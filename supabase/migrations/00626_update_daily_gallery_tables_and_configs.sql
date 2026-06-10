-- 1. 为 daily_gallery_user_passwords 添加 source 字段
ALTER TABLE public.daily_gallery_user_passwords ADD COLUMN IF NOT EXISTS source text DEFAULT 'wechat';

-- 2. 在 daily_gallery_config 中添加关键词模式相关字段
-- 注意：config 存储在 system_configs 表的 value (jsonb) 字段中，不需要 DDL，直接在代码中处理。
-- 但为了系统健壮性，我们可以确保 system_configs 记录存在

-- 3. 更新 get_wechat_draft_media_library 相关逻辑（如果涉及 RPC，但目前是直接在代码中组合 query 的，见 core_system_api.ts）
