-- Tests for comments and reactions. Run with `npm run db:test`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c1', 'owner@community.dev'),
  ('00000000-0000-0000-0000-0000000000c2', 'outsider@community.dev');
insert into public.workspaces (id, name, slug) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'Community', 'community'),
  ('aaaaaaaa-0000-0000-0000-0000000000c2', 'Other', 'other-community');
insert into public.members (workspace_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'member'),
  ('aaaaaaaa-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c2', 'owner');
insert into public.sites (id, workspace_id, name, public_key) values
  ('bbbbbbbb-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'Docs', 'pk_test_community'),
  ('bbbbbbbb-0000-0000-0000-0000000000c2', 'aaaaaaaa-0000-0000-0000-0000000000c2', 'Other', 'pk_test_other_community');

insert into public.reactions (workspace_id, site_id, page_id, kind, comment, fingerprint_hash) values
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c1', '/intro', 'helpful', null, 'fp1'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c1', '/intro', 'helpful', null, 'fp2'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c1', '/intro', 'unhelpful', 'Missing examples', 'fp3'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c1', '/intro', 'emoji:🎉', null, 'fp1'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c1', '/intro', 'emoji:🎉', null, 'fp2'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c1', '/other', 'emoji:🚀', null, 'fp1'),
  ('aaaaaaaa-0000-0000-0000-0000000000c2', 'bbbbbbbb-0000-0000-0000-0000000000c2', '/intro', 'helpful', null, 'fp1');

create function pg_temp.login(uid uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claim.sub', uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- Reaction counters -----------------------------------------------------------------

set local role service_role;

select is(
  public.reaction_counts('bbbbbbbb-0000-0000-0000-0000000000c1', '/intro'),
  '{"emoji:🎉": 2}'::jsonb,
  'public counters only include the emoji reactions of the page'
);
select is(
  public.reaction_counts('bbbbbbbb-0000-0000-0000-0000000000c1', '/missing'),
  '{}'::jsonb,
  'a page without reactions has no counters'
);
select throws_ok(
  $$ insert into public.reactions (workspace_id, site_id, page_id, kind, fingerprint_hash)
     values ('aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c1', '/intro', 'helpful', 'fp1') $$,
  '23505',
  null,
  'a visitor reacts once per kind and page'
);

reset role;

-- Dashboard feedback ------------------------------------------------------------------

select pg_temp.login('00000000-0000-0000-0000-0000000000c1');

select results_eq(
  $$ select page_id, helpful, unhelpful, emojis, comments
     from public.page_feedback('aaaaaaaa-0000-0000-0000-0000000000c1') order by page_id $$,
  $$ values ('/intro', 2::bigint, 1::bigint, '{"🎉": 2}'::jsonb, 1::bigint),
            ('/other', 0::bigint, 0::bigint, '{"🚀": 1}'::jsonb, 0::bigint) $$,
  'members get the feedback per page of their workspace'
);
select is(
  (select count(*)::int from public.page_feedback('aaaaaaaa-0000-0000-0000-0000000000c2')),
  0,
  'members cannot read the feedback of another workspace'
);
select is(
  (select count(*)::int from public.page_feedback('aaaaaaaa-0000-0000-0000-0000000000c1', since => now() + interval '1 day')),
  0,
  'feedback can be limited to a period'
);
select throws_ok(
  $$ select public.reaction_counts('bbbbbbbb-0000-0000-0000-0000000000c1', '/intro') $$,
  '42501',
  null,
  'members cannot call the public counters function'
);
select throws_ok(
  $$ select fingerprint_hash from public.reactions $$,
  '42501',
  null,
  'members cannot read reaction fingerprints'
);

-- Comments --------------------------------------------------------------------------------

reset role;

insert into public.comments (id, workspace_id, site_id, page_id, is_anonymous, author_name, body, status, edit_token_hash, fingerprint_hash) values
  ('dddddddd-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c1',
   '/intro', false, 'Ada', 'First!', 'approved', 'hash', 'fp1'),
  ('dddddddd-0000-0000-0000-0000000000c2', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-0000000000c1',
   '/intro', true, null, 'Anonymous question', 'pending', 'hash', 'fp2');

select throws_ok(
  $$ update public.comments set deleted_at = now() where id = 'dddddddd-0000-0000-0000-0000000000c1' $$,
  '23514',
  null,
  'a deleted comment cannot keep its content'
);
select lives_ok(
  $$ update public.comments set deleted_at = now(), body = '', author_name = null
     where id = 'dddddddd-0000-0000-0000-0000000000c1' $$,
  'a deleted comment keeps an empty placeholder'
);
select throws_ok(
  $$ update public.comments set body = '' where id = 'dddddddd-0000-0000-0000-0000000000c2' $$,
  '23514',
  null,
  'a published comment cannot be empty'
);

select pg_temp.login('00000000-0000-0000-0000-0000000000c1');

select lives_ok(
  $$ update public.comments set status = 'approved' where id = 'dddddddd-0000-0000-0000-0000000000c2' $$,
  'members can approve comments'
);
select throws_ok(
  $$ update public.comments set body = 'Edited' where id = 'dddddddd-0000-0000-0000-0000000000c2' $$,
  '42501',
  null,
  'members cannot change the content of a comment'
);

select pg_temp.login('00000000-0000-0000-0000-0000000000c2');

select is(
  (select count(*)::int from public.comments where workspace_id = 'aaaaaaaa-0000-0000-0000-0000000000c1'),
  0,
  'outsiders cannot read the comments of another workspace'
);

select * from finish();
rollback;
