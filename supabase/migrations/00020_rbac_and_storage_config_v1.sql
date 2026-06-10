-- 1. 扩展存储配置表，增加开关
alter table storage_configs add column if not exists enable_link_import boolean default true;

-- 2. 创建权限组表
create table if not exists permission_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  permissions jsonb default '[]'::jsonb, -- 存储权限标识数组，例如 ["upload", "link_import"]
  is_default boolean default false,
  created_at timestamp with time zone default now()
);

-- 3. 关联用户资料与权限组
alter table profiles add column if not exists group_id uuid references permission_groups(id);

-- 4. 插入默认权限组 (如果不存在)
insert into permission_groups (name, description, permissions, is_default)
values ('普通用户', '注册后的默认权限组', '["upload", "link_import"]'::jsonb, true)
on conflict (name) do nothing;

-- 5. 更新 profiles，将没有 group_id 的用户关联到默认组
update profiles 
set group_id = (select id from permission_groups where is_default = true limit 1)
where group_id is null;

-- 6. 创建触发器：新用户注册自动分配默认权限组
create or replace function handle_new_user_group()
returns trigger as $$
begin
  update public.profiles 
  set group_id = (select id from permission_groups where is_default = true limit 1)
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- 假设 profiles 是在 auth.users 插入后由另一个触发器创建的，
-- 我们需要在 profiles 插入后执行这个逻辑，或者在创建 profile 的函数里直接加。
-- 为了稳妥，我们创建一个 AFTER INSERT 触发器在 profiles 表上。
drop trigger if exists on_profile_created_assign_group on profiles;
create trigger on_profile_created_assign_group
after insert on profiles
for each row execute function handle_new_user_group();

-- 7. 视图：方便前端查询用户权限
create or replace view user_permissions as
select 
  p.id as user_id,
  g.name as group_name,
  g.permissions
from profiles p
join permission_groups g on p.group_id = g.id;
