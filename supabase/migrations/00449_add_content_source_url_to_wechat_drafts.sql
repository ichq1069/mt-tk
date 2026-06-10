ALTER TABLE wechat_drafts ADD COLUMN IF NOT EXISTS content_source_url text;
COMMENT ON COLUMN wechat_drafts.content_source_url IS '原文链接';
