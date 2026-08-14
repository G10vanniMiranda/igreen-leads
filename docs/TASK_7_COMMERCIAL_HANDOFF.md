# TASK 7 — Commercial handoff

## Attribution boundary

The admin actions record intent to open an external destination, not a commercial
outcome. `whatsapp_opened` means only that the WhatsApp CTA was activated, and
`igreen_handoff_opened` means only that the configured iGreen flow was opened.
Neither event changes the lead status.

`SENT_TO_IGREEN`, `CONTRACT_SENT`, `CONTRACTED`, and `ACTIVATED` remain explicit
administrative declarations through the existing status workflow and continue to
produce `status_changed` only when the stored status actually changes.

## WhatsApp

The POST action is authenticated, same-origin, and receives only the lead ID in the
internal route plus an opaque action ID. The server loads the authorized lead,
normalizes its stored Brazilian phone to digits for `wa.me`, and builds a centralized
message using only the first name. It does not call a WhatsApp API and does not send
a message automatically.

The template excludes bill value, utility provider, social-benefit status,
account-holder status, bill data, and other unnecessary PII. The message body is
not persisted in `lead_events` and application handlers do not log the destination.

## iGreen

The destination reuses the typed `buildIGreenReferralUrl` boundary. Its only query
parameters are `id`, loaded from `IGREEN_REFERRAL_ID`, and `sendcontract`, loaded
from `IGREEN_SEND_CONTRACT`; the base URL comes from `IGREEN_BASE_URL`. No lead ID,
submission ID, name, phone, qualification answer, bill data, or other PII is added.

## Event retry behavior

Each rendered action receives an opaque UUID. The UI disables its button briefly
to suppress simultaneous submissions. The database uses a partial unique index on
lead, event type, and this action ID, so a network retry is safely ignored. After
the brief guard, the UI rotates the UUID; a later intentional opening can therefore
create another legitimate event. There is no global uniqueness by lead or event.

The RPC uses `SECURITY INVOKER`, an empty `search_path`, fully qualified private
relations, and is executable only by `service_role`. The service-role credential
remains server-only. Responses are private/no-store and errors are generic.

## Timeline

The lead detail renders human labels for known events and a readable description
for `status_changed`. Raw event metadata is not displayed. Unknown future events
fall back to a neutral operational label.

## Validation boundaries

- No real WhatsApp message is sent.
- No real iGreen registration or contract is created.
- External links are not followed during automated tests.
- TEST smoke data must be synthetic and completely removed after validation.
- No Production operation is part of this task.
