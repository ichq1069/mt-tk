-- Ensure the column exists on media_items
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'media_items' 
          AND column_name = 'exclude_from_daily_gallery'
    ) THEN 
        ALTER TABLE public.media_items ADD COLUMN exclude_from_daily_gallery BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
