CREATE POLICY "Users can insert their own redemption_codes" ON redemption_codes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);