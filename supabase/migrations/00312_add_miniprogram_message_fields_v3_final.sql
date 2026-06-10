-- 为 miniprogram_configs 表添加缺失字段
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='miniprogram_configs' AND column_name='server_url') THEN 
    ALTER TABLE miniprogram_configs ADD COLUMN server_url TEXT; 
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='miniprogram_configs' AND column_name='token') THEN 
    ALTER TABLE miniprogram_configs ADD COLUMN token TEXT; 
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='miniprogram_configs' AND column_name='encoding_aes_key') THEN 
    ALTER TABLE miniprogram_configs ADD COLUMN encoding_aes_key TEXT; 
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='miniprogram_configs' AND column_name='message_encryption_mode') THEN 
    ALTER TABLE miniprogram_configs ADD COLUMN message_encryption_mode TEXT DEFAULT 'plain'; 
  END IF;
END $$;

-- 创建小程序登录日志表
CREATE TABLE IF NOT EXISTS mp_login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  openid TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  ticket TEXT,
  scene TEXT,
  ip_address TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE mp_login_logs ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略 (管理端可读)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Admin can read mp_login_logs' AND tablename='mp_login_logs') THEN 
    CREATE POLICY "Admin can read mp_login_logs" ON mp_login_logs
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'::user_role
    ));
  END IF;
END $$;
