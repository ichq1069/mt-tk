-- 为 storage_configs 表增加存储桶名称字段
ALTER TABLE public.storage_configs ADD COLUMN bucket_name text;
