-- 允许任何人上传到 daily_gallery 目录
CREATE POLICY "Allow public upload to daily_gallery" 
ON storage.objects 
FOR INSERT 
TO public 
WITH CHECK (
  bucket_id = 'media_content' AND 
  (storage.foldername(name))[1] = 'daily_gallery'
);

-- 同时允许公开查看（虽然 bucket 是 public 的，但有时候 RLS 还是会拦截）
CREATE POLICY "Allow public select on media_content" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'media_content');
