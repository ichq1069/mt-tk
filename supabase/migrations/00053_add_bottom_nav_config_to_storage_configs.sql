ALTER TABLE storage_configs 
ADD COLUMN IF NOT EXISTS bottom_nav_config JSONB DEFAULT '{
  "style": "standard",
  "items": [
    {"id": "home", "label": "首页", "icon": "Home", "path": "/"},
    {"id": "tags", "label": "标签", "icon": "Tag", "path": "/tags"},
    {"id": "upload", "label": "发布", "icon": "PlusCircle", "path": "/upload"},
    {"id": "fast", "label": "整理", "icon": "Zap", "path": "/fast"},
    {"id": "my", "label": "我的", "icon": "User", "path": "/my"}
  ],
  "active_color": "#3b82f6",
  "inactive_color": "#94a3b8"
}'::jsonb;
