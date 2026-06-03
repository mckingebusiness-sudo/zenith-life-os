-- Enforce monthly freeze quotas purely in the database
create or replace function public.enforce_monthly_freeze_quota()
returns trigger
language plpgsql
security definer
as $$
declare
  freezes_count int;
  start_of_month date;
  end_of_month date;
begin
  -- Skip check if update doesn't change freeze_day's month
  if TG_OP = 'UPDATE' and date_trunc('month', OLD.freeze_day) = date_trunc('month', NEW.freeze_day) then
    return NEW;
  end if;

  start_of_month := date_trunc('month', NEW.freeze_day)::date;
  end_of_month := (start_of_month + interval '1 month - 1 day')::date;
  
  select count(*) into freezes_count
  from public.habit_freezes
  where user_id = NEW.user_id
    and freeze_day >= start_of_month
    and freeze_day <= end_of_month;
    
  if freezes_count >= 3 then
    raise exception 'لقد استنفدت رصيد الإيقاف (3 مرات) لهذا الشهر!';
  end if;
  
  return NEW;
end;
$$;

drop trigger if exists habit_freezes_quota_trigger on public.habit_freezes;
create trigger habit_freezes_quota_trigger
before insert or update on public.habit_freezes
for each row execute function public.enforce_monthly_freeze_quota();
