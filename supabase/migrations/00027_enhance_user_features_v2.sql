-- Add custom_fields to profiles if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'custom_fields') THEN
        ALTER TABLE profiles ADD COLUMN custom_fields JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add read_at to notifications if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read_at') THEN
        ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create check_ins table
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    check_in_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- UNIQUE constraint for user_id and check_in_date if not exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_ins_user_id_check_in_date_key') THEN
        ALTER TABLE check_ins ADD CONSTRAINT check_ins_user_id_check_in_date_key UNIQUE(user_id, check_in_date);
    END IF;
END $$;

-- Enable RLS for check_ins
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

-- Policies for check_ins
DROP POLICY IF EXISTS "Users can view their own check-ins" ON check_ins;
CREATE POLICY "Users can view their own check-ins" ON check_ins FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can perform their own check-ins" ON check_ins;
CREATE POLICY "Users can perform their own check-ins" ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ensure profiles can be updated
-- If it already exists, it's fine.
