DROP FUNCTION IF EXISTS public.add_user_points(uuid, integer, text, text);
CREATE OR REPLACE FUNCTION public.add_user_points(p_user_id uuid, p_amount integer, p_reason text, p_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.profiles SET points = COALESCE(points, 0) + p_amount WHERE id = p_user_id;
    INSERT INTO public.points_logs (user_id, amount, reason, type)
    VALUES (p_user_id, p_amount, p_reason, p_type);
END;
$function$;