-- Tie the full daily log to its day + link the Today log's "Tomorrow" field to tomorrow.
--
-- plan_note: a short note / intention attached to THIS day. The Today log's
--   "Tomorrow" field writes it onto *tomorrow's* row, so the morning planner
--   (get_planning_context) and the Today screen read "the note left for today."
-- extra:    the day's optional log fields (mood, wins, gratitude, + any custom
--   fields) and per-block completion (% + note), moved off browser localStorage
--   onto the dated row so nothing bleeds across days and the MCP can read it.
--
-- Both are additive + nullable; existing rows/policies/triggers are unaffected
-- (daily_logs already has deny-by-default RLS + an updated_at trigger).
alter table public.daily_logs
  add column if not exists plan_note text,
  add column if not exists extra     jsonb;

comment on column public.daily_logs.plan_note is
  'Note / intention for this day, typically written the night before via the Today log''s "Tomorrow" field.';
comment on column public.daily_logs.extra is
  'Optional per-day log fields (mood/wins/gratitude/custom) + block completion ({fields, blocks}); moved off localStorage so it is dated + MCP-readable.';
