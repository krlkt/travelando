-- Travelando: profiles + auth bootstrap
-- Adds a public.profiles table that mirrors auth.users for app-level reads,
-- a trigger that upserts a profile row whenever auth.users is inserted or
-- the email is updated (covers anon → permanent conversion), and RLS so
-- each user can only read/update their own profile.

create extension if not exists "pgcrypto";

-- profiles --------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text,
  display_name    text,
  avatar_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists profiles_email_idx
  on public.profiles (email);

-- updated_at trigger reuses set_updated_at() from the trips migration.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- handle_new_user --------------------------------------------------------
-- Fires on INSERT to auth.users (signup) and on UPDATE when email changes
-- (anonymous → permanent conversion goes through updateUser, which sets
-- the email on the existing row rather than creating a new one).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update
    set email        = excluded.email,
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        avatar_url   = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_new_user();

-- RLS --------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles owner read"   on public.profiles;
drop policy if exists "profiles owner update" on public.profiles;

create policy "profiles owner read"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles owner update"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
