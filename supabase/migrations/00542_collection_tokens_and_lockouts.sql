-- 收藏口令表
CREATE TABLE IF NOT EXISTS public.collection_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    media_ids UUID[] NOT NULL,
    creator_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.collection_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tokens" ON public.collection_tokens FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tokens" ON public.collection_tokens FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- IP 锁定表
CREATE TABLE IF NOT EXISTS public.daily_gallery_password_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT UNIQUE NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    lockout_until TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX idx_collection_tokens_token ON public.collection_tokens(token);
CREATE INDEX idx_dg_lockouts_ip ON public.daily_gallery_password_lockouts(ip_address);

-- 辅助函数：生成 6 位大写字母数字组合
CREATE OR REPLACE FUNCTION generate_short_token() RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars))::integer + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;
