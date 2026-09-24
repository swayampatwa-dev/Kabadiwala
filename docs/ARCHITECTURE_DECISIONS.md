# Architecture Decisions

## Prototype stack

The supplied PRD proposes Flutter/FastAPI/SQLite/PostgreSQL. This repository
keeps its existing React/TypeScript PWA and Express/TypeScript API so the local
prototype can be completed safely without a platform rewrite. IndexedDB is the
web equivalent of the PRD's device-local SQLite layer. PostgreSQL-compatible
persistence remains the server-side target.

This is an implementation substitution, not a product-scope substitution.

## Boundaries

- `frontend`: mobile-first PWA, translations, local database and sync engine.
- `backend`: modular monolith for auth, profiles, materials, prices, lots,
  recycler requests/offers, handovers, payments, receipts and administration.
- local persistence adapter: deterministic development state; production
  adapters must remain replaceable.
- AI: advisory provider behind typed interfaces; deterministic demo fallback.

## Principles

- One canonical domain model; no parallel household-order model.
- API authorization is enforced server-side, never only hidden in UI.
- Dates are ISO-8601 and money uses integer INR paise where precision matters.
- Mutations are idempotent where offline retries are possible.
- Structured errors use `{ error: { code, message, details? } }`.
- Exact locations are treated as transaction-private data.
- Seed records are marked as demo data and are never presented as verified
  government registry results.

## Local-only deployment policy

No changes are pushed or deployed during this reconstruction. `render.yaml`
and Vercel configuration are historical infrastructure only and must not be
invoked without a new explicit user instruction.

