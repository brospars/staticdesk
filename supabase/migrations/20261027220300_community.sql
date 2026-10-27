-- Comments, reactions (likes, "was this helpful?") and reviews posted from widgets.
--
-- Visitors may post anonymously. Visitor-facing reads and writes go through the
-- server API; RLS here covers dashboard access (moderation).
--
-- fingerprint_hash: salted, rotating hash of IP + user agent, used for rate
-- limiting, deduplication and blocking. Never shown to other visitors.
-- edit_token_hash: hash of a secret kept by the author (localStorage) to edit
-- or delete their own anonymous post.

create type public.moderation_status as enum ('pending', 'approved', 'rejected', 'spam');

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid not null,
  widget_id uuid,
  -- Stable page identifier (canonical path by default) and the URL it was posted from.
  page_id text not null check (char_length(page_id) between 1 and 500),
  page_url text check (char_length(page_url) <= 2000),
  parent_id uuid references public.comments (id) on delete cascade,
  is_anonymous boolean not null default false,
  author_name text check (char_length(author_name) <= 120),
  author_email text check (char_length(author_email) <= 320),
  body text not null check (char_length(body) between 1 and 10000),
  status public.moderation_status not null default 'pending',
  edit_token_hash text,
  fingerprint_hash text,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (site_id, workspace_id)
    references public.sites (id, workspace_id) on delete cascade,
  foreign key (widget_id, workspace_id)
    references public.widgets (id, workspace_id) on delete set null (widget_id),
  -- Anonymous comments carry no identity at all.
  check (not is_anonymous or (author_name is null and author_email is null))
);

create index comments_page_idx
  on public.comments (site_id, page_id, status, created_at);
create index comments_moderation_idx
  on public.comments (workspace_id, status, created_at desc);
create index comments_parent_id_idx on public.comments (parent_id);
create index comments_widget_id_idx on public.comments (widget_id);
create index comments_fingerprint_idx on public.comments (site_id, fingerprint_hash);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function private.set_updated_at();

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid not null,
  page_id text not null check (char_length(page_id) between 1 and 500),
  -- e.g. 'like', 'helpful', 'unhelpful', 'emoji:🎉'
  kind text not null check (char_length(kind) between 1 and 40),
  -- Optional free-text feedback (e.g. after "not helpful").
  comment text check (char_length(comment) <= 2000),
  fingerprint_hash text not null,
  created_at timestamptz not null default now(),
  foreign key (site_id, workspace_id)
    references public.sites (id, workspace_id) on delete cascade,
  unique (site_id, page_id, kind, fingerprint_hash)
);

create index reactions_page_idx on public.reactions (site_id, page_id, kind);
create index reactions_workspace_id_idx on public.reactions (workspace_id, created_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  site_id uuid not null,
  widget_id uuid,
  page_id text check (char_length(page_id) <= 500),
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) <= 200),
  body text check (char_length(body) <= 10000),
  is_anonymous boolean not null default false,
  author_name text check (char_length(author_name) <= 120),
  author_email text check (char_length(author_email) <= 320),
  status public.moderation_status not null default 'pending',
  edit_token_hash text,
  fingerprint_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (site_id, workspace_id)
    references public.sites (id, workspace_id) on delete cascade,
  foreign key (widget_id, workspace_id)
    references public.widgets (id, workspace_id) on delete set null (widget_id),
  check (not is_anonymous or (author_name is null and author_email is null))
);

create index reviews_site_idx on public.reviews (site_id, status, created_at desc);
create index reviews_moderation_idx on public.reviews (workspace_id, status, created_at desc);
create index reviews_widget_id_idx on public.reviews (widget_id);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function private.set_updated_at();

-- Fingerprints blocked by moderators.
create table public.blocked_fingerprints (
  id uuid not null default gen_random_uuid() unique,
  site_id uuid not null,
  workspace_id uuid not null,
  fingerprint_hash text not null,
  reason text check (char_length(reason) <= 500),
  blocked_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (site_id, fingerprint_hash),
  foreign key (site_id, workspace_id)
    references public.sites (id, workspace_id) on delete cascade
);

create index blocked_fingerprints_workspace_id_idx on public.blocked_fingerprints (workspace_id);

alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.reviews enable row level security;
alter table public.blocked_fingerprints enable row level security;

revoke all on public.comments, public.reactions, public.reviews, public.blocked_fingerprints from anon;

-- Moderators change the status only; content stays the author's.
revoke update on public.comments, public.reviews from authenticated;
grant update (status) on public.comments, public.reviews to authenticated;
-- Members never read secrets or raw fingerprints through the API.
revoke select on public.comments, public.reviews from authenticated;
grant select (
  id, workspace_id, site_id, widget_id, page_id, page_url, parent_id, is_anonymous,
  author_name, author_email, body, status, edited_at, created_at, updated_at
) on public.comments to authenticated;
grant select (
  id, workspace_id, site_id, widget_id, page_id, rating, title, body, is_anonymous,
  author_name, author_email, status, created_at, updated_at
) on public.reviews to authenticated;
revoke select on public.reactions from authenticated;
grant select (id, workspace_id, site_id, page_id, kind, comment, created_at)
  on public.reactions to authenticated;

create policy "Members can read comments"
  on public.comments for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Members can moderate comments"
  on public.comments for update to authenticated
  using ((select private.has_workspace_role(workspace_id)))
  with check ((select private.has_workspace_role(workspace_id)));

create policy "Owners and admins can delete comments"
  on public.comments for delete to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));

create policy "Members can read reactions"
  on public.reactions for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Owners and admins can delete reactions"
  on public.reactions for delete to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));

create policy "Members can read reviews"
  on public.reviews for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Members can moderate reviews"
  on public.reviews for update to authenticated
  using ((select private.has_workspace_role(workspace_id)))
  with check ((select private.has_workspace_role(workspace_id)));

create policy "Owners and admins can delete reviews"
  on public.reviews for delete to authenticated
  using ((select private.has_workspace_role(workspace_id, array['owner', 'admin']::public.member_role[])));

-- Blocking works on fingerprints that moderators never see: the server API
-- inserts rows from a comment or review id. Members can list and unblock.
create policy "Members can read blocked fingerprints"
  on public.blocked_fingerprints for select to authenticated
  using ((select private.has_workspace_role(workspace_id)));

create policy "Members can unblock fingerprints"
  on public.blocked_fingerprints for delete to authenticated
  using ((select private.has_workspace_role(workspace_id)));

revoke select on public.blocked_fingerprints from authenticated;
grant select (id, site_id, workspace_id, reason, blocked_by, created_at)
  on public.blocked_fingerprints to authenticated;
