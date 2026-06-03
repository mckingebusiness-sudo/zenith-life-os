create extension if not exists pgcrypto;

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  icon text default '✨',
  color text not null default 'green',
  cadence text not null default 'daily' check (cadence in ('daily', 'weekly', 'monthly', 'times_per_week')),
  target_per_period integer not null default 1,
  active_weekdays integer[] not null default array[0,1,2,3,4,5,6],
  grace_days integer not null default 0,
  is_private boolean not null default false,
  sort_order integer not null default 0,
  habit_type text not null default 'good' check (habit_type in ('good', 'quit')),
  saved_value_per_day numeric,
  saved_unit text,
  is_paused boolean not null default false,
  pause_until date,
  tracking_type text not null default 'checkbox' check (tracking_type in ('checkbox', 'quantitative')),
  target_value numeric,
  target_unit text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_local date not null,
  value numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, day_local)
);

create table if not exists public.habit_freezes (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  freeze_day date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (habit_id, freeze_day)
);

create table if not exists public.habit_relapses (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_local date not null default current_date,
  reason text,
  created_at timestamptz not null default now(),
  unique (habit_id, day_local)
);

create table if not exists public.habit_streaks (
  habit_id uuid primary key references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_checkin_day date,
  total_checkins integer not null default 0,
  computed_at timestamptz not null default now()
);

create table if not exists public.habit_journals (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_local date not null,
  journal_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, day_local)
);

create table if not exists public.monthly_recoveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_local text not null check (month_local ~ '^\d{4}-\d{2}$'),
  recovered_habit_id uuid references public.habits(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, month_local)
);



create index if not exists habits_user_sort_idx on public.habits(user_id, is_deleted, sort_order);
create index if not exists habit_checkins_habit_day_idx on public.habit_checkins(habit_id, day_local);
create index if not exists habit_freezes_habit_day_idx on public.habit_freezes(habit_id, freeze_day);
create index if not exists habit_relapses_habit_day_idx on public.habit_relapses(habit_id, day_local);


create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists habits_touch_updated_at on public.habits;
create trigger habits_touch_updated_at
before update on public.habits
for each row execute function public.touch_updated_at();

drop trigger if exists habit_journals_touch_updated_at on public.habit_journals;
create trigger habit_journals_touch_updated_at
before update on public.habit_journals
for each row execute function public.touch_updated_at();



create or replace function public.recalculate_habit_streak(target_habit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  h record;
  d date;
  prev_day date;
  run_len integer := 0;
  longest integer := 0;
  current_len integer := 0;
  last_success date;
  total_success integer := 0;
begin
  select * into h from public.habits where id = target_habit_id;
  if not found then
    return;
  end if;

  if h.habit_type = 'quit' then
    -- Quit habit: every non-frozen, non-relapsed day since creation = success
    -- Frozen days are skipped (not counted, don't break streak)
    for d in
      select gs::date
      from generate_series(h.created_at::date, current_date, interval '1 day') gs
      where not exists (
        select 1 from public.habit_freezes f
        where f.habit_id = h.id and f.freeze_day = gs::date
      )
      order by gs::date
    loop
      if exists (
        select 1 from public.habit_relapses r
        where r.habit_id = h.id and r.day_local = d
      ) then
        -- Relapse day: break the streak
        run_len := 0;
      else
        -- Success day: extend the streak
        if prev_day is null or d = prev_day + 1 then
          run_len := run_len + 1;
        else
          -- Check if gap was all frozen days (streak continues)
          if prev_day is not null and not exists (
            select 1 from generate_series(prev_day + 1, d - 1, interval '1 day') gap_d
            where not exists (
              select 1 from public.habit_freezes f
              where f.habit_id = h.id and f.freeze_day = gap_d::date
            )
          ) then
            run_len := run_len + 1;
          else
            run_len := 1;
          end if;
        end if;
        total_success := total_success + 1;
        last_success := d;
      end if;
      prev_day := d;
      longest := greatest(longest, run_len);
    end loop;
  else
    -- Good habit: checkin days = success, frozen days bridge gaps
    for d in
      select c.day_local
      from public.habit_checkins c
      where c.habit_id = h.id
      order by c.day_local
    loop
      if prev_day is null or d = prev_day + 1 then
        run_len := run_len + 1;
      else
        -- Check if gap between prev_day and d was all frozen days
        if prev_day is not null and not exists (
          select 1 from generate_series(prev_day + 1, d - 1, interval '1 day') gap_d
          where not exists (
            select 1 from public.habit_freezes f
            where f.habit_id = h.id and f.freeze_day = gap_d::date
          )
        ) then
          -- All gap days were frozen, streak continues
          run_len := run_len + 1;
        else
          run_len := 1;
        end if;
      end if;
      prev_day := d;
      longest := greatest(longest, run_len);
      total_success := total_success + 1;
      last_success := d;
    end loop;
  end if;

  -- Determine current streak: check if streak is still alive
  -- (last success is today, or yesterday, or gap since last success is all frozen)
  if last_success is null then
    current_len := 0;
  elsif last_success = current_date then
    current_len := run_len;
  elsif not exists (
    select 1 from generate_series(last_success + 1, current_date - 1, interval '1 day') gap_d
    where not exists (
      select 1 from public.habit_freezes f
      where f.habit_id = h.id and f.freeze_day = gap_d::date
    )
    -- For quit habits, also check no relapses in the gap
    and (h.habit_type != 'quit' or not exists (
      select 1 from public.habit_relapses r
      where r.habit_id = h.id and r.day_local = gap_d::date
    ))
  ) then
    current_len := run_len;
  else
    current_len := 0;
  end if;

  insert into public.habit_streaks (
    habit_id, user_id, current_streak, longest_streak, last_checkin_day, total_checkins, computed_at
  )
  values (
    h.id, h.user_id, current_len, longest, last_success, total_success, now()
  )
  on conflict (habit_id) do update set
    user_id = excluded.user_id,
    current_streak = excluded.current_streak,
    longest_streak = greatest(public.habit_streaks.longest_streak, excluded.longest_streak),
    last_checkin_day = excluded.last_checkin_day,
    total_checkins = excluded.total_checkins,
    computed_at = now();
end;
$$;

create or replace function public.recalculate_habit_streak_from_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_habit_streak(coalesce(new.habit_id, old.habit_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists habit_checkins_recalculate_streak on public.habit_checkins;
create trigger habit_checkins_recalculate_streak
after insert or update or delete on public.habit_checkins
for each row execute function public.recalculate_habit_streak_from_row();

drop trigger if exists habit_relapses_recalculate_streak on public.habit_relapses;
create trigger habit_relapses_recalculate_streak
after insert or update or delete on public.habit_relapses
for each row execute function public.recalculate_habit_streak_from_row();

drop trigger if exists habit_freezes_recalculate_streak on public.habit_freezes;
create trigger habit_freezes_recalculate_streak
after insert or update or delete on public.habit_freezes
for each row execute function public.recalculate_habit_streak_from_row();

alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;
alter table public.habit_freezes enable row level security;
alter table public.habit_relapses enable row level security;
alter table public.habit_streaks enable row level security;
alter table public.habit_journals enable row level security;
alter table public.monthly_recoveries enable row level security;


create policy "Users manage own habits" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own habit checkins" on public.habit_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own habit freezes" on public.habit_freezes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own habit relapses" on public.habit_relapses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users read own habit streaks" on public.habit_streaks
  for select using (auth.uid() = user_id);
create policy "Users manage own habit journals" on public.habit_journals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own monthly recoveries" on public.monthly_recoveries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

