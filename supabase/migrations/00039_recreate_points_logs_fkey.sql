ALTER TABLE points_logs DROP CONSTRAINT IF EXISTS points_logs_user_id_fkey;
ALTER TABLE points_logs 
ADD CONSTRAINT points_logs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- 尝试刷新 PostgREST 缓存（虽然在某些环境下不一定起作用，但执行一下无妨）
NOTIFY pgrst, 'reload schema';