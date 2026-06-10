-- Add visibility column to photo_albums
alter table photo_albums add column if not exists is_public boolean default true;

-- Create table for user joined private albums
create table if not exists album_joins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  album_id uuid references photo_albums(id) on delete cascade,
  joined_at timestamp with time zone default now(),
  unique(user_id, album_id)
);

-- Add RLS for album_joins
alter table album_joins enable row level security;

create policy "Users can view their own album joins"
  on album_joins for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can join albums"
  on album_joins for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Admins have full access to album joins"
  on album_joins for all
  to authenticated
  using (is_admin(auth.uid()));
