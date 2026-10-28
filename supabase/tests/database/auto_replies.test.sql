-- Tests for auto-replies: rules, opening hours, deliveries and follow-up reminders.
-- Run with `npm run db:test`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(22);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'owner@auto.dev'),
  ('00000000-0000-0000-0000-0000000000f2', 'member@auto.dev'),
  ('00000000-0000-0000-0000-0000000000f3', 'outsider@auto.dev');
insert into public.workspaces (id, name, slug, follow_up_hours) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'Auto', 'auto', 4),
  ('aaaaaaaa-0000-0000-0000-0000000000f2', 'Other', 'other-auto', null);
insert into public.members (workspace_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1', 'owner'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2', 'member'),
  ('aaaaaaaa-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f3', 'owner');
insert into public.sites (id, workspace_id, name, public_key) values
  ('bbbbbbbb-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'Docs', 'pk_test_auto'),
  ('bbbbbbbb-0000-0000-0000-0000000000f2', 'aaaaaaaa-0000-0000-0000-0000000000f2', 'Other', 'pk_test_other_auto');
insert into public.contacts (id, workspace_id, email) values
  ('cccccccc-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'ada@auto.test'),
  ('cccccccc-0000-0000-0000-0000000000f2', 'aaaaaaaa-0000-0000-0000-0000000000f2', 'alan@auto.test');
insert into public.threads (id, workspace_id, site_id, contact_id, subject, status) values
  -- Waiting for 5 hours: due for a reminder.
  ('dddddddd-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-0000000000f1',
   'cccccccc-0000-0000-0000-0000000000f1', 'Waiting', 'open'),
  -- Answered by the team.
  ('dddddddd-0000-0000-0000-0000000000f2', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-0000000000f1',
   'cccccccc-0000-0000-0000-0000000000f1', 'Answered', 'open'),
  -- Recent message.
  ('dddddddd-0000-0000-0000-0000000000f3', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-0000000000f1',
   'cccccccc-0000-0000-0000-0000000000f1', 'Recent', 'open'),
  -- Workspace without reminders.
  ('dddddddd-0000-0000-0000-0000000000f4', 'aaaaaaaa-0000-0000-0000-0000000000f2', 'bbbbbbbb-0000-0000-0000-0000000000f2',
   'cccccccc-0000-0000-0000-0000000000f2', 'Elsewhere', 'open');
insert into public.messages (workspace_id, thread_id, direction, author_id, body, metadata, created_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f1', 'inbound', null, 'Hello?', '{}', now() - interval '5 hours'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f2', 'inbound', null, 'Hi', '{}', now() - interval '6 hours'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f2', 'outbound', '00000000-0000-0000-0000-0000000000f1', 'Answer', '{}', now() - interval '5 hours'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f3', 'inbound', null, 'Just now', '{}', now() - interval '1 hour'),
  ('aaaaaaaa-0000-0000-0000-0000000000f2', 'dddddddd-0000-0000-0000-0000000000f4', 'inbound', null, 'Old', '{}', now() - interval '3 days');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Automatic messages ---------------------------------------------------------------------

select lives_ok(
  $$ insert into public.messages (workspace_id, thread_id, direction, body, metadata, created_at)
     values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f1', 'outbound',
             'We received your message', '{"autoReply": {"id": "x", "name": "Ack"}}', now() - interval '5 hours') $$,
  'auto-replies are outbound messages without an author'
);

select throws_ok(
  $$ insert into public.messages (workspace_id, thread_id, direction, body)
     values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f1', 'outbound', 'Who wrote this?') $$,
  '23514', null,
  'other outbound messages still need an author'
);

-- Rules ------------------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.auto_replies (workspace_id, name, send_email) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'No email', true) $$,
  '23514', null,
  'a rule that sends an email needs a subject and a body'
);

select lives_ok(
  $$ insert into public.auto_replies (workspace_id, name, send_email, add_labels, assignee_id)
     values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'Label only', false, '{billing}', '00000000-0000-0000-0000-0000000000f2') $$,
  'a rule can label and assign without an email'
);

select throws_ok(
  $$ insert into public.auto_replies (workspace_id, name, send_email, assignee_id)
     values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'Outsider', false, '00000000-0000-0000-0000-0000000000f3') $$,
  '23503', null,
  'rules only assign members of their workspace'
);

insert into public.auto_replies (id, workspace_id, name, subject, body, delay_minutes) values
  ('eeeeeeee-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'Ack', 'Thanks', 'Hi {{name}}', 0),
  ('eeeeeeee-0000-0000-0000-0000000000f2', 'aaaaaaaa-0000-0000-0000-0000000000f2', 'Other ack', 'Thanks', 'Hi', 0);

select pg_temp.login('00000000-0000-0000-0000-0000000000f2');

select is(
  (select count(*)::int from public.auto_replies),
  2,
  'members read the rules of their workspace only'
);

select is_empty(
  $$ update public.auto_replies set name = 'Hacked' where id = 'eeeeeeee-0000-0000-0000-0000000000f1' returning id $$,
  'members cannot change rules'
);

select is_empty(
  $$ update public.workspaces set follow_up_hours = 1 where id = 'aaaaaaaa-0000-0000-0000-0000000000f1' returning id $$,
  'members cannot change the opening hours or reminders'
);

select pg_temp.login('00000000-0000-0000-0000-0000000000f1');

select lives_ok(
  $$ update public.workspaces
     set opening_hours = '{"enabled": true, "timezone": "Europe/Paris", "days": []}', follow_up_hours = 4
     where id = 'aaaaaaaa-0000-0000-0000-0000000000f1' $$,
  'owners set the opening hours and reminders'
);

select throws_ok(
  $$ update public.workspaces set follow_up_hours = 0 where id = 'aaaaaaaa-0000-0000-0000-0000000000f1' $$,
  '23514', null,
  'reminders need at least one hour'
);

select throws_ok(
  $$ update public.workspaces set opening_hours = '[]' where id = 'aaaaaaaa-0000-0000-0000-0000000000f1' $$,
  '23514', null,
  'opening hours are an object'
);

select lives_ok(
  $$ update public.auto_replies set add_labels = '{vip}', position = 3 where id = 'eeeeeeee-0000-0000-0000-0000000000f1' $$,
  'owners change rules'
);

select throws_ok(
  $$ insert into public.auto_reply_deliveries (workspace_id, thread_id, auto_reply_id)
     values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f3', 'eeeeeeee-0000-0000-0000-0000000000f1') $$,
  '42501', null,
  'deliveries are written by the server only'
);

reset role;

-- Deliveries --------------------------------------------------------------------------------

insert into public.auto_reply_deliveries (workspace_id, thread_id, auto_reply_id, send_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f1', 'eeeeeeee-0000-0000-0000-0000000000f1', now() - interval '1 minute'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f3', 'eeeeeeee-0000-0000-0000-0000000000f1', now() + interval '1 hour'),
  ('aaaaaaaa-0000-0000-0000-0000000000f2', 'dddddddd-0000-0000-0000-0000000000f4', 'eeeeeeee-0000-0000-0000-0000000000f2', now() - interval '1 minute');

select throws_ok(
  $$ insert into public.auto_reply_deliveries (workspace_id, thread_id, auto_reply_id)
     values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f1', 'eeeeeeee-0000-0000-0000-0000000000f1') $$,
  '23505', null,
  'one auto-reply per conversation'
);

select is(
  (select array_agg(thread_id order by thread_id) from public.claim_auto_reply_deliveries(thread => 'dddddddd-0000-0000-0000-0000000000f1')),
  array['dddddddd-0000-0000-0000-0000000000f1'::uuid],
  'claiming a thread returns its due delivery'
);

select is(
  (select array_agg(thread_id) from public.claim_auto_reply_deliveries()),
  array['dddddddd-0000-0000-0000-0000000000f4'::uuid],
  'claimed and future deliveries are not returned again'
);

select is(
  (select status from public.auto_reply_deliveries where thread_id = 'dddddddd-0000-0000-0000-0000000000f1'),
  'sending',
  'claimed deliveries are marked as sending'
);

select pg_temp.login('00000000-0000-0000-0000-0000000000f2');

select is(
  (select count(*)::int from public.auto_reply_deliveries),
  2,
  'members see the deliveries of their workspace'
);

select throws_ok(
  $$ select public.claim_auto_reply_deliveries() $$,
  '42501', null,
  'only the server claims deliveries'
);

reset role;

-- Follow-up reminders --------------------------------------------------------------------------

select is(
  (select array_agg(thread_id) from public.claim_follow_up_reminders()),
  array['dddddddd-0000-0000-0000-0000000000f1'::uuid],
  'reminds about open conversations waiting longer than the delay, ignoring auto-replies'
);

select is_empty(
  $$ select * from public.claim_follow_up_reminders() $$,
  'reminds once per visitor message'
);

-- now() is fixed within the test transaction: pretend the reminder went out earlier.
update public.threads set follow_up_notified_at = now() - interval '5 hours'
where id = 'dddddddd-0000-0000-0000-0000000000f1';
insert into public.messages (workspace_id, thread_id, direction, body, created_at) values
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'dddddddd-0000-0000-0000-0000000000f1', 'inbound', 'Anyone?', now() - interval '4 hours 30 minutes');

select is(
  (select array_agg(thread_id) from public.claim_follow_up_reminders()),
  array['dddddddd-0000-0000-0000-0000000000f1'::uuid],
  'reminds again after a new visitor message'
);

select * from finish();
rollback;
