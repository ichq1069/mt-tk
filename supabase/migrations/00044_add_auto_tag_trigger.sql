CREATE OR REPLACE FUNCTION auto_tag_media_logic()
RETURNS TRIGGER AS $$
DECLARE
    tag_rec RECORD;
BEGIN
    -- Only proceed if title is not null
    IF NEW.title IS NOT NULL THEN
        FOR tag_rec IN SELECT id, name FROM tags LOOP
            -- Check if title contains tag name (case-insensitive)
            IF NEW.title ~* tag_rec.name THEN
                INSERT INTO media_tags (media_id, tag_id)
                VALUES (NEW.id, tag_rec.id)
                ON CONFLICT (media_id, tag_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Insert
CREATE TRIGGER trigger_auto_tag_after_insert
AFTER INSERT ON media_items
FOR EACH ROW
EXECUTE FUNCTION auto_tag_media_logic();

-- Trigger for Update (only when title changes)
CREATE TRIGGER trigger_auto_tag_after_update
AFTER UPDATE OF title ON media_items
FOR EACH ROW
WHEN (OLD.title IS DISTINCT FROM NEW.title)
EXECUTE FUNCTION auto_tag_media_logic();
