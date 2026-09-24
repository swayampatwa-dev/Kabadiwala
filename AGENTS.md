# KabadiSetu Development Contract

This repository implements the local hackathon prototype defined in
`docs/PRODUCT_REQUIREMENTS.md`. That document is the product source of truth.

## Non-negotiable scope

- Latest user override: support local-only labelled demo household recyclers
  and private order chat between the customer and selected recycler.

- Latest user override: restore the household user portal, user signup,
  item listing and order tracking, plus recycler user-order acceptance.

- Latest user override: the COLLECTOR workspace is a delivery partner panel
  showing assigned household pickup requests, active pickups and completed
  deliveries to recyclers. Its home has no lot-creation hero. This overrides
  the earlier collector-only lot scope and marketplace exclusion below.

- Latest user override: remove the standalone Prices page and all navigation
  shortcuts to it. Lot estimates and transaction pricing remain in scope.

- The primary user is an informal e-waste collector.
- The core object is a digital material lot.
- The primary journey is: photo -> material -> weight -> price -> authorized
  recycler -> quote -> handover -> verified weight/final price -> payment ->
  receipt -> earnings.
- Hindi and Marathi are mandatory. English is also supported. Every visible
  string must use the translation system; do not add hard-coded UI copy.
- Core collector work must remain usable while offline and synchronize later.
- Cash recording is mandatory. The app is not a payment processor.
- AI is advisory. Manual category selection must always remain available.
- Recycler authorization is demo data and must be labelled as such.
- Field-research findings must never be fabricated.

## Scope exclusions

Do not reintroduce the household shopping-cart marketplace, coupon codes,
delivery fees, platform commissions, food-delivery-style live tracking,
complex route optimization, blockchain, crypto, ERP, or social features into
the MVP. These are outside the PRD's core workflow.

## Local-only safety rule

User authorized publishing the current prototype to the existing GitHub,
Vercel and Render projects on 2026-09-24, including labelled demo buyers,
orders and chat. Preserve hosted data; do not seed/reset the database.
Demo fixtures are enabled by default for this prototype release and can be
disabled with ENABLE_DEMO=false (API) and VITE_ENABLE_DEMO=false (web).

Development, database changes, and testing are local only until the user
explicitly authorizes deployment in a future request. Do not run Vercel,
Render, GitHub push, release, or production database commands.

## Engineering rules

- Prefer one complete vertical workflow over disconnected screens.
- Preserve role-based access: COLLECTOR, AGGREGATOR, RECYCLER, ADMIN,
  DATA_OPERATOR.
- Every mutation needs validation, an error response, audit coverage for
  important actions, and an offline/idempotency decision.
- Every screen needs loading, empty, error, and narrow-mobile states.
- Use deterministic demo data and explicitly mark assumed/demo records.
- A feature is complete only when UI, API, persistence, authorization, error
  state, and an end-to-end testable path exist.
- Run `npm run typecheck`, `npm test`, and `npm run build` before handoff.

## Read-first map

1. `docs/PRODUCT_REQUIREMENTS.md` - frozen product contract and priorities.
2. `docs/USER_FLOWS.md` - expected role workflows and state transitions.
3. `docs/ARCHITECTURE_DECISIONS.md` - local prototype architecture.
4. `docs/DATA_MODEL.md` - canonical entities and required fields.
5. `docs/LOCAL_DEVELOPMENT.md` - safe local setup and demo accounts.
6. `docs/TEST_PLAN.md` - acceptance and regression checklist.
7. `docs/IMPLEMENTATION_STATUS.md` - current progress and known gaps.
