-- 为 daily_gallery_posts 添加今日浏览量和日期字段
ALTER TABLE daily_gallery_posts ADD COLUMN IF NOT EXISTS today_view_count INTEGER DEFAULT 0;
ALTER TABLE daily_gallery_posts ADD COLUMN IF NOT EXISTS last_view_date DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN daily_gallery_posts.today_view_count IS '当日浏览量';
COMMENT ON COLUMN daily_gallery_posts.last_view_date IS '最后浏览日期，用于重置今日浏览量';

-- 创建一个函数用于增加浏览量，并自动重置今日浏览量
CREATE OR REPLACE FUNCTION increment_daily_gallery_views(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
BEGIN
    UPDATE daily_gallery_posts
    SET 
        view_count = COALESCE(view_count, 0) + 1,
        today_view_count = CASE 
            WHEN last_view_date = v_today THEN COALESCE(today_view_count, 0) + 1 
            ELSE 1 
        END,
        last_view_date = v_today,
        updated_at = NOW()
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
