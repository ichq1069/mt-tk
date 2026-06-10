CREATE TABLE IF NOT EXISTS public.badge_tasks (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    task_type text NOT NULL,
    target_value integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT badge_tasks_pkey PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.badge_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can manage badge_tasks" ON public.badge_tasks;
CREATE POLICY "Admins can manage badge_tasks" ON public.badge_tasks
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'admin'
  )
);

DROP POLICY IF EXISTS "Anyone can view active badge_tasks" ON public.badge_tasks;
CREATE POLICY "Anyone can view active badge_tasks" ON public.badge_tasks
FOR SELECT TO public
USING (is_active = true);
