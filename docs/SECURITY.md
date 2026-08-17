# iGreen Leads — Security Architecture and Known Risks

This is an engineering security review for TASK 9. It is not a certification, legal opinion, or guarantee of LGPD compliance.

## Trust boundaries

1. The public browser is untrusted. All lead and upload inputs are revalidated server-side.
2. Next.js Route Handlers are the public/server boundary. Mutating browser endpoints require same-origin requests and apply request-size and abuse controls.
3. Each isolated Supabase environment is reached only server-side with its own `SUPABASE_SERVICE_ROLE_KEY`. No service role, admin password or session secret is exposed through `NEXT_PUBLIC_*`.
4. Lead data and events live in the `private` schema with RLS enabled and privileges revoked from `public`, `anon` and `authenticated`. Approved RPCs are granted only to `service_role`.
5. Electricity bills live in a private Storage bucket. Admin access is a short-lived signed URL and responses are private/no-store.
6. Admin authorization uses an HMAC-signed, eight-hour, `HttpOnly`, `SameSite=Strict` cookie, marked `Secure` on HTTPS. Password comparison is constant-time after hashing.
7. Tracking providers are separate from essential first-party state and activate only after category consent plus TEST/Preview environment configuration.

## CSRF and same-origin

All state-changing routes—lead creation, bill upload, admin login/logout, status, notes, WhatsApp and iGreen actions—require an exact `Origin` match with the request URL. Admin mutations additionally require the valid admin cookie. External redirects use `Referrer-Policy: no-referrer` where lead context could otherwise be exposed.

## Abuse protection

Lead creation and upload allow five attempts per ten-minute window; admin login allows five per fifteen minutes. Keys are HMAC-derived from the edge-provided address using a random per-process salt. Raw addresses are neither stored nor logged and are never used for analytics.

The limiter is deliberately bounded and in-memory. It protects a local or single warm serverless instance, but it is not a distributed Production control. Replacing it with an approved shared limiter or platform WAF/rate-limit capability is a post-launch priority that requires a Human Gate covering cost, retention, trusted-proxy and failure-mode review. The current fallback groups requests without an available address and never fingerprints the device.

## Security headers and caching

Global headers include CSP, `nosniff`, `strict-origin-when-cross-origin`, `DENY`/`frame-ancestors 'none'`, and a restrictive Permissions Policy. HSTS and `upgrade-insecure-requests` require explicit `SECURITY_HTTPS_HEADERS_ENABLED=true`; they are not forced in local HTTP. Admin/API admin responses are `private, no-store` and `noindex, nofollow`; sensitive application handlers also set no-store.

The CSP allows only same-origin resources by default. Meta/GA origins are added at build time only when their provider is explicitly enabled with an ID in an authorized environment. `unsafe-eval` is development-only. `unsafe-inline` remains for scripts/styles to preserve the current statically rendered Next.js application; replacing it with per-request nonces would force dynamic rendering and remove static/CDN benefits. A nonce or stable SRI strategy is a post-launch priority.

## Upload controls

The application enforces one file, a 4 MiB (4,194,304-byte) request/file limit, PDF/JPEG/PNG allowlist, matching extension and MIME, filename bounds/path traversal checks, magic bytes plus terminal markers, simple PDF/HTML polyglot rejection, opaque paths, private Storage and compensating cleanup. It does not publish object URLs.

MALWARE SCANNING: NOT IMPLEMENTED. Complex polyglots, malicious content inside otherwise valid documents and decompression/parser threats are residual Production risks. The temporary 4 MiB limit keeps uploads within the approved Vercel Function path; a future direct-to-Storage design is outside this release scope.

## Logging and errors

Allowed operational logs contain event type, opaque submission/event identifiers, timestamp, duplicate/result and error class. Logs must not contain names, phones, filenames, bill bytes, signed URLs, cookies, passwords, service-role values or provider tokens. Public errors are generic and exclude SQL, Supabase responses, storage paths, internal function names and stack traces.

## Indexing

`INDEXING_ENABLED=false` is the safe default. It emits global noindex metadata/header and a robots disallow-all rule for local, TEST and Preview. When explicitly enabled, only public content may be indexed; `/admin` and `/api` remain disallowed/noindex.

## Privacy and retention operations

The official initial privacy contact channel is `giovannimiranda09@gmail.com`. The initial operational retention matrix is defined in [`PRIVACY_DATA_MAP.md`](PRIVACY_DATA_MAP.md), and requests are handled through [`DATA_SUBJECT_REQUESTS.md`](DATA_SUBJECT_REQUESTS.md). Those periods are product operations decisions, not universal legal deadlines.

## Accepted temporary risks / post-launch priorities

The following items are **ACCEPTED TEMPORARY RISK / POST-LAUNCH PRIORITY**. They remain unresolved and must not be represented as completed controls:

- Rate limiting is bounded and in-memory rather than distributed.
- Malware scanning is not implemented.
- Admin authentication has no MFA.
- Admin sessions have no central revocation mechanism.
- CSP retains `unsafe-inline` for scripts and styles.
- Consent preferences have no server-side evidence ledger.

Backup/recovery and rollback operations are defined in [`PRODUCTION_OPERATIONS.md`](PRODUCTION_OPERATIONS.md). The operational owner must be designated and recorded outside the repository before the first scheduled backup is due. This document does not invent that person or any legal role.

## Supabase server credential compatibility

All five server-side Supabase access paths use one shared, typed header builder. Legacy `service_role` JWTs are sent as `apikey` and `Authorization: Bearer` for compatibility with the current TEST/Homologation configuration. Modern `sb_secret_...` credentials are sent exclusively as `apikey` and are never placed in `Authorization`.

The environment variable temporarily remains named `SUPABASE_SERVICE_ROLE_KEY` even when it holds a modern secret key. Renaming it to a neutral credential name is documented technical debt and is intentionally deferred to avoid expanding the pre-launch rotation scope. No key value is recorded here, and rotation still requires environment-specific homologation and a Human Gate.
