-- Align persisted metadata names with the approved TASK 5 contract without
-- rewriting the already-applied create_bill_upload migration.

alter table private.lead_documents rename column bucket_name to storage_bucket;
alter table private.lead_documents rename column object_path to storage_path;

drop function public.register_bill_upload(
  uuid, uuid, text, text, text, text, bigint
);

create function public.register_bill_upload(
  p_submission_id uuid,
  p_document_id uuid,
  p_storage_bucket text,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint
)
returns table (document_id uuid, created boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_lead_id uuid;
  v_document_id uuid;
begin
  select id into v_lead_id
  from private.leads
  where submission_id = p_submission_id;

  if v_lead_id is null then
    raise exception using errcode = 'P0002', message = 'lead not found';
  end if;

  insert into private.lead_documents (
    id, lead_id, document_type, storage_bucket, storage_path,
    original_filename, mime_type, size_bytes, status
  ) values (
    p_document_id, v_lead_id, 'ELECTRICITY_BILL', p_storage_bucket,
    p_storage_path, btrim(p_original_filename), p_mime_type,
    p_size_bytes, 'UPLOADED'
  )
  on conflict (lead_id, document_type) do nothing
  returning id into v_document_id;

  if v_document_id is not null then
    insert into private.lead_events (lead_id, event_type, metadata)
    values (
      v_lead_id,
      'bill_uploaded',
      jsonb_build_object('document_id', v_document_id)
    );
    return query select v_document_id, true;
    return;
  end if;

  select id into v_document_id
  from private.lead_documents
  where lead_id = v_lead_id
    and document_type = 'ELECTRICITY_BILL'::private.lead_document_type;
  return query select v_document_id, false;
end;
$$;

revoke all on function public.register_bill_upload(
  uuid, uuid, text, text, text, text, bigint
) from public, anon, authenticated;
grant execute on function public.register_bill_upload(
  uuid, uuid, text, text, text, text, bigint
) to service_role;
