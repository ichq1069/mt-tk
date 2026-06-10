CREATE OR REPLACE FUNCTION public.check_all_users_badges()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user RECORD;
    v_total_granted integer := 0;
    v_granted integer;
BEGIN
    FOR v_user IN SELECT id FROM public.profiles LOOP
        v_granted := public.check_and_grant_auto_badges(v_user.id);
        v_total_granted := v_total_granted + v_granted;
    END LOOP;
    RETURN v_total_granted;
END;
$function$;
