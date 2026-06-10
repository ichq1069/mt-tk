ALTER TABLE star_hunt_activity_configs ADD COLUMN IF NOT EXISTS probability float DEFAULT 1.0;
ALTER TABLE star_hunt_activity_configs ADD COLUMN IF NOT EXISTS show_partially boolean DEFAULT false;
