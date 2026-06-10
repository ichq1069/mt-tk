-- 尝试修复 gen_salt 和 crypt (如果存在于 public schema)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'gen_salt') THEN
        ALTER FUNCTION public.gen_salt(text, integer) SET search_path = public, pg_temp;
        ALTER FUNCTION public.gen_salt(text) SET search_path = public, pg_temp;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'crypt') THEN
        ALTER FUNCTION public.crypt(text, text) SET search_path = public, pg_temp;
    END IF;
END
$$;