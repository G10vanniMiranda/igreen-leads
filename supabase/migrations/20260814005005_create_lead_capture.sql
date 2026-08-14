-- TASK 3: minimal TEST-only lead capture schema.
-- Reversal (data-destructive, manual only): drop public.create_lead_submission,
-- then private.lead_events, private.leads, private.lead_status and the private
-- schema if it is empty. No automatic down migration is executed.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create type private.lead_status as enum (
  'NEW',
  'IN_REVIEW',
  'QUALIFIED',
  'NOT_ELIGIBLE',
  'SENT_TO_IGREEN',
  'CONTRACT_SENT',
  'CONTRACTED',
  'ACTIVATED'
);

create table private.leads (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique,
  name varchar(100) not null,
  phone varchar(14) not null,
  customer_type text not null,
  state text not null,
  utility_provider text not null,
  utility_provider_other varchar(120),
  bill_range text not null,
  account_holder_status text not null,
  social_benefit_status text not null,
  requires_review boolean not null,
  status private.lead_status not null default 'NEW',
  consent_contact boolean not null,
  utm_source varchar(200),
  utm_medium varchar(200),
  utm_campaign varchar(200),
  utm_content varchar(200),
  utm_term varchar(200),
  referrer varchar(2048),
  landing_page varchar(2048),
  igreen_referral_id varchar(100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_name_length_check
    check (char_length(btrim(name)) between 2 and 100),
  constraint leads_phone_format_check
    check (phone ~ '^\+55[1-9][0-9]{9,10}$'),
  constraint leads_customer_type_check
    check (customer_type in ('residential', 'business', 'rural')),
  constraint leads_state_check
    check (state in ('MG', 'PE', 'BA', 'MS', 'MT', 'CE', 'OTHER')),
  constraint leads_utility_provider_check
    check (utility_provider in (
      'cemig',
      'neoenergia_pernambuco',
      'neoenergia_coelba',
      'energisa_ms',
      'energisa_mt',
      'enel_ceara',
      'other'
    )),
  constraint leads_utility_provider_other_check
    check (
      (utility_provider = 'other' and utility_provider_other is not null
        and char_length(btrim(utility_provider_other)) between 2 and 120)
      or
      (utility_provider <> 'other' and utility_provider_other is null)
    ),
  constraint leads_bill_range_check
    check (bill_range in (
      'up_to_150',
      '151_to_300',
      '301_to_500',
      '501_to_1000',
      '1001_to_2000',
      'above_2000'
    )),
  constraint leads_account_holder_status_check
    check (account_holder_status in ('yes', 'no', 'unsure')),
  constraint leads_social_benefit_status_check
    check (social_benefit_status in ('yes', 'no', 'unknown')),
  constraint leads_consent_contact_check check (consent_contact is true)
);

create table private.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references private.leads(id) on delete restrict,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint lead_events_event_type_check check (event_type = 'lead_created'),
  constraint lead_events_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index leads_status_created_at_idx
  on private.leads (status, created_at desc);

create index lead_events_lead_id_created_at_idx
  on private.lead_events (lead_id, created_at desc);

alter table private.leads enable row level security;
alter table private.lead_events enable row level security;

revoke all on table private.leads, private.lead_events
  from public, anon, authenticated;
grant select, insert on table private.leads, private.lead_events
  to service_role;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
grant execute on function private.set_updated_at() to service_role;

create trigger leads_set_updated_at
before update on private.leads
for each row execute function private.set_updated_at();

create function public.create_lead_submission(
  p_submission_id uuid,
  p_name text,
  p_phone text,
  p_customer_type text,
  p_state text,
  p_utility_provider text,
  p_utility_provider_other text,
  p_bill_range text,
  p_account_holder_status text,
  p_social_benefit_status text,
  p_requires_review boolean,
  p_consent_contact boolean,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_utm_term text default null,
  p_referrer text default null,
  p_landing_page text default null,
  p_igreen_referral_id text default null
)
returns table (lead_id uuid, created boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lead_id uuid;
  v_created boolean := false;
begin
  insert into private.leads (
    submission_id,
    name,
    phone,
    customer_type,
    state,
    utility_provider,
    utility_provider_other,
    bill_range,
    account_holder_status,
    social_benefit_status,
    requires_review,
    consent_contact,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    referrer,
    landing_page,
    igreen_referral_id
  ) values (
    p_submission_id,
    btrim(p_name),
    p_phone,
    p_customer_type,
    p_state,
    p_utility_provider,
    nullif(btrim(p_utility_provider_other), ''),
    p_bill_range,
    p_account_holder_status,
    p_social_benefit_status,
    p_requires_review,
    p_consent_contact,
    nullif(btrim(p_utm_source), ''),
    nullif(btrim(p_utm_medium), ''),
    nullif(btrim(p_utm_campaign), ''),
    nullif(btrim(p_utm_content), ''),
    nullif(btrim(p_utm_term), ''),
    nullif(btrim(p_referrer), ''),
    nullif(btrim(p_landing_page), ''),
    nullif(btrim(p_igreen_referral_id), '')
  )
  on conflict (submission_id) do nothing
  returning id into v_lead_id;

  if v_lead_id is not null then
    v_created := true;

    insert into private.lead_events (lead_id, event_type, metadata)
    values (
      v_lead_id,
      'lead_created',
      jsonb_build_object('submission_id', p_submission_id)
    );
  else
    select id into v_lead_id
    from private.leads
    where submission_id = p_submission_id;
  end if;

  return query select v_lead_id, v_created;
end;
$$;

revoke all on function public.create_lead_submission(
  uuid, text, text, text, text, text, text, text, text, text, boolean,
  boolean, text, text, text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_lead_submission(
  uuid, text, text, text, text, text, text, text, text, text, boolean,
  boolean, text, text, text, text, text, text, text, text
) to service_role;
