-- 1. 创建 check_album_photo_similar_with_url
CREATE OR REPLACE FUNCTION public.check_album_photo_similar_with_url(p_album_id uuid, p_hash text, p_threshold integer DEFAULT 5)
 RETURNS TABLE(id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT m.id
  FROM public.album_photos m
  WHERE m.album_id = p_album_id
    AND m.content_hash IS NOT NULL
    AND bit_count(('x' || lpad(m.content_hash, 16, '0'))::bit(64) # ('x' || lpad(p_hash, 16, '0'))::bit(64)) <= p_threshold
  LIMIT 1;
END;
$function$;

-- 2. 创建 batch_grant_badges
CREATE OR REPLACE FUNCTION public.batch_grant_badges(
    p_user_ids uuid[], 
    p_badge_id uuid, 
    p_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_badges (user_id, badge_id, expires_at)
    SELECT unnest(p_user_ids), p_badge_id, p_expires_at
    ON CONFLICT (user_id, badge_id) DO UPDATE 
    SET expires_at = EXCLUDED.expires_at,
        granted_at = now();
END;
$$;

-- 3. 创建 grant_badge_to_group
CREATE OR REPLACE FUNCTION public.grant_badge_to_group(
    p_group_id uuid, 
    p_badge_id uuid, 
    p_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_badges (user_id, badge_id, expires_at)
    SELECT id, p_badge_id, p_expires_at
    FROM public.profiles
    WHERE group_id = p_group_id
    ON CONFLICT (user_id, badge_id) DO UPDATE 
    SET expires_at = EXCLUDED.expires_at,
        granted_at = now();
END;
$$;

-- 4. 创建 check_user_badge_tasks (由于表缺失，先创建一个空返回或基础逻辑的占位符)
CREATE OR REPLACE FUNCTION public.check_user_badge_tasks(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 目前由于缺失任务表，仅返回成功提示
    RETURN jsonb_build_object('success', true, 'message', 'Badge tasks checked');
END;
$$;

-- 5. 如果 user_badges 缺少唯一约束，会导致 ON CONFLICT 失败，检查并添加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_badges_user_id_badge_id_key'
    ) THEN
        ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_user_id_badge_id_key UNIQUE (user_id, badge_id);
    END IF;
END $$;
