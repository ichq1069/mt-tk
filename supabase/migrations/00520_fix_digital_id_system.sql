-- 创建数字 ID 配置表
CREATE TABLE IF NOT EXISTS public.digital_id_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_length integer DEFAULT 6 NOT NULL,
    start_value bigint DEFAULT 100000 NOT NULL,
    next_value bigint DEFAULT 100000 NOT NULL,
    is_random_mode boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 插入默认配置
INSERT INTO public.digital_id_configs (id_length, start_value, next_value, is_random_mode)
SELECT 6, 100000, 100000, false
WHERE NOT EXISTS (SELECT 1 FROM public.digital_id_configs);

-- 创建靓号池表
CREATE TABLE IF NOT EXISTS public.special_digital_ids (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    digital_id text UNIQUE NOT NULL,
    price integer DEFAULT 0,
    is_sold boolean DEFAULT false,
    owner_id uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now()
);

-- 修正 generate_digital_id 函数并确保其逻辑正确
CREATE OR REPLACE FUNCTION public.handle_generate_digital_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_id text;
    cfg record;
    max_attempts integer := 200;
    attempts integer := 0;
BEGIN
    -- 如果已经手动设置了 ID，则跳过
    IF NEW.digital_id IS NOT NULL AND NEW.digital_id <> '' THEN
        RETURN NEW;
    END IF;

    -- 获取配置
    SELECT * INTO cfg FROM public.digital_id_configs LIMIT 1;
    
    -- 如果没有配置，使用默认设置 (8位)
    IF cfg IS NULL THEN
        new_id := floor(random() * (power(10, 8) - power(10, 7)) + power(10, 7))::text;
    ELSIF cfg.is_random_mode THEN
        LOOP
            attempts := attempts + 1;
            -- 生成随机 ID
            new_id := floor(random() * (power(10, cfg.id_length) - power(10, cfg.id_length - 1)) + power(10, cfg.id_length - 1))::text;
            
            -- 检查唯一性、排除列表和模式
            IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id) 
               AND NOT public.is_digital_id_forbidden(new_id) THEN
                EXIT;
            END IF;

            -- 安全退出: 如果尝试太多次都找不到符合模式的 ID
            IF attempts >= max_attempts THEN
                LOOP
                    new_id := floor(random() * (power(10, cfg.id_length) - power(10, cfg.id_length - 1)) + power(10, cfg.id_length - 1))::text;
                    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id);
                END LOOP;
                EXIT;
            END IF;
        END LOOP;
    ELSE
        new_id := cfg.next_value::text;
        -- 顺推模式下，跳过禁用的 ID
        WHILE public.is_digital_id_forbidden(new_id) OR EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id) LOOP
            cfg.next_value := cfg.next_value + 1;
            new_id := cfg.next_value::text;
            
            -- 防止无限循环
            attempts := attempts + 1;
            IF attempts > 1000 THEN EXIT; END IF;
        END LOOP;
        
        -- 更新下一个值
        UPDATE public.digital_id_configs SET next_value = cfg.next_value + 1 WHERE id = cfg.id;
    END IF;

    NEW.digital_id := new_id;
    RETURN NEW;
END;
$$;

-- 创建触发器 (如果不存在)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tr_generate_digital_id') THEN
        CREATE TRIGGER tr_generate_digital_id
        BEFORE INSERT ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_generate_digital_id();
    END IF;
END $$;
