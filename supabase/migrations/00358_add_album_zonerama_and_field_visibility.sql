-- Add is_visible_on_front to album_custom_fields
ALTER TABLE album_custom_fields ADD COLUMN IF NOT EXISTS is_visible_on_front BOOLEAN DEFAULT TRUE;

-- Add is_zonerama to photo_albums
ALTER TABLE photo_albums ADD COLUMN IF NOT EXISTS is_zonerama BOOLEAN DEFAULT FALSE;

-- Update the view or any related functions if they exist (none found in simple schema)
