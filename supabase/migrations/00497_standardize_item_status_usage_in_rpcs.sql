-- Standardize public.item_status usage in RPCs with explicit schema and type qualification
CREATE OR REPLACE FUNCTION public.update_media_admin_status(
    p_item_id UUID,
    p_is_recommended BOOLEAN DEFAULT NULL,
    p_is_hidden BOOLEAN DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.media_items 
    SET 
        is_recommended = COALESCE(p_is_recommended, is_recommended),
        is_hidden = COALESCE(p_is_hidden, is_hidden),
        status = CASE 
                    WHEN p_status = 'approved'::public.item_status THEN 'approved'::public.item_status
                    WHEN p_status = 'archived'::public.item_status THEN 'archived'::public.item_status
                    WHEN p_status = 'pending'::public.item_status THEN 'pending'::public.item_status
                    WHEN p_status = 'rejected'::public.item_status THEN 'rejected'::public.item_status
                    ELSE status
                 END
    WHERE public.media_items.id = p_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.batch_update_media_status_rpc(
    p_item_ids UUID[],
    p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.media_items
    SET 
        status = p_status::public.item_status,
        updated_at = NOW()
    WHERE public.media_items.id = ANY(p_item_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_media_status_rpc(
    p_item_id UUID,
    p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.media_items
    SET 
        status = p_status::public.item_status,
        updated_at = NOW()
    WHERE public.media_items.id = p_item_id;
END;
$$;
