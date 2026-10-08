-- Facerizer M2: profiles table (run once in Supabase > SQL Editor)

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  age_range text,
  age_confirmed_at timestamptz,
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each user can read only their own profile
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Each user can update only their own profile, and only these two columns
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (display_name, age_range) on public.profiles to authenticated;

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, age_confirmed_at, consent_at)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'display_name', ''),
    case when new.raw_user_meta_data->>'age_confirmed' = 'true' then now() end,
    case when new.raw_user_meta_data->>'consent' = 'true' then now() end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
