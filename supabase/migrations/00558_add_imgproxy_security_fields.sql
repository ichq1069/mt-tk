-- 添加 imgproxy 签名和加密相关字段
alter table storage_configs 
add column if not exists image_processing_key text,
add column if not exists image_processing_salt text,
add column if not exists image_processing_url_encryption_key text,
add column if not exists image_processing_force_sign boolean default false,
add column if not exists enable_image_processing boolean default false;