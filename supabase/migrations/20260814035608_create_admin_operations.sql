-- TASK 6: restricted lead operations for the internal admin panel.
-- RPC execution stays exclusive to service_role; private tables remain private.

alter table private.leads
  add column internal_notes varchar(2000),
  add constraint leads_internal_notes_length_check
    check (internal_notes is null or char_length(internal_notes) <= 2000);

alter table private.lead_events drop constraint lead_events_event_type_check;
alter table private.lead_events add constraint lead_events_event_type_check
  check (event_type in ('lead_created', 'bill_uploaded', 'status_changed'));

create index leads_state_created_at_idx on private.leads (state, created_at desc);
create index leads_requires_review_created_at_idx on private.leads (requires_review, created_at desc);
grant update (status, internal_notes) on private.leads to service_role;

create function public.admin_dashboard_metrics()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'total', count(*), 'new', count(*) filter (where l.status = 'NEW'),
    'inReview', count(*) filter (where l.status = 'IN_REVIEW'),
    'qualified', count(*) filter (where l.status = 'QUALIFIED'),
    'sentToIgreen', count(*) filter (where l.status = 'SENT_TO_IGREEN'),
    'contracted', count(*) filter (where l.status = 'CONTRACTED'),
    'activated', count(*) filter (where l.status = 'ACTIVATED'),
    'requiresReview', count(*) filter (where l.requires_review),
    'withBill', count(*) filter (where exists (select 1 from private.lead_documents d where d.lead_id = l.id)),
    'withoutBill', count(*) filter (where not exists (select 1 from private.lead_documents d where d.lead_id = l.id))
  ) from private.leads l;
$$;

create function public.admin_list_leads(
  p_page integer default 1, p_page_size integer default 20,
  p_status text default null, p_state text default null,
  p_requires_review boolean default null, p_has_bill boolean default null,
  p_search text default null
)
returns table (
  id uuid, name text, phone text, state text, utility_provider text,
  bill_range text, status text, requires_review boolean, has_bill boolean,
  created_at timestamptz, total_count bigint
)
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_phone_search text := regexp_replace(coalesce(p_search, ''), '[^0-9]', '', 'g');
begin
  if p_page < 1 or p_page_size < 1 or p_page_size > 100 then
    raise exception using errcode = '22023', message = 'invalid pagination';
  end if;
  if p_status is not null and not exists (
    select 1 from unnest(enum_range(null::private.lead_status)) s where s::text = p_status
  ) then
    raise exception using errcode = '22023', message = 'invalid status';
  end if;

  return query
  select l.id, l.name::text, l.phone::text, l.state, l.utility_provider,
    l.bill_range, l.status::text, l.requires_review,
    exists (select 1 from private.lead_documents d where d.lead_id = l.id),
    l.created_at, count(*) over ()
  from private.leads l
  where (p_status is null or l.status::text = p_status)
    and (p_state is null or l.state = p_state)
    and (p_requires_review is null or l.requires_review = p_requires_review)
    and (p_has_bill is null or exists (
      select 1 from private.lead_documents d where d.lead_id = l.id
    ) = p_has_bill)
    and (v_search is null or l.name ilike '%' || v_search || '%'
      or (v_phone_search <> '' and regexp_replace(l.phone, '[^0-9]', '', 'g') like '%' || v_phone_search || '%'))
  order by l.created_at desc, l.id desc
  limit p_page_size offset ((p_page - 1) * p_page_size);
end;
$$;

create function public.admin_get_lead(p_lead_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'lead', to_jsonb(l) - 'consent_contact',
    'document', (select to_jsonb(d) - 'storage_path' - 'storage_bucket'
      from private.lead_documents d where d.lead_id = l.id order by d.created_at desc limit 1),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from private.lead_events e where e.lead_id = l.id), '[]'::jsonb)
  ) from private.leads l where l.id = p_lead_id;
$$;

create function public.admin_get_bill_document(p_lead_id uuid)
returns table (storage_bucket text, storage_path text)
language sql stable security invoker set search_path = '' as $$
  select d.storage_bucket::text, d.storage_path::text from private.lead_documents d
  where d.lead_id = p_lead_id
    and d.document_type = 'ELECTRICITY_BILL'::private.lead_document_type
  order by d.created_at desc limit 1;
$$;

create function public.admin_update_lead_status(p_lead_id uuid, p_status text)
returns table (previous_status text, current_status text, changed boolean)
language plpgsql security invoker set search_path = '' as $$
declare
  v_previous private.lead_status;
  v_current private.lead_status;
begin
  begin
    v_current := p_status::private.lead_status;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'invalid status';
  end;
  select status into v_previous from private.leads where id = p_lead_id for update;
  if v_previous is null then
    raise exception using errcode = 'P0002', message = 'lead not found';
  end if;
  if v_previous = v_current then
    return query select v_previous::text, v_current::text, false;
    return;
  end if;
  update private.leads set status = v_current where id = p_lead_id;
  insert into private.lead_events (lead_id, event_type, metadata)
  values (p_lead_id, 'status_changed', jsonb_build_object('from', v_previous, 'to', v_current));
  return query select v_previous::text, v_current::text, true;
end;
$$;

create function public.admin_update_internal_notes(p_lead_id uuid, p_internal_notes text)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_notes text := nullif(btrim(p_internal_notes), '');
begin
  if char_length(coalesce(v_notes, '')) > 2000 then
    raise exception using errcode = '22001', message = 'internal notes too long';
  end if;
  update private.leads set internal_notes = v_notes where id = p_lead_id;
  if not found then raise exception using errcode = 'P0002', message = 'lead not found'; end if;
  return v_notes;
end;
$$;

revoke all on function public.admin_dashboard_metrics() from public, anon, authenticated;
revoke all on function public.admin_list_leads(integer, integer, text, text, boolean, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_get_lead(uuid) from public, anon, authenticated;
revoke all on function public.admin_get_bill_document(uuid) from public, anon, authenticated;
revoke all on function public.admin_update_lead_status(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_update_internal_notes(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_dashboard_metrics() to service_role;
grant execute on function public.admin_list_leads(integer, integer, text, text, boolean, boolean, text) to service_role;
grant execute on function public.admin_get_lead(uuid) to service_role;
grant execute on function public.admin_get_bill_document(uuid) to service_role;
grant execute on function public.admin_update_lead_status(uuid, text) to service_role;
grant execute on function public.admin_update_internal_notes(uuid, text) to service_role;
