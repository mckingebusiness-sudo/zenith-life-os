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
  
  finalized_run_len integer := 0;
  finalized_last_success date;
  
  last_success date;
  total_success integer := 0;
begin
  select * into h from public.habits where id = target_habit_id;
  if not found then
    return;
  end if;

  if h.habit_type = 'quit' then
    -- Quit habit: every non-frozen, non-relapsed day since creation = success
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
        
        -- A finalized streak only counts up to yesterday
        if d < current_date then
          longest := greatest(longest, run_len);
          finalized_run_len := run_len;
          finalized_last_success := d;
        end if;
      end if;
      prev_day := d;
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
          run_len := run_len + 1;
        else
          run_len := 1;
        end if;
      end if;
      prev_day := d;
      
      total_success := total_success + 1;
      last_success := d;
      
      -- Finalized streak up to yesterday
      if d < current_date then
        longest := greatest(longest, run_len);
        finalized_run_len := run_len;
        finalized_last_success := d;
      end if;
    end loop;
  end if;

  -- Determine current finalized streak: check if streak is still alive
  -- It is alive if finalized_last_success was yesterday, or gap since then is all frozen
  if finalized_last_success is null then
    current_len := 0;
  elsif finalized_last_success = current_date - 1 then
    current_len := finalized_run_len;
  elsif not exists (
    select 1 from generate_series(finalized_last_success + 1, current_date - 1, interval '1 day') gap_d
    where not exists (
      select 1 from public.habit_freezes f
      where f.habit_id = h.id and f.freeze_day = gap_d::date
    )
    and (h.habit_type != 'quit' or not exists (
      select 1 from public.habit_relapses r
      where r.habit_id = h.id and r.day_local = gap_d::date
    ))
  ) then
    current_len := finalized_run_len;
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
