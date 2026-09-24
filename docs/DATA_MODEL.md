# Canonical Data Model

All mutable records include `createdAt`, `updatedAt`, `source`, and
`validationStatus`.

## Core entities

- User: id, role, phone, preferredLanguage, status.
- CollectorProfile: userId, displayName, generalOperatingLocation,
  optionalProfilePhoto.
- Recycler: id, name, facilityLocation, authorizationNumber,
  authorizationStatus, contact, materialsAccepted, serviceArea,
  pickupAvailable, demoVerificationNotice.
- Material: id, category, subcategory, names by language, safetyLevel,
  visualAsset, description by language.
- PriceRecord: id, materialId, location, effectiveDate, minRate, maxRate,
  unit, offeredBy, source.
- MaterialLot: id, collectorId, category, subcategory, description, localPhotoId,
  photoUrl, approximateWeightKg, condition, sourceType, collectionLocation,
  capturedAt, status, syncStatus.
- RecyclerRequest: id, lotId, recyclerId, preferredHandover, status, sentAt.
- Offer: id, requestId, recyclerId, quotedRate, unit, pickupAvailable, notes,
  status, rejectionReason, expiresAt.
- Handover: id, lotId, method, scheduledAt, location, photograph,
  verifiedWeightKg, verifiedCondition, finalPrice, reference, status.
- Payment: id, lotId, amount, method, status, recordedAt, reference.
- Receipt: id, lotId, handoverId, paymentId, generatedAt.
- TraceEvent: id, lotId, type, actorId, occurredAt, publicDetails.
- SafetyContent: id, materialId, language, title, body, audioAsset, active.
- Notification: id, userId, messageKey, parameters, readAt.
- SyncOperation: idempotencyKey, entity, action, payload, state, attempts,
  lastError.
- AuditEvent: actorId, actorRole, action, entity, entityId, timestamp,
  previousValue, newValue.

## Privacy rule

Public recycler matching uses only a general area. Exact coordinates are
available only to the collector and selected recycler after acceptance.

