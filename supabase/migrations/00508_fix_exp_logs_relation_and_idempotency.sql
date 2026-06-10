-- Fix add_user_exp to use growth_logs and handle idempotency
CREATE OR REPLACE FUNCTION public.add_user_exp(
    p_user_id uuid,
    p_amount integer,
    p_reason text,
    p_type text,
    p_target_id text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 只有当没有 target_id 或者 target_id 不冲突时才发放
    IF p_target_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.growth_logs 
        WHERE user_id = p_user_id AND type = p_type AND target_id = p_target_id
    ) THEN
        UPDATE public.profiles
        SET exp = COALESCE(exp, 0) + p_amount
        WHERE id = p_user_id;

        INSERT INTO public.growth_logs (user_id, amount, reason, type, target_id)
        VALUES (p_user_id, p_amount, p_reason, p_type, p_target_id)
        ON CONFLICT (user_id, type, target_id) WHERE target_id IS NOT NULL DO NOTHING;
    END IF;
END;
$$;

-- Fix add_user_points to handle idempotency
CREATE OR REPLACE FUNCTION public.add_user_points(
    p_user_id uuid,
    p_amount integer,
    p_reason text,
    p_type text,
    p_target_id text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 只有当没有 target_id 或者 target_id 不冲突时才发放
    IF p_target_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.points_logs 
        WHERE user_id = p_user_id AND type = p_type AND target_id = p_target_id
    ) THEN
        UPDATE public.profiles
        SET points = COALESCE(points, 0) + p_amount
        WHERE id = p_user_id;

        INSERT INTO public.points_logs (user_id, amount, reason, type, target_id)
        VALUES (p_user_id, p_amount, p_reason, p_type, p_target_id)
        ON CONFLICT (user_id, type, target_id) WHERE target_id IS NOT NULL DO NOTHING;
    END IF;
END;
$$;
