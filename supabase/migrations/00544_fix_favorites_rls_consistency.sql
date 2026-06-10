-- Update UPDATE policy for favorites table to use the same uid() helper
DROP POLICY IF EXISTS "Users can update their own favorites" ON "public"."favorites";

CREATE POLICY "Users can update their own favorites" ON "public"."favorites"
FOR UPDATE TO authenticated
USING (uid() = user_id)
WITH CHECK (uid() = user_id);
