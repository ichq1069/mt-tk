CREATE OR REPLACE FUNCTION log_point_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(OLD.points, 0) <> NEW.points THEN
    INSERT INTO points_logs (user_id, amount, reason)
    VALUES (NEW.id, NEW.points - COALESCE(OLD.points, 0), '系统同步 (数据库触发)');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_log_point_changes ON profiles;
CREATE TRIGGER tr_log_point_changes
AFTER UPDATE OF points ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_point_changes();
