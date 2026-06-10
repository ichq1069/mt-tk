-- 增加彩蛋中奖人数
CREATE OR REPLACE FUNCTION public.increment_egg_winners(egg_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.easter_egg_configs
  SET current_winners = current_winners + 1
  WHERE id = egg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 安全增加积分函数（带 search_path 以消除安全警告）
CREATE OR REPLACE FUNCTION public.add_user_points_safe(user_id UUID, amount INTEGER, reason_text TEXT)
RETURNS void AS $$
BEGIN
  PERFORM public.add_user_points(user_id, amount, reason_text, 'easter_egg');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
