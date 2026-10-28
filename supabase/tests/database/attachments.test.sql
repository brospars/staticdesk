-- Tests for contact form attachments. Run with `npm run db:test`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@files.dev'),
  ('00000000-0000-0000-0000-0000000000a2', 'outsider@files.dev');
insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'Files', 'files'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'Other', 'other-files');
insert into public.members (workspace_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2', 'owner');
insert into public.sites (id, workspace_id, name, public_key) values
  ('bbbbbbbb-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'Docs', 'pk_test_files'),
  ('bbbbbbbb-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-0000000000a2', 'Other', 'pk_test_other_files');

-- Upload requests: one for each case below. Only some files reach the bucket.
insert into public.attachments (id, workspace_id, site_id, storage_path, file_name, content_type, size_bytes, created_at) values
  ('cccccccc-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'bbbbbbbb-0000-0000-0000-0000000000a1',
   'a1/b1/c1/report.pdf', 'report.pdf', 'application/pdf', 100, now()),
  ('cccccccc-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'bbbbbbbb-0000-0000-0000-0000000000a1',
   'a1/b1/c2/missing.png', 'missing.png', 'image/png', 100, now()),
  ('cccccccc-0000-0000-0000-0000000000a3', 'aaaaaaaa-0000-0000-0000-0000000000a2', 'bbbbbbbb-0000-0000-0000-0000000000a2',
   'a2/b2/c3/other.pdf', 'other.pdf', 'application/pdf', 100, now()),
  ('cccccccc-0000-0000-0000-0000000000a4', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'bbbbbbbb-0000-0000-0000-0000000000a1',
   'a1/b1/c4/old.pdf', 'old.pdf', 'application/pdf', 100, now() - interval '2 days');
insert into storage.objects (bucket_id, name, metadata) values
  ('attachments', 'a1/b1/c1/report.pdf', '{"size": 2048, "mimetype": "application/pdf"}'),
  ('attachments', 'a2/b2/c3/other.pdf', '{"size": 10, "mimetype": "application/pdf"}'),
  ('attachments', 'a1/b1/c4/old.pdf', '{"size": 10, "mimetype": "application/pdf"}');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role service_role;

select is(
  (select public from storage.buckets where id = 'attachments'),
  false,
  'the attachments bucket is private'
);

-- Not uploaded, another site's, or too old: the submission is rejected as a whole.
select throws_ok(
  $$ select public.submit_contact(site_id => 'bbbbbbbb-0000-0000-0000-0000000000a1', email => 'ada@example.com',
       message => 'Hi', page_id => '/', attachment_ids => array['cccccccc-0000-0000-0000-0000000000a2']::uuid[]) $$,
  '22023', 'Unknown attachment',
  'files that were not uploaded are rejected'
);
select throws_ok(
  $$ select public.submit_contact(site_id => 'bbbbbbbb-0000-0000-0000-0000000000a1', email => 'ada@example.com',
       message => 'Hi', page_id => '/', attachment_ids => array['cccccccc-0000-0000-0000-0000000000a3']::uuid[]) $$,
  '22023', 'Unknown attachment',
  'files uploaded for another site are rejected'
);
select throws_ok(
  $$ select public.submit_contact(site_id => 'bbbbbbbb-0000-0000-0000-0000000000a1', email => 'ada@example.com',
       message => 'Hi', page_id => '/', attachment_ids => array['cccccccc-0000-0000-0000-0000000000a4']::uuid[]) $$,
  '22023', 'Unknown attachment',
  'stale uploads are rejected'
);
select is((select count(*) from public.threads where site_id = 'bbbbbbbb-0000-0000-0000-0000000000a1'), 0::bigint, 'rejected submissions store nothing');

select lives_ok(
  $$ select public.submit_contact(site_id => 'bbbbbbbb-0000-0000-0000-0000000000a1', email => 'ada@example.com',
       message => 'Hi', page_id => '/',
       attachment_ids => array['cccccccc-0000-0000-0000-0000000000a1', 'cccccccc-0000-0000-0000-0000000000a1']::uuid[]) $$,
  'uploaded files are linked to the message (duplicates ignored)'
);
select is(
  (select a.size_bytes from public.attachments a join public.messages m on m.id = a.message_id
   where a.id = 'cccccccc-0000-0000-0000-0000000000a1'),
  2048::bigint,
  'the size comes from the stored object'
);
select throws_ok(
  $$ select public.submit_contact(site_id => 'bbbbbbbb-0000-0000-0000-0000000000a1', email => 'bob@example.com',
       message => 'Again', page_id => '/', attachment_ids => array['cccccccc-0000-0000-0000-0000000000a1']::uuid[]) $$,
  '22023', 'Unknown attachment',
  'an attachment cannot be linked twice'
);

-- Members see their workspace's linked attachments and files ----------------------

select pg_temp.login('00000000-0000-0000-0000-0000000000a1');
select results_eq(
  'select file_name from public.attachments order by file_name',
  array['report.pdf'],
  'members see linked attachments of their workspace only'
);
select results_eq(
  $$ select name from storage.objects where bucket_id = 'attachments' $$,
  array['a1/b1/c1/report.pdf'],
  'members can download linked files of their workspace only'
);
select throws_ok(
  $$ insert into public.attachments (workspace_id, site_id, storage_path, file_name, content_type, size_bytes)
     values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'bbbbbbbb-0000-0000-0000-0000000000a1', 'x/y', 'y', 'text/plain', 1) $$,
  '42501', null,
  'members cannot create attachments'
);

select pg_temp.login('00000000-0000-0000-0000-0000000000a2');
select is_empty(
  $$ select name from storage.objects where bucket_id = 'attachments' and name like 'a1/%' $$,
  'other workspaces cannot read the files'
);

select * from finish();
rollback;
