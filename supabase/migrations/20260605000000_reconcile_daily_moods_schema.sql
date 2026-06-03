-- Reconcile the daily_moods table with the columns the application actually uses.
--
-- Background:
--   * 20260602000000_advanced_habits.sql created daily_moods(date_local date, mood_score int 1..5).
--   * 20260604000000_fix_streaks_rls_and_security.sql tried to (re)create
--     daily_moods(day_local date, mood text) but used CREATE TABLE IF NOT EXISTS,
--     so on databases where the table already existed it was a NO-OP.
--   * The app (src/components/habits/DailyMoodCheckIn.tsx and HabitsAIAnalysis.tsx)
--     reads/writes day_local + mood (text). On a v1-shaped table those writes fail
--     and reads return null, silently losing the user's mood data.
--
-- This migration is idempotent and converges either shape to:
--   daily_moods(day_local date NOT NULL, mood text NOT NULL CHECK (...))
-- while preserving any existing rows.

-- 1. Ensure the table exists in the app-expected shape (no-op if already present).
create table if not exists public.daily_moods (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    day_local date,
    mood text,
    created_at timestamptz not null default now()
);

-- 2. Add the app-expected columns if an older shape is live.
alter table public.daily_moods add column if not exists day_local date;
alter table public.daily_moods add column if not exists mood text;

-- 3. Backfill day_local from the legacy date_local column when present.
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'daily_moods' and column_name = 'date_local'
    ) then
        update public.daily_moods
        set day_local = date_local
        where day_local is null and date_local is not null;
    end if;
end $$;

-- 4. Backfill mood (text) from the legacy mood_score column when present.
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'daily_moods' and column_name = 'mood_score'
    ) then
        update public.daily_moods
        set mood = case mood_score
            when 1 then 'tired'
            when 2 then 'sad'
            when 3 then 'neutral'
            when 4 then 'happy'
            when 5 then 'energetic'
            else 'neutral'
        end
        where mood is null and mood_score is not null;
    end if;
end $$;

-- 5. Drop NOT NULL on legacy columns so new inserts (day_local + mood only) succeed.
do $$
begin
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='daily_moods' and column_name='date_local') then
        alter table public.daily_moods alter column date_local drop not null;
    end if;
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='daily_moods' and column_name='mood_score') then
        alter table public.daily_moods alter column mood_score drop not null;
    end if;
end $$;

-- 6. Default any still-null mood before enforcing constraints.
update public.daily_moods set mood = 'neutral' where mood is null;

-- 7. Enforce NOT NULL on the app-expected columns (only when data allows).
do $$
begin
    if not exists (select 1 from public.daily_moods where day_local is null) then
        alter table public.daily_moods alter column day_local set not null;
    end if;
    if not exists (select 1 from public.daily_moods where mood is null) then
        alter table public.daily_moods alter column mood set not null;
    end if;
end $$;

-- 8. Enforce the allowed mood values (drop first so re-runs are safe).
alter table public.daily_moods drop constraint if exists daily_moods_mood_check;
alter table public.daily_moods
    add constraint daily_moods_mood_check
    check (mood in ('happy', 'neutral', 'tired', 'sad', 'energetic'));

-- 9. One mood row per user per day (the app upserts onConflict 'user_id, day_local').
do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'daily_moods_user_day_unique'
    ) then
        -- de-duplicate any pre-existing collisions, keeping the most recent row
        delete from public.daily_moods a
        using public.daily_moods b
        where a.user_id = b.user_id
          and a.day_local = b.day_local
          and a.created_at < b.created_at;
        alter table public.daily_moods
            add constraint daily_moods_user_day_unique unique (user_id, day_local);
    end if;
end $$;

-- 10. Supporting index for per-user/day lookups.
create index if not exists idx_daily_moods_user_day on public.daily_moods (user_id, day_local);

-- 11. Ensure RLS is enabled and the access policy exists (idempotent).
alter table public.daily_moods enable row level security;
drop policy if exists "Users can manage their own daily moods" on public.daily_moods;
drop policy if exists "Users manage own daily moods" on public.daily_moods;
create policy "Users manage own daily moods" on public.daily_moods
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
