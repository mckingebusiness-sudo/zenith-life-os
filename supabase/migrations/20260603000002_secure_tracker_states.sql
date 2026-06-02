create table if not exists public.habit_lockdowns (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    habit_id uuid not null references public.habits(id) on delete cascade,
    locked_until timestamptz not null,
    created_at timestamptz not null default now()
);
create index if not exists habit_lockdowns_habit_idx on public.habit_lockdowns(habit_id);
alter table public.habit_lockdowns enable row level security;
create policy "Users manage own lockdowns" on public.habit_lockdowns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.habit_vault_messages (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    habit_id uuid not null references public.habits(id) on delete cascade unique,
    encrypted_message text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.habit_vault_messages enable row level security;
create policy "Users manage own vault messages" on public.habit_vault_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger habit_vault_msgs_touch_updated_at before update on public.habit_vault_messages for each row execute function public.touch_updated_at();
