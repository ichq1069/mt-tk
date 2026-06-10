-- Add password_type column
ALTER TABLE public.daily_gallery_special_passwords 
ADD COLUMN IF NOT EXISTS password_type text DEFAULT 'one_time';

-- Add browser_id column to link password to a specific device
ALTER TABLE public.daily_gallery_special_passwords 
ADD COLUMN IF NOT EXISTS browser_id text;

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_special_passwords_password_type ON public.daily_gallery_special_passwords(password_type);
CREATE INDEX IF NOT EXISTS idx_special_passwords_browser_id ON public.daily_gallery_special_passwords(browser_id);

-- Update comment for clarification
COMMENT ON COLUMN public.daily_gallery_special_passwords.password_type IS 'Password types: one_time (default), periodic (regular), multiple (multi-use), permanent (long-term)';
COMMENT ON COLUMN public.daily_gallery_special_passwords.browser_id IS 'Locks the password to a specific browser/device';
