# iGreen Leads — Security Architecture and Known Risks

This is an engineering security review for TASK 9. It is not a certification, legal opinion, or guarantee of LGPD compliance.

## Trust boundaries

1. The public browser is untrusted. All lead and upload inputs are revalidated server-side.
2. Next.js Route Handlers are the public/server boundary. Mutating browser endpoints require same-origin requests and apply request-size and abuse controls.
3. Supabase TEST is reached only server-side with `SUPABASE_SERVICE_ROLE_KEY`. No service role, admin password or session secret is exposed through `NEXT_PUBLIC_*`.
4. Lead data and events live in the `private` schema with RLS enabled and privileges revoked from `public`, `anon` and `authenticated`. Approved RPCs are granted only to `service_role`.
5. Electricity bills live in a private Storage bucket. Admin access is a short-lived signed URL and responses are private/no-store.
6. Admin authorization uses an HMAC-signed, eight-hour, `HttpOnly`, `SameSite=Strict` cookie, marked `Secure` on HTTPS. Password comparison is constant-time after hashing.
7. Tracking providers are separate from essential first-party state and activate only after category consent plus TEST/Preview environment configuration.

## CSRF and same-origin

All state-changing routes—lead creation, bill upload, admin login/logout, status, notes, WhatsApp and iGreen actions—require an exact `Origin` match with the request URL. Admin mutations additionally require the valid admin cookie. External redirects use `Referrer-Policy: no-referrer` where lead context could otherwise be exposed.

## Abuse protection

Lead creation and upload allow five attempts per ten-minute window; admin login allows five per fifteen minutes. Keys are HMAC-derived from the edge-provided address using a random per-process salt. Raw addresses are neither stored nor logged and are never used for analytics.

The limiter is deliberately bounded and in-memory. It protects a local or single warm serverless instance, but it is not a distributed Production control. Before Production, select an approved shared limiter or platform WAF/rate-limit capability through a Human Gate, with cost, retention, trusted-proxy and failure-mode review. The current fallback groups requests without an available address and never fingerprints the device.

## Security headers and caching

Global headers include CSP, `nosniff`, `strict-origin-when-cross-origin`, `DENY`/`frame-ancestors 'none'`, and a restrictive Permissions Policy. HSTS and `upgrade-insecure-requests` require explicit `SECURITY_HTTPS_HEADERS_ENABLED=true`; they are not forced in local HTTP. Admin/API admin responses are `private, no-store` and `noindex, nofollow`; sensitive application handlers also set no-store.

The CSP allows only same-origin resources by default. Meta/GA origins are added at build time only when their provider is explicitly enabled with an ID in TEST/Preview. `unsafe-eval` is development-only. `unsafe-inline` remains for scripts/styles to preserve the current statically rendered Next.js application; replacing it with per-request nonces would force dynamic rendering and remove static/CDN benefits. A nonce or stable SRI strategy should be reassessed for Production.

## Upload controls

The application enforces one file, a 10 MB request/file limit, PDF/JPEG/PNG allowlist, matching extension and MIME, filename bounds/path traversal checks, magic bytes plus terminal markers, simple PDF/HTML polyglot rejection, opaque paths, private Storage and compensating cleanup. It does not publish object URLs.

MALWARE SCANNING: NOT IMPLEMENTED. Complex polyglots, malicious content inside otherwise valid documents and decompression/parser threats are residual Production risks. The 10 MB limit is reasonable for scanned bills but must be reconciled with final hosting limits and shared abuse controls.

## Logging and errors

Allowed operational logs contain event type, opaque submission/event identifiers, timestamp, duplicate/result and error class. Logs must not contain names, phones, filenames, bill bytes, signed URLs, cookies, passwords, service-role values or provider tokens. Public errors are generic and exclude SQL, Supabase responses, storage paths, internal function names and stack traces.

## Indexing

`INDEXING_ENABLED=false` is the safe default. It emits global noindex metadata/header and a robots disallow-all rule for local, TEST and Preview. When explicitly enabled, only public content may be indexed; `/admin` and `/api` remain disallowed/noindex.

## Production blockers and known risks

- Approved privacy contact channel and accountable process are absent.
- Retention/deletion policy and legal-role analysis, including the iGreen relationship, are undefined.
- Rate limiting is not distributed and needs an approved platform/shared control.
- Malware scanning is not implemented.
- Admin uses one shared secret, has no MFA, account lifecycle or server-side session revocation list.
- CSP retains `unsafe-inline`; a stricter Production strategy requires performance/hosting evaluation.
- Consent exists only in browser storage; there is no server evidence ledger, which may be required by the future legal design.
- Incident response, backups, recovery testing, secret rotation and monitoring ownership need operational approval.

No Production deployment is authorized by TASK 9.
