-- 统一处理函数，区分不同操作
CREATE OR REPLACE FUNCTION handle_album_photo_count_stmt_all()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE photo_albums pa
        SET photo_count = (SELECT count(*) FROM album_photos ap WHERE ap.album_id = pa.id),
            updated_at = now()
        WHERE id IN (SELECT album_id FROM new_table);
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE photo_albums pa
        SET photo_count = (SELECT count(*) FROM album_photos ap WHERE ap.album_id = pa.id),
            updated_at = now()
        WHERE id IN (SELECT album_id FROM new_table UNION SELECT album_id FROM old_table);
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE photo_albums pa
        SET photo_count = (SELECT count(*) FROM album_photos ap WHERE ap.album_id = pa.id),
            updated_at = now()
        WHERE id IN (SELECT album_id FROM old_table);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 重新关联触发器
DROP TRIGGER IF EXISTS tr_album_photo_count_insert_stmt ON album_photos;
DROP TRIGGER IF EXISTS tr_album_photo_count_update_stmt ON album_photos;
DROP TRIGGER IF EXISTS tr_album_photo_count_delete_stmt ON album_photos;

CREATE TRIGGER tr_album_photo_count_insert_stmt
AFTER INSERT ON album_photos
REFERENCING NEW TABLE AS new_table
FOR EACH STATEMENT
EXECUTE FUNCTION handle_album_photo_count_stmt_all();

CREATE TRIGGER tr_album_photo_count_update_stmt
AFTER UPDATE ON album_photos
REFERENCING OLD TABLE AS old_table NEW TABLE AS new_table
FOR EACH STATEMENT
EXECUTE FUNCTION handle_album_photo_count_stmt_all();

CREATE TRIGGER tr_album_photo_count_delete_stmt
AFTER DELETE ON album_photos
REFERENCING OLD TABLE AS old_table
FOR EACH STATEMENT
EXECUTE FUNCTION handle_album_photo_count_stmt_all();
