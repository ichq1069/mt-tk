ALTER TABLE public.daily_gallery_special_passwords 
ADD CONSTRAINT daily_gallery_special_passwords_wechat_sync_key 
UNIQUE (creator_id, target_date, source);