-- 每日图集素材库表
CREATE TABLE IF NOT EXISTS daily_gallery_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_in_post_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 每日图集发布记录表
CREATE TABLE IF NOT EXISTS daily_gallery_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_date DATE NOT NULL UNIQUE,
  password TEXT NOT NULL,
  password_expires_at TIMESTAMPTZ NOT NULL,
  image_ids UUID[] NOT NULL DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  unique_visitor_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT FALSE
);

-- 每日图集访问日志表
CREATE TABLE IF NOT EXISTS daily_gallery_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES daily_gallery_posts(id) ON DELETE CASCADE,
  user_openid TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  password_used TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_daily_gallery_pool_is_used ON daily_gallery_pool(is_used);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_posts_post_date ON daily_gallery_posts(post_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_posts_is_published ON daily_gallery_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_access_logs_post_id ON daily_gallery_access_logs(post_id);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_access_logs_user_openid ON daily_gallery_access_logs(user_openid);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_access_logs_user_id ON daily_gallery_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_gallery_access_logs_accessed_at ON daily_gallery_access_logs(accessed_at DESC);

-- RPC: 获取未使用的随机图片
CREATE OR REPLACE FUNCTION get_random_unused_images(count INTEGER)
RETURNS SETOF daily_gallery_pool
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM daily_gallery_pool
  WHERE is_used = FALSE
  ORDER BY RANDOM()
  LIMIT count;
END;
$$;

-- RPC: 标记图片为已使用
CREATE OR REPLACE FUNCTION mark_images_as_used(image_ids UUID[], post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE daily_gallery_pool
  SET is_used = TRUE,
      used_in_post_id = post_id,
      updated_at = NOW()
  WHERE id = ANY(image_ids);
END;
$$;

-- RPC: 验证密码
CREATE OR REPLACE FUNCTION verify_daily_gallery_password(
  p_post_date DATE,
  p_password TEXT
)
RETURNS TABLE(
  is_valid BOOLEAN,
  post_id UUID,
  image_ids UUID[],
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_post RECORD;
BEGIN
  SELECT * INTO v_post
  FROM daily_gallery_posts
  WHERE post_date = p_post_date
    AND is_published = TRUE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_post.password = p_password AND v_post.password_expires_at > NOW() THEN
    RETURN QUERY SELECT TRUE, v_post.id, v_post.image_ids, v_post.password_expires_at;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID[], NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- RPC: 记录访问日志
CREATE OR REPLACE FUNCTION log_daily_gallery_access(
  p_post_id UUID,
  p_user_openid TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_password_used TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_log_id UUID;
  v_is_new_visitor BOOLEAN;
BEGIN
  -- 插入访问日志
  INSERT INTO daily_gallery_access_logs (
    post_id, user_openid, user_id, ip_address, user_agent, password_used
  ) VALUES (
    p_post_id, p_user_openid, p_user_id, p_ip_address, p_user_agent, p_password_used
  ) RETURNING id INTO v_log_id;

  -- 更新浏览次数
  UPDATE daily_gallery_posts
  SET view_count = view_count + 1
  WHERE id = p_post_id;

  -- 检查是否为新访客（基于openid或user_id）
  IF p_user_openid IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM daily_gallery_access_logs
      WHERE post_id = p_post_id
        AND user_openid = p_user_openid
        AND id != v_log_id
    ) INTO v_is_new_visitor;
  ELSIF p_user_id IS NOT NULL THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM daily_gallery_access_logs
      WHERE post_id = p_post_id
        AND user_id = p_user_id
        AND id != v_log_id
    ) INTO v_is_new_visitor;
  ELSE
    v_is_new_visitor := FALSE;
  END IF;

  -- 更新独立访客数
  IF v_is_new_visitor THEN
    UPDATE daily_gallery_posts
    SET unique_visitor_count = unique_visitor_count + 1
    WHERE id = p_post_id;
  END IF;

  RETURN v_log_id;
END;
$$;

-- RPC: 获取访问统计
CREATE OR REPLACE FUNCTION get_daily_gallery_stats(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  post_date DATE,
  post_id UUID,
  image_count INTEGER,
  view_count INTEGER,
  unique_visitor_count INTEGER,
  password TEXT,
  password_expires_at TIMESTAMPTZ,
  is_published BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.post_date,
    p.id,
    ARRAY_LENGTH(p.image_ids, 1) AS image_count,
    p.view_count,
    p.unique_visitor_count,
    p.password,
    p.password_expires_at,
    p.is_published
  FROM daily_gallery_posts p
  WHERE (p_start_date IS NULL OR p.post_date >= p_start_date)
    AND (p_end_date IS NULL OR p.post_date <= p_end_date)
  ORDER BY p.post_date DESC;
END;
$$;

-- RPC: 同步用户注册后的历史访问记录
CREATE OR REPLACE FUNCTION sync_daily_gallery_user_history(
  p_user_id UUID,
  p_openid TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE daily_gallery_access_logs
  SET user_id = p_user_id
  WHERE user_openid = p_openid
    AND user_id IS NULL;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- 插入默认配置
INSERT INTO system_configs (key, value, description)
VALUES 
  ('daily_gallery_config', 
   '{"daily_count": 5, "auto_publish": true, "publish_time": "00:00", "password_duration": 1, "password_keyword": "今日图片"}'::jsonb,
   '每日图集配置：每日发布数量、自动发布、发布时间、密码有效期（小时）、获取密码关键词')
ON CONFLICT (key) DO NOTHING;

-- RLS策略
ALTER TABLE daily_gallery_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_gallery_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_gallery_access_logs ENABLE ROW LEVEL SECURITY;

-- 管理员可以管理素材库
CREATE POLICY "Admins can manage gallery pool"
ON daily_gallery_pool
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 管理员可以管理发布记录
CREATE POLICY "Admins can manage posts"
ON daily_gallery_posts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 所有人可以查看已发布的帖子（需要密码验证在应用层）
CREATE POLICY "Anyone can view published posts"
ON daily_gallery_posts
FOR SELECT
TO public
USING (is_published = TRUE);

-- 管理员可以查看所有访问日志
CREATE POLICY "Admins can view all access logs"
ON daily_gallery_access_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 用户可以查看自己的访问日志
CREATE POLICY "Users can view own access logs"
ON daily_gallery_access_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 允许插入访问日志（通过RPC）
CREATE POLICY "Allow insert access logs"
ON daily_gallery_access_logs
FOR INSERT
TO public
WITH CHECK (TRUE);

COMMENT ON TABLE daily_gallery_pool IS '每日图集素材库';
COMMENT ON TABLE daily_gallery_posts IS '每日图集发布记录';
COMMENT ON TABLE daily_gallery_access_logs IS '每日图集访问日志';
