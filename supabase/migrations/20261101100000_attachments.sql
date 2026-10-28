-- Contact form attachments, stored in the private "attachments" bucket.
--
-- Visitors upload through signed upload URLs issued by the server, which first
-- inserts a row here (message_id null). submit_contact() then links the uploaded
-- files to the new message. Rows still unlinked after a day (abandoned uploads,
-- deleted conversations) are removed with their file by /api/cron/cleanup.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  5 * 1024 * 1024,
  -- Keep in sync with ATTACHMENT_TYPES in @staticdesk/core.
  array[
    'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf',
    'text/plain', 'text/csv', 'application/zip', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  site_id uuid not null,
  -- Null until the submission is stored, and after the message is deleted.
  message_id uuid references public.messages (id) on delete set null,
  -- <workspace id>/<site id>/<attachment id>/<file name>
  storage_path text not null unique check (char_length(storage_path) <= 400),
  file_name text not null check (char_length(file_name) between 1 and 255),
  content_type text not null check (char_length(content_type) <= 255),
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  foreign key (site_id, workspace_id)
    references public.sites (id, workspace_id) on delete cascade
);

create index attachments_message_id_idx on public.attachments (message_id);
create index attachments_site_id_idx on public.attachments (site_id);
create index attachments_workspace_id_idx on public.attachments (workspace_id);
create index attachments_unlinked_idx on public.attachments (created_at) where message_id is null;

alter table public.attachments enable row level security;
revoke all on public.attachments from anon, authenticated;
-- Written by the server only (service role).
grant select on public.attachments to authenticated;

create policy "Members can read attachments"
  on public.attachments for select to authenticated
  using (message_id is not null and (select private.has_workspace_role(workspace_id)));

-- Members download files through signed URLs created with their own session.
create policy "Members can read attachment files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from public.attachments a
      where a.storage_path = storage.objects.name
        and a.message_id is not null
        and (select private.has_workspace_role(a.workspace_id))
    )
  );

-- Contact submissions link their uploaded attachments ---------------------------

drop function public.submit_contact(uuid, text, text, text, uuid, text, text, jsonb);

create function public.submit_contact(
  site_id uuid,
  email text,
  message text,
  page_id text,
  widget_id uuid default null,
  name text default null,
  page_url text default null,
  fields jsonb default null,
  attachment_ids uuid[] default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
-- Parameters share column names; they are always referenced as submit_contact.<name>.
#variable_conflict use_column
declare
  ws uuid;
  contact uuid;
  thread uuid;
  widget uuid;
  msg uuid;
  wanted integer;
  linked integer;
begin
  select s.workspace_id into ws from public.sites s where s.id = submit_contact.site_id;
  if ws is null then
    raise exception 'Unknown site' using errcode = 'no_data_found';
  end if;

  -- Ignore widget ids that are not a contact widget of this site.
  select w.id into widget
  from public.widgets w
  where w.id = submit_contact.widget_id
    and w.site_id = submit_contact.site_id
    and w.kind = 'contact';

  insert into public.contacts (workspace_id, email, name)
  values (ws, lower(submit_contact.email), nullif(trim(submit_contact.name), ''))
  on conflict (workspace_id, lower(email)) do update
    set name = coalesce(excluded.name, public.contacts.name)
  returning id into contact;

  insert into public.threads (workspace_id, site_id, widget_id, contact_id, subject)
  values (
    ws,
    submit_contact.site_id,
    widget,
    contact,
    left(split_part(trim(submit_contact.message), e'\n', 1), 120)
  )
  returning id into thread;

  insert into public.messages (workspace_id, thread_id, direction, body, metadata)
  values (
    ws,
    thread,
    'inbound',
    submit_contact.message,
    jsonb_strip_nulls(jsonb_build_object(
      'pageId', submit_contact.page_id,
      'pageUrl', submit_contact.page_url,
      'fields', case when jsonb_typeof(submit_contact.fields) = 'array'
        and jsonb_array_length(submit_contact.fields) > 0 then submit_contact.fields end
    ))
  )
  returning id into msg;

  -- Each attachment must belong to this site, be unused, recent and uploaded.
  -- Its size and type are taken from the stored object, not from the request.
  wanted := (select count(distinct id) from unnest(submit_contact.attachment_ids) id);
  if wanted > 0 then
    update public.attachments a
    set message_id = msg,
        size_bytes = coalesce((o.metadata ->> 'size')::bigint, a.size_bytes),
        content_type = coalesce(o.metadata ->> 'mimetype', a.content_type)
    from storage.objects o
    where a.id = any (submit_contact.attachment_ids)
      and a.site_id = submit_contact.site_id
      and a.message_id is null
      and a.created_at > now() - interval '1 day'
      and o.bucket_id = 'attachments'
      and o.name = a.storage_path;
    get diagnostics linked = row_count;
    if linked <> wanted then
      raise exception 'Unknown attachment' using errcode = 'invalid_parameter_value';
    end if;
  end if;

  insert into public.events (workspace_id, site_id, widget_id, type, page_id)
  values (ws, submit_contact.site_id, widget, 'submit', submit_contact.page_id);

  return thread;
end;
$$;

revoke all on function public.submit_contact from public, anon, authenticated;
grant execute on function public.submit_contact to service_role;
