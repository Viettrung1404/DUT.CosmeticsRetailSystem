# Recommendation tracking reliability

Apply `20261126150000_recommendation_tracking_receipts` before starting the updated backend:

```powershell
cd backend
npx prisma migrate deploy
```

Web and Mobile generate one UUID `batchId` for each tracking payload. A failed
payload keeps its ID, events and impressions until retry succeeds. The Worker
preserves that ID through the queue. Legacy event batches without an ID use a
fingerprint of the anonymous ID and event IDs; impression-only batches require
an explicit ID because identical impressions from separate visits are distinct.

Event inserts, impression receipts and daily funnel metrics commit in a single
PostgreSQL transaction. Only newly inserted `SEARCH_CLICK`, `ADD_TO_CART` and
`PURCHASE` events affect funnel counters. The cleanup job removes old receipts
with the same retention window as behavior events.

COD checkout, POS sales and confirmed online payments write a
`RECOMMENDATION_PURCHASE` outbox record inside their business transaction. The
existing outbox relay processes these records locally and awaits the tracking
listener before marking them published. Failures stay pending for the next
relay sweep; `OUTBOX_RELAY_ENABLED` must be enabled. The in-memory event remains
a low-latency path, and deterministic purchase event IDs make both paths safe
to replay. This does not require an additional Cloudflare queue.

Serving applies customer avoided tags after blending candidate sources and
refills recommendations after live inventory filtering. Best-seller and
same-category fallback queries enforce stock eligibility before applying LIMIT.

Regression tests cover duplicate and overlapping batches, impression-only
retries, metric-write rollback, purchase outbox retry, poison-message isolation,
ingredient filtering across sources, and fallback when precomputed items sell
out. Tests using the in-memory transaction fixture are unit tests; they do not
replace verification on an isolated PostgreSQL instance.
