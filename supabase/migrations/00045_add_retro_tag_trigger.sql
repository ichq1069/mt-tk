CREATE OR REPLACE FUNCTION retro_tag_media_on_tag_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO media_tags (media_id, tag_id)
    SELECT id, NEW.id
    FROM media_items
    WHERE title ~* NEW.name
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_retro_tag_after_tag_insert
AFTER INSERT ON tags
FOR EACH ROW
EXECUTE FUNCTION retro_tag_media_on_tag_insert();
