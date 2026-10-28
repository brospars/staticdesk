-- Development seed, loaded by `npm run db:reset`.
-- Sign in at http://localhost:3000 with dev@staticdesk.local / password.
-- Embed the demo widgets with data-site="pk_demo000000000000000000".

-- Dev user ---------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'dev@staticdesk.local',
  extensions.crypt('password', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{"name": "Dev User"}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'email',
  '{"sub": "11111111-1111-1111-1111-111111111111", "email": "dev@staticdesk.local", "email_verified": true}',
  now(), now(), now()
);

-- Workspace, site and widgets ----------------------------------------------------

insert into public.workspaces (id, name, slug) values
  ('22222222-2222-2222-2222-222222222222', 'Demo', 'demo');

insert into public.members (workspace_id, user_id, role) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'owner');

insert into public.sites (id, workspace_id, name, public_key, allowed_origins) values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Demo docs',
  'pk_demo000000000000000000',
  '{http://localhost:3000,http://localhost:4000,http://127.0.0.1:4000}'
);

insert into public.widgets (id, workspace_id, site_id, kind, name, config) values
  ('44444444-4444-4444-4444-000000000001', '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333', 'contact', 'Contact',
   '{"title": "Contact us", "fields": [{"id": "topic", "type": "select", "label": "Topic", "required": false, "options": ["Question", "Bug report", "Other"]}]}'),
  ('44444444-4444-4444-4444-000000000002', '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333', 'comments', 'Comments', '{"allowAnonymous": true, "moderation": "post"}'),
  ('44444444-4444-4444-4444-000000000003', '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333', 'reactions', 'Was this helpful?', '{"kinds": ["helpful", "unhelpful"]}'),
  ('44444444-4444-4444-4444-000000000004', '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333', 'reviews', 'Reviews', '{}');

-- Inbox --------------------------------------------------------------------------

insert into public.contacts (id, workspace_id, email, name) values
  ('55555555-5555-5555-5555-000000000001', '22222222-2222-2222-2222-222222222222', 'ada@example.com', 'Ada Lovelace'),
  ('55555555-5555-5555-5555-000000000002', '22222222-2222-2222-2222-222222222222', 'alan@example.com', 'Alan Turing');

insert into public.threads (id, workspace_id, site_id, widget_id, contact_id, subject, status, labels) values
  ('66666666-6666-6666-6666-000000000001', '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-000000000001',
   '55555555-5555-5555-5555-000000000001', 'Question about self-hosting', 'open', '{question}'),
  ('66666666-6666-6666-6666-000000000002', '22222222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-000000000001',
   '55555555-5555-5555-5555-000000000002', 'Typo on the install page', 'resolved', '{docs}');

insert into public.messages (workspace_id, thread_id, direction, author_id, body, created_at) values
  ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-000000000001', 'inbound', null,
   'Hi! Can I run StaticDesk with plain Postgres instead of Supabase?', now() - interval '2 hours'),
  ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-000000000001', 'note',
   '11111111-1111-1111-1111-111111111111', 'Link the self-hosting guide once it is published.', now() - interval '1 hour'),
  ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-000000000002', 'inbound', null,
   'The install command is missing a dash.', now() - interval '3 days'),
  ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-000000000002', 'outbound',
   '11111111-1111-1111-1111-111111111111', 'Fixed, thanks for the report!', now() - interval '2 days');

-- Messages above are backdated: align threads with their latest message.
update public.threads t
set last_message_at = m.latest
from (
  select thread_id, max(created_at) as latest
  from public.messages
  where direction <> 'note'
  group by thread_id
) m
where m.thread_id = t.id;

-- Comments, reactions and reviews --------------------------------------------------

insert into public.comments (workspace_id, site_id, widget_id, page_id, is_anonymous, author_name, body, status, fingerprint_hash) values
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-000000000002',
   '/getting-started', false, 'Grace', 'Clear and to the point, thanks!', 'approved', 'seed-fp-1'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-000000000002',
   '/getting-started', true, null, 'Does this work with Docusaurus 3?', 'approved', 'seed-fp-2'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-000000000002',
   '/getting-started', true, null, 'Buy cheap watches at spam.example', 'pending', 'seed-fp-3');

insert into public.reactions (workspace_id, site_id, page_id, kind, comment, fingerprint_hash) values
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '/getting-started', 'helpful', null, 'seed-fp-1'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '/getting-started', 'helpful', null, 'seed-fp-2'),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '/getting-started', 'unhelpful', 'Missing a Hugo example', 'seed-fp-4');

insert into public.reviews (workspace_id, site_id, widget_id, rating, title, body, author_name, status) values
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-000000000004',
   5, 'Exactly what our docs needed', 'Set up in five minutes on GitHub Pages.', 'Linus', 'approved');

-- Auto-reply and a few analytics events ---------------------------------------------

insert into public.auto_replies (workspace_id, name, subject, body) values (
  '22222222-2222-2222-2222-222222222222',
  'Acknowledgement',
  'We received your message',
  'Hi {{name}}, thanks for reaching out to {{site}}. We usually reply within one business day.'
);

insert into public.events (workspace_id, site_id, widget_id, type, page_id, occurred_at)
select
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-000000000001',
  (array['view', 'view', 'view', 'open', 'submit']::public.event_type[])[1 + (n % 5)],
  '/getting-started',
  now() - (n * interval '3 hours')
from generate_series(1, 200) as n;
