alter table random_beauty_configs 
add column if not exists daily_gallery_trigger_probability int default 0,
add column if not exists default_limit int default 5;