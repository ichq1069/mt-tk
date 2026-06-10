-- Add UPDATE policy for favorites table to support upsert
CREATE POLICY "Users can update their own favorites" ON "public"."favorites"
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure users can select their own favorites (already exists but making sure)
-- (The existing policy "Users can view their own favorites" already does this)
