# Architecture

The npm workspace contains a React/TypeScript Vite PWA and an Express/TypeScript API. UI domains are separated by role and consume only REST contracts. Domain functions implement deterministic pricing, recycler scoring, anomaly/discrepancy evaluation and lifecycle rules independently of UI or persistence.

```text
React PWA → REST API → domain services → repository adapter
     ↓                         ↓               ↓
IndexedDB queue          audit/status rules   local demo / MongoDB
```

Authentication uses signed server-side role claims. Collector mutations can enter Dexie with a UUID and later reach `/api/sync`; duplicate UUIDs are not executed twice. Public traceability emits a deliberately reduced view.

Production adapters: Mongo repositories, S3-compatible storage, verified authorization registry, SMS OTP, payment gateway, geospatial index, TFLite/ONNX inference and background sync worker.
