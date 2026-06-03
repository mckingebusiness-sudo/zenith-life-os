-- Reconcile the urge_levels table with the columns the application actually uses.

-- 1. Ensure the new column exists
alter table public.urge_levels add column if not exists urge_level integer;

-- 2. Add default to day_local so inserts without it don't fail
alter table public.urge_levels alter column day_local set default CURRENT_DATE;

-- 3. Backfill urge_level from the legacy level column when present
do $$
begin
    if exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'urge_levels' and column_name = 'level'
    ) then
        update public.urge_levels
        set urge_level = case level
            when 'low' then 1
            when 'medium' then 3
            when 'high' then 4
            when 'extreme' then 5
            else 1
        end
        where urge_level is null and level is not null;
    end if;
end $$;

-- 4. Drop NOT NULL on legacy column so new inserts succeed
do $$
begin
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='urge_levels' and column_name='level') then
        alter table public.urge_levels alter column level drop not null;
    end if;
end $$;

-- 5. Default any still-null urge_level before enforcing constraints
update public.urge_levels set urge_level = 1 where urge_level is null;

-- 6. Enforce NOT NULL on the app-expected columns
do $$
begin
    if not exists (select 1 from public.urge_levels where urge_level is null) then
        alter table public.urge_levels alter column urge_level set not null;
    end if;
end $$;

-- 7. Enforce the allowed urge_level values
alter table public.urge_levels drop constraint if exists urge_levels_urge_level_check;
alter table public.urge_levels
    add constraint urge_levels_urge_level_check
    check (urge_level between 1 and 5);
