-- Create content_categories table
CREATE TABLE IF NOT EXISTS public.content_categories (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add category_id to media_items
ALTER TABLE public.media_items ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.content_categories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

-- Policies for content_categories
CREATE POLICY "Allow public read content_categories" ON public.content_categories FOR SELECT USING (true);
CREATE POLICY "Allow admin all content_categories" ON public.content_categories FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Insert some default categories if table is empty
INSERT INTO public.content_categories (name, icon, sort_order)
SELECT 'TK', 'Video', 1
WHERE NOT EXISTS (SELECT 1 FROM public.content_categories WHERE name = 'TK');

INSERT INTO public.content_categories (name, icon, sort_order)
SELECT '白袜', 'ImageIcon', 2
WHERE NOT EXISTS (SELECT 1 FROM public.content_categories WHERE name = '白袜');

INSERT INTO public.content_categories (name, icon, sort_order)
SELECT '写真图集', 'ImageIcon', 3
WHERE NOT EXISTS (SELECT 1 FROM public.content_categories WHERE name = '写真图集');

INSERT INTO public.content_categories (name, icon, sort_order)
SELECT '青春', 'ImageIcon', 4
WHERE NOT EXISTS (SELECT 1 FROM public.content_categories WHERE name = '青春');

-- Update default permission groups to include content_classification
-- Note: Check if the permission is not already in the array
UPDATE public.permission_groups 
SET permissions = permissions || '["content_classification"]'::jsonb
WHERE (name = '超级管理员' OR name = '管理员') 
  AND NOT (permissions @> '["content_classification"]'::jsonb);
