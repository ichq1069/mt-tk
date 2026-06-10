-- Add visibility and minimum role to content_categories
ALTER TABLE content_categories ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE content_categories ADD COLUMN IF NOT EXISTS min_role TEXT DEFAULT 'pt';

-- Add visibility and minimum role to tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS min_role TEXT DEFAULT 'pt';
