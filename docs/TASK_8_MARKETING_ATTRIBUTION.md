# TASK 8 — Marketing Attribution & Analytics

## Scope and decisions

TASK 8 adds a typed, provider-independent tracking boundary for the public funnel. It does not add a marketing dashboard, financial metrics, a database event stream, a tag manager, or Production trackers.

Public behavioral events remain ephemeral in this version. Critical business events continue to be written exactly once through their existing database paths: `lead_created`, `bill_uploaded`, `whatsapp_opened`, `igreen_handoff_opened`, and `status_changed`. In particular, `page_view` is not persisted in PostgreSQL.

## Event contract

Every public event has:

- `eventName`: one of the eight approved public funnel names;
- `eventId`: a new unpredictable UUID for that occurrence;
- `occurredAt`: an ISO timestamp;
- `sessionId`: the opaque first-party journey identifier;
- `attribution`: the preserved first-touch attribution;
- `context`: a small, event-specific object without PII.

The same immutable event object and `eventId` are delivered to every provider. This is the browser/server deduplication boundary for a future Meta Conversions API implementation. CAPI transport is intentionally deferred: there is no approved hashed-PII rule or external TEST credential in this task.

The event distinctions remain explicit. A submitted lead is not qualified; an uploaded bill is not qualified; opening WhatsApp is not a completed contact; opening the iGreen handoff does not change commercial status; and no technical event represents a contract or activation.

## First-touch attribution and journey

The landing captures `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `referrer`, and `landing_page`. Values are trimmed and UTMs are limited to 200 characters. Landing/referrer values are limited to 2,048 characters. Unknown query parameters and URL fragments are removed, and referrer query parameters are not retained. Values are treated only as strings and are never rendered as HTML or executed.

Attribution is stored under a versioned key in `sessionStorage`, so internal navigation cannot silently overwrite first-touch. The same captured object is sent in the existing lead submission and therefore persists in the existing lead columns. Last-touch is deliberately deferred to avoid ambiguous multi-touch semantics in this MVP.

The journey ID is a random UUID stored in `sessionStorage`. It lasts for the browser tab/session, is scoped to the first-party origin, is not sent to third parties while providers are disabled, and uses no cookie, IP address, fingerprint, device property, name, phone, or lead identifier. `sessionStorage` was preferred to a cookie because this journey needs no cross-session or cross-site correlation.

## Providers and configuration

Meta Pixel and GA4 are represented by small adapters behind the central interface. Their IDs are runtime configuration only; no ID is hardcoded.

Environment variables:

- `ANALYTICS_ENVIRONMENT`: `local`, `test`, `preview`, or `production`;
- `META_PIXEL_ENABLED` and `META_PIXEL_ID`;
- `GA_ENABLED` and `GA_MEASUREMENT_ID`.

Missing enable flags safely mean `false`. Even a requested provider is forced off outside `test`/`preview`, and its ID is discarded in `production`. No external script is installed by TASK 8.

Approved Meta mapping:

- `page_view` → `PageView`;
- `lead_submitted` → `CompleteRegistration`.

Approved GA4 mapping:

- `qualification_started`;
- `qualification_completed`;
- `lead_submitted`;
- `bill_uploaded`.

There is no `Purchase`, revenue, value, commission, inferred contract, or inferred activation event.

## Consent and privacy

Contact consent is not analytics or advertising consent. TASK 8 does not invent either consent and does not add a generic banner without an approved policy. The application currently passes no analytics/ad consent, so Meta and GA adapters do not initialize and no non-essential external script or event is sent.

The local first-party journey state is limited to essential funnel continuity and attribution persistence. Provider payloads exclude name, phone, WhatsApp, lead/document IDs, filename, bill contents, social-benefit response, account-holder response, and unit data. Server logs continue to exclude those fields and all secrets.

## Admin and operations

The existing lead detail already displays all seven persisted origin fields, so no dashboard or schema change was required. Operators can see source, medium, campaign, content, term, referrer, and landing page next to the lead while the commercial timeline remains separate.

## TEST validation

The local/TEST smoke uses synthetic UTMs, a technical lead, and a synthetic PDF. It verifies persisted first-touch attribution, a private Storage object, one `lead_created`, and one `bill_uploaded`. Meta and GA remain off. Cleanup removes the Storage object first and then only the synthetic lead's document metadata, events, and lead row; the final residue query must return zero in all four categories.
