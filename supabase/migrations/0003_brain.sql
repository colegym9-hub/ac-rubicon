-- 0003_brain.sql — AC Rubicon second-brain (cloud)
--
-- Moves the markdown brain into Supabase: raw sources + the Claude-maintained
-- wiki + the small queues the Claude Code routines work off. Retrieval is
-- Postgres FULL-TEXT SEARCH (generated tsvector + GIN) — no embeddings, no
-- pgvector, no OpenAI. Same access model as 0001_init.sql: RLS enabled
-- deny-by-default; all access is server-side via the service-role key; the
-- browser never holds a Supabase client (capture/chat status is polled through
-- API routes).
--
-- set_updated_at() already exists (from 0001_init.sql). The generated tsvector
-- columns use the literal 'english' config so they stay IMMUTABLE.

-- ── raw_sources (immutable inputs; one row per capture) ──────────────────────
create table public.raw_sources (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in
                ('note','youtube','instagram','tiktok','article','voice','image','chat_answer')),
  title       text,
  raw_input   text not null,                 -- the URL, typed text, or Storage path
  content_md  text,                          -- converted markdown (null until converted)
  status      text not null default 'raw' check (status in
                ('raw','converting','converted','ingesting','ingested','error')),
  error_msg   text,
  retry_count smallint not null default 0,
  source_date date,
  tags        text[] not null default '{}',
  token_est   integer,
  fts         tsvector generated always as (
                to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content_md,''))
              ) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger raw_sources_updated_at before update on public.raw_sources
  for each row execute function public.set_updated_at();
create index raw_sources_status_idx     on public.raw_sources(status);
create index raw_sources_type_idx       on public.raw_sources(type);
create index raw_sources_created_at_idx on public.raw_sources(created_at desc);
create index raw_sources_fts_idx        on public.raw_sources using gin(fts);

-- ── wiki_pages (Claude-maintained knowledge base) ───────────────────────────
-- domain is free text (grouped in the UI). Expected values mirror the brain's
-- CLAUDE.md taxonomy: 'A.C Media', 'BU', 'Content', 'Coursework', 'Personal Ops'
-- (left unconstrained so a seed can't fail on an unforeseen domain).
create table public.wiki_pages (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  domain           text not null,
  overview         text,
  content_md       text,
  related_slugs    text[] not null default '{}',
  status           text not null default 'active' check (status in ('active','draft','archived')),
  pinned           boolean not null default false,
  version          integer not null default 1,
  last_ingested_at timestamptz,
  fts              tsvector generated always as (
                     to_tsvector('english',
                       coalesce(title,'') || ' ' || coalesce(overview,'') || ' ' || coalesce(content_md,''))
                   ) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger wiki_pages_updated_at before update on public.wiki_pages
  for each row execute function public.set_updated_at();
create index wiki_pages_domain_idx     on public.wiki_pages(domain);
create index wiki_pages_status_idx     on public.wiki_pages(status);
create index wiki_pages_updated_at_idx on public.wiki_pages(updated_at desc);
create index wiki_pages_fts_idx        on public.wiki_pages using gin(fts);

-- ── raw_source_wiki_pages (which sources fed which pages; append-only) ───────
create table public.raw_source_wiki_pages (
  id           uuid primary key default gen_random_uuid(),
  source_id    uuid not null references public.raw_sources(id) on delete cascade,
  page_id      uuid not null references public.wiki_pages(id) on delete cascade,
  contribution text not null default 'added' check (contribution in ('added','updated','confirmed')),
  page_version integer not null default 1,
  created_at   timestamptz not null default now(),
  unique (source_id, page_id)
);
create index rswp_page_id_idx   on public.raw_source_wiki_pages(page_id);
create index rswp_source_id_idx on public.raw_source_wiki_pages(source_id);

-- ── brain_log (append-only activity ledger; never UPDATE/DELETE) ─────────────
create table public.brain_log (
  id          uuid primary key default gen_random_uuid(),
  operation   text not null check (operation in
                ('ingest','query','lint','create','update','archive','error')),
  target_type text check (target_type in ('raw_source','wiki_page','brain')),
  target_id   uuid,
  summary     text not null,
  meta        jsonb not null default '{}'::jsonb,
  model       text,
  tokens_used integer,
  created_at  timestamptz not null default now()
);
create index brain_log_created_at_idx on public.brain_log(created_at desc);
create index brain_log_operation_idx  on public.brain_log(operation);

-- ── brain_reports (weekly lint + insight cards; one per kind per week) ───────
create table public.brain_reports (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('lint','insight')),
  week_of       date not null,
  status        text not null default 'pending' check (status in ('pending','done','error')),
  issues        jsonb not null default '[]'::jsonb,
  summary       text,
  model_used    text,
  input_tokens  integer,
  output_tokens integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (kind, week_of)
);
create trigger brain_reports_updated_at before update on public.brain_reports
  for each row execute function public.set_updated_at();

-- ── brain_snippets (key facts surfaced into planning context) ───────────────
create table public.brain_snippets (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,
  label        text not null,
  value        text not null,
  active       boolean not null default true,
  sort         smallint not null default 0,
  wiki_page_id uuid references public.wiki_pages(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger brain_snippets_updated_at before update on public.brain_snippets
  for each row execute function public.set_updated_at();
create index brain_snippets_active_idx on public.brain_snippets(active, sort) where active = true;

-- ── brain_chats (routine-driven chat queue: app asks → routine answers → poll) ─
create table public.brain_chats (
  id         uuid primary key default gen_random_uuid(),
  question   text not null,
  answer     text,
  status     text not null default 'pending' check (status in
               ('pending','answering','answered','error')),
  citations  jsonb not null default '[]'::jsonb,   -- [{slug,title}] of wiki pages used
  error_msg  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger brain_chats_updated_at before update on public.brain_chats
  for each row execute function public.set_updated_at();
create index brain_chats_status_idx     on public.brain_chats(status);
create index brain_chats_created_at_idx on public.brain_chats(created_at desc);

-- ── replan_requests (routine-driven two-question "re-plan from now" queue) ────
create table public.replan_requests (
  id           uuid primary key default gen_random_uuid(),
  plan_date    date not null,
  what_changed text,                          -- answer 1: what changed
  time_left    text,                          -- answer 2: time left today
  status       text not null default 'pending' check (status in
                 ('pending','planning','done','error')),
  error_msg    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger replan_requests_updated_at before update on public.replan_requests
  for each row execute function public.set_updated_at();
create index replan_requests_status_idx on public.replan_requests(status);

-- ── RLS: enable, deny-by-default (service-role bypasses; no anon/auth policies) ─
alter table public.raw_sources           enable row level security;
alter table public.wiki_pages            enable row level security;
alter table public.raw_source_wiki_pages enable row level security;
alter table public.brain_log             enable row level security;
alter table public.brain_reports         enable row level security;
alter table public.brain_snippets        enable row level security;
alter table public.brain_chats           enable row level security;
alter table public.replan_requests       enable row level security;
