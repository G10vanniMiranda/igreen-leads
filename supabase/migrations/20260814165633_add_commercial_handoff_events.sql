-- TASK 7: auditable commercial handoff actions without inferring outcomes.
-- Opening an external destination never changes a lead's commercial status.

alter table private.lead_events drop constraint lead_events_event_type_check;
alter table private.lead_events add constraint lead_events_event_type_check
  check (event_type in (
    'lead_created',
    'bill_uploaded',
    'status_changed',
    'whatsapp_opened',
    'igreen_handoff_opened'
  ));

create unique index lead_events_handoff_action_id_idx
  on private.lead_events (lead_id, event_type, (metadata ->> 'action_id'))
  where event_type in ('whatsapp_opened', 'igreen_handoff_opened');

create function public.admin_record_handoff_event(
  p_lead_id uuid,
  p_event_type text,
  p_action_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_created boolean := false;
begin
  if p_event_type not in ('whatsapp_opened', 'igreen_handoff_opened') then
    raise exception using errcode = '22023', message = 'invalid handoff event';
  end if;

  insert into private.lead_events (lead_id, event_type, metadata)
  values (p_lead_id, p_event_type, jsonb_build_object('action_id', p_action_id))
  on conflict do nothing
  returning true into v_created;

  return coalesce(v_created, false);
end;
$$;

revoke all on function public.admin_record_handoff_event(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_record_handoff_event(uuid, text, uuid)
  to service_role;
