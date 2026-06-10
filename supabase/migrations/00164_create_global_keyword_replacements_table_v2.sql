-- 创建全局关键词替换表
CREATE TABLE public.global_keyword_replacements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_word TEXT NOT NULL,
    replacement_word TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('system', 'user')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(original_word, type)
);

-- 启用 RLS
ALTER TABLE public.global_keyword_replacements ENABLE ROW LEVEL SECURITY;

-- 策略：所有人可读 (用于前端替换)
CREATE POLICY "Public read keyword replacements" ON public.global_keyword_replacements
    FOR SELECT USING (TRUE);

-- 策略：管理员可全权操作
CREATE POLICY "Admin manage keyword replacements" ON public.global_keyword_replacements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
