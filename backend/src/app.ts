import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import * as db from "./data.js";
import { scheduleSave } from "./persistence.js";
import {
  allowedTransitions,
  anomaly,
  discrepancy,
  estimatePrice,
} from "./domain.js";
const secret = process.env.JWT_SECRET || "local-demo-secret-change-me";
const app = express();
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || !allowedOrigins.length || allowedOrigins.includes(origin)
        ? cb(null, true)
        : cb(new Error("Origin not allowed")),
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  if (req.method !== "GET")
    res.on("finish", () => {
      if (res.statusCode < 400) scheduleSave();
    });
  next();
});
app.use("/api/auth", rateLimit({ windowMs: 60000, limit: 30 }));
const ok = (res: any, data: any, status = 200) =>
  res.status(status).json({ success: true, data });
const fail = (res: any, status: number, code: string, message: string) =>
  res.status(status).json({ success: false, error: { code, message } });
const audit = (
  actor: string,
  role: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: any = {},
) =>
  db.audits.unshift({
    id: crypto.randomUUID(),
    actor,
    role,
    action,
    entityType,
    entityId,
    timestamp: new Date().toISOString(),
    metadata,
  });
const notify = (
  userId: string,
  title: string,
  message: string,
  type = "INFO",
  link = "",
) =>
  db.notifications.unshift({
    id: crypto.randomUUID(),
    userId,
    title,
    message,
    type,
    link,
    read: false,
    createdAt: new Date().toISOString(),
  });
const auth = (roles?: string[]) => (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, secret);
    const current: any = db.users.find((u: any) => u.id === req.user.id);
    if (!current || current.status !== "APPROVED")
      return fail(res, 403, "ACCOUNT_INACTIVE", "Admin approval is required");
    if (roles && !roles.includes(req.user.role))
      return fail(
        res,
        403,
        "FORBIDDEN",
        "You do not have permission for this action",
      );
    next();
  } catch {
    return fail(res, 401, "UNAUTHORIZED", "Please sign in");
  }
};
app.get("/api/health", (_, res) =>
  ok(res, {
    status: "ok",
    mode: "DEMO",
    database: "deterministic local data; MongoDB adapter ready",
  }),
);
app.post("/api/auth/login", async (req, res) => {
  const s = z
    .object({ identifier: z.string().min(3), password: z.string().optional() })
    .safeParse(req.body);
  if (!s.success)
    return fail(res, 400, "VALIDATION_ERROR", "Enter email or phone");
  const user: any = db.users.find(
    (u: any) => u.email === s.data.identifier || u.phone === s.data.identifier,
  );
  if (
    !user ||
    !s.data.password ||
    !(await bcrypt.compare(
      s.data.password,
      user.passwordHash || db.passwordHash,
    ))
  )
    return fail(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
  if (user.status !== "APPROVED")
    return fail(
      res,
      403,
      "ACCOUNT_PENDING",
      "Your account is waiting for admin approval",
    );
  const safe = { ...user, passwordHash: undefined };
  ok(res, {
    token: jwt.sign(safe, secret, { expiresIn: "12h" }),
    user: safe,
    demoMode: true,
  });
});
app.post("/api/auth/signup", async (req, res) => {
  const s = z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().min(10),
      password: z.string().min(8),
      role: z.enum(["CUSTOMER", "COLLECTOR", "RECYCLER"]),
    })
    .safeParse(req.body);
  if (!s.success)
    return fail(res, 400, "VALIDATION_ERROR", s.error.issues[0].message);
  if (
    db.users.some(
      (u: any) => u.email === s.data.email || u.phone === s.data.phone,
    )
  )
    return fail(
      res,
      409,
      "ACCOUNT_EXISTS",
      "Email or phone already registered",
    );
  const status = s.data.role === "CUSTOMER" ? "APPROVED" : "PENDING";
  const user: any = {
    id: crypto.randomUUID(),
    ...s.data,
    passwordHash: await bcrypt.hash(s.data.password, 10),
    status,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  notify(
    "u-admin",
    "New signup awaiting review",
    `${user.name} registered as ${user.role}`,
    "APPROVAL",
    "/admin/approvals",
  );
  audit(user.id, user.role, "USER_SIGNUP", "User", user.id, { status });
  ok(
    res,
    {
      id: user.id,
      status,
      message:
        status === "APPROVED" ? "Account ready" : "Admin approval required",
    },
    201,
  );
});
app.post("/api/auth/request-otp", (req, res) => {
  const user: any = db.users.find(
    (u: any) => u.phone === String(req.body.phone),
  );
  if (!user)
    return fail(
      res,
      404,
      "PHONE_NOT_FOUND",
      "No account found for this mobile number",
    );
  if (user.status !== "APPROVED")
    return fail(
      res,
      403,
      "ACCOUNT_PENDING",
      "Your account is waiting for admin approval",
    );
  ok(res, { sent: true, demoMode: true, message: "Demo OTP ready" });
});
app.post("/api/auth/verify-otp", (req, res) => {
  const user: any = db.users.find(
    (u: any) => u.phone === String(req.body.phone),
  );
  const expected = user?.role === "COLLECTOR" ? "654321" : "123456";
  if (!user || String(req.body.otp) !== expected)
    return fail(res, 401, "INVALID_OTP", "Invalid demo OTP");
  if (user.status !== "APPROVED")
    return fail(
      res,
      403,
      "ACCOUNT_PENDING",
      "Your account is waiting for admin approval",
    );
  const safe = { ...user, passwordHash: undefined };
  ok(res, {
    token: jwt.sign(safe, secret, { expiresIn: "12h" }),
    user: safe,
    demoMode: true,
  });
});
app.get("/api/materials", (_, res) => ok(res, db.materials));
app.get("/api/prices", (_, res) =>
  ok(
    res,
    db.materials.map((m) => ({ ...m, pricing: estimatePrice(m.name) })),
  ),
);
app.post("/api/prices/estimate", (req, res) =>
  ok(
    res,
    estimatePrice(
      req.body.material,
      Number(req.body.weight) || 1,
      req.body.condition || "USED",
    ),
  ),
);
app.post("/api/ai/classify", (req, res) => {
  const hint = String(
    req.body.suggestedMaterial ||
      req.body.visionLabel ||
      req.body.fileName ||
      req.body.hint ||
      "pcb",
  ).toLowerCase();
  const material = hint.includes("battery")
    ? "Battery"
    : hint.includes("cable") || hint.includes("wire")
      ? "Cable"
      : hint.includes("lcd") ||
          hint.includes("screen") ||
          hint.includes("monitor")
        ? "LCD/Display"
        : hint.includes("laptop") || hint.includes("notebook")
          ? "Laptop"
          : hint.includes("mobile") || hint.includes("telephone")
            ? "Mobile Phone"
            : hint.includes("computer") || hint.includes("keyboard")
              ? "Computer"
              : hint.includes("motor")
                ? "Motor"
                : "PCB";
  ok(res, {
    material,
    confidence: {
      PCB: 92,
      Battery: 89,
      Cable: 95,
      "LCD/Display": 87,
      Laptop: 84,
      "Mobile Phone": 86,
      Computer: 85,
      Motor: 83,
    }[material],
    condition: "USED",
    estimatedWeight: 2.4,
    pricing: estimatePrice(material, 2.4),
    model: req.body.visionLabel
      ? "ON_DEVICE_ML_ASSISTED"
      : "DETERMINISTIC_FALLBACK",
    advisory: true,
  });
});
app.get("/api/lots", auth(), (req: any, res) =>
  ok(
    res,
    req.user.role === "COLLECTOR"
      ? db.lots.filter((x) => x.collectorId === req.user.id)
      : db.lots,
  ),
);
app.post("/api/lots", auth(["COLLECTOR", "ADMIN"]), (req: any, res) => {
  const s = z
    .object({
      materialCategory: z.string(),
      approxWeight: z.coerce.number().positive().max(10000),
      condition: z.enum(["POOR", "USED", "GOOD"]).default("USED"),
      location: z.string().min(2),
      clientOperationId: z.string().optional(),
    })
    .safeParse(req.body);
  if (!s.success)
    return fail(res, 400, "VALIDATION_ERROR", s.error.issues[0].message);
  if (s.data.clientOperationId && db.synced.has(s.data.clientOperationId))
    return ok(
      res,
      db.lots.find((x) => x.clientOperationId === s.data.clientOperationId),
    );
  const p = estimatePrice(
    s.data.materialCategory,
    s.data.approxWeight,
    s.data.condition,
  );
  const lot = {
    id: crypto.randomUUID(),
    lotId: `KBD-${new Date().getFullYear()}-${String(db.lots.length + 101).padStart(6, "0")}`,
    collectorId: req.user.id,
    ...s.data,
    estimatedValue: p.average * s.data.approxWeight,
    priceRange: { low: p.totalLow, high: p.totalHigh },
    status: "CREATED",
    syncStatus: "SYNCED",
    createdAt: new Date().toISOString(),
  };
  db.lots.unshift(lot);
  if (s.data.clientOperationId) db.synced.add(s.data.clientOperationId);
  audit(req.user.id, req.user.role, "LOT_CREATED", "Lot", lot.lotId);
  ok(res, lot, 201);
});
app.get("/api/lots/:id", (req, res) => {
  const x = db.lots.find(
    (l) => l.lotId === req.params.id || l.id === req.params.id,
  );
  return x ? ok(res, x) : fail(res, 404, "LOT_NOT_FOUND", "Lot not found");
});
app.patch("/api/lots/:id", auth(), (req: any, res) => {
  const x = db.lots.find(
    (l) => l.lotId === req.params.id || l.id === req.params.id,
  );
  if (!x) return fail(res, 404, "LOT_NOT_FOUND", "Lot not found");
  if (
    req.body.status &&
    !allowedTransitions[x.status]?.includes(req.body.status)
  )
    return fail(
      res,
      409,
      "INVALID_STATUS_TRANSITION",
      `Cannot move ${x.status} to ${req.body.status}`,
    );
  Object.assign(x, req.body);
  ok(res, x);
});
app.get("/api/recyclers", (_, res) => ok(res, db.recyclers));
app.post("/api/recyclers/:id/verify", auth(["ADMIN"]), (req: any, res) => {
  const r = db.recyclers.find((x) => x.id === req.params.id);
  if (!r) return fail(res, 404, "RECYCLER_NOT_FOUND", "Recycler not found");
  r.status = "VERIFIED";
  r.authorized = true;
  audit(req.user.id, req.user.role, "RECYCLER_VERIFIED", "Recycler", r.id);
  ok(res, r);
});
app.post(
  "/api/lots/:id/quotes",
  auth(["RECYCLER", "ADMIN"]),
  (req: any, res) => {
    const lot = db.lots.find(
      (x) => x.lotId === req.params.id || x.id === req.params.id,
    );
    if (!lot) return fail(res, 404, "LOT_NOT_FOUND", "Lot not found");
    const q = {
      id: crypto.randomUUID(),
      lotId: lot.lotId,
      recyclerId: "r1",
      offerPrice: Number(req.body.offerPrice),
      pickupAvailable: !!req.body.pickupAvailable,
      pickupDate: req.body.pickupDate,
      notes: req.body.notes,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    db.quotes.push(q);
    lot.status = "QUOTED";
    notify(
      lot.collectorId,
      "New recycler quote",
      `${lot.lotId} received an offer of ₹${q.offerPrice}/kg`,
      "QUOTE",
      `/collector/lots/${lot.lotId}`,
    );
    audit(req.user.id, req.user.role, "QUOTE_SUBMITTED", "Quote", q.id);
    ok(res, q, 201);
  },
);
app.get("/api/lots/:id/quotes", auth(), (req, res) =>
  ok(
    res,
    db.quotes.filter((q) => q.lotId === req.params.id),
  ),
);
app.post(
  "/api/quotes/:id/accept",
  auth(["COLLECTOR", "ADMIN"]),
  (req: any, res) => {
    const q = db.quotes.find((x) => x.id === req.params.id);
    if (!q) return fail(res, 404, "QUOTE_NOT_FOUND", "Quote not found");
    q.status = "ACCEPTED";
    const lot = db.lots.find((x) => x.lotId === q.lotId);
    if (lot) {
      lot.status = "ACCEPTED";
      lot.quotedPrice = q.offerPrice;
      lot.recyclerId = q.recyclerId;
    }
    notify(
      "u-recycler",
      "Quote accepted",
      `${q.lotId} is ready for pickup planning`,
      "ACCEPTED",
      "/recycler/operations",
    );
    audit(req.user.id, req.user.role, "QUOTE_ACCEPTED", "Quote", q.id);
    ok(res, q);
  },
);
app.post("/api/handover", auth(), (req: any, res) => {
  if (req.body.otp !== "123456")
    return fail(res, 400, "INVALID_OTP", "Demo handover OTP is 123456");
  const lot = db.lots.find((x) => x.lotId === req.body.lotId);
  if (!lot) return fail(res, 404, "LOT_NOT_FOUND", "Lot not found");
  const d = discrepancy(lot.approxWeight, Number(req.body.weightAtHandover));
  const h = {
    id: crypto.randomUUID(),
    handoverId: `HND-${Date.now()}`,
    lotId: lot.lotId,
    collectorId: lot.collectorId,
    recyclerId: lot.recyclerId,
    weightAtHandover: Number(req.body.weightAtHandover),
    otpVerified: true,
    collectorConfirmation: true,
    recyclerConfirmation: true,
    status: "CONFIRMED",
    timestamp: new Date().toISOString(),
    discrepancy: d,
  };
  db.handovers.push(h);
  lot.status = "HANDED_OVER";
  lot.finalWeight = h.weightAtHandover;
  if (d.flagged)
    db.anomalies.unshift({
      id: crypto.randomUUID(),
      type: "WEIGHT_DISCREPANCY",
      severity: d.severity,
      lotId: lot.lotId,
      status: "OPEN",
      details: d,
    });
  notify(
    lot.collectorId,
    "Handover confirmed",
    `${lot.lotId} weight verified at ${h.weightAtHandover} kg`,
    d.flagged ? "WARNING" : "HANDOVER",
    `/collector/lots/${lot.lotId}`,
  );
  audit(req.user.id, req.user.role, "HANDOVER_CONFIRMED", "Handover", h.id);
  ok(res, h, 201);
});
app.post("/api/payments", auth(["RECYCLER", "ADMIN"]), (req: any, res) => {
  const lot = db.lots.find((x) => x.lotId === req.body.lotId);
  if (!lot) return fail(res, 404, "LOT_NOT_FOUND", "Lot not found");
  if (
    db.payments.some(
      (p) => p.transactionReference === req.body.transactionReference,
    )
  )
    return ok(
      res,
      db.payments.find(
        (p) => p.transactionReference === req.body.transactionReference,
      ),
    );
  const max = Math.round(
    (lot.quotedPrice || estimatePrice(lot.materialCategory).average) *
      (lot.finalWeight || lot.approxWeight),
  );
  if (Number(req.body.amount) > max)
    return fail(
      res,
      409,
      "PAYMENT_EXCEEDS_SALE_VALUE",
      `Payment cannot exceed ₹${max}`,
    );
  const p = {
    id: crypto.randomUUID(),
    lotId: lot.lotId,
    amount: Number(req.body.amount),
    method: req.body.method,
    status: "PAID",
    transactionReference: req.body.transactionReference,
    paidAt: new Date().toISOString(),
  };
  db.payments.unshift(p);
  lot.status = "PAID";
  lot.finalSaleValue = p.amount;
  notify(
    lot.collectorId,
    "Payment received",
    `₹${p.amount} received for ${lot.lotId}`,
    "PAYMENT",
    "/collector/earnings",
  );
  audit(req.user.id, req.user.role, "PAYMENT_RECORDED", "Payment", p.id);
  ok(res, p, 201);
});
app.get("/api/payments", auth(), (_, res) => ok(res, db.payments));
app.post("/api/anomalies/check", (req, res) =>
  ok(res, {
    ...anomaly(
      Number(req.body.quote),
      Number(req.body.benchmark),
      Number(process.env.ANOMALY_THRESHOLD_PERCENT) || 30,
    ),
    quote: Number(req.body.quote),
    benchmark: Number(req.body.benchmark),
  }),
);
app.get("/api/anomalies", auth(["ADMIN"]), (_, res) => ok(res, db.anomalies));
app.post("/api/sync", auth(), async (req: any, res) => {
  const results = [];
  for (const op of req.body.operations || []) {
    if (db.synced.has(op.clientOperationId)) {
      results.push({
        clientOperationId: op.clientOperationId,
        status: "DUPLICATE",
      });
      continue;
    }
    if (op.type === "CREATE_LOT") {
      const p = estimatePrice(
        op.payload.materialCategory,
        op.payload.approxWeight,
        op.payload.condition,
      );
      const lot = {
        id: crypto.randomUUID(),
        lotId: `KBD-${new Date().getFullYear()}-${String(db.lots.length + 101).padStart(6, "0")}`,
        collectorId: req.user.id,
        ...op.payload,
        estimatedValue: p.average * op.payload.approxWeight,
        priceRange: { low: p.totalLow, high: p.totalHigh },
        status: "CREATED",
        syncStatus: "SYNCED",
        clientOperationId: op.clientOperationId,
        createdAt: new Date().toISOString(),
      };
      db.lots.unshift(lot);
    }
    db.synced.add(op.clientOperationId);
    results.push({ clientOperationId: op.clientOperationId, status: "SYNCED" });
  }
  ok(res, {
    results,
    synced: results.filter((x) => x.status === "SYNCED").length,
  });
});
app.get("/api/traceability/:id", (req, res) => {
  const l = db.lots.find((x) => x.lotId === req.params.id);
  if (!l) return fail(res, 404, "LOT_NOT_FOUND", "Lot not found");
  ok(res, {
    lotId: l.lotId,
    material: l.materialCategory,
    weight: l.finalWeight || l.approxWeight,
    collectionDate: l.createdAt,
    recycler: l.recyclerId ? "Demo Verified Recycler" : "Pending match",
    handover: ["HANDED_OVER", "RECEIVED", "PAID", "RECYCLED"].includes(
      l.status,
    ),
    payment: ["PAID", "RECYCLED"].includes(l.status),
    recycling: l.status === "RECYCLED",
    status: l.status,
  });
});
app.get("/api/dashboard/:role", auth(), (req: any, res) => {
  const gmv = db.payments.reduce((s, p) => s + p.amount, 0);
  ok(res, {
    lots: db.lots.length,
    active: db.lots.filter(
      (x) => !["PAID", "RECYCLED", "CANCELLED"].includes(x.status),
    ).length,
    paid: db.payments.length,
    gmv,
    materialKg: Math.round(db.lots.reduce((s, x) => s + x.approxWeight, 0)),
    verifiedRecyclers: db.recyclers.filter((x) => x.status === "VERIFIED")
      .length,
    anomalies: db.anomalies.length,
    monthlyEarnings: 31850,
    previousMonthChange: 18,
  });
});
app.get("/api/business/metrics", auth(["ADMIN"]), (_, res) => {
  const gmv = db.payments.reduce((s, p) => s + p.amount, 0);
  ok(res, {
    gmv,
    revenue: Math.round(gmv * 0.01),
    subscription: 45000,
    logistics: 18500,
    contributionMargin: Math.round(gmv * 0.01) + 26500,
    platformFeePercent: 1,
  });
});
app.get("/api/audit", auth(["ADMIN"]), (_, res) => ok(res, db.audits));
app.get("/api/notifications", auth(), (req: any, res) =>
  ok(
    res,
    db.notifications
      .filter((n) => n.userId === req.user.id || req.user.role === "ADMIN")
      .slice(0, 30),
  ),
);
app.patch("/api/notifications/:id/read", auth(), (req: any, res) => {
  const n = db.notifications.find(
    (x) =>
      x.id === req.params.id &&
      (x.userId === req.user.id || req.user.role === "ADMIN"),
  );
  if (!n)
    return fail(res, 404, "NOTIFICATION_NOT_FOUND", "Notification not found");
  n.read = true;
  ok(res, n);
});
const km = (a: any, b: any) => {
  const r = 6371,
    dLat = ((b.latitude - a.latitude) * Math.PI) / 180,
    dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const v =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(v));
};
app.post(
  "/api/pickups/optimize",
  auth(["RECYCLER", "ADMIN"]),
  (req: any, res) => {
    const depot = {
      latitude: Number(req.body.latitude) || 18.5204,
      longitude: Number(req.body.longitude) || 73.8567,
    };
    const capacity = Math.max(20, Number(req.body.capacityKg) || 250);
    const radius = Math.max(1, Math.min(50, Number(req.body.radiusKm) || 15));
    const candidates = db.lots
      .filter((l) =>
        ["ACCEPTED", "PICKUP_SCHEDULED", "CREATED"].includes(l.status),
      )
      .map((l, i) => ({
        ...l,
        latitude: Number(l.latitude) || 18.5204 + ((i % 7) - 3) * 0.008,
        longitude: Number(l.longitude) || 73.8567 + ((i % 5) - 2) * 0.01,
      }))
      .filter((l) => km(depot, l) <= radius);
    const routes: any[] = [];
    let remaining = [...candidates];
    while (remaining.length) {
      let current = depot,
        load = 0,
        distance = 0;
      const stops: any[] = [];
      while (remaining.length) {
        const ranked = remaining
          .map((l) => ({ l, d: km(current, l) }))
          .sort((a, b) => a.d - b.d);
        const next = ranked.find(
          (x) => load + Number(x.l.approxWeight) <= capacity,
        );
        if (!next) break;
        distance += next.d;
        load += Number(next.l.approxWeight);
        stops.push({
          lotId: next.l.lotId,
          material: next.l.materialCategory,
          weight: next.l.approxWeight,
          latitude: next.l.latitude,
          longitude: next.l.longitude,
          distanceFromPreviousKm: +next.d.toFixed(1),
        });
        current = next.l;
        remaining = remaining.filter((x) => x.id !== next.l.id);
      }
      if (!stops.length) {
        remaining.shift();
        continue;
      }
      distance += km(current, depot);
      routes.push({
        routeId: `POOL-${routes.length + 1}`,
        stops,
        totalWeightKg: +load.toFixed(1),
        distanceKm: +distance.toFixed(1),
        estimatedSavingPercent: Math.min(45, Math.round(12 + stops.length * 6)),
        capacityUtilizationPercent: Math.round((load / capacity) * 100),
      });
    }
    ok(res, {
      depot,
      radiusKm: radius,
      capacityKg: capacity,
      optimizedAt: new Date().toISOString(),
      routes,
      unassigned: remaining.length,
    });
  },
);
app.get("/api/admin/users", auth(["ADMIN"]), (_, res) =>
  ok(
    res,
    db.users.map((u: any) => ({ ...u, passwordHash: undefined })),
  ),
);
app.patch("/api/admin/users/:id/status", auth(["ADMIN"]), (req: any, res) => {
  const user: any = db.users.find((u: any) => u.id === req.params.id);
  if (!user) return fail(res, 404, "USER_NOT_FOUND", "User not found");
  if (!["APPROVED", "REJECTED", "SUSPENDED"].includes(req.body.status))
    return fail(res, 400, "INVALID_STATUS", "Invalid approval status");
  user.status = req.body.status;
  notify(
    user.id,
    `Account ${user.status.toLowerCase()}`,
    user.status === "APPROVED"
      ? "You can now sign in and start working."
      : "Contact support for more information.",
    "APPROVAL",
  );
  audit(req.user.id, "ADMIN", "USER_STATUS_CHANGED", "User", user.id, {
    status: user.status,
  });
  ok(res, { ...user, passwordHash: undefined });
});
app.get("/api/admin/marketplace-config", auth(["ADMIN"]), (_, res) =>
  ok(res, { ...db.businessConfig, coupons: db.coupons }),
);
app.patch("/api/admin/marketplace-config", auth(["ADMIN"]), (req, res) => {
  const value = db.setBusinessConfig({
    commissionPercent: Math.max(
      0,
      Math.min(
        30,
        Number(
          req.body.commissionPercent ?? db.businessConfig.commissionPercent,
        ),
      ),
    ),
    deliveryCharge: Math.max(
      0,
      Number(req.body.deliveryCharge ?? db.businessConfig.deliveryCharge),
    ),
    freeDeliveryAbove: Math.max(
      0,
      Number(req.body.freeDeliveryAbove ?? db.businessConfig.freeDeliveryAbove),
    ),
  });
  ok(res, value);
});
app.post("/api/admin/coupons", auth(["ADMIN"]), (req, res) => {
  const s = z
    .object({
      code: z.string().min(3).max(20),
      type: z.enum(["FLAT", "PERCENT"]),
      value: z.coerce.number().positive(),
      minOrderValue: z.coerce.number().nonnegative().default(0),
    })
    .safeParse(req.body);
  if (!s.success)
    return fail(res, 400, "VALIDATION_ERROR", s.error.issues[0].message);
  const c = {
    id: crypto.randomUUID(),
    ...s.data,
    code: s.data.code.toUpperCase(),
    active: true,
  };
  db.coupons.unshift(c);
  ok(res, c, 201);
});
app.post("/api/marketplace/orders", auth(["CUSTOMER"]), (req: any, res) => {
  const s = z
    .object({
      items: z
        .array(
          z.object({
            name: z.string().min(2),
            category: z.string().min(2),
            quantity: z.coerce.number().positive(),
            estimatedWeight: z.coerce.number().positive(),
            condition: z.enum(["POOR", "USED", "GOOD"]),
            photo: z.string().max(1400000).optional(),
          }),
        )
        .min(1),
      address: z.string().min(5),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      couponCode: z.string().optional(),
    })
    .safeParse(req.body);
  if (!s.success)
    return fail(res, 400, "VALIDATION_ERROR", s.error.issues[0].message);
  const gross = s.data.items.reduce(
    (sum, i) =>
      sum +
      estimatePrice(i.category, i.estimatedWeight, i.condition)
        .recommendedFairPrice *
        i.estimatedWeight,
    0,
  );
  const coupon = db.coupons.find(
    (c: any) =>
      c.active &&
      c.code === s.data.couponCode?.toUpperCase() &&
      gross >= c.minOrderValue,
  );
  const discount = coupon
    ? coupon.type === "PERCENT"
      ? (gross * coupon.value) / 100
      : coupon.value
    : 0;
  const delivery =
    gross >= db.businessConfig.freeDeliveryAbove
      ? 0
      : db.businessConfig.deliveryCharge;
  const order: any = {
    id: crypto.randomUUID(),
    orderId: `ORD-${Date.now()}`,
    customerId: req.user.id,
    items: s.data.items,
    address: s.data.address,
    latitude:
      s.data.latitude ??
      (s.data.address.toLowerCase().includes("kothrud") ? 18.5074 : 18.5204),
    longitude:
      s.data.longitude ??
      (s.data.address.toLowerCase().includes("kothrud") ? 73.8077 : 73.8567),
    aiEstimatedValue: Math.round(gross),
    priceRange: {
      low: Math.round(gross * 0.82),
      high: Math.round(gross * 1.16),
    },
    couponCode: coupon?.code,
    discount: Math.round(discount),
    deliveryCharge: delivery,
    status: "AWAITING_RECYCLER",
    createdAt: new Date().toISOString(),
  };
  db.orders.unshift(order);
  db.users
    .filter((u: any) => u.role === "RECYCLER" && u.status === "APPROVED")
    .forEach((u: any) =>
      notify(
        u.id,
        "New household material order",
        `${order.items.length} item(s) available. Accept and set a value.`,
        "ORDER",
        "/recycler/orders",
      ),
    );
  audit(req.user.id, "CUSTOMER", "ORDER_PLACED", "Order", order.orderId);
  ok(res, order, 201);
});
app.get("/api/marketplace/orders", auth(), (req: any, res) => {
  if (req.user.role === "CUSTOMER")
    return ok(
      res,
      db.orders
        .filter((o) => o.customerId === req.user.id)
        .map((o) => ({
          ...o,
          recyclerName: o.recyclerId
            ? db.users.find((u: any) => u.id === o.recyclerId)?.name
            : undefined,
          collectorName: o.collectorId
            ? db.users.find((u: any) => u.id === o.collectorId)?.name
            : undefined,
        })),
    );
  if (req.user.role === "RECYCLER")
    return ok(
      res,
      db.orders
        .filter(
          (o) =>
            o.status === "AWAITING_RECYCLER" || o.recyclerId === req.user.id,
        )
        .map((o) => ({
          ...o,
          customerId: undefined,
          address:
            o.recyclerId === req.user.id
              ? o.address
              : o.address.split(",").slice(-2).join(","),
        })),
    );
  if (req.user.role === "COLLECTOR")
    return ok(
      res,
      db.orders
        .filter((o) => o.collectorId === req.user.id)
        .map((o) => ({
          ...o,
          customerId: undefined,
          recyclerName: db.users.find((u: any) => u.id === o.recyclerId)?.name,
        })),
    );
  if (req.user.role === "ADMIN") return ok(res, db.orders);
  return fail(res, 403, "FORBIDDEN", "Role not supported");
});
app.post(
  "/api/marketplace/orders/:id/recycler-accept",
  auth(["RECYCLER"]),
  (req: any, res) => {
    const order = db.orders.find(
      (o) =>
        (o.orderId === req.params.id || o.id === req.params.id) &&
        o.status === "AWAITING_RECYCLER",
    );
    if (!order)
      return fail(
        res,
        409,
        "ORDER_UNAVAILABLE",
        "Another recycler already accepted this order",
      );
    const amount = Math.max(
      1,
      Number(req.body.amount || order.aiEstimatedValue),
    );
    const collector: any = db.users.find(
      (u: any) => u.role === "COLLECTOR" && u.status === "APPROVED",
    );
    if (!collector)
      return fail(
        res,
        409,
        "NO_COLLECTOR",
        "No approved collector is currently available",
      );
    order.recyclerId = req.user.id;
    order.recyclerOffer = amount;
    order.collectorId = collector.id;
    order.status = "COLLECTOR_ASSIGNED";
    order.acceptedAt = new Date().toISOString();
    notify(
      order.customerId,
      "Recycler accepted your order",
      `${req.user.name} accepted at ₹${amount}. ${collector.name} is assigned for pickup.`,
      "ACCEPTED",
      "/customer/orders",
    );
    notify(
      collector.id,
      "New assigned pickup",
      `${order.orderId} is assigned only to you. Collect it and deliver to ${req.user.name}.`,
      "PICKUP",
      "/collector/orders",
    );
    audit(
      req.user.id,
      "RECYCLER",
      "HOUSEHOLD_ORDER_ACCEPTED",
      "Order",
      order.orderId,
      { collectorId: collector.id, amount },
    );
    ok(res, order);
  },
);
app.post(
  "/api/marketplace/orders/:id/start-trip",
  auth(["COLLECTOR"]),
  (req: any, res) => {
    const order = db.orders.find(
      (o) =>
        (o.orderId === req.params.id || o.id === req.params.id) &&
        o.collectorId === req.user.id,
    );
    if (!order || order.status !== "COLLECTOR_ASSIGNED")
      return fail(
        res,
        409,
        "ORDER_UNAVAILABLE",
        "Assigned pickup is not ready",
      );
    order.status = "COLLECTOR_EN_ROUTE";
    order.tripStartedAt = new Date().toISOString();
    order.collectorLatitude = 18.5204;
    order.collectorLongitude = 73.8567;
    notify(
      order.customerId,
      "Collector is on the way",
      `${req.user.name} started the trip. Track the ETA in your order.`,
      "PICKUP",
      "/customer/orders",
    );
    ok(res, order);
  },
);
app.post(
  "/api/marketplace/orders/:id/pickup",
  auth(["COLLECTOR"]),
  (req: any, res) => {
    const order = db.orders.find(
      (o) =>
        (o.orderId === req.params.id || o.id === req.params.id) &&
        o.collectorId === req.user.id,
    );
    if (
      !order ||
      !["COLLECTOR_ASSIGNED", "COLLECTOR_EN_ROUTE"].includes(order.status)
    )
      return fail(
        res,
        409,
        "ORDER_UNAVAILABLE",
        "Assigned pickup is not ready",
      );
    order.status = "PICKED_UP";
    order.pickedUpAt = new Date().toISOString();
    notify(
      order.customerId,
      "Item picked up",
      `${req.user.name} collected your items. They are on the way to the recycler.`,
      "PICKUP",
      "/customer/orders",
    );
    notify(
      order.recyclerId,
      "Material picked up",
      `${order.orderId} is on the way to your facility.`,
      "PICKUP",
      "/recycler/orders",
    );
    ok(res, order);
  },
);
app.post(
  "/api/marketplace/orders/:id/deliver",
  auth(["COLLECTOR"]),
  (req: any, res) => {
    const order = db.orders.find(
      (o) =>
        (o.orderId === req.params.id || o.id === req.params.id) &&
        o.collectorId === req.user.id,
    );
    if (!order || order.status !== "PICKED_UP")
      return fail(
        res,
        409,
        "ORDER_UNAVAILABLE",
        "Order must be picked up first",
      );
    order.status = "DELIVERED_TO_RECYCLER";
    order.deliveredAt = new Date().toISOString();
    order.finalAmount = order.recyclerOffer;
    notify(
      order.customerId,
      "Delivered safely",
      `${order.orderId} reached the recycler. Final value ₹${order.finalAmount}.`,
      "DELIVERED",
      "/customer/orders",
    );
    notify(
      order.recyclerId,
      "Delivery completed",
      `${order.orderId} has arrived at your facility.`,
      "DELIVERED",
      "/recycler/orders",
    );
    ok(res, order);
  },
);
app.post(
  "/api/marketplace/orders/:id/offers",
  auth(["COLLECTOR"]),
  (req: any, res) => {
    const order = db.orders.find(
      (o) => o.orderId === req.params.id || o.id === req.params.id,
    );
    if (!order || order.status !== "OPEN")
      return fail(res, 409, "ORDER_UNAVAILABLE", "Order is no longer open");
    if (
      db.marketplaceOffers.some(
        (x) =>
          x.orderId === order.orderId &&
          x.collectorId === req.user.id &&
          x.status === "PENDING",
      )
    )
      return fail(res, 409, "OFFER_EXISTS", "You already have a pending offer");
    const amount = Math.max(1, Number(req.body.amount));
    const offer = {
      id: crypto.randomUUID(),
      orderId: order.orderId,
      collectorId: req.user.id,
      collectorName: req.user.name,
      amount,
      pickupAt: req.body.pickupAt,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    db.marketplaceOffers.push(offer);
    order.status = "OFFERED";
    notify(
      order.customerId,
      "New pickup offer",
      `A verified collector offered ₹${amount}. Review the price before accepting.`,
      "OFFER",
      `/customer/orders`,
    );
    ok(res, offer, 201);
  },
);
app.post(
  "/api/marketplace/offers/:id/decision",
  auth(["CUSTOMER"]),
  (req: any, res) => {
    const offer = db.marketplaceOffers.find((x) => x.id === req.params.id);
    const order =
      offer &&
      db.orders.find(
        (o) => o.orderId === offer.orderId && o.customerId === req.user.id,
      );
    if (!offer || !order)
      return fail(res, 404, "OFFER_NOT_FOUND", "Offer not found");
    if (req.body.decision === "ACCEPT") {
      offer.status = "ACCEPTED";
      order.status = "PICKUP_ASSIGNED";
      order.collectorId = offer.collectorId;
      order.acceptedOffer = offer.amount;
      db.marketplaceOffers
        .filter((x) => x.orderId === order.orderId && x.id !== offer.id)
        .forEach((x) => (x.status = "CLOSED"));
      notify(
        offer.collectorId,
        "Pickup offer accepted",
        `${order.orderId}: customer accepted ₹${offer.amount}. Exact address is now available.`,
        "PICKUP",
        "/collector/orders",
      );
    } else {
      offer.status = "REJECTED";
      order.status = "OPEN";
      order.collectorId = undefined;
      db.users
        .filter((u: any) => u.role === "COLLECTOR" && u.status === "APPROVED")
        .forEach((u: any) =>
          notify(
            u.id,
            "Pickup reopened",
            `${order.orderId} is open for a new price offer.`,
            "ORDER",
            "/collector/orders",
          ),
        );
    }
    ok(res, order);
  },
);
app.post(
  "/api/marketplace/orders/:id/verify-weight",
  auth(["COLLECTOR"]),
  (req: any, res) => {
    const order = db.orders.find(
      (o) =>
        (o.orderId === req.params.id || o.id === req.params.id) &&
        o.collectorId === req.user.id,
    );
    if (!order)
      return fail(res, 404, "ORDER_NOT_FOUND", "Assigned order not found");
    const actualWeight = Math.max(0, Number(req.body.actualWeight));
    const estimated = order.items.reduce(
      (s: any, i: any) => s + i.estimatedWeight,
      0,
    );
    const revised = Math.round(
      order.acceptedOffer * (actualWeight / estimated),
    );
    order.actualWeight = actualWeight;
    order.weightEvidence = req.body.photo;
    order.revisedAmount = revised;
    order.status =
      Math.abs(actualWeight - estimated) / estimated > 0.05
        ? "PRICE_REVISION_PENDING"
        : "PAYMENT_READY";
    notify(
      order.customerId,
      order.status === "PAYMENT_READY"
        ? "Weight verified"
        : "Weight changed — approve revised price",
      `${actualWeight} kg verified. Final amount ₹${revised}.`,
      "WEIGHT",
      "/customer/orders",
    );
    ok(res, order);
  },
);
app.post(
  "/api/marketplace/orders/:id/final-decision",
  auth(["CUSTOMER"]),
  (req: any, res) => {
    const order = db.orders.find(
      (o) =>
        (o.orderId === req.params.id || o.id === req.params.id) &&
        o.customerId === req.user.id,
    );
    if (!order) return fail(res, 404, "ORDER_NOT_FOUND", "Order not found");
    if (req.body.decision === "ACCEPT") {
      order.status = "COMPLETED";
      order.finalAmount = order.revisedAmount;
      order.commission = Math.round(
        (order.finalAmount * db.businessConfig.commissionPercent) / 100,
      );
      order.customerPayout = Math.max(
        0,
        order.finalAmount -
          order.commission -
          order.deliveryCharge +
          order.discount,
      );
      order.completedAt = new Date().toISOString();
      notify(
        order.collectorId,
        "Pickup completed",
        `${order.orderId} final payment ₹${order.customerPayout} confirmed.`,
        "PAYMENT",
        "/collector/orders",
      );
      notify(
        order.customerId,
        "Payment confirmed",
        `Net payout ₹${order.customerPayout} after charges and coupon.`,
        "PAYMENT",
        "/customer/orders",
      );
    } else {
      order.status = "DISPUTED";
      notify(
        "u-admin",
        "Marketplace dispute",
        `${order.orderId} revised weight/price was rejected.`,
        "WARNING",
        "/admin/orders",
      );
    }
    ok(res, order);
  },
);
app.use((_, res) => fail(res, 404, "ROUTE_NOT_FOUND", "API route not found"));
export default app;
