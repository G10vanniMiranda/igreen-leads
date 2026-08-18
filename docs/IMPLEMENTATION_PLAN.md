# iGreen Leads — Implementation Plan

This document is the versioned source of truth for the project technical roadmap. It records direction and sequencing, not exhaustive requirements. Detailed specifications continue to be approved task by task.

> Detailed task specifications override roadmap summaries when explicitly approved.

## Permanent engineering principles

- Validate in TEST before considering Production.
- Never change Production without explicit authorization.
- Keep database migrations versioned.
- Never turn an unconfirmed commercial rule into a universal rule in code.
- Collect only the minimum necessary personally identifiable information (PII).
- Validate external input server-side.
- Never expose secrets in client-side code.
- Tracking must represent real events and must never invent conversions.
- External changes must respect the applicable human gates.
- Finish every task with objective quality evidence.

## Roadmap

### TASK 1 — Foundation

**Status:** COMPLETED

- **Objective:** Establish the application foundation and initial visual direction.
- **Main deliveries:** Next.js project, typed configuration, initial brand identity, Hero, and configurable iGreen integration boundary.
- **Dependencies:** None.
- **Out of scope:** Full funnel and production integrations.
- **Completion criterion:** Stable, typed foundation validated by project quality checks.

### TASK 2 — Pre-Qualification Flow

**Status:** COMPLETED

- **Objective:** Qualify visitors through a short, deterministic decision flow.
- **Main deliveries:** Six-step flow, state/distributor and account questions, `requiresReview`, reducer, types, tracking boundary, and tests.
- **Dependencies:** TASK 1.
- **Out of scope:** Contact persistence and definitive approval.
- **Completion criterion:** Complete flow behaves according to approved rules and passes tests.

### TASK 3 — Lead Capture & TEST Persistence

**Status:** COMPLETED

- **Objective:** Capture consented contact data and persist leads safely in Supabase TEST.
- **Main deliveries:** Name and WhatsApp capture, consent, server-side validation, idempotent lead/event persistence, private access controls, safe logging, and smoke tests.
- **Dependencies:** TASK 2 and a verified Supabase TEST target.
- **Out of scope:** Production, bill uploads, real handoff, and marketing integrations.
- **Completion criterion:** Lead capture and persistence are secure, idempotent, tested, and validated only in TEST.

### TASK 4 — Conversion Landing Page

**Status:** COMPLETED

- **Objective:** Create this roadmap and complete the first professional, conversion-oriented public landing page.
- **Main deliveries:** Versioned roadmap, commercial page sections, qualified claims, integrated pre-qualification, responsive UX, accessibility, and basic metadata.
- **Dependencies:** TASKS 1–3 and their existing user journey.
- **Out of scope:** Database changes, external integrations, analytics, bill uploads, Production, and deployment.
- **Completion criterion:** Landing and preserved funnel pass functional, visual, accessibility, build, and quality validation.

### TASK 5 — Secure Electricity Bill Upload

**Status:** COMPLETED

- **Objective:** Add a secure path for eligible users to provide an electricity bill.
- **Main deliveries:** Upload journey, protected storage boundary, validation, and lifecycle handling.
- **Dependencies:** TASK 3 and an explicitly approved detailed specification.
- **Out of scope:** Automated OCR/AI analysis unless separately approved.
- **Completion criterion:** Approved upload requirements are implemented securely and validated in TEST.

### TASK 6 — Lead Operations Panel

**Status:** COMPLETED

- **Objective:** Support authorized operational handling of captured leads.
- **Main deliveries:** Restricted lead visibility and the minimum approved operational workflow.
- **Dependencies:** Persisted leads, authentication/authorization decisions, and a detailed specification.
- **Out of scope:** Unapproved CRM scope or broad administration features.
- **Completion criterion:** Authorized operators can perform the approved workflow securely and audibly.

### TASK 7 — Commercial Handoff / iGreen / WhatsApp

**Status:** COMPLETED

- **Objective:** Connect qualified lead outcomes to the approved commercial continuation channel.
- **Main deliveries:** Explicit handoff boundary and approved iGreen/WhatsApp behavior.
- **Dependencies:** Confirmed commercial process, credentials, compliance review, and human gates.
- **Out of scope:** Unapproved automated messaging or invented partner behavior.
- **Completion criterion:** Handoff works only through approved channels with traceable outcomes.

### TASK 8 — Marketing Attribution & Analytics

**Status:** COMPLETED

- **Objective:** Measure acquisition and real funnel outcomes responsibly.
- **Main deliveries:** Approved attribution model, consent-aware analytics, and truthful conversion events.
- **Dependencies:** Marketing decisions, privacy requirements, and approved event definitions.
- **Out of scope:** Fabricated conversions or trackers added without consent and authorization.
- **Completion criterion:** Validated analytics report only real, approved events.

### TASK 9 — Privacy, Security & Anti-Abuse Hardening

**Status:** COMPLETED

- **Objective:** Harden the complete funnel against privacy, security, and abuse risks.
- **Main deliveries:** Threat review and approved controls for data, APIs, uploads, access, and abuse prevention.
- **Dependencies:** Stable implementations from preceding tasks.
- **Out of scope:** Controls without a validated risk or requirement.
- **Completion criterion:** Identified material risks have tested mitigations and documented residual risk.

### TASK 10 — E2E / Homologation / Production Readiness

**Status:** COMPLETED

- **Objective:** Validate the integrated product before any production release.
- **Main deliveries:** Approved end-to-end scenarios, homologation evidence, operational checklist, and release readiness assessment.
- **Dependencies:** Completion of the release candidate scope.
- **Out of scope:** Production deployment itself.
- **Completion criterion:** All release gates have objective evidence and an explicit go/no-go decision.

### TASK 11 — Production Release

**Status:** COMPLETED — CONTROLLED LAUNCH

- **Objective:** Release the approved and homologated product to Production.
- **Main deliveries:** Production environment configured, migrations applied, deployment completed, smoke validation passed, post-smoke cleanup completed. Public launch remains deliberately controlled (indexing, Meta and GA disabled) pending a separate authorization to widen exposure.
- **Dependencies:** TASK 10 approval and explicit Production authorization.
- **Out of scope:** Unapproved scope changes during release.
- **Completion criterion:** Authorized release is healthy, verified, monitored, and documented. Live operational state (deployment identifiers, smoke results, runtime baselines) is tracked in [`docs/AGENT_HANDOFF.md`](AGENT_HANDOFF.md), not in this roadmap.

### TASK 12 — Conversion Optimization

**Status:** FUTURE

- **Objective:** Improve funnel outcomes based on trustworthy production evidence.
- **Main deliveries:** Evidence-led experiments and approved UX/copy refinements.
- **Dependencies:** Production baseline and reliable analytics.
- **Out of scope:** Changes based solely on assumptions or misleading patterns.
- **Completion criterion:** Approved experiments have measurable, documented results.

### TASK 13 — Automated Bill Analysis / OCR / AI

**Status:** FUTURE

- **Objective:** Explore automation of bill data extraction and analysis.
- **Main deliveries:** To be defined by a future detailed specification and validation study.
- **Dependencies:** Secure upload capability, privacy assessment, and evidence of operational value.
- **Out of scope:** Unreviewed automated decisions or unsupported accuracy claims.
- **Completion criterion:** Approved automation meets defined accuracy, security, privacy, and human-review gates.

### TASK 14 — Haverns Integration

**Status:** FUTURE

- **Objective:** Integrate Haverns if its role and value are formally confirmed.
- **Main deliveries:** To be defined only after the integration contract and use case are approved.
- **Dependencies:** Confirmed product need, technical contract, credentials, and human gates.
- **Out of scope:** Any speculative or undocumented integration behavior.
- **Completion criterion:** The approved integration is secure, observable, and verified end to end.
