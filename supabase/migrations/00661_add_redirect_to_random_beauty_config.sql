alter table random_beauty_configs 
add column if not exists after_quota_redirect_url text default '/',
add column if not exists after_quota_button_text text default '返回首页';