-- 创建签到配置表
CREATE TABLE IF NOT EXISTS public.signin_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    day_number integer UNIQUE NOT NULL, -- 1-7
    min_points integer DEFAULT 1,
    max_points integer DEFAULT 10,
    exp_reward integer DEFAULT 5, -- 经验奖励
    created_at timestamp with time zone DEFAULT now()
);

-- 初始化 7 天签到奖励
INSERT INTO public.signin_configs (day_number, min_points, max_points, exp_reward) VALUES
(1, 1, 5, 5),
(2, 2, 6, 6),
(3, 3, 8, 8),
(4, 4, 10, 10),
(5, 5, 12, 12),
(6, 6, 15, 15),
(7, 10, 30, 30)
ON CONFLICT (day_number) DO UPDATE SET 
    min_points = EXCLUDED.min_points, 
    max_points = EXCLUDED.max_points,
    exp_reward = EXCLUDED.exp_reward;
