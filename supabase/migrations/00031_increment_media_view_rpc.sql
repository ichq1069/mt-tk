-- 阅读量增加函数
create or replace function increment_media_view(item_id uuid)
returns void as $$
begin
  update media_items
  set view_count = view_count + 1
  where id = item_id;
end;
$$ language plpgsql security definer;

-- 自动加分触发积分日志 (可选，但为了性能可以在 api.ts 处理)
-- 建议在 api.ts 的 performCheckIn 和 addPoints 中处理 points_logs 插入
