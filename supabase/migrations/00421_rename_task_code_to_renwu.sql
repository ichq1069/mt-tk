-- 重命名字段 code_snippet 为 renwu，以符合用户需求
ALTER TABLE miniprogram_configs RENAME COLUMN code_snippet TO renwu;

-- 为 mp_qr_generation_logs 添加索引以优化并发查询速度
CREATE INDEX IF NOT EXISTS idx_mp_qr_gen_scene_created ON mp_qr_generation_logs (scene, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_unlock_logs_lookup ON ad_unlock_logs (item_id, browser_id, status);
