-- 1. 彻底删除旧的触发器
DROP TRIGGER IF EXISTS tr_album_photo_count_change ON album_photos;
DROP TRIGGER IF EXISTS tr_album_photo_count_insert_stmt ON album_photos;
DROP TRIGGER IF EXISTS tr_album_photo_count_update_stmt ON album_photos;
DROP TRIGGER IF EXISTS tr_album_photo_count_delete_stmt ON album_photos;

-- 2. 重新定义触发器函数，使用 SECURITY DEFINER 确保始终能看到所有行并进行正确计数
CREATE OR REPLACE FUNCTION public.handle_album_photo_count_stmt_all()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- 关键修复：确保跨 RLS 计数
AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE public.photo_albums pa
        SET photo_count = (SELECT count(*) FROM public.album_photos ap WHERE ap.album_id = pa.id),
            updated_at = now()
        WHERE id IN (SELECT album_id FROM new_table);
    END IF;

    IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
        UPDATE public.photo_albums pa
        SET photo_count = (SELECT count(*) FROM public.album_photos ap WHERE ap.album_id = pa.id),
            updated_at = now()
        WHERE id IN (SELECT album_id FROM old_table);
    END IF;
    
    RETURN NULL;
END;
$$;

-- 3. 重新创建基于语句级的触发器（更高效且不会重复触发）
-- 注意：这里使用 REFERENCING 语句，这是 PG 10+ 的语法，Supabase 支持
CREATE TRIGGER tr_album_photo_count_insert_stmt
AFTER INSERT ON public.album_photos
REFERENCING NEW TABLE AS new_table
FOR EACH STATEMENT EXECUTE FUNCTION handle_album_photo_count_stmt_all();

CREATE TRIGGER tr_album_photo_count_update_stmt
AFTER UPDATE ON public.album_photos
REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
FOR EACH STATEMENT EXECUTE FUNCTION handle_album_photo_count_stmt_all();

CREATE TRIGGER tr_album_photo_count_delete_stmt
AFTER DELETE ON public.album_photos
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT EXECUTE FUNCTION handle_album_photo_count_stmt_all();

-- 4. 立即执行一次全量同步，修复当前所有不一致的计数
UPDATE public.photo_albums pa
SET photo_count = (SELECT count(*) FROM public.album_photos ap WHERE ap.album_id = pa.id),
    updated_at = now();

-- 5. 确保 photo_albums 表的 photo_count 默认值为 0
ALTER TABLE public.photo_albums ALTER COLUMN photo_count SET DEFAULT 0;
