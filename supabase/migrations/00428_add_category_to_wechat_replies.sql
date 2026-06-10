-- Add category column to wechat_replies
ALTER TABLE public.wechat_replies ADD COLUMN category text;

-- Add comment to explain categories
COMMENT ON COLUMN public.wechat_replies.category IS 'Reply category: login, daily_gallery, binding, help, check_in';

-- Add a table for mini program message push config if not exists
-- We will use system_configs for this, but let's ensure the wechat_replies can be used by mini program too
-- We might want to add a platform column to wechat_replies or just allow config_id to be null/special for mini program
-- Actually, the user wants it to be like wechat official account, so maybe we should have a mini_program_configs table?
-- Let's check if we have one.
