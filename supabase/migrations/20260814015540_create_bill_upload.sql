-- TASK 5: private electricity-bill storage metadata and atomic registration.
-- Reversal (data-destructive, manual only): remove Storage objects through the
-- Storage API, then drop the RPCs/table/types and the private bucket. Never
-- delete rows directly from storage.objects.

create type private.lead_document_type as enum ('ELECTRICITY_BILL');
create type private.lead_document_status as enum ('UPLOADED');

create table private.lead_documents (
  id uuid primary key,
  lead_id uuid not null references private.leads(id) on delete restrict,
  document_type private.lead_document_type not null,
  bucket_name varchar(100) not null,
  object_path varchar(500) not null,
  original_filename varchar(180) not null,
  mime_type varchar(100) not null,
  size_bytes bigint not null,
  status private.lead_document_status not null default 'UPLOADED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_documents_one_type_per_lead unique (lead_id, document_type),
  constraint lead_documents_object_unique unique (bucket_name, object_path),
  constraint lead_documents_bucket_check check (bucket_name = 'lead-documents'),
  constraint lead_documents_path_check
    check (object_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(pdf|jpg|png)$'),
  constraint lead_documents_filename_check
    check (char_length(btrim(original_filename)) between 1 and 180),
  constraint lead_documents_mime_check
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  constraint lead_documents_size_check check (size_bytes between 1 and 10485760)
);

create index lead_documents_lead_id_created_at_idx
  on private.lead_documents (lead_id, created_at desc);

alter table private.lead_documents enable row level security;
revoke all on table private.lead_documents from public, anon, authenticated;
grant select, insert on table private.lead_documents to service_role;

create trigger lead_documents_set_updated_at
before update on private.lead_documents
for each row execute function private.set_updated_at();

alter table private.lead_events drop constraint lead_events_event_type_check;
alter table private.lead_events add constraint lead_events_event_type_check
  check (event_type in ('lead_created', 'bill_uploaded'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-documents',
  'lead-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
);

create function public.get_bill_upload_target(p_submission_id uuid)
returns table (lead_id uuid, existing_document_id uuid)
language sql
security invoker
set search_path = ''
as $$
  select l.id, d.id
  from private.leads as l
  left join private.lead_documents as d
    on d.lead_id = l.id
   and d.document_type = 'ELECTRICITY_BILL'::private.lead_document_type
  where l.submission_id = p_submission_id;
$$;

revoke all on function public.get_bill_upload_target(uuid)
  from public, anon, authenticated;
grant execute on function public.get_bill_upload_target(uuid) to service_role;

create function public.register_bill_upload(
  p_submission_id uuid,
  p_document_id uuid,
  p_bucket_name text,
  p_object_path text,
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
    id, lead_id, document_type, bucket_name, object_path,
    original_filename, mime_type, size_bytes, status
  ) values (
    p_document_id, v_lead_id, 'ELECTRICITY_BILL', p_bucket_name,
    p_object_path, btrim(p_original_filename), p_mime_type,
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
