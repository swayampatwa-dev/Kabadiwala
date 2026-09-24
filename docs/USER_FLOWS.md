# Canonical User Flows

## Collector / aggregator

Onboarding -> dashboard -> create lot -> capture/preview/retake photo -> AI
suggestion or manual category -> details -> weight -> GPS -> price and history
-> recycler comparison -> request -> offers -> accept offer -> schedule ->
handover -> payment -> receipt -> earnings.

Dashboard prioritizes five actions: Sell Material, Check Prices, Find Recycler,
My Earnings and Safety. It also shows pending lots, pending payments, recent
transactions and offline sync status.

## Recycler

Login -> dashboard queues -> open request -> inspect photograph/material/
weight/general location/estimate -> quote or reject/counter -> schedule ->
confirm receipt -> enter verified weight/condition/final price -> record
payment -> complete transaction.

Recycler cannot see exact collection coordinates before it becomes the chosen
party for an accepted transaction.

## Admin

Login -> dashboard -> manage collectors and recycler authorization -> manage
material taxonomy -> manage dated local prices -> monitor transactions -> edit
safety guidance -> inspect datasets and validation status -> review anomalies
and audit events.

## Data operator

Login -> datasets -> inspect/import/edit prices and material records -> validate
or reject records -> export structured data. No user-approval or global-admin
permissions.

## Offline collector flow

When offline, required reference data is read from local cache. New lot data,
GPS and compressed photo are stored locally with LOCAL_ONLY/SYNC_PENDING state.
On reconnect, sync starts automatically, uses an idempotency key, uploads the
photo, creates/updates the lot and reports success or a recoverable error.

## Lot transition rules

```text
DRAFT -> CREATED -> MATCHED -> REQUESTED -> ACCEPTED -> SCHEDULED
      -> IN_TRANSIT -> HANDED_OVER -> VERIFIED -> COMPLETED
```

Cancellation is allowed before verification with an audit reason. Payment may
be PENDING or PARTIAL while a verified lot waits for settlement; completion
requires a fully paid payment record or an explicit admin-approved exception.

