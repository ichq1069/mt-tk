-- Add is_mandatory to announcements
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false;

-- Create announcement_acknowledgments table
CREATE TABLE IF NOT EXISTS announcement_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  openid TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(announcement_id, user_id),
  UNIQUE(announcement_id, openid)
);

-- Update daily_gallery_access_logs_view to be more comprehensive
CREATE OR REPLACE VIEW daily_gallery_access_logs_view AS
 SELECT l.id,
    l.post_id,
    l.user_openid,
    l.user_id,
    l.ip_address,
    l.user_agent,
    l.accessed_at,
    l.password_used,
    l.browser_fingerprint,
    COALESCE(p.username, p2.username, w.nickname, f.nickname) AS profile_username,
    COALESCE(p.avatar_url, p2.avatar_url, w.avatar_url, f.avatar_url) AS profile_avatar_url,
    f.nickname AS fan_nickname,
    f.avatar_url AS fan_avatar_url
   FROM daily_gallery_access_logs l
     LEFT JOIN profiles p ON l.user_id = p.id
     LEFT JOIN profiles p2 ON l.user_openid = p2.wechat_openid OR l.user_openid = p2.mp_openid
     LEFT JOIN wechat_users w ON l.user_openid = w.openid
     LEFT JOIN ( SELECT DISTINCT ON (wechat_fans.openid) wechat_fans.openid,
            wechat_fans.nickname,
            wechat_fans.avatar_url
           FROM wechat_fans
          ORDER BY wechat_fans.openid, wechat_fans.created_at DESC) f ON l.user_openid = f.openid;
