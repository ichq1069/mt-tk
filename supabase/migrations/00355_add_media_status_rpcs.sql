-- 为媒体状态更新添加专门的 RPC 函数，规避 PostgREST 状态枚举类型转换的 400 错误
CREATE OR REPLACE FUNCTION public.update_media_status_rpc(p_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count int;
BEGIN
    -- 权限检查：必须是管理员
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION '只有管理员可以执行此操作';
    END IF;

    -- 更新状态，进行显式类型转换
    UPDATE public.media_items
    SET status = p_status::public.item_status,
        reason = p_reason,
        updated_at = NOW()
    WHERE id = p_id;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item not found');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.batch_update_media_status_rpc(p_ids uuid[], p_status text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count int;
BEGIN
    -- 权限检查
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION '只有管理员可以执行此操作';
    END IF;

    -- 批量更新状态
    UPDATE public.media_items
    SET status = p_status::public.item_status,
        reason = p_reason,
        updated_at = NOW()
    WHERE id = ANY(p_ids);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'count', v_updated_count);
END;
$$;