# TASK 6 — Lead Operations Panel

## Security boundary

The `/admin` surface is an internal MVP, not a general CRM. A single strong
server-side `ADMIN_PASSWORD` authenticates the administrator. A separate
`ADMIN_SESSION_SECRET` signs an eight-hour stateless session stored in an
`httpOnly`, `SameSite=Strict` cookie. HTTPS responses also set `Secure`.

Every protected page verifies the session before reading lead data, so an
unauthenticated response never renders PII. Administrative POST endpoints
verify the session, require a same-origin request, and validate IDs and values
server-side. Responses use private no-store and noindex headers and errors are
generic. No lead payload is logged.

## Data access

The browser never receives the Supabase service-role credential and never
queries private tables. The flow is Browser → Next.js server → Supabase RPC.
RPC execution is revoked from `public`, `anon`, and `authenticated`, and granted
only to `service_role`. Existing private-table RLS and grants remain closed.

Status update and `status_changed` event insertion execute inside one Postgres
function/transaction. Event metadata contains only `from` and `to`.
`internal_notes` is nullable and limited to 2,000 characters in both the server
handler and database constraint.

The dashboard and list are server-rendered without public caching. List queries
use parameterized filters and 20-row server-side pages. Offset pagination is a
deliberate MVP trade-off for direct numbered pages; the composite sort and
filter indexes keep the current operational workload bounded. Cursor pagination
can replace it if volume makes deep pages material.

Name/phone search is submitted by POST. The redirect carries only a short-lived
AES-GCM encrypted search token, so names and phone numbers do not appear in URLs
or access logs. The decrypted value is used only server-side as an RPC parameter.

## Private bill access

The Storage bucket remains private. After authentication, the Next.js server
looks up the document path through a service-role-only RPC and requests a signed
Storage URL valid for 120 seconds. The URL is returned only as an immediate
redirect, is never stored, and the bucket is never made public.

## Required local secrets

- `ADMIN_PASSWORD`: strong random value with at least 12 characters.
- `ADMIN_SESSION_SECRET`: independent random value with at least 32 characters.

Both are server-only. They must never use a `NEXT_PUBLIC_` prefix and must not be
committed.
