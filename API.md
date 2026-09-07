# REST API

All responses use `{ success, data }` or `{ success: false, error: { code, message } }`. Protected endpoints require `Authorization: Bearer <JWT>`.

- `POST /api/auth/login`, `POST /api/auth/verify-otp`
- `GET /api/materials`, `GET /api/prices`, `POST /api/prices/estimate`
- `POST /api/ai/classify`
- `GET|POST /api/lots`, `GET|PATCH /api/lots/:id`
- `GET|POST /api/lots/:id/quotes`, `POST /api/quotes/:id/accept`
- `GET /api/recyclers`, `POST /api/recyclers/:id/verify`
- `POST /api/handover`, `GET|POST /api/payments`
- `GET|POST /api/anomalies[/check]`
- `GET /api/traceability/:lotId`
- `GET /api/dashboard/:role`, `GET /api/business/metrics`, `GET /api/audit`
- `POST /api/sync`

Status transitions are validated server-side. Payment amount cannot exceed calculated final sale value, and transaction references are idempotent.
