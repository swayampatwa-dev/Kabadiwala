# Offline architecture

Dexie stores drafts, reference cache and a mutation queue. Every mutation has a UUID `clientOperationId`. Offline lot creation writes both draft and queue before navigating away. `/api/sync` recognizes already processed IDs and returns `DUPLICATE` without executing again.

The PWA service worker caches the application shell. Production should add image blob compression, retry backoff, server-version conflict metadata, a last-write-wins policy for ordinary drafts, explicit conflict review for money/status fields and Background Sync where supported.
