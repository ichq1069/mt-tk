-- wechat_replies table
CREATE TABLE IF NOT EXISTS public.wechat_replies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    config_id uuid REFERENCES public.wechat_configs(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'keyword', 'follow', 'auto'
    keyword text, -- for keyword replies
    match_type text DEFAULT 'exact', -- 'exact', 'fuzzy'
    content_type text DEFAULT 'text', -- 'text', 'image', 'news'
    reply_content text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- wechat_messages table
CREATE TABLE IF NOT EXISTS public.wechat_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    config_id uuid REFERENCES public.wechat_configs(id) ON DELETE CASCADE,
    msg_id text,
    from_user text NOT NULL,
    to_user text NOT NULL,
    msg_type text NOT NULL,
    content text,
    pic_url text,
    media_id text,
    event text,
    event_key text,
    reply_content text,
    reply_type text,
    replied_at timestamp with time zone,
    raw_xml text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wechat_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wechat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for wechat_replies
DROP POLICY IF EXISTS "Allow authenticated users to manage wechat_replies" ON public.wechat_replies;
CREATE POLICY "Allow authenticated users to manage wechat_replies" ON public.wechat_replies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS policies for wechat_messages
DROP POLICY IF EXISTS "Allow authenticated users to manage wechat_messages" ON public.wechat_messages;
CREATE POLICY "Allow authenticated users to manage wechat_messages" ON public.wechat_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon to insert wechat_messages" ON public.wechat_messages;
CREATE POLICY "Allow anon to insert wechat_messages" ON public.wechat_messages FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role to manage wechat_messages" ON public.wechat_messages;
CREATE POLICY "Allow service_role to manage wechat_messages" ON public.wechat_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
