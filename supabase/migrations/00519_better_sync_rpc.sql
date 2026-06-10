CREATE OR REPLACE FUNCTION public.upsert_table_data_no_fks(
  p_table_name text,
  p_rows jsonb,
  p_conflict_column text DEFAULT 'id'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cols text;
  v_update_cols text;
  v_query text;
BEGIN
  -- 临时关闭外键约束
  SET LOCAL session_replication_role = 'replica';

  -- 获取列名
  SELECT string_agg(quote_ident(column_name), ', ')
  INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table_name;

  -- 构建更新子句（排除冲突列）
  SELECT string_agg(quote_ident(column_name) || ' = EXCLUDED.' || quote_ident(column_name), ', ')
  INTO v_update_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = p_table_name
  AND column_name != p_conflict_column;

  -- 构建并执行动态 SQL
  v_query := format(
    'INSERT INTO %I (%s) 
     SELECT * FROM jsonb_populate_recordset(NULL::%I, $1) 
     ON CONFLICT (%I) DO UPDATE SET %s',
    p_table_name, v_cols, p_table_name, p_conflict_column, v_update_cols
  );

  EXECUTE v_query USING p_rows;

  RETURN jsonb_build_object('success', true, 'count', jsonb_array_length(p_rows));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_table_data_no_fks(text, jsonb, text) TO authenticated;
