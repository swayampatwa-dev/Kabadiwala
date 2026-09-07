# Data model

The API selects persistence in this order: `MONGODB_URI` (MongoDB/Mongoose), `DATABASE_URL` (PostgreSQL fallback), then deterministic memory mode. Docker Compose provides MongoDB 7 locally at `mongodb://localhost:27017/chakrasetu`. The persisted state includes lots, quotes, payments, handovers, anomalies, audits, notifications and offline idempotency keys.

Core entities are User, CollectorProfile, RecyclerProfile, Material, PriceRecord, Lot, Quote, Transaction, Handover, Payment, SafetyGuide, Anomaly, SyncOperation, AuditLog, BusinessConfig and Subscription.

A production Mongo implementation should index `lotId` uniquely, plus `collectorId`, `recyclerId`, `materialCategory`, coarse `location`, `createdAt` and `status`. SyncOperation needs a unique `clientOperationId`; Payment needs a unique transaction reference. Precise collection coordinates must remain protected and public passport projections must be allow-list based.

The same application workflow remains available in memory when neither database variable is configured.
