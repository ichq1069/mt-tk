ALTER TABLE storage_configs 
DROP COLUMN IF EXISTS image_processing_key,
DROP COLUMN IF EXISTS image_processing_salt,
DROP COLUMN IF EXISTS image_processing_url_encryption_key,
DROP COLUMN IF EXISTS image_processing_force_sign;