-- 创建通知模板表
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    title_template TEXT NOT NULL,
    content_template TEXT NOT NULL,
    category TEXT DEFAULT 'system', -- system, audit, reward, etc.
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 插入一些初始模板
INSERT INTO public.notification_templates (name, title_template, content_template, category)
VALUES 
('作品审核通过', '您的作品《{title}》已通过审核', '亲爱的 {username}，您发布的作品《{title}》已通过审核，现在大家都可以看到它啦！祝您在社区玩得开心。', 'audit'),
('作品审核拒绝', '作品《{title}》审核未通过', '抱歉 {username}，您的作品《{title}》因“{reason}”未通过审核。您可以根据建议修改后重新上传。', 'audit'),
('积分奖励通知', '获得 {amount} 积分奖励', '恭喜 {username}！由于 {reason}，系统已向您的账户发放了 {amount} 积分奖励，快去个人中心查看吧。', 'reward'),
('系统维护通知', '系统维护公告', '各位用户请注意，系统将于 {time} 进行例行维护，届时部分功能可能无法使用，预计耗时 {duration}，给您带来的不便敬请谅解。', 'system');

-- 给通知表增加发送渠道标识
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'all'; -- in_app, email, all
