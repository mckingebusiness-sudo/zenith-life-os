-- ============================================================
-- Backend safety fixes: constraints, missing tables, summaries
-- ============================================================

-- 12. habit_lockdowns: deduplicate then add unique constraint
do $$
begin
  -- Remove duplicates, keep latest
  delete from public.habit_lockdowns a
  using public.habit_lockdowns b
  where a.user_id = b.user_id
    and a.habit_id = b.habit_id
    and a.created_at < b.created_at;
exception when undefined_table then null;
end $$;

alter table public.habit_lockdowns
  drop constraint if exists habit_lockdowns_user_habit_unique;
do $$
begin
  alter table public.habit_lockdowns
    add constraint habit_lockdowns_user_habit_unique unique (user_id, habit_id);
exception when duplicate_table then null;
end $$;

-- 13. habit_vault_messages: switch to (user_id, habit_id) unique
alter table public.habit_vault_messages
  drop constraint if exists habit_vault_messages_habit_id_key;

do $$
begin
  alter table public.habit_vault_messages
    add constraint habit_vault_messages_user_habit_unique unique (user_id, habit_id);
exception when duplicate_table then null;
end $$;

-- 14. boards and board_columns tables for task management
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  color text not null default 'blue',
  icon text not null default '📋',
  is_default boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  color text not null default 'gray',
  position integer not null default 0,
  max_cards integer,
  created_at timestamptz not null default now()
);

alter table public.boards enable row level security;
alter table public.board_columns enable row level security;

drop policy if exists "Users manage own boards" on public.boards;
create policy "Users manage own boards"
  on public.boards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own board columns" on public.board_columns;
create policy "Users manage own board columns"
  on public.board_columns for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 11. Monthly summaries table
create table if not exists public.habit_monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_local text not null, -- 'YYYY-MM' format
  total_habits integer not null default 0,
  good_habits integer not null default 0,
  quit_habits integer not null default 0,
  good_success_count integer not null default 0,
  quit_success_count integer not null default 0,
  relapse_count integer not null default 0,
  freeze_count integer not null default 0,
  completion_percentage numeric not null default 0,
  generated_at timestamptz not null default now(),
  unique(user_id, month_local)
);

alter table public.habit_monthly_summaries enable row level security;

drop policy if exists "Users manage own monthly summaries" on public.habit_monthly_summaries;
create policy "Users manage own monthly summaries"
  on public.habit_monthly_summaries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
