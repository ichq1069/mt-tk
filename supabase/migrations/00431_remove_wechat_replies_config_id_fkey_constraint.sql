-- Drop the foreign key constraint
ALTER TABLE public.wechat_replies DROP CONSTRAINT IF EXISTS wechat_replies_config_id_fkey;

-- We could optionally add a platform column already done
