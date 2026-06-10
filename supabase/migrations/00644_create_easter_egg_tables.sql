-- 彩蛋配置表
CREATE TABLE public.easter_egg_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('points', 'physical', 'coupon')),
    reward_content JSONB NOT NULL,
    trigger_condition JSONB NOT NULL DEFAULT '{}'::jsonb,
    icon_url TEXT,
    message TEXT,
    start_at TIMESTAMPTZ DEFAULT NOW(),
    end_at TIMESTAMPTZ,
    max_winners INTEGER DEFAULT 100,
    current_winners INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 彩蛋中奖记录表
CREATE TABLE public.easter_egg_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    egg_id UUID NOT NULL REFERENCES public.easter_egg_configs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL,
    reward_content JSONB NOT NULL,
    claim_status TEXT NOT NULL DEFAULT 'claimed' CHECK (claim_status IN ('pending', 'claimed', 'shipped')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 彩蛋触发日志表
CREATE TABLE public.easter_egg_trigger_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    egg_id UUID REFERENCES public.easter_egg_configs(id) ON DELETE SET NULL,
    page TEXT,
    is_win BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 开启 RLS
ALTER TABLE public.easter_egg_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.easter_egg_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.easter_egg_trigger_logs ENABLE ROW LEVEL SECURITY;

-- 策略：管理员全权，普通用户只读配置和看自己的中奖记录
CREATE POLICY "Admin full access on easter_egg_configs" ON public.easter_egg_configs
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Anyone can view active easter_egg_configs" ON public.easter_egg_configs
    FOR SELECT TO authenticated USING (status = 'active');

CREATE POLICY "Admin full access on easter_egg_records" ON public.easter_egg_records
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Users can view their own egg records" ON public.easter_egg_records
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admin full access on easter_egg_trigger_logs" ON public.easter_egg_trigger_logs
    FOR ALL TO authenticated USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- 允许用户插入触发日志（通过 RPC 或者直接，为了安全推荐通过 Edge Function）
CREATE POLICY "Authenticated users can insert trigger logs" ON public.easter_egg_trigger_logs
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 触发器：更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_easter_egg_configs_updated_at
    BEFORE UPDATE ON public.easter_egg_configs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
