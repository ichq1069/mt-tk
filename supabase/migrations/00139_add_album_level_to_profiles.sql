-- 创建等级枚举
DO $$ BEGIN
    CREATE TYPE public.album_permission_level AS ENUM ('pt', 'vip', 'svip', 'vvip');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 给 profiles 添加等级字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS album_level public.album_permission_level DEFAULT 'pt';

-- 确保 album_photos 的 level 字段与我们的映射一致
-- 原有 level 是 'normal', 'non_restricted', 'restricted'
-- 我们保持现状，但在查询时根据逻辑进行映射：
-- pt: normal
-- vip/svip: normal + non_restricted
-- vvip: normal + non_restricted + restricted

-- 更新已有用户的等级（如果有特殊需求可以加，这里默认所有用户初始为 pt）
