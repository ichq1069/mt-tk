UPDATE storage_configs 
SET bottom_nav_config = '{
  "style": "standard",
  "items": [
    {"id": "home", "label": "首页", "icon": "Home", "path": "/"},
    {"id": "notify", "label": "消息", "icon": "Bell", "path": "/notifications"},
    {"id": "upload", "label": "发布", "icon": "PlusCircle", "path": "/upload", "is_special": true},
    {"id": "fast", "label": "整理", "icon": "Zap", "path": "/fast-organize"},
    {"id": "my", "label": "我的", "icon": "User", "path": "/profile"}
  ],
  "active_color": "#3b82f6",
  "inactive_color": "#94a3b8"
}'::jsonb;
