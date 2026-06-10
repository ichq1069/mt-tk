-- 为 wecom_configs 表增加回调配置字段
ALTER TABLE wecom_configs 
ADD COLUMN IF NOT EXISTS cb_token TEXT,
ADD COLUMN IF NOT EXISTS cb_aes_key TEXT;
