ALTER TABLE wechat_drafts ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'normal';
COMMENT ON COLUMN wechat_drafts.sync_status IS '同步状态：normal-正常，missing-微信端已不存在';