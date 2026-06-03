create table if not exists public.habit_urge_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    habit_id uuid not null references public.habits(id) on delete cascade,
    day_local date not null,
    urge_level integer not null check (urge_level between 1 and 5),
    trigger text,
    created_at timestamptz not null default now()
);
alter table public.habit_urge_logs enable row level security;
create policy "Users manage own habit_urge_logs" on public.habit_urge_logs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.habit_recovery_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    habit_id uuid not null references public.habits(id) on delete cascade,
    day_local date not null,
    action_taken text not null,
    created_at timestamptz not null default now()
);
alter table public.habit_recovery_events enable row level security;
create policy "Users manage own habit_recovery_events" on public.habit_recovery_events
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.habit_sos_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    habit_id uuid not null references public.habits(id) on delete cascade,
    feeling text,
    suggested_alternative text,
    outcome text, -- e.g., 'Survived', 'Relapsed', 'Pending'
    created_at timestamptz not null default now()
);
alter table public.habit_sos_sessions enable row level security;
create policy "Users manage own habit_sos_sessions" on public.habit_sos_sessions
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.habit_why_wall (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    habit_id uuid not null references public.habits(id) on delete cascade,
    reason text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(habit_id)
);
alter table public.habit_why_wall enable row level security;
create policy "Users manage own habit_why_wall" on public.habit_why_wall
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger habit_why_wall_touch_updated_at
before update on public.habit_why_wall
for each row execute function public.touch_updated_at();
