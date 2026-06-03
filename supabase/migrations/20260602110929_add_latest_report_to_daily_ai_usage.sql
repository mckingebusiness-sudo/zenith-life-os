-- Ensure the table exists before altering it (it may not exist yet if running fresh).
create table if not exists public.daily_ai_usage (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    day_local date not null,
    usage_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, day_local)
);

alter table public.daily_ai_usage add column if not exists latest_report text;
