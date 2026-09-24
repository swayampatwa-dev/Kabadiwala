# PRD Acceptance Test Plan

## Required end-to-end scenario

1. Choose Marathi; verify every visible collector screen is Marathi.
2. Choose Hindi; verify every visible collector screen is Hindi.
3. Choose English; verify there is no Hindi/Hinglish UI copy.
4. Complete collector onboarding and profile.
5. Create a 15 kg PCB lot with photo preview, retake, category override, GPS,
   condition and source type.
6. Verify local price source/date/history and estimated range.
7. Compare only compatible, demo-authorized recyclers and inspect match reasons.
8. Send request; recycler quotes, counter-offers, rejects another request and
   accepts the chosen one.
9. Schedule handover; verify exact location privacy.
10. Recycler records final weight, condition and price.
11. Record cash payment and open digital receipt/trace timeline.
12. Confirm collector earnings and pending amounts.
13. Go offline, create a second lot including photo/GPS, reload, reconnect and
    verify automatic idempotent sync.

## Admin acceptance

- Authorize/suspend recycler.
- Create/edit/deactivate material and price record.
- Inspect transaction and payment status.
- Create/edit multilingual safety content.
- Validate/reject a dataset record and view audit event.

## Regression gates

- Role boundary API tests.
- Lot/payment state transition tests.
- Price/weight validation tests.
- Exact-location privacy test.
- Offline retry/idempotency test.
- Complete translation-key test for en/hi/mr.
- Mobile widths 360, 390 and 430 px.
- No blank loading, empty or error screens.

