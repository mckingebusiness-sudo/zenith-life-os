-- Performance indexes for the habits month-range queries.
-- The month grid / analytics fetch rows by user_id over a date range across
-- habit_checkins, habit_freezes and habit_relapses. The existing indexes are on
-- (habit_id, <day>), so user-scoped range scans fall back to less efficient
-- plans as history grows, risking the 8s/15s fetch abort. These composite
-- indexes match the actual access pattern.
--
-- NOTE: habit_freezes stores the date in column `freeze_day` (not `day_local`).

create index if not exists idx_habit_checkins_user_day
    on public.habit_checkins (user_id, day_local);

create index if not exists idx_habit_freezes_user_day
    on public.habit_freezes (user_id, freeze_day);

create index if not exists idx_habit_relapses_user_day
    on public.habit_relapses (user_id, day_local);
