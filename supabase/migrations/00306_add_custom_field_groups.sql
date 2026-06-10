-- 创建字段组表
create table if not exists public.album_custom_field_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  field_ids uuid[] not null default '{}',
  created_at timestamp with time zone default now()
);

-- 设置权限
alter table public.album_custom_field_groups enable row level security;
create policy "Allow all for authenticated users" on public.album_custom_field_groups for all using (true);
create policy "Allow read for anon users" on public.album_custom_field_groups for select using (true);
