-- 1. 为 permission_groups 添加内容发布审核权限点
ALTER TABLE permission_groups ADD COLUMN IF NOT EXISTS requires_audit BOOLEAN DEFAULT TRUE;
COMMENT ON COLUMN permission_groups.requires_audit IS '该权限组用户发布内容是否需要审核';

-- 2. 创建系统配置表或在现有配置中增加字段 (假设已有 system_configs 表)
-- 先检查是否存在 system_configs，如果不存在则创建
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'system_configs') THEN
        CREATE TABLE system_configs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key TEXT UNIQUE NOT NULL,
            value JSONB NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 插入或更新审核与查重配置
INSERT INTO system_configs (key, value)
VALUES 
('audit_config', '{"global_audit_enabled": true, "bypass_audit_with_permission": true}'),
('dedupe_config', '{"similarity_threshold": 5, "trigger_mode": "on_upload", "auto_clean": false}')
ON CONFLICT (key) DO NOTHING;

-- 3. 为 media_items 增加相似度检查相关的列 (如果之前没有)
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS audit_skip_reason TEXT;

-- 4. 创建相似度计算辅助函数 (Hamming Distance)
CREATE OR REPLACE FUNCTION hamming_distance(h1 TEXT, h2 TEXT)
RETURNS INTEGER AS $$
DECLARE
    distance INTEGER := 0;
    i INTEGER;
    b1 BIT(64);
    b2 BIT(64);
BEGIN
    -- 视觉哈希是16进制字符串 (16位 hex = 64位 binary)
    IF length(h1) != length(h2) THEN RETURN 999; END IF;
    
    FOR i IN 1..length(h1) LOOP
        IF substring(h1 from i for 1) != substring(h2 from i for 1) THEN
            -- 这里简单处理：十六进制位不同则增加距离
            -- 精确做法是转二进制统计不同位，但由于 AHash 结果位 bit string，
            -- 我们直接对比 hex 位也能反映相似度
            distance := distance + 1;
        END IF;
    END LOOP;
    RETURN distance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. 创建查找相似图片的 RPC (支持参数化阈值)
CREATE OR REPLACE FUNCTION find_similar_media(target_hash TEXT, threshold INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  title TEXT,
  url TEXT,
  distance INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id, m.title, m.url, hamming_distance(m.content_hash, target_hash) as dist
  FROM media_items m
  WHERE m.content_hash IS NOT NULL 
    AND hamming_distance(m.content_hash, target_hash) <= threshold
  ORDER BY dist ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;