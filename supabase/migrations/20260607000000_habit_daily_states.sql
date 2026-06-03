-- 1. Create State Enum
create type public.habit_state_type as enum ('completed', 'failed', 'avoided', 'frozen', 'pending');

-- 2. Create the unified states table
create table if not exists public.habit_daily_states (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    habit_id uuid not null references public.habits(id) on delete cascade,
    day_local date not null,
    state habit_state_type not null,
    tracking_value numeric,
    note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(habit_id, day_local)
);
create index habit_daily_states_user_day_idx on public.habit_daily_states(user_id, day_local);
create index habit_daily_states_habit_idx on public.habit_daily_states(habit_id);

alter table public.habit_daily_states enable row level security;

create policy "Users manage own daily states"
    on public.habit_daily_states for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create trigger habit_daily_states_touch_updated_at 
before update on public.habit_daily_states 
for each row execute function public.touch_updated_at();

-- 3. Migrate Data
-- Checkins -> completed
insert into public.habit_daily_states (id, user_id, habit_id, day_local, state, tracking_value, note, created_at)
select id, user_id, habit_id, day_local, 'completed'::habit_state_type, value, note, created_at
from public.habit_checkins
on conflict (habit_id, day_local) do nothing;

-- Freezes -> frozen
insert into public.habit_daily_states (id, user_id, habit_id, day_local, state, note, created_at)
select id, user_id, habit_id, freeze_day, 'frozen'::habit_state_type, reason, created_at
from public.habit_freezes
on conflict (habit_id, day_local) do nothing;

-- Relapses -> failed
insert into public.habit_daily_states (id, user_id, habit_id, day_local, state, note, created_at)
select id, user_id, habit_id, day_local, 'failed'::habit_state_type, reason, created_at
from public.habit_relapses
on conflict (habit_id, day_local) do nothing;

-- 4. Drop Old Tables and clean up functions referring to them
drop trigger if if exists habit_checkins_streak_trig on public.habit_checkins cascade;
drop trigger if if exists habit_relapses_streak_trig on public.habit_relapses cascade;
drop trigger if if exists habit_freezes_streak_trig on public.habit_freezes cascade;
drop function if exists public.trigger_recalculate_streak cascade;

drop table public.habit_checkins cascade;
drop table public.habit_relapses cascade;
drop table public.habit_freezes cascade;

-- 5. Optimized Recalculate Habit Streak without generate_series
create or replace function public.recalculate_habit_streak(target_habit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  h record;
  st record;
  prev_day date;
  run_len integer := 0;
  longest integer := 0;
  total_success integer := 0;
  last_success date;
  current_len integer := 0;
begin
  select * into h from public.habits where id = target_habit_id;
  if not found then return; end if;

  -- Iterate through states sorted by day_local
  for st in
    select day_local, state
    from public.habit_daily_states
    where habit_id = target_habit_id
    order by day_local asc
  loop
    if st.state = 'completed' or st.state = 'avoided' then
      -- Valid success day
      if prev_day is null or st.day_local = prev_day + 1 then
         run_len := run_len + 1;
      else
         -- gap means broken streak unless bridged by frozen days 
         -- Check if the gap contains any non-frozen days. If so, reset.
         -- Since we have explicit states, if there was no state recorded, it's a gap.
         -- Actually, with explicit states, every day should be recorded, but if not, we assume it's a failure (missed day)
         run_len := 1;
      end if;
      
      total_success := total_success + 1;
      last_success := st.day_local;
      longest := greatest(longest, run_len);
      
    elsif st.state = 'frozen' then
      -- Frozen days don't increment streak but don't break it. We just pretend the frozen day is adjacent
      -- to the next day for the purpose of continuity.
      -- So we do nothing to run_len, but keep it alive.
      null;
    elsif st.state = 'failed' or st.state = 'pending' then
      -- Streak broken
      run_len := 0;
    end if;

    prev_day := st.day_local;
  end loop;

  -- The current streak is alive if last_success was today, yesterday, or bridged by frozen days
  if last_success is null then
     current_len := 0;
  elsif last_success >= current_date - 1 then
     current_len := run_len;
  else
     -- Check if all days from last_success + 1 to yesterday are frozen
     if not exists (
         select 1 from public.habit_daily_states 
         where habit_id = target_habit_id 
           and day_local > last_success 
           and day_local < current_date 
           and state != 'frozen'
     ) then
         current_len := run_len;
     else
         current_len := 0;
     end if;
  end if;

  insert into public.habit_streaks (
    habit_id, user_id, current_streak, longest_streak, last_checkin_day, total_checkins, computed_at
  )
  values (
    h.id, h.user_id, current_len, longest, last_success, total_success, now()
  )
  on conflict (habit_id) do update set
    current_streak = excluded.current_streak,
    longest_streak = greatest(public.habit_streaks.longest_streak, excluded.longest_streak),
    last_checkin_day = excluded.last_checkin_day,
    total_checkins = excluded.total_checkins,
    computed_at = now();
end;
$$;

-- 6. Trigger for habit_daily_states
create function public.trigger_daily_states_streak()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_habit_streak(old.habit_id);
    return old;
  else
    perform public.recalculate_habit_streak(new.habit_id);
    return new;
  end if;
end;
$$;

create trigger habit_daily_states_streak_trig
after insert or update or delete on public.habit_daily_states
for each row execute function public.trigger_daily_states_streak();

-- 7. Secure Backend RPC
create or replace function public.log_habit_state(
  p_habit_id uuid,
  p_day_local date,
  p_state text,
  p_tracking_value numeric default null,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- verify ownership
  if not exists (select 1 from public.habits where id = p_habit_id and user_id = v_user_id) then
    raise exception 'Habit not found or unauthorized';
  end if;

  -- validate state
  if p_state not in ('completed', 'failed', 'avoided', 'frozen', 'pending') then
     raise exception 'Invalid state: %', p_state;
  end if;

  if p_state = 'pending' then
     delete from public.habit_daily_states 
     where habit_id = p_habit_id and day_local = p_day_local;
  else
     insert into public.habit_daily_states (
       user_id, habit_id, day_local, state, tracking_value, note
     ) values (
       v_user_id, p_habit_id, p_day_local, p_state::habit_state_type, p_tracking_value, p_note
     ) on conflict (habit_id, day_local) do update set
       state = excluded.state,
       tracking_value = excluded.tracking_value,
       note = excluded.note,
       updated_at = now();
  end if;
end;
$$;
