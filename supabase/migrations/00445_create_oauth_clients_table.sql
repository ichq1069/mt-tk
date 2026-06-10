-- 创建 OAuth 客户端表
CREATE TABLE public.oauth_clients (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    client_id text NOT NULL UNIQUE,
    client_secret text NOT NULL,
    name text,
    description text,
    scopes text[] DEFAULT '{admin:read,admin:write}',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT oauth_clients_pkey PRIMARY KEY (id)
);

-- 开启 RLS
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;

-- 只有管理员可以读写此表
CREATE POLICY "Admins can manage oauth clients" ON public.oauth_clients
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 插入一个示例客户端 (用于调试)
-- INSERT INTO public.oauth_clients (client_id, client_secret, name) VALUES ('admin_cli', 'cli_secret_123', 'Default Admin CLI');
