# Data Subject Requests — Operational Readiness

TASK 9 does not create a self-service portal and does not define legal response deadlines. This document is the minimum future operating procedure; it must receive legal/operational ownership before Production.

## Production prerequisite

A specific privacy request channel, accountable owner, identity-verification method, retention policy and response register must be approved before public operation. No email address is invented in the application.

## Request intake and handling

1. Receive the request through the future approved privacy channel.
2. Record only the minimum information needed to understand the request.
3. Verify identity proportionally before revealing, changing or deleting personal data. Never request an electricity bill merely as a default identity proof.
4. Classify the request as access, correction, deletion, objection/restriction, or consent/preference revocation.
5. Locate records using approved server-side/admin procedures. Do not expose service-role credentials or raw database access to the requester.
6. Assess legal/contractual retention constraints with the responsible professional; do not promise deletion where retention is required.
7. For approved deletion, remove the private Storage object through the Storage API, then delete related events and document metadata before deleting the lead record. The current foreign keys do not cascade this cleanup. Confirm all targeted residues are zero.
8. For correction, update only verified fields and preserve the minimum audit evidence required by the approved policy.
9. Communicate the result through the verified channel without including unnecessary PII or signed URLs.
10. Record completion and any justified residual data without copying the full request into operational notes.

## Consent and tracking revocation

The visitor can change analytics/advertising preferences in the footer. Revocation stops new provider events in that browser. It does not automatically remove data previously received by an external provider; any such request must follow the provider-specific process once those providers are formally activated.

`consent_contact` is independent. A future revocation of contact must be recorded operationally and respected without being interpreted as an automatic request to erase every record.
