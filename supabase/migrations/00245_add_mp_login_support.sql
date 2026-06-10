-- 为小程序配置添加模式和登录开关
ALTER TABLE miniprogram_configs 
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'task' CHECK (mode IN ('task', 'login')),
ADD COLUMN IF NOT EXISTS is_login_enabled BOOLEAN DEFAULT FALSE;

-- 为用户档案添加小程序 OpenID 字段
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS mp_openid TEXT UNIQUE;

-- 为站点配置添加小程序登录开关（如果 site_settings 不存在，这里暂时用全局变量或配置表）
-- 假设已有配置表用于存储系统参数，如果没有，可以在 admin_settings 或类似表中添加。
-- 这里先在 miniprogram_configs 中记录，因为它是全局唯一的。

COMMENT ON COLUMN miniprogram_configs.mode IS '小程序运行模式：task=任务模式, login=登录模式';
COMMENT ON COLUMN miniprogram_configs.is_login_enabled IS '是否开启小程序登录/注册功能';
COMMENT ON COLUMN profiles.mp_openid IS '用户绑定的微信小程序 OpenID';