-- 1. 批量更新媒体指纹
CREATE OR REPLACE FUNCTION batch_update_media_hashes(p_updates jsonb)
RETURNS int AS $$
DECLARE
    v_item record;
    v_count int := 0;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_updates) AS x(id uuid, content_hash text, dedupe_error text, "table" text)
    LOOP
        IF v_item."table" = 'media_items' THEN
            UPDATE media_items 
            SET content_hash = v_item.content_hash, 
                dedupe_error = v_item.dedupe_error 
            WHERE id = v_item.id;
            IF FOUND THEN v_count := v_count + 1; END IF;
        ELSIF v_item."table" = 'album_photos' THEN
            UPDATE album_photos 
            SET content_hash = v_item.content_hash, 
                dedupe_error = v_item.dedupe_error 
            WHERE id = v_item.id;
            IF FOUND THEN v_count := v_count + 1; END IF;
        END IF;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 2. 保存查重扫描日志
CREATE OR REPLACE FUNCTION log_dedupe_scan(
    p_scan_type text,
    p_processed_count int,
    p_duplicate_count int,
    p_duration_ms int,
    p_config jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
    v_log_id uuid;
BEGIN
    INSERT INTO dedupe_logs (
        scan_type, 
        processed_count, 
        duplicate_count, 
        duration_ms, 
        scan_config
    ) VALUES (
        p_scan_type, 
        p_processed_count, 
        p_duplicate_count, 
        p_duration_ms, 
        p_config
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 3. 彻底清理已知的查重错误 (可选，用于维护)
CREATE OR REPLACE FUNCTION clear_dedupe_errors(p_table text DEFAULT 'media_items')
RETURNS int AS $$
DECLARE
    v_count int;
BEGIN
    IF p_table = 'media_items' THEN
        UPDATE media_items SET dedupe_error = NULL WHERE dedupe_error IS NOT NULL;
        GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSIF p_table = 'album_photos' THEN
        UPDATE album_photos SET dedupe_error = NULL WHERE dedupe_error IS NOT NULL;
        GET DIAGNOSTICS v_count = ROW_COUNT;
    ELSE
        v_count := 0;
    END IF;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
