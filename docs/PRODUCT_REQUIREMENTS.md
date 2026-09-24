# KabadiSetu Product Requirements

Status: **frozen MVP contract**  
Source: user-supplied Kabadiwala Connect PRD, Problem Statement 26229  
Deployment policy: **local only**

## Product definition

KabadiSetu is a vernacular, offline-tolerant e-waste platform that helps an
informal collector create a digital material lot, understand a local price
range, find an authorized recycler, complete a documented handover, record
payment, and maintain earnings history.

The app is not a household resale marketplace. The collector is the primary
user and `MaterialLot` is the primary domain object.

## Required roles

- Collector: creates and owns lots, compares prices and offers, schedules
  handover, records payment, views receipts and earnings.
- Aggregator: collector capabilities plus management of multiple lots and
  larger-volume handovers.
- Recycler: sees eligible requests, quotes, accepts/rejects/counter-offers,
  schedules and verifies handover, records final weight/condition/price.
- Admin: manages recyclers, collectors, materials, prices, transactions,
  safety content and platform monitoring.
- Data operator: manages validated datasets and price records without full
  platform administration.

## P0 workflow

1. Select Hindi, Marathi, or English.
2. Select role and complete minimal profile.
3. Collector photographs material; compressed image is saved locally.
4. AI may suggest category/confidence/alternatives; collector confirms or
   overrides it.
5. Collector selects category/subcategory, condition and source type.
6. Collector enters approximate weight and captures privacy-aware GPS.
7. App shows current local rate, source/date, history and estimated range.
8. App ranks authorized compatible recyclers and explains every match.
9. Collector sends lot request with pickup/drop-off/agreed-location choice.
10. Recycler quotes, accepts, rejects with reason, or counter-offers.
11. Parties schedule handover. Status follows the canonical state model.
12. Recycler verifies photograph, final weight, condition and final price.
13. Cash/UPI/bank/other payment is recorded; partial/pending is supported.
14. App generates a digital handover/payment receipt and traceability timeline.
15. Collector earnings update.
16. The collector lot-creation path also works offline and auto-syncs later.

## Mandatory UX

- Mobile-first, icon-first, high contrast, large touch targets and simple copy.
- Complete English, Hindi and Marathi localization.
- Optional spoken guidance in the selected language.
- Visible loading, empty, error and offline states; never a blank screen.
- Exact collector location is only shown to the selected transaction party.
- AI failure never blocks manual use.

## Required material categories

CRT, LCD, PCB, Cable, Battery, Motor, Magnet-bearing assembly and Mixed
plastics. Categories have visual cards and structured subcategories.

## Canonical statuses

- Lot: DRAFT, CREATED, MATCHED, REQUESTED, ACCEPTED, SCHEDULED, IN_TRANSIT,
  HANDED_OVER, VERIFIED, COMPLETED, CANCELLED.
- Payment: PENDING, PARTIAL, PAID, FAILED.
- Recycler: PENDING_VERIFICATION, AUTHORIZED, SUSPENDED, EXPIRED.
- Sync: LOCAL_ONLY, SYNC_PENDING, SYNCING, SYNCED, SYNC_FAILED.

## Demo data targets

- 20-50 material/subcategory records.
- 100+ dated, sourced and location-specific price records.
- 5-10 explicitly demo authorized recyclers.
- 30-100 demo transactions and 5-10 demo collectors.
- Category-specific sample images where licensing allows.

Every dataset record carries `created_at`, `updated_at`, `source` and
`validation_status`. Price records additionally carry effective date,
location and unit.

## Explicit non-goals

Full banking, cryptocurrency, blockchain, ERP, social networking, a household
shopping marketplace, complex route optimization, autonomous AI pricing,
nationwide automated onboarding and IoT devices.

## Acceptance criterion

A judge can complete photo -> material -> weight -> price -> recycler -> lot
request -> offer -> handover -> final price -> cash payment -> receipt ->
earnings, then create another lot offline and see it synchronize on reconnect.

