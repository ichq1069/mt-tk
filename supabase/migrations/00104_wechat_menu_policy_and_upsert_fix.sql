-- RLS policies for wechat_menus
ALTER TABLE public.wechat_menus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to manage wechat_menus" ON public.wechat_menus;
CREATE POLICY "Allow authenticated users to manage wechat_menus" ON public.wechat_menus FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure config_id is unique per menu if we only want one active menu per config
-- ALTER TABLE public.wechat_menus ADD CONSTRAINT wechat_menus_config_id_key UNIQUE (config_id);
-- Actually, we might have history, so no UNIQUE constraint. Upsert will handle by ID if provided.
-- For simple case, we use upsert with config_id as key.
