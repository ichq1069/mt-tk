-- 1. 为 profiles 添加 digital_id 和 rank 字段
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS digital_id text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rank text DEFAULT '初出茅庐';

-- 2. 创建数字 ID 配置表
CREATE TABLE IF NOT EXISTS public.digital_id_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_length integer DEFAULT 6,
    start_value integer DEFAULT 100000,
    next_value integer DEFAULT 100001,
    is_random_mode boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now()
);

-- 初始化配置（如果不存在）
INSERT INTO public.digital_id_configs (id_length, start_value, next_value)
SELECT 6, 100000, 100001
WHERE NOT EXISTS (SELECT 1 FROM public.digital_id_configs);

-- 3. 创建靓号池表
CREATE TABLE IF NOT EXISTS public.special_digital_ids (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    digital_id text UNIQUE NOT NULL,
    price integer DEFAULT 100,
    required_rank text DEFAULT '练气期1层',
    is_sold boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. 自动生成数字 ID 的函数
CREATE OR REPLACE FUNCTION public.generate_digital_id()
RETURNS trigger AS $$
DECLARE
    new_id text;
    cfg record;
BEGIN
    IF NEW.digital_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT * INTO cfg FROM public.digital_id_configs LIMIT 1;

    IF cfg.is_random_mode THEN
        LOOP
            new_id := floor(random() * (power(10, cfg.id_length) - power(10, cfg.id_length - 1)) + power(10, cfg.id_length - 1))::text;
            EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id);
        END LOOP;
    ELSE
        new_id := cfg.next_value::text;
        UPDATE public.digital_id_configs SET next_value = next_value + 1 WHERE id = cfg.id;
    END IF;

    NEW.digital_id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器：创建用户时自动分配数字 ID
DROP TRIGGER IF EXISTS tr_generate_digital_id ON public.profiles;
CREATE TRIGGER tr_generate_digital_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_digital_id();

-- 5. 修复 IP 采集的触发器函数
CREATE OR REPLACE FUNCTION public.set_visit_ip()
RETURNS trigger AS $$
BEGIN
    IF NEW.ip_address IS NULL OR NEW.ip_address = 'unknown' OR NEW.ip_address = '' THEN
        NEW.ip_address := COALESCE(
            current_setting('request.headers', true)::json->>'x-forwarded-for',
            current_setting('request.headers', true)::json->>'cf-connecting-ip',
            'unknown'
        );
        -- 处理可能的多个 IP 地址情况（x-forwarded-for 可能包含多个 IP，取第一个）
        IF NEW.ip_address LIKE '%,%' THEN
            NEW.ip_address := split_part(NEW.ip_address, ',', 1);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 user_visit_stats 添加 IP 自动采集触发器
DROP TRIGGER IF EXISTS tr_set_visit_ip ON public.user_visit_stats;
CREATE TRIGGER tr_set_visit_ip
BEFORE INSERT ON public.user_visit_stats
FOR EACH ROW
EXECUTE FUNCTION public.set_visit_ip();

-- 6. 添加一些演示靓号
INSERT INTO public.special_digital_ids (digital_id, price, required_rank) VALUES
('666666', 1000, '筑基期1层'),
('888888', 2000, '结丹期1层'),
('123456', 500, '练气期6层'),
('999999', 3000, '元婴期1层'),
('111111', 800, '练气期9层')
ON CONFLICT DO NOTHING;
