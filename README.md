# KABADI+

**Sahi Daam. Sahi Recycler. Safe Recycling.**

KABADI+ is a local-first digital e-waste network connecting informal collectors with responsible recyclers through fair-price intelligence, AI-assisted classification, explainable matching, verified handovers, payment records and public-safe traceability.

## Run locally

Prerequisites: Node.js 20+, npm 10+. MongoDB 7 is optional for the current deterministic prototype adapter and available through Docker.

```bash
npm install
docker compose up -d
npm run seed
npm run dev
```

Open `http://localhost:5173`. API: `http://localhost:4000/api/health`.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Collector | collector@kabadi.local | Demo123! |
| Recycler | recycler@kabadi.local | Demo123! |
| Admin | admin@kabadi.local | Demo123! |

Demo OTP is `123456`. This is visibly marked as prototype authentication.

## Commands

- `npm run dev` — start web and API
- `npm run seed` — reset deterministic seed data
- `npm test` — critical domain and API tests
- `npm run typecheck` — strict TypeScript checks
- `npm run build` — production builds

## Features

- Collector: on-device TensorFlow.js/MobileNet assisted scan, consent-based live GPS with OpenStreetMap, fair pricing, guided lot creation, offline IndexedDB sync, live notification inbox, recycler matching, digital passport, earnings and multilingual safety.
- Recycler: incoming lots, real quotes, capacity-aware nearest-neighbour pickup route optimization, OTP handover, weight discrepancy flags, notification events and local payment recording.
- Admin: formalization dashboard, recycler review, anomalies, dataset health, audit log, business metrics and network flywheel.
- Platform: role-checked JWT API, structured errors, validation, rate limiting, idempotent client operations, status machine, PWA shell and CSV-ready structured endpoints.

## Environment

Copy `.env.example` to `.env`. Do not use the demo JWT secret in production. Business thresholds are configured by environment variables now; a production admin configuration persistence layer is the next adapter.

## Offline demo

Sign in as collector, use the connectivity button to enable **OFFLINE DEMO MODE**, create a lot, and reload. The draft and queued mutation remain in IndexedDB. Turn online mode back on and click sync; the server processes the unique `clientOperationId` only once.

## AI demo

Classification and pricing are deterministic local services. Filenames containing `battery`, `cable`, or `lcd` produce the respective class; other images produce PCB. Predictions are advisory and no measured model accuracy is claimed.

## Tests and known limitations

The test suite covers pricing, matching, price anomalies, weight discrepancies, authenticated lot creation, notifications, capacity-aware pickup pooling and traceability. MongoDB is primary when `MONGODB_URI` is configured; PostgreSQL remains a deployment-safe fallback. Real authorization registry verification, object storage, payments, custom field-trained e-waste ML, production OTP, background Web Push and Playwright browser automation remain production upgrades.

See [architecture](./ARCHITECTURE.md), [API](./API.md), [database](./DATABASE.md), [AI](./AI.md), [offline design](./OFFLINE.md), [business model](./BUSINESS_MODEL.md), and [demo script](./DEMO.md).
