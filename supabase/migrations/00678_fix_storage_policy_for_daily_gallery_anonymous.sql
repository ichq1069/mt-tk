-- 删除旧政策
DROP POLICY IF EXISTS "Allow public upload to daily_gallery" ON storage.objects;

-- 使用更可靠的 LIKE 匹配，允许在 daily_gallery 下的所有层级上传
CREATE POLICY "Allow public upload to daily_gallery_recursive" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (
  bucket_id = 'media_content' AND 
  name LIKE 'daily_gallery/%'
);

-- 允许匿名用户更新自己的文件（如果需要重试或覆盖，虽然这里是 Date.now 命名的）
CREATE POLICY "Allow public update to daily_gallery" 
ON storage.objects 
FOR UPDATE
TO public 
USING (
  bucket_id = 'media_content' AND 
  name LIKE 'daily_gallery/%'
);
