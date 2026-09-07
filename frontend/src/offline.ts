import Dexie, { type Table } from "dexie";
export type OfflineOp = {
  id?: number;
  clientOperationId: string;
  type: "CREATE_LOT" | "UPDATE_LOT" | "CREATE_HANDOVER" | "CREATE_PAYMENT";
  payload: any;
  createdAt: string;
  status: "PENDING" | "SYNCED" | "FAILED";
};
class OfflineDB extends Dexie {
  operations!: Table<OfflineOp, number>;
  drafts!: Table<any, string>;
  cache!: Table<any, string>;
  constructor() {
    super("kabadi-plus");
    this.version(1).stores({
      operations: "++id,&clientOperationId,status,createdAt",
      drafts: "&id,createdAt",
      cache: "&key,updatedAt",
    });
  }
}
export const offlineDB = new OfflineDB();
export const isDemoOffline = () =>
  localStorage.getItem("kbd-offline") === "true";
export async function queue(type: OfflineOp["type"], payload: any) {
  const op = {
    clientOperationId: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    status: "PENDING" as const,
  };
  await offlineDB.operations.add(op);
  return op;
}
export async function syncNow() {
  const pending = await offlineDB.operations
    .where("status")
    .equals("PENDING")
    .toArray();
  if (!pending.length) return 0;
  const { api } = await import("./api");
  const result = await api<any>("/sync", {
    method: "POST",
    body: JSON.stringify({ operations: pending }),
  });
  for (const op of pending) {
    await offlineDB.operations.update(op.id!, { status: "SYNCED" });
    await offlineDB.drafts.delete(op.clientOperationId);
  }
  return result.synced as number;
}
