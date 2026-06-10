-- User visit stats table
CREATE TABLE IF NOT EXISTS public.user_visit_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    browser TEXT,
    os TEXT,
    network_type TEXT,
    adblock_enabled BOOLEAN DEFAULT FALSE,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification buffer table
CREATE TABLE IF NOT EXISTS public.notification_buffer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    link TEXT,
    link_type TEXT DEFAULT 'internal',
    metadata JSONB DEFAULT '{}'::jsonb,
    send_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending'::public.item_status, -- pending, sent, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient buffer lookup
CREATE INDEX IF NOT EXISTS idx_notification_buffer_pending ON public.notification_buffer(user_id, type, status) WHERE status::public.item_status = 'pending'::public.item_status;

-- Enable RLS for user_visit_stats
ALTER TABLE public.user_visit_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert visit stats" ON public.user_visit_stats FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Admins can view visit stats" ON public.user_visit_stats FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- RPC to flush notification buffer
CREATE OR REPLACE FUNCTION public.flush_notification_buffer()
RETURNS VOID AS $$
DECLARE
    buf_rec RECORD;
BEGIN
    FOR buf_rec IN 
        SELECT * FROM public.notification_buffer 
        WHERE status::public.item_status = 'pending'::public.item_status AND send_at <= NOW()
    LOOP
        -- Insert into main notifications table
        INSERT INTO public.notifications (user_id, type, title, content, link, link_type, metadata)
        VALUES (buf_rec.user_id, buf_rec.type, buf_rec.title, buf_rec.content, buf_rec.link, buf_rec.link_type, buf_rec.metadata);

        -- Mark as sent
        UPDATE public.notification_buffer 
        SET status = 'sent', updated_at = NOW() 
        WHERE id = buf_rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
