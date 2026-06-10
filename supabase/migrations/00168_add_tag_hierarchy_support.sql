-- 为标签表添加层级支持字段（如果尚未存在）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tags' AND column_name='parent_id') THEN
    ALTER TABLE public.tags ADD COLUMN parent_id UUID REFERENCES public.tags(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tags' AND column_name='level') THEN
    ALTER TABLE public.tags ADD COLUMN level INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tags' AND column_name='weight') THEN
    ALTER TABLE public.tags ADD COLUMN weight INTEGER DEFAULT 0;
  END IF;
END $$;

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_tags_parent_id ON public.tags(parent_id);
CREATE INDEX IF NOT EXISTS idx_tags_level ON public.tags(level);
CREATE INDEX IF NOT EXISTS idx_tags_weight ON public.tags(weight DESC);

-- 创建获取标签树的函数
CREATE OR REPLACE FUNCTION public.get_tag_tree()
RETURNS TABLE (
  id UUID,
  name TEXT,
  parent_id UUID,
  level INTEGER,
  weight INTEGER,
  created_at TIMESTAMPTZ,
  children JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE tag_tree AS (
    -- 根标签（level = 0 或 parent_id IS NULL）
    SELECT 
      t.id,
      t.name,
      t.parent_id,
      t.level,
      t.weight,
      t.created_at,
      '[]'::JSONB as children
    FROM public.tags t
    WHERE t.parent_id IS NULL OR t.level = 0
    
    UNION ALL
    
    -- 子标签
    SELECT 
      t.id,
      t.name,
      t.parent_id,
      t.level,
      t.weight,
      t.created_at,
      '[]'::JSONB as children
    FROM public.tags t
    INNER JOIN tag_tree tt ON t.parent_id = tt.id
  )
  SELECT * FROM tag_tree
  ORDER BY level ASC, weight DESC, name ASC;
END;
$$;
