-- Update login_tickets SELECT policy for anon to include intermediate statuses
DROP POLICY IF EXISTS "Anon can view ticket status" ON login_tickets;
CREATE POLICY "Anon can view ticket status" ON login_tickets
FOR SELECT TO anon
USING (status IN ('pending', 'scanned', 'confirmed', 'fulfilled', 'expired', 'logging_in'));

-- Allow anon to update ticket status to 'logging_in' (H5 side)
CREATE POLICY "Anon can update ticket to logging_in" ON login_tickets
FOR UPDATE TO anon
USING (status = 'confirmed')
WITH CHECK (status = 'logging_in');
