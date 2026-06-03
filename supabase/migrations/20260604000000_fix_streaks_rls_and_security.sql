create table if not exists public.daily_ai_usage (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    day_local date not null,
    usage_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, day_local)
);

create table if not exists public.urge_levels (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    habit_id uuid not null references public.habits(id) on delete cascade,
    day_local date not null,
    level text not null check (level in ('low', 'medium', 'high', 'extreme')),
    created_at timestamptz not null default now(),
    unique (habit_id, day_local)
);

create table if not exists public.daily_moods (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    day_local date not null,
    mood text not null check (mood in ('happy', 'neutral', 'tired', 'sad', 'energetic')),
    created_at timestamptz not null default now(),
    unique (user_id, day_local)
);

alter table public.habit_streaks enable row level security;
alter table public.daily_ai_usage enable row level security;
alter table public.urge_levels enable row level security;
alter table public.daily_moods enable row level security;

create policy "Users manage own habit streaks" on public.habit_streaks
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own daily ai usage" on public.daily_ai_usage
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own urge levels" on public.urge_levels
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own daily moods" on public.daily_moods
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger daily_ai_usage_touch_updated_at
before update on public.daily_ai_usage
for each row execute function public.touch_updated_at();
