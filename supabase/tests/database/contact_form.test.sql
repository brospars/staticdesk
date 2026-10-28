-- Tests for contact form fields, notifications and webhooks. Run with `npm run db:test`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'owner@forms.dev'),
  ('00000000-0000-0000-0000-0000000000f2', 'member@forms.dev'),
  ('00000000-0000-0000-0000-0000000000f3', 'outsider@forms.dev');
insert into public.workspaces (id, name, slug)
values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'Forms', 'forms');
insert into public.members (workspace_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1', 'owner'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2', 'member');
insert into public.sites (id, workspace_id, name, public_key)
values ('bbbbbbbb-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'Docs', 'pk_test_forms');
insert into public.webhooks (id, workspace_id, site_id, url) values
  ('dddddddd-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1',
   'bbbbbbbb-0000-0000-0000-0000000000f1', 'https://hooks.example.com/in');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Custom field values ----------------------------------------------------------------

set local role service_role;

select public.submit_contact(
  site_id => 'bbbbbbbb-0000-0000-0000-0000000000f1',
  email => 'ada@example.com',
  message => 'Hello',
  page_id => '/',
  fields => '[{"id": "company", "label": "Company", "value": "Acme"}]'
);

select is(
  (select metadata->'fields'->0->>'value' from public.messages m
   join public.threads t on t.id = m.thread_id
   where t.site_id = 'bbbbbbbb-0000-0000-0000-0000000000f1'),
  'Acme',
  'custom field values are stored on the message'
);

select public.submit_contact(
  site_id => 'bbbbbbbb-0000-0000-0000-0000000000f1',
  email => 'alan@example.com',
  message => 'No fields',
  page_id => '/',
  fields => '[]'
);

select ok(
  (select not (metadata ? 'fields') from public.messages where body = 'No fields'),
  'empty field lists are not stored'
);

-- Notification emails ------------------------------------------------------------------

select is(
  (select array_agg(e) from public.workspace_notification_emails('aaaaaaaa-0000-0000-0000-0000000000f1') e),
  array['owner@forms.dev', 'member@forms.dev'],
  'notification emails list the members'
);

reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000f1');
select throws_ok(
  $$ select public.workspace_notification_emails('aaaaaaaa-0000-0000-0000-0000000000f1') $$,
  '42501',
  null,
  'dashboard users cannot call workspace_notification_emails'
);

-- Webhooks ---------------------------------------------------------------------------

select matches(
  (select secret from public.webhooks where id = 'dddddddd-0000-0000-0000-0000000000f1'),
  '^whsec_[0-9a-f]{48}$',
  'webhooks get a generated secret'
);

select lives_ok(
  $$ insert into public.webhooks (workspace_id, site_id, kind, url)
     values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-0000000000f1',
             'slack', 'https://hooks.slack.com/services/T/B/X') $$,
  'an owner can add a webhook'
);

select throws_ok(
  $$ insert into public.webhooks (workspace_id, site_id, url)
     values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-0000000000f1', 'http://hooks.example.com') $$,
  '23514',
  null,
  'webhook URLs must use HTTPS'
);

select lives_ok(
  $$ update public.webhooks set enabled = false where id = 'dddddddd-0000-0000-0000-0000000000f1' $$,
  'an owner can disable a webhook'
);

select throws_ok(
  $$ update public.webhooks set last_status = 200 where id = 'dddddddd-0000-0000-0000-0000000000f1' $$,
  '42501',
  null,
  'delivery results are written by the server only'
);

select throws_ok(
  $$ insert into public.webhooks (workspace_id, site_id, url, secret)
     values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-0000000000f1',
             'https://hooks.example.com/b', 'whsec_chosen') $$,
  '42501',
  null,
  'secrets are always generated'
);

select pg_temp.login('00000000-0000-0000-0000-0000000000f2');
select is_empty(
  $$ select id from public.webhooks $$,
  'members cannot see webhooks'
);

select pg_temp.login('00000000-0000-0000-0000-0000000000f3');
select is_empty(
  $$ select id from public.webhooks $$,
  'outsiders cannot see webhooks'
);

select * from finish();
rollback;
