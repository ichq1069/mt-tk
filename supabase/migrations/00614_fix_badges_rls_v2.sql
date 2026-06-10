-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage badges" ON public.badges;

-- Create more direct policy
CREATE POLICY "Admins can manage badges" ON public.badges
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

-- Also allow anyone to view active badges
DROP POLICY IF EXISTS "Anyone can view badges" ON public.badges;
CREATE POLICY "Anyone can view badges" ON public.badges
FOR SELECT TO public
USING (is_active = true);
