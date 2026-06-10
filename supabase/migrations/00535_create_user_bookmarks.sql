CREATE TABLE IF NOT EXISTS public.user_bookmarks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  view_mode TEXT,
  view_layout TEXT,
  category_id TEXT,
  active_tag_ids TEXT[],
  scroll_position INTEGER DEFAULT 0,
  preview_index INTEGER DEFAULT -1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_bookmarks' AND policyname = 'Users can manage their own bookmark'
  ) THEN
    CREATE POLICY "Users can manage their own bookmark" ON public.user_bookmarks
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
