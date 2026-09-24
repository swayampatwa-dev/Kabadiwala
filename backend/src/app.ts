import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import * as db from "./data.js";
import { pin, offerItems, localOffers } from "./local-offers.js";
import { addDemoBuyers } from "./demo-buyers.js";
import { scheduleSave } from "./persistence.js";
import {
  allowedTransitions,
  anomaly,
  discrepancy,
  estimatePrice,
} from "./domain.js";
const secret = process.env.JWT_SECRET || "local-demo-secret-change-me";
const app = express();
// Chat history is private: generic order responses must never include it.
// The authorized messages endpoint returns the message array directly.
app.set("json replacer",(key:string,value:any)=>key==="messages"?undefined:value);
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
      role: z.enum(["CUSTOMER", "COLLECTOR", "AGGREGATOR", "RECYCLER"]),
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
      message: status === "APPROVED" ? "Account ready" : "Admin approval required",
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
app.get("/api/account/location",auth(),(req:any,res)=>{
  const u=db.users.find(u=>u.id===req.user.id);
  return ok(res,{address:u.address||"",pincode:u.pincode||"",servicePincodes:u.servicePincodes||[],buyingRates:u.buyingRates||{}});
});
app.put("/api/account/location",auth(["CUSTOMER","RECYCLER"]),(req:any,res)=>{
  const schema=z.object({address:z.string().trim().min(5).max(500),pincode:pin,servicePincodes:z.array(pin).max(100).optional(),buyingRates:z.record(z.string().min(2),z.number().positive().max(1000000)).optional()});
  const parsed=schema.safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR",parsed.error.issues[0].message);
  const u=db.users.find(u=>u.id===req.user.id);u.address=parsed.data.address;u.pincode=parsed.data.pincode;
  if(u.role==="RECYCLER"){u.servicePincodes=[...new Set([parsed.data.pincode,...(parsed.data.servicePincodes||[])])];u.buyingRates=parsed.data.buyingRates||{};u.ratesUpdatedAt=new Date().toISOString();}
  audit(u.id,u.role,"LOCATION_RATES_UPDATED","User",u.id);return ok(res,{saved:true});
});
app.post("/api/marketplace/compare",auth(["CUSTOMER"]),(req:any,res)=>{
  const parsed=z.object({pincode:pin,items:offerItems}).safeParse(req.body);
  if(!parsed.success)return fail(res,400,"VALIDATION_ERROR",parsed.error.issues[0].message);
  return ok(res,localOffers(db.users,parsed.data.pincode,parsed.data.items));
});
app.get("/api/prices", (req, res) => {
  const category = String(req.query.category || "");
  const records = category ? db.priceRecords.filter((p) => p.category === category) : db.priceRecords;
  ok(res, records);
});
app.get("/api/prices/history", (req, res) => {
  const category = String(req.query.category || "PCB");
  ok(res, db.priceRecords.filter((p) => p.category === category).sort((a,b) => +new Date(a.effectiveDate)-+new Date(b.effectiveDate)));
});
app.get("/api/safety", (_, res) => ok(res, db.safetyContent.filter((x) => x.active)));
app.post("/api/admin/materials",auth(["ADMIN","DATA_OPERATOR"]),(req:any,res)=>{const parsed=z.object({category:z.string().min(2),subcategory:z.string().min(2),hi:z.string().min(1),mr:z.string().min(1),rate:z.coerce.number().nonnegative(),safetyLevel:z.enum(["NORMAL","HIGH"])}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR",parsed.error.issues[0].message);const item:any={id:crypto.randomUUID(),name:parsed.data.category,...parsed.data,active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),source:"ADMIN_ENTRY",validationStatus:"VALIDATED"};db.materials.push(item);audit(req.user.id,req.user.role,"MATERIAL_CREATED","Material",item.id,item);return ok(res,item,201);});
app.patch("/api/admin/materials/:id",auth(["ADMIN","DATA_OPERATOR"]),(req:any,res)=>{const item:any=db.materials.find((x:any)=>x.id===req.params.id);if(!item)return fail(res,404,"MATERIAL_NOT_FOUND","Material not found");const previous={...item};Object.assign(item,req.body,{updatedAt:new Date().toISOString()});audit(req.user.id,req.user.role,"MATERIAL_UPDATED","Material",item.id,{previous,newValue:item});return ok(res,item);});
app.post("/api/admin/prices",auth(["ADMIN","DATA_OPERATOR"]),(req:any,res)=>{const parsed=z.object({materialId:z.string(),category:z.string(),subcategory:z.string(),location:z.string().min(2),effectiveDate:z.string(),minRate:z.coerce.number().nonnegative(),maxRate:z.coerce.number().positive(),unit:z.literal("kg"),offeredBy:z.string().min(2),source:z.string().min(2)}).refine(x=>x.maxRate>=x.minRate,{message:"Maximum rate must be at least minimum rate"}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR",parsed.error.issues[0].message);const item:any={id:crypto.randomUUID(),...parsed.data,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),validationStatus:"VALIDATED"};db.priceRecords.push(item);audit(req.user.id,req.user.role,"PRICE_CREATED","PriceRecord",item.id,item);return ok(res,item,201);});
app.post("/api/admin/safety",auth(["ADMIN"]),(req:any,res)=>{const parsed=z.object({material:z.string(),title:z.object({en:z.string(),hi:z.string(),mr:z.string()}),body:z.object({en:z.string(),hi:z.string(),mr:z.string()})}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR",parsed.error.issues[0].message);const item:any={id:crypto.randomUUID(),...parsed.data,active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),source:"ADMIN_ENTRY",validationStatus:"VALIDATED"};db.safetyContent.push(item);audit(req.user.id,req.user.role,"SAFETY_CREATED","SafetyContent",item.id,item);return ok(res,item,201);});
app.get("/api/profile", auth(), (req:any, res) => ok(res, db.users.find((u:any) => u.id === req.user.id)));
app.patch("/api/profile", auth(), (req:any, res) => {
  const user:any = db.users.find((u:any) => u.id === req.user.id);
  const parsed = z.object({preferredLanguage:z.enum(["en","hi","mr"]).optional(),generalOperatingLocation:z.string().min(2).optional(),name:z.string().min(2).optional()}).safeParse(req.body);
  if(!parsed.success) return fail(res,400,"VALIDATION_ERROR",parsed.error.issues[0].message);
  Object.assign(user, parsed.data, {updatedAt:new Date().toISOString()});
  audit(req.user.id,req.user.role,"PROFILE_UPDATED","User",req.user.id,parsed.data); return ok(res,user);
});
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
    ["COLLECTOR", "AGGREGATOR"].includes(req.user.role)
      ? db.lots.filter((x) => x.collectorId === req.user.id)
      : db.lots,
  ),
);
app.post("/api/lots", auth(["COLLECTOR", "AGGREGATOR", "ADMIN"]), (req: any, res) => {
  const s = z
    .object({
      materialCategory: z.string(),
      materialSubcategory: z.string().min(2),
      description: z.string().min(2),
      photoUrl: z.string().min(1),
      approxWeight: z.coerce.number().positive().max(10000),
      condition: z.enum(["POOR", "USED", "GOOD"]).default("USED"),
      sourceType: z.enum(["HOUSEHOLD_COLLECTION","BUSINESS_COLLECTION","REPAIR_SHOP","BULK_AGGREGATION","OTHER"]),
      location: z.union([z.string().min(2),z.object({label:z.string().min(2),latitude:z.number(),longitude:z.number(),accuracy:z.number().nonnegative(),capturedAt:z.string()})]),
      capturedAt: z.string().optional(),
      preferredHandover: z.enum(["PICKUP","DROPOFF","AGREED_LOCATION"]).default("PICKUP"),
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
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), source:"COLLECTOR_ENTRY", validationStatus:"USER_CONFIRMED",
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
  r.status = "AUTHORIZED";
  r.authorizationStatus = "AUTHORIZED";
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
app.post("/api/lots/:id/respond", auth(["RECYCLER","ADMIN"]), (req:any,res) => {
  const lot:any=db.lots.find((x:any)=>x.lotId===req.params.id||x.id===req.params.id);
  if(!lot)return fail(res,404,"LOT_NOT_FOUND","Lot not found");
  const parsed=z.object({action:z.enum(["ACCEPT","REJECT","COUNTER"]),quotedPrice:z.coerce.number().positive().optional(),pickupAvailable:z.boolean().default(false),notes:z.string().max(300).optional(),rejectionReason:z.string().optional()}).safeParse(req.body);
  if(!parsed.success)return fail(res,400,"VALIDATION_ERROR",parsed.error.issues[0].message);
  if(parsed.data.action!=="REJECT"&&!parsed.data.quotedPrice)return fail(res,400,"PRICE_REQUIRED","A rate is required");
  if(parsed.data.action==="REJECT"&&!parsed.data.rejectionReason)return fail(res,400,"REASON_REQUIRED","Select a rejection reason");
  const q:any={id:crypto.randomUUID(),lotId:lot.lotId,recyclerId:req.user.recyclerId||"r1",offerPrice:parsed.data.quotedPrice,pickupAvailable:parsed.data.pickupAvailable,notes:parsed.data.notes,rejectionReason:parsed.data.rejectionReason,status:parsed.data.action==="REJECT"?"REJECTED":parsed.data.action==="ACCEPT"?"ACCEPTED":"COUNTERED",createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+48*3600000).toISOString()};
  db.quotes.push(q);lot.status=parsed.data.action==="ACCEPT"?"ACCEPTED":"REQUESTED";if(parsed.data.action==="ACCEPT"){lot.recyclerId=q.recyclerId;lot.quotedPrice=q.offerPrice;}
  notify(lot.collectorId,"Recycler response",`${lot.lotId}: ${q.status}`,"QUOTE",`/collector/lots/${lot.lotId}`);audit(req.user.id,req.user.role,`LOT_${q.status}`,"Lot",lot.lotId,q);return ok(res,q,201);
});
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
    verifiedCondition: req.body.verifiedCondition || lot.condition,
    finalPrice: Number(req.body.finalPrice || ((lot.quotedPrice || estimatePrice(lot.materialCategory).average) * Number(req.body.weightAtHandover))),
    photograph: req.body.photograph || lot.photoUrl,
    location: req.body.location || lot.location,
    scheduledAt: req.body.scheduledAt || null,
    method: req.body.method || lot.preferredHandover || "PICKUP",
    otpVerified: true,
    collectorConfirmation: true,
    recyclerConfirmation: true,
    status: "VERIFIED",
    timestamp: new Date().toISOString(),
    discrepancy: d,
  };
  db.handovers.push(h);
  lot.status = "VERIFIED";
  lot.finalWeight = h.weightAtHandover;
  lot.finalPrice = h.finalPrice;
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
    status: req.body.status || "PAID",
    transactionReference: req.body.transactionReference,
    paidAt: new Date().toISOString(),
  };
  db.payments.unshift(p);
  if(p.status === "PAID") lot.status = "COMPLETED";
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
app.get("/api/receipts/:lotId", auth(), (req:any,res) => {
  const lot:any=db.lots.find((x:any)=>x.lotId===req.params.lotId);
  if(!lot)return fail(res,404,"LOT_NOT_FOUND","Lot not found");
  const handover:any=db.handovers.find((x:any)=>x.lotId===lot.lotId);const payment:any=db.payments.find((x:any)=>x.lotId===lot.lotId);const recycler:any=db.recyclers.find((x:any)=>x.id===lot.recyclerId);
  return ok(res,{receiptId:`RCP-${lot.lotId}`,lotId:lot.lotId,material:`${lot.materialCategory} — ${lot.materialSubcategory||""}`,collectorId:lot.collectorId,recycler:recycler?.name||"Pending",handoverReference:handover?.handoverId,verifiedWeight:handover?.weightAtHandover,finalPrice:handover?.finalPrice,paymentMethod:payment?.method,paymentStatus:payment?.status,date:payment?.paidAt||handover?.timestamp,prototypeNotice:"Prototype receipt — not a tax invoice"});
});
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
    handover: ["HANDED_OVER", "VERIFIED", "COMPLETED"].includes(
      l.status,
    ),
    payment: l.status === "COMPLETED",
    recycling: l.status === "COMPLETED",
    status: l.status,
  });
});
app.get("/api/dashboard/:role", auth(), (req: any, res) => {
  const gmv = db.payments.reduce((s, p) => s + p.amount, 0);
  ok(res, {
    lots: db.lots.length,
    active: db.lots.filter(
      (x) => !["COMPLETED", "CANCELLED"].includes(x.status),
    ).length,
    paid: db.payments.length,
    gmv,
    materialKg: Math.round(db.lots.reduce((s, x) => s + x.approxWeight, 0)),
    verifiedRecyclers: db.recyclers.filter((x) => x.status === "AUTHORIZED")
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
app.post("/api/marketplace/demo-buyers",auth(["CUSTOMER"]),(req:any,res)=>{
  if(process.env.ENABLE_DEMO === "false")return fail(res,403,"DEMO_DISABLED","Demo data is disabled");
  const parsed=pin.safeParse(req.body.pincode);
  if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Enter a valid six-digit pincode");
  addDemoBuyers(db.users,parsed.data);
  audit(req.user.id,req.user.role,"DEMO_BUYERS_ENABLED","Pincode",parsed.data);
  ok(res,{enabled:true});
});
app.post("/api/marketplace/demo-orders",auth(["RECYCLER"]),(req:any,res)=>{
  if(process.env.ENABLE_DEMO==="false")return fail(res,403,"DEMO_DISABLED","Demo data is disabled");
  const samples=[{name:"Demo copper cables",category:"Cable",weight:3,price:660},{name:"Demo old laptop",category:"Laptop",weight:2,price:480},{name:"Demo household motor",category:"Motor",weight:4,price:760}];
  let created=0;
  samples.forEach((sample,i)=>{
    const orderId=`DEMO-${req.user.id}-${i+1}`;
    if(db.orders.some(o=>o.orderId===orderId))return;
    db.orders.push({id:crypto.randomUUID(),orderId,customerId:"u-customer",selectedRecyclerId:req.user.id,source:"LOCAL_DEMO_ORDER",seededDemoData:true,items:[{name:sample.name,category:sample.category,estimatedWeight:sample.weight,quantity:1,condition:"USED"}],address:"Demo pickup address, Kothrud, Pune",pincode:"411038",latitude:18.5074,longitude:73.8077,selectedOffer:{recyclerId:req.user.id,name:req.user.name,total:sample.price},aiEstimatedValue:sample.price,priceRange:{low:Math.round(sample.price*.85),high:Math.round(sample.price*1.15)},status:"AWAITING_RECYCLER",createdAt:new Date().toISOString()});
    created++;
  });
  if(created)audit(req.user.id,req.user.role,"DEMO_ORDERS_CREATED","User",req.user.id,{created});
  ok(res,{created});
});
const chatAccess=(req:any,res:any,next:any)=>{
  const order=db.orders.find(o=>o.orderId===req.params.id);
  if(!order)return fail(res,404,"NOT_FOUND","Order not found");
  const recyclerId=order.recyclerId||order.selectedRecyclerId;
  if(!(req.user.role==="CUSTOMER"&&order.customerId===req.user.id)&&!(req.user.role==="RECYCLER"&&recyclerId===req.user.id))return fail(res,403,"FORBIDDEN","Only the customer and selected recycler can access this chat");
  req.order=order;req.chatRecyclerId=recyclerId;next();
};
app.get("/api/marketplace/orders/:id/messages",auth(["CUSTOMER","RECYCLER"]),chatAccess,(req:any,res)=>ok(res,req.order.messages||[]));
app.post("/api/marketplace/orders/:id/messages",auth(["CUSTOMER","RECYCLER"]),chatAccess,(req:any,res)=>{
  const parsed=z.object({text:z.string().trim().min(1).max(1000),clientId:z.string().uuid()}).safeParse(req.body);
  if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Message must contain 1–1000 characters and a valid request ID");
  const messages=req.order.messages??=[];
  const existing=messages.find((m:any)=>m.clientId===parsed.data.clientId&&m.senderId===req.user.id);
  if(existing)return ok(res,existing);
  const message={id:crypto.randomUUID(),...parsed.data,senderId:req.user.id,senderName:db.users.find(u=>u.id===req.user.id)?.name,createdAt:new Date().toISOString()};
  messages.push(message);
  notify(req.user.role==="CUSTOMER"?req.chatRecyclerId:req.order.customerId,"New order message",`New message for ${req.order.orderId}`,"ORDER",req.user.role==="CUSTOMER"?"/recycler/orders":"/customer/orders");
  audit(req.user.id,req.user.role,"ORDER_MESSAGE_SENT","Order",req.order.orderId);
  ok(res,message,201);
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
      pincode: pin,
      selectedRecyclerId: z.string().min(1),
      expectedTotal: z.number().positive(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      couponCode: z.string().optional(),
    })
    .safeParse(req.body);
  if (!s.success)
    return fail(res, 400, "VALIDATION_ERROR", s.error.issues[0].message);
  const chosen=localOffers(db.users,s.data.pincode,s.data.items).find(o=>o.recyclerId===s.data.selectedRecyclerId);
  if(!chosen)return fail(res,409,"OFFER_UNAVAILABLE","This recycler no longer serves your pincode or all selected materials. Compare again.");
  if(chosen.total!==s.data.expectedTotal)return fail(res,409,"RATE_CHANGED","The recycler updated their rates. Compare again before placing your order.");
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
    pincode:s.data.pincode,
    selectedRecyclerId:chosen.recyclerId,
    selectedOffer:chosen,
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
    .filter((u: any) => u.id===chosen.recyclerId && u.role === "RECYCLER" && u.status === "APPROVED")
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
            (o.status === "AWAITING_RECYCLER" && (!o.selectedRecyclerId || o.selectedRecyclerId===req.user.id)) || o.recyclerId === req.user.id,
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
          customerName: db.users.find((u:any)=>u.id===o.customerId)?.name || "Customer",
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
    if(order.selectedRecyclerId && order.selectedRecyclerId!==req.user.id)return fail(res,403,"FORBIDDEN","This order is assigned to another recycler");
    const amount = Math.max(
      1,
      Number(order.selectedOffer?.total || req.body.amount || order.aiEstimatedValue),
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
