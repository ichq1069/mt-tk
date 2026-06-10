-- User specific pending items for fast organize
CREATE TABLE IF NOT EXISTS public.user_pending_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_id UUID REFERENCES public.media_items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, media_id)
);

-- RLS
ALTER TABLE public.user_pending_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own pending items" ON public.user_pending_items
    FOR ALL USING (auth.uid() = user_id);

-- Admin can see all
CREATE POLICY "Admins can view all pending items" ON public.user_pending_items
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
