CREATE TABLE IF NOT EXISTS parse_import_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number INTEGER NOT NULL DEFAULT 1,
  name TEXT,
  api_url TEXT NOT NULL,
  match_pattern TEXT,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE parse_import_configs ENABLE ROW LEVEL SECURITY;

-- Admins have full access
DROP POLICY IF EXISTS "Admins have full access on parse_import_configs" ON parse_import_configs;
CREATE POLICY "Admins have full access on parse_import_configs" ON parse_import_configs
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Everyone can view enabled configs for frontend use
DROP POLICY IF EXISTS "Everyone can view enabled parse_import_configs" ON parse_import_configs;
CREATE POLICY "Everyone can view enabled parse_import_configs" ON parse_import_configs
FOR SELECT TO authenticated
USING (status = 'enabled');
