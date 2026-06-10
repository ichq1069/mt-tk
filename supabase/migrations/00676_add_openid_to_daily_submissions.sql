ALTER TABLE daily_gallery_submissions ADD COLUMN IF NOT EXISTS openid TEXT;
ALTER TABLE daily_gallery_submissions ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE daily_gallery_submissions ALTER COLUMN user_id DROP NOT NULL;

-- 允许匿名提交（如果 RLS 开启的话也需要对应策略）
ALTER TABLE daily_gallery_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous submissions to daily_gallery_submissions"
ON daily_gallery_submissions
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public read access to daily_gallery_submissions"
ON daily_gallery_submissions
FOR SELECT
TO public
USING (true);
