# KabadiSetu

Offline-tolerant, multilingual e-waste lot and authorized-recycler connection
prototype for Ministry of Mines/JNARDDC Problem Statement 26229.

The collector-first journey is:

```text
Photo -> Material -> Weight -> Local price -> Authorized recycler -> Offer
-> Verified handover -> Payment record -> Digital receipt -> Earnings
```

This reconstruction is **local only**. Nothing is pushed or deployed unless a
future user request explicitly authorizes it.

## Read before development

- [Development contract](./AGENTS.md)
- [Frozen product scope](./docs/PRODUCT_REQUIREMENTS.md)
- [Canonical flows](./docs/USER_FLOWS.md)
- [Architecture decisions](./docs/ARCHITECTURE_DECISIONS.md)
- [Data model](./docs/DATA_MODEL.md)
- [Test plan](./docs/TEST_PLAN.md)
- [Implementation status](./docs/IMPLEMENTATION_STATUS.md)

## Run locally

Requires Node.js 20+ and npm 10+.

```bash
npm install
npm run seed
npm run dev
```

Open `http://localhost:5173`. API health is at `http://localhost:4000/api/health`.

## Local demo identities

| Role | Login | Prototype secret |
|---|---|---|
| Collector | `6666666666` | OTP `654321` |
| Aggregator | `aggregator@kabadi.local` | `Demo123!` |
| Recycler | `9876543211` | OTP `123456` |
| Admin | `admin@kabadi.local` | `Demo123!` |
| Data operator | `data@kabadi.local` | `Demo123!` |

All authentication, authorization records, recyclers, prices and payments are
prototype fixtures. No real SMS, government registry query or payment occurs.

## Quality gates

```bash
npm run typecheck
npm test
npm run build
```

The suite covers pricing, matching, validation, role boundaries, offline
idempotency and collector -> recycler -> handover -> payment -> traceability.

## Prototype stack

React/TypeScript PWA, IndexedDB/Dexie offline queue and Express/TypeScript API.
The web local database substitutes for the PRD's SQLite mobile layer. See the
architecture decision record before changing frameworks.

