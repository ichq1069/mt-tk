CREATE OR REPLACE FUNCTION public.get_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_media_count BIGINT;
    v_profile_count BIGINT;
    v_config_count BIGINT;
BEGIN
    SELECT count(*) INTO v_media_count FROM public.media_items;
    SELECT count(*) INTO v_profile_count FROM public.profiles;
    -- Check if storage_configs exists, otherwise use 0
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'storage_configs') THEN
        SELECT count(*) INTO v_config_count FROM public.storage_configs;
    ELSE
        v_config_count := 0;
    END IF;

    RETURN jsonb_build_object(
        'status', 'healthy',
        'db_time', now(),
        'stats', jsonb_build_object(
            'media_count', v_media_count,
            'profile_count', v_profile_count,
            'config_count', v_config_count
        )
    );
END;
$$;
