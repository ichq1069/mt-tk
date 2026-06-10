-- 为 media_items 增加分类人字段，用于记录是谁进行了分类操作
ALTER TABLE public.media_items ADD COLUMN IF NOT EXISTS classified_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.media_items ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;

-- 创建审计视图或简单的关联更新逻辑
-- 已经在 api.ts 中处理更新逻辑，这里只负责 DDL
