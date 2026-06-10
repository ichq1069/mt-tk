-- 1. 创建排除 ID 表
CREATE TABLE IF NOT EXISTS public.excluded_digital_ids (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    digital_id text UNIQUE NOT NULL,
    reason text,
    created_at timestamptz DEFAULT now()
);

-- 2. 创建排除模式表
CREATE TABLE IF NOT EXISTS public.digital_id_patterns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern text NOT NULL, -- 正则表达式
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 3. 插入初始模式: AA (连续两个数字相同)
INSERT INTO public.digital_id_patterns (pattern, description)
VALUES ('(\d)\1', '禁止出现连续两个相同的数字 (AA模式)')
ON CONFLICT DO NOTHING;

-- 4. 创建检查函数
CREATE OR REPLACE FUNCTION public.is_digital_id_forbidden(p_id text)
RETURNS boolean AS $$
DECLARE
    pattern_rec record;
BEGIN
    -- 1. 检查特定排除列表
    IF EXISTS (SELECT 1 FROM public.excluded_digital_ids WHERE digital_id = p_id) THEN
        RETURN TRUE;
    END IF;

    -- 2. 检查靓号池 (保留给购买)
    IF EXISTS (SELECT 1 FROM public.special_digital_ids WHERE digital_id = p_id) THEN
        RETURN TRUE;
    END IF;

    -- 3. 检查自定义模式 (如 AA, AAAABBBB 等)
    FOR pattern_rec IN SELECT pattern FROM public.digital_id_patterns WHERE is_active = true LOOP
        IF p_id ~ pattern_rec.pattern THEN
            RETURN TRUE;
        END IF;
    END LOOP;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 5. 更新分配触发器函数
CREATE OR REPLACE FUNCTION public.generate_digital_id()
RETURNS trigger AS $$
DECLARE
    new_id text;
    cfg record;
    max_attempts integer := 200;
    attempts integer := 0;
    found_valid boolean := false;
BEGIN
    -- 如果已经手动设置了 ID，则跳过
    IF NEW.digital_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 获取配置
    SELECT * INTO cfg FROM public.digital_id_configs LIMIT 1;
    
    -- 如果没有配置，使用默认设置 (8位)
    IF cfg IS NULL THEN
        cfg := (SELECT NULL::public.digital_id_configs);
        cfg.id_length := 8;
        cfg.is_random_mode := true;
    END IF;

    IF cfg.is_random_mode THEN
        LOOP
            attempts := attempts + 1;
            -- 生成随机 ID
            new_id := floor(random() * (power(10, cfg.id_length) - power(10, cfg.id_length - 1)) + power(10, cfg.id_length - 1))::text;
            
            -- 检查唯一性、排除列表和模式
            IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id) 
               AND NOT public.is_digital_id_forbidden(new_id) THEN
                found_valid := true;
                EXIT;
            END IF;

            -- 安全退出: 如果尝试太多次都找不到符合模式的 ID
            -- (例如模式太严苛或 ID 长度太短导致几乎所有号码都被排除)
            -- 则降级为只检查唯一性，确保用户能注册成功
            IF attempts >= max_attempts THEN
                LOOP
                    new_id := floor(random() * (power(10, cfg.id_length) - power(10, cfg.id_length - 1)) + power(10, cfg.id_length - 1))::text;
                    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id);
                END LOOP;
                found_valid := true;
                EXIT;
            END IF;
        END LOOP;
    ELSE
        new_id := cfg.next_value::text;
        -- 顺推模式下，跳过禁用的 ID
        WHILE public.is_digital_id_forbidden(new_id) OR EXISTS (SELECT 1 FROM public.profiles WHERE digital_id = new_id) LOOP
            cfg.next_value := cfg.next_value + 1;
            new_id := cfg.next_value::text;
            
            -- 防止无限循环 (虽然概率极低)
            attempts := attempts + 1;
            IF attempts > 1000 THEN EXIT; END IF;
        END LOOP;
        
        -- 更新下一个值
        UPDATE public.digital_id_configs SET next_value = cfg.next_value + 1 WHERE id = cfg.id;
    END IF;

    NEW.digital_id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
