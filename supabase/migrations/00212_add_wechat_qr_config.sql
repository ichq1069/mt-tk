ALTER TABLE wechat_configs 
ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ;

-- 创建一个视图或简单的配置来存储当前选中的公众号二维码
CREATE OR REPLACE VIEW active_wechat_config AS
SELECT * FROM wechat_configs WHERE is_active = true LIMIT 1;
