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
| Household user | user@kabadi.local | Demo123! |
| Collector | collector@kabadi.local | Demo123! |
| Recycler | recycler@kabadi.local | Demo123! |
| Admin | admin@kabadi.local | Demo123! |

Demo OTP is `123456`. This is visibly marked as prototype authentication.

Separate entry URLs: `/user-login`, `/collector-login`, `/recycler-login`, and `/admin/login`. New collector/recycler registrations remain pending until approved in `/admin/approvals`.

## Commands

- `npm run dev` — start web and API
- `npm run seed` — reset deterministic seed data
- `npm test` — critical domain and API tests
- `npm run typecheck` — strict TypeScript checks
- `npm run build` — production builds

## Features

- Household user: multi-item photo cart, private AI price range, coupon, pickup order, anonymous collector offers, accept/reject/rebroadcast, verified-weight revision and final payout confirmation.
- Collector: approved-only household pickup marketplace, price offers, address reveal after acceptance, scale-weight verification, on-device TensorFlow.js/MobileNet scan, GPS, offline sync and notifications.
- Recycler: incoming lots, real quotes, capacity-aware nearest-neighbour pickup route optimization, OTP handover, weight discrepancy flags, notification events and local payment recording.
- Admin: collector/recycler approval, marketplace order oversight, commission/delivery-charge controls, coupon creation, formalization dashboard, anomalies, datasets, audit log and business metrics.
- Platform: role-checked JWT API, structured errors, validation, rate limiting, idempotent client operations, status machine, PWA shell and CSV-ready structured endpoints.

## Environment

Copy `.env.example` to `.env`. Do not use the demo JWT secret in production. Business thresholds are configured by environment variables now; a production admin configuration persistence layer is the next adapter.

## Offline demo

Sign in as collector, use the connectivity button to enable **OFFLINE DEMO MODE**, create a lot, and reload. The draft and queued mutation remain in IndexedDB. Turn online mode back on and click sync; the server processes the unique `clientOperationId` only once.

## AI demo

Photos are compressed locally and TensorFlow.js MobileNet runs on-device. Its visual evidence is mapped into supported e-waste classes; the deterministic API provider remains a fallback. Predictions are advisory and no measured field accuracy is claimed.

## Tests and known limitations

The test suite covers pricing, matching, price anomalies, weight discrepancies, authenticated lot creation, notifications, capacity-aware pickup pooling and traceability. MongoDB is primary when `MONGODB_URI` is configured; PostgreSQL remains a deployment-safe fallback. Real authorization registry verification, object storage, payments, custom field-trained e-waste ML, production OTP, background Web Push and Playwright browser automation remain production upgrades.

See [architecture](./ARCHITECTURE.md), [API](./API.md), [database](./DATABASE.md), [AI](./AI.md), [offline design](./OFFLINE.md), [business model](./BUSINESS_MODEL.md), and [demo script](./DEMO.md).
