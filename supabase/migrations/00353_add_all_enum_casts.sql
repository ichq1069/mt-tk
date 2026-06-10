-- 确保所有核心枚举类型与 text 之间可以双向隐式转换，防止 PostgREST 查询时的类型不匹配错误
DO $$
DECLARE
    enums text[] := ARRAY['user_role', 'public.item_status', 'notification_type', 'badge_category', 'album_permission_level'];
    enum_name text;
BEGIN
    FOREACH enum_name IN ARRAY enums LOOP
        -- text -> enum
        IF NOT EXISTS (SELECT 1 FROM pg_cast WHERE castsource = 'text'::regtype AND casttarget = enum_name::regtype) THEN
            EXECUTE format('CREATE CAST (text AS %I) WITH INOUT AS IMPLICIT', enum_name);
        END IF;
        
        -- enum -> text
        IF NOT EXISTS (SELECT 1 FROM pg_cast WHERE castsource = enum_name::regtype AND casttarget = 'text'::regtype) THEN
            EXECUTE format('CREATE CAST (%I AS text) WITH INOUT AS IMPLICIT', enum_name);
        END IF;
    END LOOP;
END $$;