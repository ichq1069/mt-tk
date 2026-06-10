-- 为 public.item_status 枚举类型添加与 text 类型的隐式转换，解决 PostgREST 查询时的类型匹配问题
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_cast 
        WHERE castsource = 'text'::regtype 
        AND casttarget = 'public.item_status'::regtype
    ) THEN
        CREATE CAST (text AS public.item_status) WITH INOUT AS IMPLICIT;
    END IF;
END $$;