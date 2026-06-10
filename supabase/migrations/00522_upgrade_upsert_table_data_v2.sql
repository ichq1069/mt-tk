CREATE OR REPLACE FUNCTION public.upsert_table_data_v2(
  p_table_name text,
  p_rows jsonb,
  p_conflict_columns text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cols text;
  v_update_cols text;
  v_conflict_clause text;
  v_query text;
BEGIN
  -- 临时关闭外键约束 (replica 模式下不会触发外键检查)
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
  AND NOT (column_name = ANY(p_conflict_columns));

  -- 构建冲突列子句
  SELECT string_agg(quote_ident(col), ', ')
  INTO v_conflict_clause
  FROM unnest(p_conflict_columns) col;

  -- 构建并执行动态 SQL
  -- 如果没有更新列（即全表只有主键/联合主键），则 DO NOTHING
  IF v_update_cols IS NULL OR v_update_cols = '' THEN
    v_query := format(
      'INSERT INTO %I (%s) 
       SELECT * FROM jsonb_populate_recordset(NULL::%I, $1) 
       ON CONFLICT (%s) DO NOTHING',
      p_table_name, v_cols, p_table_name, v_conflict_clause
    );
  ELSE
    v_query := format(
      'INSERT INTO %I (%s) 
       SELECT * FROM jsonb_populate_recordset(NULL::%I, $1) 
       ON CONFLICT (%s) DO UPDATE SET %s',
      p_table_name, v_cols, p_table_name, v_conflict_clause, v_update_cols
    );
  END IF;

  EXECUTE v_query USING p_rows;

  RETURN jsonb_build_object('success', true, 'count', jsonb_array_length(p_rows));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;
