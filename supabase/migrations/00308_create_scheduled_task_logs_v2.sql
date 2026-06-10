-- 创建定时任务日志表
CREATE TABLE IF NOT EXISTS public.scheduled_task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  message TEXT,
  execution_time TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_scheduled_task_logs_task_name ON public.scheduled_task_logs(task_name);
CREATE INDEX IF NOT EXISTS idx_scheduled_task_logs_execution_time ON public.scheduled_task_logs(execution_time DESC);

-- 创建清理旧日志的函数
CREATE OR REPLACE FUNCTION public.prune_scheduled_task_logs()
RETURNS TRIGGER AS $$
BEGIN
  -- 对于每个任务，仅保留最新的10条
  DELETE FROM public.scheduled_task_logs
  WHERE id NOT IN (
    SELECT id
    FROM public.scheduled_task_logs
    WHERE task_name = NEW.task_name
    ORDER BY execution_time DESC
    LIMIT 10
  ) AND task_name = NEW.task_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器，每次插入后清理超过10条的旧记录
DROP TRIGGER IF EXISTS tr_prune_scheduled_task_logs ON public.scheduled_task_logs;
CREATE TRIGGER tr_prune_scheduled_task_logs
AFTER INSERT ON public.scheduled_task_logs
FOR EACH ROW
EXECUTE FUNCTION public.prune_scheduled_task_logs();

-- 开启 RLS
ALTER TABLE public.scheduled_task_logs ENABLE ROW LEVEL SECURITY;

-- 允许管理员查看日志
CREATE POLICY "Admins can view scheduled task logs"
ON public.scheduled_task_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 允许 service_role 写入日志
CREATE POLICY "Service role can insert scheduled task logs"
ON public.scheduled_task_logs
FOR INSERT
TO service_role
WITH CHECK (true);
