alter table miniprogram_configs 
add column if not exists task_page_path text default 'pages/user/task',
add column if not exists login_page_path text default 'pages/user/wxlogin';

update miniprogram_configs set 
  task_page_path = coalesce(task_page_path, 'pages/user/task'),
  login_page_path = coalesce(login_page_path, 'pages/user/wxlogin');
