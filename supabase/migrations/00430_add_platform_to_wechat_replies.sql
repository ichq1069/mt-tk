-- Add platform column to wechat_replies
ALTER TABLE public.wechat_replies ADD COLUMN platform text DEFAULT 'wechat';

-- Add index for platform
CREATE INDEX idx_wechat_replies_platform ON public.wechat_replies(platform);

-- For existing records, set to wechat
UPDATE public.wechat_replies SET platform = 'wechat' WHERE platform IS NULL;
