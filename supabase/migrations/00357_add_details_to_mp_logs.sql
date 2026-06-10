ALTER TABLE mp_login_logs ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}';
ALTER TABLE ad_unlock_logs ADD COLUMN IF NOT EXISTS details jsonb DEFAULT '{}';
ALTER TABLE mp_login_logs ADD COLUMN IF NOT EXISTS log_type text;
ALTER TABLE ad_unlock_logs ADD COLUMN IF NOT EXISTS log_type text;

COMMENT ON COLUMN mp_login_logs.details IS '详细交互日志数据，包括请求参数和响应结果';
COMMENT ON COLUMN ad_unlock_logs.details IS '详细交互日志数据，包括请求参数和响应结果';
COMMENT ON COLUMN mp_login_logs.log_type IS '日志类型：mp_login, mp_bind, scancode';
COMMENT ON COLUMN ad_unlock_logs.log_type IS '日志类型：ad_callback, get_task_data';
