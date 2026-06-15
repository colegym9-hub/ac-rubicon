-- 0004_brain_loops.sql — CloudMD SOPs, project notes, ingest debounce lock, needs_review status.

-- ── brain_sops (the CloudMD) — general doc + per-routine docs; edited in-app, read by routines ──
create table public.brain_sops (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,        -- 'cloudmd' | 'ingest' | 'chat' | 'replan' | 'daily' | 'weekly'
  label      text not null,
  content_md text not null default '',
  sort       smallint not null default 0,
  updated_at timestamptz not null default now()
);
create trigger brain_sops_updated_at before update on public.brain_sops
  for each row execute function public.set_updated_at();
alter table public.brain_sops enable row level security;

-- ── project_notes — background context fed by the brain + added manually; read for planning ──
create table public.project_notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content_md text not null,
  source_id  uuid references public.raw_sources(id) on delete set null,  -- null = manual note
  created_at timestamptz not null default now()
);
create index project_notes_project_id_idx on public.project_notes(project_id, created_at desc);
alter table public.project_notes enable row level security;

-- ── brain_run_lock — single-row debounce for the process-brain ping (fire only if stale) ──
create table public.brain_run_lock (
  id       boolean primary key default true check (id),  -- check(id) + PK ⇒ exactly one row
  fired_at timestamptz not null default to_timestamp(0)
);
insert into public.brain_run_lock (id) values (true) on conflict (id) do nothing;
alter table public.brain_run_lock enable row level security;

-- ── raw_sources: add 'needs_review' (held until Cole routes it; never auto-files) ──
alter table public.raw_sources drop constraint raw_sources_status_check;
alter table public.raw_sources add constraint raw_sources_status_check
  check (status in ('raw','converting','converted','ingesting','ingested','needs_review','error'));
