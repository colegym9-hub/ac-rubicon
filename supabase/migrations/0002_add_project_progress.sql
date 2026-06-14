-- 0002: project progress — a manual slider value, or auto-computed from subtasks.
-- progress_mode = 'auto'  → progress shown = % of the project's tasks marked done
--                 'manual' → progress shown = this stored value (the slider)
alter table public.projects
  add column if not exists progress smallint not null default 0 check (progress between 0 and 100),
  add column if not exists progress_mode text not null default 'auto' check (progress_mode in ('auto','manual'));
