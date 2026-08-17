# TASK 5 — Secure electricity bill upload

## Architecture decision

The upload uses a Next.js Route Handler because multipart request boundaries,
HTTP status codes, request-size validation, and retry behavior are clearer and
easier to test there than in a component or a Server Action.

The browser sends only the file and the random `submissionId` created for the
lead flow. The server resolves that opaque identifier to the existing lead;
client-provided lead IDs are not accepted. The service-role credential remains
server-only.

The server validates filename length and traversal characters, size, MIME,
extension coherence, and the PDF/JPEG/PNG magic bytes. It generates
`<lead_id>/<document_id>.<ext>` so neither PII nor the original filename appears
in the Storage path. The original filename is retained only as private metadata.
The application accepts at most 4 MiB (4,194,304 bytes) per bill and enforces
that boundary again in the Route Handler before any Storage persistence.

## Storage/database consistency

Storage and PostgreSQL do not share an ACID transaction. The selected flow is:

1. validate and resolve the lead;
2. upload once to the private `lead-documents` bucket;
3. atomically insert `private.lead_documents` and `bill_uploaded` through an RPC;
4. remove the uploaded object through the Storage API if database registration
   fails or a concurrent request already registered the lead's bill.

The unique `(lead_id, document_type)` constraint allows one electricity bill per
lead in this MVP. A retry returns the existing document and does not upload or
emit another event.

The bucket has no public Storage policies. Public, `anon`, and `authenticated`
roles cannot access the private metadata table or execute the upload RPCs; the
server-side service role is the only application access boundary.

## Deliberate limitations

This task does not include antivirus scanning, OCR, AI processing, public or
signed download links, document replacement, retention automation, or an
operator interface. Magic-byte checks reduce simple content spoofing but are
not malware detection. These limits must be revisited before broader document
access or Production release.
