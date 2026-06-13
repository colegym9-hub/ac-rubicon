-- 0001_init.sql — AC Rubicon initial schema
-- 6 tables + effective-task-weight view + RLS.
--
-- Access model (see specs/TODO.md NEEDS ME): RLS is ENABLED and DENY-BY-DEFAULT.
-- There are no anon/authenticated policies on purpose — the app reaches the DB
-- only from the server using the SERVICE_ROLE key (which bypasses RLS), gated by
-- the app password. The browser never holds a Supabase client.

-- gen_random_uuid() is built into Postgres 13+ (no pgcrypto needed).

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── projects ──────────────────────────────────────────────────────────────
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  priority    smallint not null default 3 check (priority between 1 and 5),
  status      text not null default 'active' check (status in ('active','someday','done','archived')),
  category    text check (category in ('finite','system','habit','later')),
  brain_ref   text,
  target_date date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ── tasks (project_id NULL = one-off Inbox task) ────────────────────────────
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  project_id    uuid references public.projects(id) on delete set null,
  priority      smallint not null default 3 check (priority between 1 and 5),
  status        text not null default 'todo' check (status in ('todo','doing','done','blocked','dropped')),
  effort        text not null default 'slot' check (effort in ('quick','slot','deep')),
  est_minutes   integer check (est_minutes is null or est_minutes > 0),
  due           date,
  scheduled_for date,
  notes         text,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create index tasks_project_id_idx    on public.tasks(project_id);
create index tasks_status_idx        on public.tasks(status);
create index tasks_due_idx           on public.tasks(due);
create index tasks_scheduled_for_idx on public.tasks(scheduled_for);

-- ── tracking_metrics (adding a new thing to track = one row, no code change) ─
create table public.tracking_metrics (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  label      text not null,
  type       text not null check (type in ('bool','count','scale','duration','note')),
  active     boolean not null default true,
  sort       smallint not null default 0,
  created_at timestamptz not null default now()
);

-- ── tracking_entries (one row per metric per day) ───────────────────────────
create table public.tracking_entries (
  id         uuid primary key default gen_random_uuid(),
  metric_id  uuid not null references public.tracking_metrics(id) on delete cascade,
  date       date not null,
  value_num  double precision,
  value_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (metric_id, date)
);
create trigger tracking_entries_updated_at before update on public.tracking_entries
  for each row execute function public.set_updated_at();
create index tracking_entries_date_idx on public.tracking_entries(date);

-- ── daily_logs (nightly recap) ──────────────────────────────────────────────
create table public.daily_logs (
  id            uuid primary key default gen_random_uuid(),
  date          date not null unique,
  recap_text    text,
  slots_done    smallint,
  slots_slipped text,           -- free-text: which slots slipped + why (e.g. "deep-work block — late start")
  energy        smallint check (energy is null or energy between 1 and 5),
  parsed        jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger daily_logs_updated_at before update on public.daily_logs
  for each row execute function public.set_updated_at();

-- ── daily_plans (scheduler output) ──────────────────────────────────────────
create table public.daily_plans (
  id              uuid primary key default gen_random_uuid(),
  date            date not null unique,
  blocks          jsonb not null default '[]'::jsonb,
  source          text not null default 'auto' check (source in ('auto','edited')),
  calendar_synced boolean not null default false,
  rationale       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger daily_plans_updated_at before update on public.daily_plans
  for each row execute function public.set_updated_at();

-- ── effective-task-weight view ──────────────────────────────────────────────
-- v1 priority logic (TUNABLE — see NEEDS ME). Higher weight = surface sooner.
-- security_invoker = true so the view enforces the underlying tables' RLS
-- (anon sees nothing; service-role bypasses RLS and sees all).
create view public.task_weights with (security_invoker = true) as
select
  t.*,
  case
    when t.status in ('done','dropped') then 0
    else
        (t.priority * 20)
      + case
          when t.due is null                    then 0
          when t.due <= current_date            then 40   -- overdue / due today
          when t.due <= current_date + 2        then 25   -- next 2 days
          when t.due <= current_date + 7        then 12   -- this week
          else 0
        end
      + case t.effort when 'quick' then 3 else 0 end       -- nudge quick wins on ties
      + case t.status when 'doing' then 10 when 'blocked' then -30 else 0 end
  end as weight
from public.tasks t;

-- ── RLS: enable, deny-by-default (no policies = no anon/authenticated access) ─
alter table public.projects         enable row level security;
alter table public.tasks            enable row level security;
alter table public.tracking_metrics enable row level security;
alter table public.tracking_entries enable row level security;
alter table public.daily_logs       enable row level security;
alter table public.daily_plans      enable row level security;
