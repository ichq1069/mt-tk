-- Add storage_priority to storage_configs
ALTER TABLE public.storage_configs ADD COLUMN IF NOT EXISTS storage_priority text DEFAULT 'r2_first';

-- Also add admin_storage_priority to distinguish between user upload and admin upload if needed
-- But for now, one is enough.

-- Update the type in types.ts will be done via str_replace_editor
