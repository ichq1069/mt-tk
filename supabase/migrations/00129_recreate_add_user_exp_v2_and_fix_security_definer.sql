DROP FUNCTION IF EXISTS public.add_user_exp(uuid, integer, text, text);
CREATE OR REPLACE FUNCTION public.add_user_exp(p_user_id uuid, p_amount integer, p_reason text, p_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.profiles SET exp = COALESCE(exp, 0) + p_amount WHERE id = p_user_id;
    INSERT INTO public.growth_logs (user_id, amount, reason, type)
    VALUES (p_user_id, p_amount, p_reason, p_type);
END;
$function$;