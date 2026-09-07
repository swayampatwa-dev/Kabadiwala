# Data model

Core entities are User, CollectorProfile, RecyclerProfile, Material, PriceRecord, Lot, Quote, Transaction, Handover, Payment, SafetyGuide, Anomaly, SyncOperation, AuditLog, BusinessConfig and Subscription.

A production Mongo implementation should index `lotId` uniquely, plus `collectorId`, `recyclerId`, `materialCategory`, coarse `location`, `createdAt` and `status`. SyncOperation needs a unique `clientOperationId`; Payment needs a unique transaction reference. Precise collection coordinates must remain protected and public passport projections must be allow-list based.

The checked-in prototype repository is deterministic in-process data so the full demo runs without external infrastructure. `docker-compose.yml` provides MongoDB for the persistence adapter upgrade.
