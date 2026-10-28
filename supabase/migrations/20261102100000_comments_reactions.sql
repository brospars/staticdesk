-- Comments and reactions widgets: author deletion and the counters they show.

-- Authors may delete their comment. A comment with replies stays as an empty
-- placeholder so the thread still reads well; the others are removed.
alter table public.comments add column deleted_at timestamptz;
alter table public.comments drop constraint comments_body_check;
alter table public.comments add constraint comments_body_check
  check (char_length(body) <= 10000 and (deleted_at is not null or char_length(body) >= 1));
alter table public.comments add constraint comments_deleted_check
  check (deleted_at is null or (body = '' and author_name is null and author_email is null));

grant select (deleted_at) on public.comments to authenticated;

-- Public counters of the emoji reactions of a page, as {"emoji:🎉": 3}.
-- "helpful" and "unhelpful" votes are only shown in the dashboard.
create function public.reaction_counts(site uuid, page text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(counts.kind, counts.total), '{}'::jsonb)
  from (
    select r.kind, count(*) as total
    from public.reactions r
    where r.site_id = reaction_counts.site
      and r.page_id = reaction_counts.page
      and r.kind like 'emoji:%'
    group by r.kind
  ) counts;
$$;

revoke all on function public.reaction_counts from public, anon, authenticated;
grant execute on function public.reaction_counts to service_role;

-- Feedback per page for the dashboard: helpful and unhelpful votes, emoji
-- totals and the number of written comments. Runs with the caller's
-- privileges, so members only see their workspaces.
create function public.page_feedback(ws uuid, site uuid default null, since timestamptz default null)
returns table (
  site_id uuid,
  page_id text,
  helpful bigint,
  unhelpful bigint,
  emojis jsonb,
  comments bigint,
  last_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with counts as (
    select r.site_id, r.page_id, r.kind, count(*) as total, count(r.comment) as comments, max(r.created_at) as last_at
    from public.reactions r
    where r.workspace_id = page_feedback.ws
      and (page_feedback.site is null or r.site_id = page_feedback.site)
      and (page_feedback.since is null or r.created_at >= page_feedback.since)
    group by r.site_id, r.page_id, r.kind
  )
  select
    counts.site_id,
    counts.page_id,
    coalesce(sum(counts.total) filter (where counts.kind = 'helpful'), 0)::bigint,
    coalesce(sum(counts.total) filter (where counts.kind = 'unhelpful'), 0)::bigint,
    coalesce(jsonb_object_agg(substr(counts.kind, 7), counts.total) filter (where counts.kind like 'emoji:%'), '{}'::jsonb),
    sum(counts.comments)::bigint,
    max(counts.last_at)
  from counts
  group by counts.site_id, counts.page_id
  order by max(counts.last_at) desc
  limit 500;
$$;

revoke all on function public.page_feedback from public, anon;
grant execute on function public.page_feedback to authenticated;
