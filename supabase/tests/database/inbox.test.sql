-- Tests for the shared inbox: search, email replies, suppressions, saved replies,
-- notification preferences and sending domains. Run with `npm run db:test`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner@inbox.dev'),
  ('00000000-0000-0000-0000-0000000000e2', 'member@inbox.dev'),
  ('00000000-0000-0000-0000-0000000000e3', 'outsider@inbox.dev');
insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-0000-0000-0000-0000000000e1', 'Inbox', 'inbox'),
  ('aaaaaaaa-0000-0000-0000-0000000000e2', 'Other', 'other-inbox');
insert into public.members (workspace_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1', 'owner'),
  ('aaaaaaaa-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2', 'member'),
  ('aaaaaaaa-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e3', 'owner');
insert into public.sites (id, workspace_id, name, public_key) values
  ('bbbbbbbb-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-0000000000e1', 'Docs', 'pk_test_inbox'),
  ('bbbbbbbb-0000-0000-0000-0000000000e2', 'aaaaaaaa-0000-0000-0000-0000000000e2', 'Other', 'pk_test_other_inbox');
insert into public.contacts (id, workspace_id, email, name) values
  ('cccccccc-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-0000000000e1', 'ada@inbox.test', 'Ada Lovelace'),
  ('cccccccc-0000-0000-0000-0000000000e2', 'aaaaaaaa-0000-0000-0000-0000000000e1', 'alan@example.com', null),
  ('cccccccc-0000-0000-0000-0000000000e3', 'aaaaaaaa-0000-0000-0000-0000000000e2', 'ada@inbox.test', null);
insert into public.threads (id, workspace_id, site_id, contact_id, subject, status, assignee_id, labels) values
  ('dddddddd-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-0000000000e1', 'bbbbbbbb-0000-0000-0000-0000000000e1',
   'cccccccc-0000-0000-0000-0000000000e1', 'Self-hosting question', 'open', null, '{question}'),
  ('dddddddd-0000-0000-0000-0000000000e2', 'aaaaaaaa-0000-0000-0000-0000000000e1', 'bbbbbbbb-0000-0000-0000-0000000000e1',
   'cccccccc-0000-0000-0000-0000000000e2', 'Typo', 'resolved', '00000000-0000-0000-0000-0000000000e2', '{docs,bug}'),
  ('dddddddd-0000-0000-0000-0000000000e3', 'aaaaaaaa-0000-0000-0000-0000000000e2', 'bbbbbbbb-0000-0000-0000-0000000000e2',
   'cccccccc-0000-0000-0000-0000000000e3', 'Other workspace', 'open', null, '{question}');
insert into public.messages (workspace_id, thread_id, direction, body) values
  ('aaaaaaaa-0000-0000-0000-0000000000e1', 'dddddddd-0000-0000-0000-0000000000e1', 'inbound', 'Can I use plain Postgres?'),
  ('aaaaaaaa-0000-0000-0000-0000000000e1', 'dddddddd-0000-0000-0000-0000000000e2', 'inbound', 'The install command is missing a dash'),
  ('aaaaaaaa-0000-0000-0000-0000000000e2', 'dddddddd-0000-0000-0000-0000000000e3', 'inbound', 'Postgres question from elsewhere');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Search -----------------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-0000000000e2');

select is(
  (select count(*)::int from public.search_threads('aaaaaaaa-0000-0000-0000-0000000000e1')),
  2,
  'search without filters lists the workspace threads'
);

select is(
  (select array_agg(id) from public.search_threads('aaaaaaaa-0000-0000-0000-0000000000e1', query => 'postgres')),
  array['dddddddd-0000-0000-0000-0000000000e1'::uuid],
  'full-text search matches message bodies'
);

select is(
  (select array_agg(id) from public.search_threads('aaaaaaaa-0000-0000-0000-0000000000e1', query => 'alan@')),
  array['dddddddd-0000-0000-0000-0000000000e2'::uuid],
  'search matches the contact email'
);

select is(
  (select count(*)::int from public.search_threads('aaaaaaaa-0000-0000-0000-0000000000e1', query => '100%')),
  0,
  'LIKE wildcards in the query are escaped'
);

select is(
  (select array_agg(id) from public.search_threads('aaaaaaaa-0000-0000-0000-0000000000e1', statuses => '{open,pending}')),
  array['dddddddd-0000-0000-0000-0000000000e1'::uuid],
  'search filters by status'
);

select is(
  (select array_agg(id) from public.search_threads('aaaaaaaa-0000-0000-0000-0000000000e1', unassigned => true)),
  array['dddddddd-0000-0000-0000-0000000000e1'::uuid],
  'search filters unassigned threads'
);

select is(
  (select array_agg(id) from public.search_threads('aaaaaaaa-0000-0000-0000-0000000000e1', label => 'bug')),
  array['dddddddd-0000-0000-0000-0000000000e2'::uuid],
  'search filters by label'
);

select is(
  (select array_agg(l) from public.workspace_thread_labels('aaaaaaaa-0000-0000-0000-0000000000e1') l),
  array['bug', 'docs', 'question'],
  'workspace labels are listed once, sorted'
);

select is(
  (select count(*)::int from public.search_threads('aaaaaaaa-0000-0000-0000-0000000000e2', query => 'postgres')),
  0,
  'search does not reach other workspaces'
);

-- Email replies --------------------------------------------------------------------------

select throws_ok(
  $$ select public.receive_email_reply('dddddddd-0000-0000-0000-0000000000e2', 'Thanks', '<x@mail>') $$,
  '42501',
  null,
  'dashboard users cannot store email replies'
);

reset role;
set local role service_role;

select isnt(
  public.receive_email_reply(
    thread_id => 'dddddddd-0000-0000-0000-0000000000e2',
    body => 'It still fails for me',
    email_message_id => '<reply-1@mail.example.com>',
    from_email => 'Alan@Example.com'
  ),
  null,
  'an email reply is stored'
);

select is(
  (select status::text from public.threads where id = 'dddddddd-0000-0000-0000-0000000000e2'),
  'open',
  'an email reply reopens a resolved thread'
);

select is(
  (select metadata->>'from' from public.messages where email_message_id = '<reply-1@mail.example.com>'),
  'alan@example.com',
  'the sender address is kept in the message metadata'
);

select is(
  public.receive_email_reply(
    thread_id => 'dddddddd-0000-0000-0000-0000000000e2',
    body => 'It still fails for me',
    email_message_id => '<reply-1@mail.example.com>'
  ),
  null,
  'a redelivered reply is ignored'
);

select throws_ok(
  $$ select public.receive_email_reply('dddddddd-0000-0000-0000-0000000000ff', 'Hi', '<y@mail>') $$,
  'P0002',
  'Unknown thread',
  'replies to unknown threads are rejected'
);

-- Suppressions --------------------------------------------------------------------------

select is(
  public.suppress_email(' ADA@inbox.test', 'Permanent bounce'),
  2,
  'a bounce suppresses the address in every workspace'
);

select is(
  (select email_suppression_reason from public.contacts where id = 'cccccccc-0000-0000-0000-0000000000e1'),
  'Permanent bounce',
  'the suppression reason is stored'
);

-- Notification preferences ----------------------------------------------------------------

select is(
  (select array_agg(e) from public.workspace_notification_emails('aaaaaaaa-0000-0000-0000-0000000000e1', 'new_thread') e),
  array['owner@inbox.dev', 'member@inbox.dev'],
  'by default every member hears about new threads'
);

select is(
  (select array_agg(e) from public.workspace_notification_emails(
    'aaaaaaaa-0000-0000-0000-0000000000e1', 'reply', 'dddddddd-0000-0000-0000-0000000000e2') e),
  array['member@inbox.dev'],
  'by default replies notify the assignee only'
);

select is(
  (select array_agg(e) from public.workspace_notification_emails(
    'aaaaaaaa-0000-0000-0000-0000000000e1', 'reply', 'dddddddd-0000-0000-0000-0000000000e1') e),
  array['owner@inbox.dev', 'member@inbox.dev'],
  'replies on unassigned threads notify everyone'
);

reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');

insert into public.notification_preferences (workspace_id, user_id, new_threads, daily_digest)
values ('aaaaaaaa-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e1', 'none', true);

select throws_ok(
  $$ insert into public.notification_preferences (workspace_id, user_id)
     values ('aaaaaaaa-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2') $$,
  '42501',
  null,
  'members cannot change the preferences of others'
);

select throws_ok(
  $$ insert into public.notification_preferences (workspace_id, user_id)
     values ('aaaaaaaa-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e1') $$,
  '42501',
  null,
  'preferences need a membership'
);

reset role;
set local role service_role;

select is(
  (select array_agg(e) from public.workspace_notification_emails('aaaaaaaa-0000-0000-0000-0000000000e1', 'new_thread') e),
  array['member@inbox.dev'],
  'members can opt out of new thread emails'
);

select is(
  (select array_agg(e) from public.workspace_notification_emails('aaaaaaaa-0000-0000-0000-0000000000e1', 'digest') e),
  array['owner@inbox.dev'],
  'the digest goes to members who opted in'
);

-- Saved replies ----------------------------------------------------------------------------

reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000e2');

insert into public.saved_replies (workspace_id, title, body)
values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'Thanks', 'Thanks for reaching out!');

select is(
  (select created_by from public.saved_replies where title = 'Thanks'),
  '00000000-0000-0000-0000-0000000000e2'::uuid,
  'saved replies record their author'
);

select pg_temp.login('00000000-0000-0000-0000-0000000000e3');

select is(
  (select count(*)::int from public.saved_replies),
  0,
  'saved replies are private to the workspace'
);

-- Sending domains ---------------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-0000000000e3');

select throws_ok(
  $$ insert into public.sending_domains (workspace_id, domain)
     values ('aaaaaaaa-0000-0000-0000-0000000000e2', 'example.com') $$,
  '42501',
  null,
  'sending domains are created by the server only'
);

select * from finish();
rollback;
