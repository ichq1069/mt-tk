-- 确保 public.item_status 枚举与 text 之间可以双向隐式转换
DO $$
BEGIN
    -- text -> public.item_status
    IF NOT EXISTS (SELECT 1 FROM pg_cast WHERE castsource = 'text'::regtype AND casttarget = 'public.item_status'::regtype) THEN
        CREATE CAST (text AS public.item_status) WITH INOUT AS IMPLICIT;
    END IF;
    
    -- public.item_status -> text
    IF NOT EXISTS (SELECT 1 FROM pg_cast WHERE castsource = 'public.item_status'::regtype AND casttarget = 'text'::regtype) THEN
        CREATE CAST (public.item_status AS text) WITH INOUT AS IMPLICIT;
    END IF;
END $$;