-- 1. 为 storage_configs 添加下载配置
ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS enable_download BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS download_mode TEXT DEFAULT 'both', -- 'wallpaper', 'album', 'both'
ADD COLUMN IF NOT EXISTS wallpaper_price INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS album_price INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS min_download_role TEXT DEFAULT 'user';

-- 2. 创建媒体下载记录表
CREATE TABLE IF NOT EXISTS media_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
    album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE, -- 可选，如果是下载整个相册
    type TEXT NOT NULL, -- 'wallpaper', 'album'
    points_spent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME zone DEFAULT now(),
    UNIQUE(user_id, media_id, type) -- 防止同一媒体多次扣费（单图）
);

-- 3. 添加索引
CREATE INDEX IF NOT EXISTS idx_media_downloads_user_id ON media_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_media_downloads_media_id ON media_downloads(media_id);

-- 4. 开启 RLS
ALTER TABLE media_downloads ENABLE ROW LEVEL SECURITY;

-- 5. 策略
CREATE POLICY "Users can view their own downloads" 
ON media_downloads FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own downloads" 
ON media_downloads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 6. 创建 RPC 函数处理扣分和记录下载
CREATE OR REPLACE FUNCTION handle_media_download(
    p_user_id UUID,
    p_media_id UUID,
    p_album_id UUID,
    p_type TEXT,
    p_points INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_current_points INTEGER;
    v_already_downloaded BOOLEAN;
BEGIN
    -- 1. 检查是否已经下载过
    IF p_type = 'wallpaper' THEN
        SELECT EXISTS(SELECT 1 FROM media_downloads WHERE user_id = p_user_id AND media_id = p_media_id AND type = 'wallpaper') INTO v_already_downloaded;
    ELSE
        -- 相册下载逻辑可能更复杂，这里简单处理：如果是相册，检查是否存在该相册的下载记录
        SELECT EXISTS(SELECT 1 FROM media_downloads WHERE user_id = p_user_id AND album_id = p_album_id AND type = 'album') INTO v_already_downloaded;
    END IF;

    IF v_already_downloaded THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already downloaded', 'recharged', false);
    END IF;

    -- 2. 检查积分是否足够
    SELECT points INTO v_current_points FROM profiles WHERE id = p_user_id;
    IF v_current_points < p_points THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient points');
    END IF;

    -- 3. 扣除积分
    UPDATE profiles SET points = points - p_points WHERE id = p_user_id;

    -- 4. 记录积分流水
    INSERT INTO user_points_transactions (user_id, amount, type, description)
    VALUES (p_user_id, -p_points, 'download', 'Download ' || p_type || ': ' || COALESCE(p_media_id::text, p_album_id::text));

    -- 5. 记录下载
    INSERT INTO media_downloads (user_id, media_id, album_id, type, points_spent)
    VALUES (p_user_id, p_media_id, p_album_id, p_type, p_points);

    RETURN jsonb_build_object('success', true, 'message', 'Download successful', 'recharged', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
