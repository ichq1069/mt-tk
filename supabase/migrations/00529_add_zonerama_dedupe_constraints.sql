-- Add unique constraint/index for album_photos
ALTER TABLE album_photos DROP CONSTRAINT IF EXISTS album_photos_album_url_unique;
ALTER TABLE album_photos ADD CONSTRAINT album_photos_album_url_unique UNIQUE (album_id, url);

DROP INDEX IF EXISTS album_photos_album_zonerama_id_unique;
CREATE UNIQUE INDEX album_photos_album_zonerama_id_unique ON album_photos (album_id, zonerama_photo_id) 
WHERE zonerama_photo_id IS NOT NULL;

-- Add unique index for media_items
DROP INDEX IF EXISTS media_items_zonerama_photo_id_unique;
CREATE UNIQUE INDEX media_items_zonerama_photo_id_unique ON media_items (zonerama_photo_id) 
WHERE zonerama_photo_id IS NOT NULL;