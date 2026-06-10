ALTER TABLE daily_gallery_posts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- 添加触发器以自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_daily_gallery_posts_updated_at
    BEFORE UPDATE ON daily_gallery_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
