-- Fix trigger recalculation consistency for streaks
-- Handles TG_OP correctly without record coalesce which can fail,
-- and ensures both old and new habits are recalculated if habit_id changes.

create or replace function public.recalculate_habit_streak_from_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'DELETE' then
    perform public.recalculate_habit_streak(OLD.habit_id);
    return OLD;
  elsif TG_OP = 'UPDATE' then
    perform public.recalculate_habit_streak(NEW.habit_id);
    if NEW.habit_id is distinct from OLD.habit_id then
      perform public.recalculate_habit_streak(OLD.habit_id);
    end if;
    return NEW;
  elsif TG_OP = 'INSERT' then
    perform public.recalculate_habit_streak(NEW.habit_id);
    return NEW;
  end if;
  return null;
end;
$$;
