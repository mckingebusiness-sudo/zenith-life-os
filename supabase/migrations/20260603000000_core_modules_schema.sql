-- 1. user_settings
create table if not exists public.user_settings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade unique,
    sidebar_collapsed boolean not null default false,
    sidebar_width integer not null default 240,
    notifications_enabled boolean not null default true,
    ai_suggestions_enabled boolean not null default true,
    focus_mode_enabled boolean not null default false,
    currency text not null default 'USD',
    budget_monthly numeric not null default 0,
    work_hours_start text not null default '09:00',
    work_hours_end text not null default '17:00',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "Users manage own settings" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. calendar_events
create table if not exists public.calendar_events (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    location text,
    start_at timestamptz not null,
    end_at timestamptz not null,
    all_day boolean not null default false,
    color text not null default 'blue',
    category text not null default 'general',
    recurrence text default 'none',
    recurrence_end timestamptz,
    reminder_minutes integer,
    task_id uuid,
    goal_id uuid,
    is_cancelled boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.calendar_events enable row level security;
create policy "Users manage own calendar events" on public.calendar_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. expense_categories
create table if not exists public.expense_categories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    icon text not null default '💰',
    color text not null default 'blue',
    budget_monthly numeric,
    type text not null default 'expense' check (type in ('income', 'expense', 'saving', 'investment')),
    created_at timestamptz not null default now()
);
alter table public.expense_categories enable row level security;
create policy "Users manage own expense categories" on public.expense_categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. transactions
create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category_id uuid references public.expense_categories(id) on delete set null,
    title text not null,
    description text,
    amount numeric not null,
    currency text not null default 'USD',
    type text not null default 'expense' check (type in ('income', 'expense', 'transfer', 'saving', 'investment')),
    date date not null default current_date,
    payment_method text not null default 'cash',
    is_recurring boolean not null default false,
    recurrence_period text,
    receipt_url text,
    tags text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "Users manage own transactions" on public.transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. goals
create table if not exists public.goals (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    category text not null default 'personal',
    priority text not null default 'medium',
    status text not null default 'active',
    progress numeric not null default 0,
    target_date date,
    completed_at timestamptz,
    parent_goal_id uuid references public.goals(id) on delete cascade,
    milestones jsonb not null default '[]'::jsonb,
    tags text[] not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.goals enable row level security;
create policy "Users manage own goals" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6. note_folders
create table if not exists public.note_folders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    color text not null default 'gray',
    icon text not null default '📁',
    parent_id uuid references public.note_folders(id) on delete cascade,
    position integer not null default 0,
    created_at timestamptz not null default now()
);
alter table public.note_folders enable row level security;
create policy "Users manage own note folders" on public.note_folders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7. notes
create table if not exists public.notes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    content text not null,
    content_json jsonb,
    folder_id uuid references public.note_folders(id) on delete set null,
    tags text[] not null default '{}',
    color text not null default 'yellow',
    is_pinned boolean not null default false,
    is_archived boolean not null default false,
    is_encrypted boolean not null default false,
    word_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy "Users manage own notes" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 8. tasks
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    board_id uuid,
    column_id uuid,
    goal_id uuid references public.goals(id) on delete set null,
    title text not null,
    description text,
    priority text not null default 'medium',
    status text not null default 'todo',
    tags text[] not null default '{}',
    attachments jsonb not null default '[]'::jsonb,
    checklists jsonb not null default '[]'::jsonb,
    due_date timestamptz,
    estimated_minutes integer,
    actual_minutes integer,
    position integer not null default 0,
    is_archived boolean not null default false,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy "Users manage own tasks" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 9. vault_items
create table if not exists public.vault_items (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    type text not null default 'note',
    encrypted_data text not null,
    icon text not null default '🔒',
    folder text,
    tags text[] not null default '{}',
    is_favorite boolean not null default false,
    last_accessed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.vault_items enable row level security;
create policy "Users manage own vault items" on public.vault_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Add update triggers
create trigger user_settings_touch_updated_at before update on public.user_settings for each row execute function public.touch_updated_at();
create trigger calendar_events_touch_updated_at before update on public.calendar_events for each row execute function public.touch_updated_at();
create trigger transactions_touch_updated_at before update on public.transactions for each row execute function public.touch_updated_at();
create trigger goals_touch_updated_at before update on public.goals for each row execute function public.touch_updated_at();
create trigger notes_touch_updated_at before update on public.notes for each row execute function public.touch_updated_at();
create trigger tasks_touch_updated_at before update on public.tasks for each row execute function public.touch_updated_at();
create trigger vault_items_touch_updated_at before update on public.vault_items for each row execute function public.touch_updated_at();
