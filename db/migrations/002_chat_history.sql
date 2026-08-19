-- ALT. — Chat History table
-- Run this in Supabase Dashboard → SQL Editor

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
