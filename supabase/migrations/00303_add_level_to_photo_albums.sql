alter table photo_albums add column if not exists level text not null default 'pt';

-- 开启索引以便快速查询
create index if not exists idx_photo_albums_level on photo_albums(level);

-- 更新现有数据（可选）
update photo_albums set level = 'pt' where level is null;