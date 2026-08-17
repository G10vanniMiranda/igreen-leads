# iGreen Leads — Privacy Data Map

This inventory describes the implementation as of TASK 9. It is an engineering record, not a legal classification or a declaration of LGPD compliance.

## Initial operational retention policy

These periods are operational product decisions, not claims of universal legal deadlines:

| Record | Initial operational retention |
| --- | --- |
| Leads without operational progress | 90 days after the last interaction |
| Bills and document metadata for leads without progress | 90 days after the last interaction |
| Bills and document metadata for completed or handed-off leads | 90 days after operational completion, unless a specific legitimate need requires retention |
| Operational events and audit trail | 12 months |
| `internal_notes` | The same retention period as the associated lead |

Valid deletion requests are evaluated operationally and executed when no legitimate reason for retention remains. The application does not yet automate these deletions; the approved procedure is documented in [`DATA_SUBJECT_REQUESTS.md`](DATA_SUBJECT_REQUESTS.md). The official initial privacy contact channel is `giovannimiranda09@gmail.com`.

## Lead and qualification data

| Data | Purpose | Origin | Storage | Access | Current sharing | Operational sensitivity and main risks |
| --- | --- | --- | --- | --- | --- | --- |
| Name and WhatsApp | Identify the request and contact the requester about the requested analysis | Visitor | `private.leads` in the isolated Supabase environment | Server-side service role and authenticated admin | Infrastructure providers; no automated marketing sharing | Direct identifiers; unauthorized access, misuse, logs, exports |
| Unit type, state, utility provider, bill range | Initial qualification and operational analysis | Visitor | `private.leads` | Server and admin | Infrastructure providers | Profiling/context risk if combined with identifiers |
| Account-holder and social-benefit answers | Determine whether manual review is needed | Visitor | `private.leads` | Server and admin | Infrastructure providers | Higher operational sensitivity; discrimination or excessive use |
| `consent_contact` and timestamp | Record that contact was requested for this service | Visitor action | `private.leads` | Server and admin | Infrastructure providers | Must not be reused as analytics/advertising consent |
| UTMs, referrer and landing page | Preserve first-touch acquisition context | Browser URL/referrer | Session storage and lead columns | Browser during journey; server/admin after submission | Infrastructure providers; external analytics only with separate consent/config | Query strings may contain unexpected data; implementation strips unknown query parameters and referrer queries |
| Created/updated timestamps, status and `internal_notes` | Operate and audit the lead workflow | System/admin | `private.leads` | Server and admin | Infrastructure providers | Notes may accidentally contain excessive PII; operator discipline required |

## Documents

| Data | Purpose | Origin | Storage | Access | Current sharing | Operational sensitivity and main risks |
| --- | --- | --- | --- | --- | --- | --- |
| Electricity bill | Support the requested analysis | Visitor upload | Private `lead-documents` Storage bucket | Server-side service role; admin via 120-second signed URL | Supabase infrastructure | May contain identifiers, address and consumption data; malware, link leakage, unauthorized access |
| Original filename | Validation and operational metadata | Visitor device | `private.lead_documents` | Server/admin | Infrastructure providers | Can contain PII; never logged or used in object path |
| MIME type, byte size, document status and timestamps | Validation, lifecycle and audit | File/system | `private.lead_documents` | Server/admin | Infrastructure providers | MIME spoofing and oversized/abusive uploads |
| Opaque object path | Private object lookup | System-generated UUIDs | Database and Storage | Server/admin only | Infrastructure providers | Signed URL leakage; path itself contains no filename or direct PII |

MALWARE SCANNING: NOT IMPLEMENTED. This is a known Production Readiness risk. The temporary 4 MiB (4,194,304-byte) limit is enforced server-side before Storage persistence; direct-to-Storage upload remains a future architectural decision.

## Tracking and preferences

| Data | Purpose | Origin | Storage | Access | Current sharing | Operational sensitivity and main risks |
| --- | --- | --- | --- | --- | --- | --- |
| Journey/session UUID | Correlate steps in one browser-tab journey without fingerprinting | Browser-generated random UUID | `sessionStorage` | Same-origin browser code | None while providers are off | Cross-context correlation if scope expands; current scope ends with the tab/session |
| Event UUID, timestamp, event name and minimal context | Truthful funnel measurement and future deduplication | Application | Ephemeral browser memory | Same-origin browser code/provider adapters | Meta/GA only if separately consented and TEST/Preview configured | Semantic inflation or accidental PII in context; typed allowlist and tests reduce risk |
| First-touch attribution | Maintain campaign origin through submission | URL/referrer | `sessionStorage`, then lead record | Browser/server/admin | As above | Unexpected query content; bounded allowlist used |
| Essential/analytics/advertising choices, version and timestamp | Apply and remember tracking preferences | Visitor | `localStorage` | Same-origin browser code | None | Preference integrity; contains no direct identifier |

Public behavioral events are not persisted in PostgreSQL. Critical business events remain in `private.lead_events` through the existing server-side workflows.

## Admin authentication

| Data | Purpose | Origin | Storage | Access | Current sharing | Operational sensitivity and main risks |
| --- | --- | --- | --- | --- | --- | --- |
| `ADMIN_PASSWORD` | Authenticate the single approved operator boundary | Server environment | Server-only environment variable | Server runtime | Hosting environment | Brute force, weak/reused password, accidental exposure |
| `ADMIN_SESSION_SECRET` | HMAC-sign the admin session | Server environment | Server-only environment variable | Server runtime | Hosting environment | Compromise permits session forgery; rotation invalidates sessions |
| Admin session cookie | Maintain an eight-hour authenticated session | Server-generated signed payload | Browser cookie (`HttpOnly`, `SameSite=Strict`, `Secure` on HTTPS) | Browser HTTP stack/server | Hosting transport only | Theft/replay until expiry; logout removes browser cookie but does not maintain a server revocation list |

No admin password is persisted in the database. No raw IP is stored or logged for analytics. The MVP abuse limiter derives an ephemeral keyed value in process memory solely for security.

## References used for the technical decisions

- [ANPD — Cookies e Proteção de Dados Pessoais](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf)
- [ANPD — Segurança da Informação para Agentes de Tratamento de Pequeno Porte](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-vf.pdf)
