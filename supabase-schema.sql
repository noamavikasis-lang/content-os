-- ==========================================
-- Content OS - Supabase Database Schema
-- הרץ את זה ב-SQL Editor של Supabase
-- ==========================================

-- Videos
create table if not exists videos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  shoot_date date,
  publish_date date,
  publish_time time,
  status text not null default 'planned'
    check (status in ('planned','filmed','on_drive','editing','ready','published')),
  networks text[] default '{}',
  drive_link text,
  cover_ready boolean default false,
  cta_ready boolean default false,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Copies (קופי לכל רשת)
create table if not exists copies (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references videos(id) on delete cascade not null,
  network text not null
    check (network in ('instagram','tiktok','youtube_short','youtube','facebook')),
  caption text,
  hashtags text,
  ai_generated boolean default false,
  updated_at timestamptz default now(),
  unique(video_id, network)
);

-- Checklist items
create table if not exists checklist_items (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references videos(id) on delete cascade not null,
  item_key text not null,
  checked boolean default false,
  checked_by uuid references auth.users(id),
  checked_at timestamptz,
  unique(video_id, item_key)
);

-- Analytics
create table if not exists analytics (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references videos(id) on delete cascade not null,
  network text not null,
  recorded_at date default current_date,
  views integer default 0,
  saves integer default 0,
  shares integer default 0,
  comments integer default 0,
  new_followers integer default 0,
  notes text
);

-- Notes (הערות)
create table if not exists video_notes (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references videos(id) on delete cascade not null,
  author_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamptz default now()
);

-- Profiles
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text,
  role text check (role in ('creator', 'editor')),
  updated_at timestamptz default now()
);

-- ==========================================
-- Enable Row Level Security
-- ==========================================
alter table videos enable row level security;
alter table copies enable row level security;
alter table checklist_items enable row level security;
alter table analytics enable row level security;
alter table video_notes enable row level security;
alter table profiles enable row level security;

-- ==========================================
-- Policies (כל משתמש מחובר יכול לראות הכל)
-- ==========================================
create policy "authenticated all on videos" on videos
  for all using (auth.uid() is not null);

create policy "authenticated all on copies" on copies
  for all using (auth.uid() is not null);

create policy "authenticated all on checklist_items" on checklist_items
  for all using (auth.uid() is not null);

create policy "authenticated all on analytics" on analytics
  for all using (auth.uid() is not null);

create policy "authenticated all on video_notes" on video_notes
  for all using (auth.uid() is not null);

create policy "authenticated all on profiles" on profiles
  for all using (auth.uid() is not null);

-- ==========================================
-- Auto-create profile on signup
-- ==========================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'role'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Enable Realtime for videos table
alter publication supabase_realtime add table videos;
