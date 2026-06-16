-- 0005_brain_conversations.sql — saved chat threads for "Ask your brain"
--
-- Turns the flat brain_chats queue into resumable conversations: each chat row
-- now belongs to a conversation, so the app can list/reopen past threads and
-- feed prior turns back to the model for follow-up memory. Additive + reversible
-- (new table + nullable FK): existing brain_chats rows keep conversation_id NULL
-- and simply read as standalone one-off Q&As. Same access model as 0003_brain.sql:
-- RLS enabled deny-by-default; all access is server-side via the service-role key.
--
-- set_updated_at() already exists (from 0001_init.sql).

-- ── brain_conversations (one row per saved thread) ───────────────────────────
create table public.brain_conversations (
  id         uuid primary key default gen_random_uuid(),
  title      text,                                  -- derived from the first question
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger brain_conversations_updated_at before update on public.brain_conversations
  for each row execute function public.set_updated_at();
create index brain_conversations_updated_at_idx on public.brain_conversations(updated_at desc);

-- ── brain_chats.conversation_id (which thread each turn belongs to) ──────────
alter table public.brain_chats
  add column conversation_id uuid references public.brain_conversations(id) on delete cascade;
create index brain_chats_conversation_id_idx
  on public.brain_chats(conversation_id, created_at);

-- ── RLS: enable, deny-by-default (service-role bypasses; no anon/auth policies) ─
alter table public.brain_conversations enable row level security;
