create index if not exists daily_moods_user_date_idx on public.daily_moods(user_id, date_local desc);
create index if not exists habit_rewards_unclaimed_idx on public.habit_rewards(user_id) where is_claimed = false;
