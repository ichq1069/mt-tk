ALTER TABLE wechat_drafts ADD COLUMN IF NOT EXISTS image_ids uuid[] DEFAULT '{}';
COMMENT ON COLUMN wechat_drafts.image_ids IS '草稿中使用的媒体库图片ID集合';
