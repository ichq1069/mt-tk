-- 为 profiles 表添加黑名单字段
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE;

-- 创建图集访问申请表
CREATE TABLE IF NOT EXISTS album_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'::public.item_status CHECK (status IN ('pending', 'approved', 'rejected')),
  rejected_reason TEXT,
  approved_level TEXT CHECK (approved_level IN ('pt', 'vip', 'svip', 'vvip')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建图集用户特定权限表
CREATE TABLE IF NOT EXISTS album_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('pt', 'vip', 'svip', 'vvip')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, album_id)
);

-- 开启 RLS
ALTER TABLE album_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS 策略
-- 申请表：用户只能查看和创建自己的申请，管理员可查看和修改所有
CREATE POLICY "Users can view their own requests" ON album_access_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests" ON album_access_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all requests" ON album_access_requests
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 权限表：用户只能查看自己的权限，管理员可管理所有
CREATE POLICY "Users can view their own album permissions" ON album_user_permissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage album permissions" ON album_user_permissions
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 确保每日图集配置表存在 (如果还没创建的话)
-- CREATE TABLE IF NOT EXISTS daily_gallery_config ... (已经在之前的需求中创建过)
