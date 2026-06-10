-- 1. 为 photo_albums 增加 PDF 打包开关
ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS auto_pdf_enabled BOOLEAN DEFAULT FALSE;

-- 2. 为现有管理员权限组增加新权限点
UPDATE permission_groups 
SET permissions = permissions || '["album_browse", "album_download"]'::jsonb
WHERE name = '管理员';

-- 3. 确保所有相关表的 RLS 策略支持新权限（如果需要，目前我们还是先通过前端控制）
