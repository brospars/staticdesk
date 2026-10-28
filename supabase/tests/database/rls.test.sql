-- Row level security tests. Run with `pnpm db:test` (supabase test db).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(27);

-- Fixtures -------------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'owner@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'admin@test.dev'),
  ('00000000-0000-0000-0000-00000000000c', 'member@test.dev'),
  ('00000000-0000-0000-0000-00000000000d', 'outsider@test.dev');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

create function pg_temp.logout() returns void language sql as $$
  select set_config('role', 'postgres', true),
         set_config('request.jwt.claim.sub', '', true),
         set_config('request.jwt.claims', '', true);
$$;

-- Every public table has RLS ----------------------------------------------------

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'every public table has row level security enabled'
);

-- Workspaces ------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$ select public.create_workspace('Acme', 'acme') $$,
  'an authenticated user can create a workspace'
);
select is(
  (select role::text from public.members m join public.workspaces w on w.id = m.workspace_id
   where w.slug = 'acme' and m.user_id = '00000000-0000-0000-0000-00000000000a'),
  'owner',
  'the creator becomes owner'
);
select lives_ok(
  $$ insert into public.members (workspace_id, user_id, role)
     select id, '00000000-0000-0000-0000-00000000000b', 'admin' from public.workspaces where slug = 'acme' $$,
  'an owner can add an admin'
);
select lives_ok(
  $$ insert into public.members (workspace_id, user_id, role)
     select id, '00000000-0000-0000-0000-00000000000c', 'member' from public.workspaces where slug = 'acme' $$,
  'an owner can add a member'
);
select is(
  (select count(*)::int from public.members),
  3,
  'the workspace has three members'
);
select lives_ok(
  $$ insert into public.sites (workspace_id, name, allowed_origins)
     select id, 'Docs', '{https://docs.acme.dev}' from public.workspaces where slug = 'acme' $$,
  'an owner can create a site'
);
select matches(
  (select public_key from public.sites where name = 'Docs'),
  '^pk_[0-9a-f]{24}$',
  'sites get a generated public key'
);

-- Outsiders and anonymous users -----------------------------------------------

select pg_temp.logout();
create temp table fixture as select id as workspace_id from public.workspaces where slug = 'acme';
grant select on fixture to authenticated;

select pg_temp.login('00000000-0000-0000-0000-00000000000d');
select is_empty($$ select 1 from public.workspaces $$, 'an outsider sees no workspace');
select is_empty($$ select 1 from public.sites $$, 'an outsider sees no site');
select throws_ok(
  $$ insert into public.members (workspace_id, user_id, role)
     select workspace_id, '00000000-0000-0000-0000-00000000000d', 'owner' from fixture $$,
  '42501',
  null,
  'an outsider cannot add themselves to a workspace'
);

select pg_temp.logout();
set local role anon;
select throws_ok(
  $$ select 1 from public.workspaces $$,
  '42501',
  null,
  'anon has no access to workspaces'
);
select throws_ok(
  $$ select 1 from public.comments $$,
  '42501',
  null,
  'anon has no access to comments'
);
select pg_temp.logout();

-- Roles ------------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select isnt_empty($$ select 1 from public.sites where name = 'Docs' $$, 'a member can read sites');
select is_empty(
  $$ update public.sites set name = 'Hacked' where name = 'Docs' returning 1 $$,
  'a member cannot update sites'
);

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$ insert into public.members (workspace_id, user_id, role)
     select id, '00000000-0000-0000-0000-00000000000d', 'owner' from public.workspaces where slug = 'acme' $$,
  '42501',
  null,
  'an admin cannot add an owner'
);
select is_empty(
  $$ delete from public.members where user_id = '00000000-0000-0000-0000-00000000000a' returning 1 $$,
  'an admin cannot remove an owner'
);
select lives_ok(
  $$ insert into public.widgets (workspace_id, site_id, kind, name)
     select workspace_id, id, 'comments', 'Comments' from public.sites where name = 'Docs' $$,
  'an admin can create a widget'
);

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ delete from public.members where user_id = '00000000-0000-0000-0000-00000000000a';
     set constraints all immediate $$,
  '23514',
  null,
  'the last owner cannot leave the workspace'
);

-- Members list -------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select is(
  (select count(*)::int from public.workspace_members((select workspace_id from fixture))),
  3,
  'a member can list the members of their workspace'
);
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
select is_empty(
  $$ select * from public.workspace_members((select workspace_id from fixture)) $$,
  'an outsider cannot list members'
);

-- Community content ------------------------------------------------------------

select pg_temp.logout();
insert into public.comments (workspace_id, site_id, page_id, is_anonymous, body, fingerprint_hash, edit_token_hash)
select workspace_id, id, '/intro', true, 'Anonymous comment', 'fp_secret', 'tok_secret'
from public.sites where name = 'Docs';

select throws_ok(
  $$ insert into public.comments (workspace_id, site_id, page_id, is_anonymous, author_name, body)
     select workspace_id, id, '/intro', true, 'Ada', 'Hello' from public.sites where name = 'Docs' $$,
  '23514',
  null,
  'an anonymous comment cannot carry an author name'
);

select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$ update public.comments set status = 'approved' where page_id = '/intro' $$,
  'a member can approve a comment'
);
select throws_ok(
  $$ update public.comments set body = 'Edited' where page_id = '/intro' $$,
  '42501',
  null,
  'a member cannot rewrite a comment'
);
select throws_ok(
  $$ select fingerprint_hash from public.comments $$,
  '42501',
  null,
  'members cannot read visitor fingerprints'
);

-- Inbox --------------------------------------------------------------------------

select pg_temp.logout();
insert into public.contacts (workspace_id, email)
select id, 'visitor@example.com' from public.workspaces where slug = 'acme';
insert into public.threads (workspace_id, site_id, contact_id, subject)
select s.workspace_id, s.id, c.id, 'Question'
from public.sites s join public.contacts c on c.workspace_id = s.workspace_id
where s.name = 'Docs';

select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select lives_ok(
  $$ insert into public.messages (workspace_id, thread_id, direction, author_id, body)
     select workspace_id, id, 'note', '00000000-0000-0000-0000-00000000000c', 'Internal note'
     from public.threads where subject = 'Question' $$,
  'a member can add an internal note'
);
select throws_ok(
  $$ insert into public.messages (workspace_id, thread_id, direction, author_id, body)
     select workspace_id, id, 'outbound', '00000000-0000-0000-0000-00000000000c', 'Reply'
     from public.threads where subject = 'Question' $$,
  '42501',
  null,
  'outbound messages are created by the server only'
);

select * from finish();
rollback;
