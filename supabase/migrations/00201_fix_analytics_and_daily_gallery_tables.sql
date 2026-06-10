-- 为 user_visit_stats 添加唯一约束，解决 upsert 冲突
ALTER TABLE user_visit_stats ADD CONSTRAINT user_visit_stats_unique_visit UNIQUE (ip_address, browser, os, network_type, path);

-- 确保 daily_gallery_pool 表存在 (或者重命名 media_items 使用的方式)
-- 既然代码和文档矛盾，我决定按照需求文档创建一个独立的每日图集素材表，或者统一使用 media_items
-- 根据之前的 RPC 定义，它是使用 media_items。
-- 但为了不改变现有的 publish 逻辑，我修改 verify 函数使其从 media_items 读取
