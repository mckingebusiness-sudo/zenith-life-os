create or replace function public.initialize_habit_streak()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.habit_streaks (habit_id, user_id, current_streak, longest_streak, total_checkins)
  values (new.id, new.user_id, 0, 0, 0)
  on conflict (habit_id) do nothing;
  return new;
end;
$$;

drop trigger if exists habits_initialize_streak on public.habits;
create trigger habits_initialize_streak
after insert on public.habits
for each row execute function public.initialize_habit_streak();
