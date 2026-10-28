-- Tests for the public API helpers. Run with `npm run db:test`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(13);

insert into public.workspaces (id, name, slug)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'Acme', 'acme-public');
insert into public.sites (id, workspace_id, name, public_key)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Docs', 'pk_test_public');
insert into public.widgets (id, workspace_id, site_id, kind, name) values
  ('cccccccc-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001', 'contact', 'Contact'),
  ('cccccccc-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   'bbbbbbbb-0000-0000-0000-000000000001', 'comments', 'Comments');

-- Rate limiting --------------------------------------------------------------------

set local role service_role;

select ok(public.hit_rate_limit('test:a', 60, 2), 'first hit is allowed');
select ok(public.hit_rate_limit('test:a', 60, 2), 'second hit is allowed');
select ok(not public.hit_rate_limit('test:a', 60, 2), 'third hit exceeds the limit');
select ok(public.hit_rate_limit('test:b', 60, 2), 'buckets are independent');

-- Contact submissions -------------------------------------------------------------

select isnt(
  public.submit_contact(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    'Ada@Example.com', 'Ada', e'Question about pricing\nMore details here.', '/pricing', 'https://docs.acme.dev/pricing'
  ),
  null,
  'a submission returns the thread id'
);

select is(
  (select email from public.contacts where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'ada@example.com',
  'the contact email is stored lowercased'
);

select is(
  (select subject from public.threads where site_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'Question about pricing',
  'the subject is the first line of the message'
);

select is(
  (select metadata->>'pageId' from public.messages m
   join public.threads t on t.id = m.thread_id
   where t.site_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  '/pricing',
  'the message records the page'
);

select is(
  (select count(*)::int from public.events
   where site_id = 'bbbbbbbb-0000-0000-0000-000000000001' and type = 'submit'),
  1,
  'a submit event is recorded'
);

select public.submit_contact(
  'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000002',
  'ada@example.com', null, 'Second message', '/', null
);

select is(
  (select count(*)::int from public.contacts where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  1,
  'the same email reuses the contact'
);

select is(
  (select name from public.contacts where workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Ada',
  'a missing name keeps the known one'
);

select is(
  (select widget_id from public.threads where subject = 'Second message'),
  null,
  'a widget that is not a contact widget of the site is ignored'
);

reset role;
set local role authenticated;
select throws_ok(
  $$ select public.submit_contact('bbbbbbbb-0000-0000-0000-000000000001', null, 'x@example.com', null, 'Hi', '/', null) $$,
  '42501',
  null,
  'dashboard users cannot call submit_contact'
);

select * from finish();
rollback;
