-- 添加草稿采用状态字段
ALTER TABLE wechat_drafts 
ADD COLUMN IF NOT EXISTS is_adopted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS adopted_at timestamptz;

-- 添加索引以优化查询
CREATE INDEX IF NOT EXISTS idx_wechat_drafts_is_adopted ON wechat_drafts(is_adopted);
CREATE INDEX IF NOT EXISTS idx_wechat_drafts_adopted_at ON wechat_drafts(adopted_at);

-- 添加注释
COMMENT ON COLUMN wechat_drafts.is_adopted IS '草稿是否已被采用';
COMMENT ON COLUMN wechat_drafts.adopted_at IS '草稿采用时间';
