-- ============================================================
-- ALT. — Supabase schema + Row Level Security
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ---------- PROFILES (one row per auth user) ----------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  plan text not null default 'starter' check (plan in ('starter', 'pro')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ---------- SUBSCRIPTIONS ----------
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  cost numeric not null default 0,
  freq text not null default 'month',
  status text not null default 'Frequently Used',
  category text not null default 'success',
  created_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);
create policy "subscriptions_update_own" on public.subscriptions
  for update using (auth.uid() = user_id);
create policy "subscriptions_delete_own" on public.subscriptions
  for delete using (auth.uid() = user_id);

-- ---------- SKILLS ----------
create table if not exists public.skills (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  skill text not null,
  created_at timestamptz not null default now()
);

alter table public.skills enable row level security;

create policy "skills_select_own" on public.skills
  for select using (auth.uid() = user_id);
create policy "skills_insert_own" on public.skills
  for insert with check (auth.uid() = user_id);
create policy "skills_delete_own" on public.skills
  for delete using (auth.uid() = user_id);

-- ---------- STACK (workflow rebuilder inputs) ----------
create table if not exists public.stacks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tool_name text not null,
  role text not null default '',
  monthly_cost numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.stacks enable row level security;

create policy "stacks_select_own" on public.stacks
  for select using (auth.uid() = user_id);
create policy "stacks_insert_own" on public.stacks
  for insert with check (auth.uid() = user_id);
create policy "stacks_delete_own" on public.stacks
  for delete using (auth.uid() = user_id);

-- ---------- CONTACT MESSAGES (public form) ----------
create table if not exists public.contact_messages (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "contact_messages_anon_insert" on public.contact_messages
  for insert with check (true);

-- ---------- CHAT HISTORY ----------
create table if not exists public.chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_history enable row level security;

create policy "chat_history_select_own" on public.chat_history
  for select using (auth.uid() = user_id);
create policy "chat_history_insert_own" on public.chat_history
  for insert with check (auth.uid() = user_id);
create policy "chat_history_delete_own" on public.chat_history
  for delete using (auth.uid() = user_id);

-- ---------- OPTIONAL: auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
