create table if not exists media_staging (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  url text not null,
  thumbnail_url text,
  title text,
  type text check (type in ('image', 'video')) default 'image',
  category_id uuid references content_categories(id),
  tag_names text[],
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending'::public.item_status,
  import_source text,
  owner_id uuid references profiles(id) default auth.uid()
);

alter table media_staging enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'media_staging' and policyname = 'Admins can do everything on media_staging'
  ) then
    create policy "Admins can do everything on media_staging" 
    on media_staging for all 
    to authenticated
    using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
  end if;
end $$;

-- Also add a column for batch import if needed, but for now this is enough.
