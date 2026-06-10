-- 为 storage_configs 添加全局缩略图参数
ALTER TABLE storage_configs ADD COLUMN IF NOT EXISTS thumbnail_params TEXT DEFAULT '?w=300';

-- 创建调试日志配置表
CREATE TABLE IF NOT EXISTS debug_log_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT FALSE,
  retention_minutes INTEGER DEFAULT 5, -- 默认 5 分钟
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初始化一条调试日志配置数据
INSERT INTO debug_log_settings (id, is_enabled, retention_minutes)
SELECT gen_random_uuid(), FALSE, 5
WHERE NOT EXISTS (SELECT 1 FROM debug_log_settings);

-- 创建调试日志记录表
CREATE TABLE IF NOT EXISTS debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url TEXT,
  image_url TEXT,
  is_thumbnail BOOLEAN,
  is_original BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 添加清理调试日志的定时任务 (需要权限)
-- 简单起见，我们在 Edge Function 或前端触发清理
