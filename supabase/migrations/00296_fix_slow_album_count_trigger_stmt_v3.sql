CREATE OR REPLACE FUNCTION handle_album_photo_count_stmt_upsert()
RETURNS TRIGGER AS $$
BEGIN
    -- 处理插入或更新时的计数，同时考虑可能从旧图集移动过来的情况
    UPDATE photo_albums pa
    SET photo_count = (SELECT count(*) FROM album_photos ap WHERE ap.album_id = pa.id),
        updated_at = now()
    WHERE id IN (
        SELECT album_id FROM new_table
        UNION
        -- 如果是更新触发器且定义了 old_table，则也更新旧图集
        SELECT album_id FROM (SELECT 1) AS dummy LEFT JOIN old_table ON TRUE WHERE old_table.album_id IS NOT NULL
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
