-- 为 wechat_drafts 添加 tracking_id
ALTER TABLE wechat_drafts ADD COLUMN IF NOT EXISTS tracking_id TEXT;

-- 为 media_items 添加 wechat_draft_tracking_id
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS wechat_draft_tracking_id TEXT;

-- 也可以考虑在 wechat_materials 添加，但 media_items 已经足够了，因为它是已入稿库的数据源
