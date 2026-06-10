ALTER TABLE ads 
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'session', -- 'session', 'always', 'daily'
ADD COLUMN IF NOT EXISTS allow_skip BOOLEAN DEFAULT true;