-- Create helper function if not exists
CREATE OR REPLACE FUNCTION public.can_manage_badges()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Drop existing manage policy if any (to avoid duplicates)
DROP POLICY IF EXISTS "Admins can manage badges" ON public.badges;

-- Create policies
CREATE POLICY "Admins can manage badges" ON public.badges
FOR ALL TO authenticated
USING (can_manage_badges())
WITH CHECK (can_manage_badges());
