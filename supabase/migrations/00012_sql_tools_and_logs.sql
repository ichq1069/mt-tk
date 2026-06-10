-- 创建 SQL 操作日志表
CREATE TABLE IF NOT EXISTS public.sql_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id),
    query_text TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success', 'error'
    affected_rows INT,
    error_message TEXT,
    execution_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 启用 RLS
ALTER TABLE public.sql_logs ENABLE ROW LEVEL SECURITY;

-- 仅管理员可以查看和插入日志
CREATE POLICY "Admins can manage sql_logs" ON public.sql_logs
    FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- 创建万能 SQL 执行函数 (仅限管理员调用)
CREATE OR REPLACE FUNCTION public.execute_admin_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    start_time timestamptz;
    end_time timestamptz;
    diff_ms int;
    row_count int;
    result_data jsonb;
    error_msg text;
BEGIN
    -- 严格权限检查
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION '只有管理员可以执行此操作';
    END IF;

    start_time := clock_timestamp();

    -- 根据 SQL 类型处理返回值
    IF (trim(sql_query) ~* '^\s*SELECT') THEN
        EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result_data;
        row_count := jsonb_array_length(result_data);
    ELSE
        EXECUTE sql_query;
        GET DIAGNOSTICS row_count = ROW_COUNT;
        result_data := jsonb_build_object('affected_rows', row_count);
    END IF;

    end_time := clock_timestamp();
    diff_ms := extract(epoch from (end_time - start_time)) * 1000;

    -- 记录成功日志
    INSERT INTO public.sql_logs (user_id, query_text, status, affected_rows, execution_time_ms)
    VALUES (auth.uid(), sql_query, 'success', row_count, diff_ms);

    RETURN jsonb_build_object('success', true, 'data', result_data, 'execution_time_ms', diff_ms);

EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
    
    -- 记录错误日志
    INSERT INTO public.sql_logs (user_id, query_text, status, error_message)
    VALUES (auth.uid(), sql_query, 'error', error_msg);

    RETURN jsonb_build_object('success', false, 'error', error_msg);
END;
$$;
