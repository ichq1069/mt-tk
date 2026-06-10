-- 为 profiles 增加头像、背景图和积分字段
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cover_url') THEN
        ALTER TABLE profiles ADD COLUMN cover_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'points') THEN
        ALTER TABLE profiles ADD COLUMN points INTEGER DEFAULT 0;
    END IF;
END $$;

-- 为 storage_configs 增加签到配置
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storage_configs' AND column_name = 'check_in_points') THEN
        ALTER TABLE storage_configs ADD COLUMN check_in_points INTEGER DEFAULT 10;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storage_configs' AND column_name = 'check_in_description') THEN
        ALTER TABLE storage_configs ADD COLUMN check_in_description TEXT DEFAULT '每日签到奖励';
    END IF;
END $$;
