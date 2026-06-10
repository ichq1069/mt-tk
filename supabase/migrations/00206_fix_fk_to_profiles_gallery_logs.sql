-- 修正外键，从 auth.users 指向 public.profiles 以便前端关联查询
ALTER TABLE daily_gallery_access_logs 
DROP CONSTRAINT IF EXISTS daily_gallery_access_logs_user_id_fkey;

ALTER TABLE daily_gallery_access_logs 
ADD CONSTRAINT daily_gallery_access_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
