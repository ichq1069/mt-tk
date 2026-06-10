-- 1. 创建媒体下载记录表 (如果刚才失败了)
CREATE TABLE IF NOT EXISTS media_downloads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
    album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'wallpaper', 'album'
    points_spent INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME zone DEFAULT now(),
    UNIQUE(user_id, media_id, type) -- 防止同一单图多次扣费
);

-- 2. 改进后的 RPC 函数使用 points_logs
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
        SELECT EXISTS(SELECT 1 FROM media_downloads WHERE user_id = p_user_id AND album_id = p_album_id AND type = 'album') INTO v_already_downloaded;
    END IF;

    IF v_already_downloaded THEN
        RETURN jsonb_build_object('success', true, 'message', 'Already downloaded', 'recharged', false);
    END IF;

    -- 2. 检查积分是否足够
    SELECT COALESCE(points, 0) INTO v_current_points FROM profiles WHERE id = p_user_id;
    IF v_current_points < p_points THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient points');
    END IF;

    -- 3. 扣除积分
    UPDATE profiles SET points = points - p_points WHERE id = p_user_id;

    -- 4. 记录积分流水
    INSERT INTO points_logs (user_id, amount, reason, type, target_id)
    VALUES (p_user_id, -p_points, 'Download ' || p_type, 'download', COALESCE(p_media_id::text, p_album_id::text));

    -- 5. 记录下载
    INSERT INTO media_downloads (user_id, media_id, album_id, type, points_spent)
    VALUES (p_user_id, p_media_id, p_album_id, p_type, p_points);

    RETURN jsonb_build_object('success', true, 'message', 'Download successful', 'recharged', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
