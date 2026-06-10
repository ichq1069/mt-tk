-- Allow anyone (including anon) to read redemption_codes for validation
CREATE POLICY "Public can read redemption_codes for validation"
ON redemption_codes
FOR SELECT
USING (true);

-- Allow anyone to read redemption_logs (needed to check if user has redeemed)
-- Actually, for anon registration, they don't have a user_id yet until they sign up.
-- But AuthContext.tsx checks if log exists AFTER it creates the user.
CREATE POLICY "Public can insert redemption_logs"
ON redemption_logs
FOR INSERT
WITH CHECK (true);

-- Allow anyone to read logs to see if a code was already used
CREATE POLICY "Public can read redemption_logs"
ON redemption_logs
FOR SELECT
USING (true);

-- Allow incrementing redemption_codes used_count
-- Since increment_redemption_use is an RPC, we need to ensure the RPC can be called.
-- Let's check if there are any other policies for UPDATE.
CREATE POLICY "Public can update redemption_codes used_count"
ON redemption_codes
FOR UPDATE
USING (true)
WITH CHECK (true);
