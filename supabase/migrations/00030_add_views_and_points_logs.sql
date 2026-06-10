-- 1. 媒体表增加阅读量
alter table media_items add column if not exists view_count int8 default 0;

-- 2. 阅读记录表（防止重复计数）
create table if not exists media_views (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  media_id uuid references media_items(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, media_id)
);

-- 3. 积分日志表
create table if not exists points_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  amount int4 not null,
  reason text not null,
  created_at timestamptz default now()
);

-- 4. 配置表增加虚拟阅读量配置
alter table storage_configs add column if not exists virtual_view_base_min int4 default 0;
alter table storage_configs add column if not exists virtual_view_base_max int4 default 0;

-- 5. RLS 策略
alter table media_views enable row level security;
alter table points_logs enable row level security;

create policy "Users can view their own views" on media_views for select using (auth.uid() = user_id);
create policy "Users can insert their own views" on media_views for insert with check (auth.uid() = user_id);
create policy "Users can view their own points logs" on points_logs for select using (auth.uid() = user_id);

-- 管理员权限
create policy "Admins can manage all views" on media_views for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can manage all points logs" on points_logs for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 6. 开启实时
alter publication supabase_realtime add table points_logs;
