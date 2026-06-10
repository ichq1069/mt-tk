alter table media_items add column if not exists tags text[];
-- 为 tags 字段添加索引以便搜索
create index if not exists idx_media_items_tags on media_items using gin(tags);
