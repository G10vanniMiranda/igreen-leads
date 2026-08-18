# Production Operations Runbook

This runbook records the initial backup, recovery and rollback decisions for iGreen Leads. It does not provision external infrastructure or assign a legal role.

## Accepted Supabase Free backup risk

Production starts temporarily on Supabase Free without managed automatic backups or point-in-time recovery (PITR). This limitation is consciously accepted for the initial launch and makes the following operator-run backups mandatory.

## Operational ownership

The initial operational owner for backups and restores is **Giovanni de Sousa Miranda**. The owner is accountable for daily execution evidence, off-site retention, monthly restore evidence and escalation of failures.

## Daily database backup

1. Export the Production PostgreSQL database once per day using a Supabase-supported `pg_dump` workflow from a trusted operator environment.
2. Keep credentials outside commands, logs, filenames and repository files.
3. Produce an integrity checksum and record only timestamp, environment, result, size and checksum in the operations register.
4. Encrypt the dump before transfer to access-controlled off-site storage.
5. Treat a failed or incomplete dump as an operational incident and retry only after the cause is understood.

## Daily Storage backup

1. Inventory the private `lead-documents` bucket once per day through the official Supabase Storage API.
2. Copy every object to encrypted, access-controlled off-site storage without making the source bucket or backup public.
3. Preserve object paths and maintain a manifest with object identifier, size and integrity checksum; do not place signed URLs or object contents in logs.
4. Verify the copied-object count and checksums independently of the PostgreSQL dump.

Database and Storage are separate backup sets. A database dump does not back up bucket objects, and an object copy does not back up document metadata or lead records.

## Retention and rotation

- Retain the seven most recent daily database and Storage backup sets.
- Retain four weekly database and Storage backup sets.
- Delete expired off-site sets using the storage provider's controlled deletion process and record the result.
- Never delete the only known-good set while a replacement is unverified.

## Monthly restore test

1. Once per month, select a database set and its matching Storage set.
2. Restore both into an isolated, access-controlled non-Production environment.
3. Verify schema and migration history, record counts, bucket privacy, object count, checksums and the metadata-to-object relationship.
4. Do not connect the restore to public Vercel environments, analytics, WhatsApp or iGreen handoff.
5. Destroy the isolated restore safely after recording the test result, duration and any corrective actions.

A backup is not considered recoverable until both the database and Storage restore have been tested successfully.

## Release rollback

- The first Production Deployment keeps indexing, Meta and GA disabled.
- Any critical failure prevents public disclosure or launch communication.
- Remove only synthetic data created by the technical smoke, following foreign-key and Storage cleanup order.
- Fixes return to `preview/homologation`, pass the required quality gates and receive a new homologation review before another Production attempt.
- Git rollback is performed only through an auditable `git revert`; history rewriting and force-push are not rollback mechanisms.
- Database migrations are forward-only. Schema corrections require a new reviewed migration; applied migrations are not edited or rolled back in place.

This plan does not authorize a merge, Production Deployment, domain assignment, tracker activation or Supabase change.
