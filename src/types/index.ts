export interface Option {
  label: string;
  value: string;
  icon?: React.ElementType;
  withCount?: boolean;
}

export type UserRole = 'pt' | 'vip' | 'svip' | 'vvip' | 'admin';
export type AlbumPermissionLevel = 'pt' | 'vip' | 'svip' | 'vvip' | 'admin';
export type ItemStatus = 'pending' | 'approved' | 'rejected' | 'archived';

export interface PermissionGroup {
  id: string;
  name: string;
  description?: string;
  permissions: string[]; // ['upload', 'link_import']
  is_default: boolean;
  requires_audit: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  email: string | null;
  mobile?: string | null;
  role: UserRole;
  notes?: string | null;
  security_status?: 'normal' | 'reset_required' | 'locked';

  is_banned?: boolean;
  is_blacklisted?: boolean;
  is_verified?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  created_at: string;
  updated_at?: string;
  group_id?: string;
  permission_groups?: PermissionGroup;
  custom_fields?: Record<string, any>; // JSONB column for dynamic fields
  avatar_url?: string | null;
  cover_url?: string | null;
  points?: number;
  exp?: number;
  total_views?: number;
  digital_id?: string | number | null;
  rank?: string;
  mp_openid?: string | null;
  wechat_openid?: string | null;
  album_level?: AlbumPermissionLevel;
  permissions?: string[];
  wechat_users?: any[];
  last_session_id?: string | null;
  last_sign_in_at?: string | null;
  is_debug_enabled?: boolean;
  auto_created?: boolean;
}

export interface PointsLog {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

export interface MediaItem {
  id: string;
  user_id: string;
  url: string;
  thumbnail_url?: string | null;
  title: string | null;
  type: 'image' | 'video';
  status: ItemStatus;
  reason: string | null;
  rejection_reason?: string | null; // 审核拒绝原因
  metadata?: any;
  created_at: string;
  profiles?: Profile; // Joined data
  favorite_count?: number;
  view_count?: number;
  description?: string | null;
  media_tags?: MediaTag[]; // Joined data
  category_id?: string | null;
  content_categories?: ContentCategory; // Joined data
  file_md5?: string | null; // 文件MD5哈希值，用于去重
  content_hash?: string | null; // 图片内容视觉哈希值，用于识别视觉相似图片
  dedupe_error?: string | null; // 去重扫描失败原因
  deleted_at?: string | null; // 软删除时间
  heat_score?: number;
  is_recommended?: boolean;
  is_hidden?: boolean;
  updated_at?: string;
  tags?: string[];
  source_table?: 'media_items' | 'media_staging';
  zonerama_photo_id?: string | null;
}

export interface RecommendationSetting {
  id: string;
  name: string;
  weights: {
    view_weight: number;
    favorite_weight: number;
    time_decay_factor: number;
    manual_boost_weight: number;
  };
  created_at: string;
  updated_at: string;
}

export interface StorageConfig {
  id: string;
  user_id: string | null;
  key_id: string | null;
  secret_key: string | null;
  endpoint: string | null;
  bucket_name: string | null;
  custom_domain: string | null;
  updated_at: string;
  enable_link_import: boolean;
  enable_blob?: boolean;
  enable_image_cache?: boolean;
  site_title: string;
  site_logo: string | null;
  site_description: string | null;
  wechat_only: boolean;
  wechat_forbidden: boolean;
  wechat_forbidden_mode?: 'template' | 'custom';
  wechat_forbidden_html?: string;
  wechat_login_enabled?: boolean;
  wechat_binding_enabled?: boolean;
  check_in_points?: number;
  check_in_description?: string;
  virtual_view_base_min?: number;
  virtual_view_base_max?: number;
  watermark_enabled?: boolean;
  watermark_text?: string;
  watermark_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'tile';
  watermark_opacity?: number;
  watermark_layout?: 'single' | 'grid';
  watermark_size?: number;
  login_methods?: string[];
  registration_mode?: 'disabled' | 'invite' | 'normal';
  register_mode?: 'public' | 'invite';
  force_login?: boolean;
  anonymous_view_limit?: number;
  user_agreement?: string;
  privacy_policy?: string;
  invitation_mode_enabled?: boolean;
  player_type?: 'h5' | 'artplayer' | 'xgplayer';
  player_settings?: any;
  image_path_prefix?: string;
  video_path_prefix?: string;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
  smtp_from?: string | null;
  smtp_enabled?: boolean;
  single_device_login?: boolean;
  thumbnail_quality?: number;
  thumbnail_width?: number;
  thumbnail_height?: number;
  ms_optimization_enabled?: boolean;

  is_mp_login_enabled?: boolean;
  is_mp_bind_enabled?: boolean;
  thumbnail_size?: number;
  enable_thumbnails?: boolean;
  enable_upload_categories?: boolean;
  enable_upload_tags?: boolean;
  upload_category_single?: boolean;
  default_upload_category?: string;
  default_upload_tags?: string;
  file_naming_rule?: string;
  file_naming_rule_sample?: string;
  thumbnail_params?: string;
  enable_progressive_loading?: boolean;
  enable_download?: boolean;
  download_mode?: 'wallpaper' | 'album' | 'both';
  wallpaper_price?: number;
  album_price?: number;
  min_download_role?: string;
  mp_domain_identifier?: string;
  bottom_nav_config?: {
    style: 'standard' | 'dock';
    items: {
      id: string;
      label: string;
      icon: string;
      path: string;
      is_special?: boolean; // 用于中间凸起按钮
    }[];
    active_color: string;
    inactive_color: string;
  };
  admin_bottom_nav_config?: {
    style: 'standard' | 'dock';
    items: {
      id: string;
      label: string;
      icon: string;
      path: string;
      is_special?: boolean; // 用于中间凸起按钮
    }[];
    active_color: string;
    inactive_color: string;
  };
  homepage_path?: string;
  standalone_paths?: string[];
  bg_music_url?: string;
  bg_music_volume?: number;
  bg_music_title?: string;
  bg_music_play_mode?: 'sequential' | 'random';
  bg_music_icon_url?: string;
  bg_music_list?: {
    id: string;
    url: string;
    title: string;
  }[];
  image_proxy_url?: string;
  image_proxy_secret?: string;
  image_proxy_exclude_domains?: string;
  enable_image_proxy?: boolean;
  
  video_proxy_url?: string;
  video_proxy_secret?: string;
  enable_video_proxy?: boolean;
  video_proxy_rules?: any;
  
  image_processing_url?: string;
  image_processing_rules?: Record<string, string>;
  enable_proxy_image_processing?: boolean;
  enable_image_processing?: boolean;
  saved_imgproxy_urls?: string[];
  saved_processing_rules?: { label: string; value: string }[];
  preview_test_images?: string[];
  storage_priority?: 'r2_first' | 'superbed_first';
  
  r2_mode?: 'direct' | 'worker';
  r2_worker_url?: string;
  r2_worker_token?: string;
  
  hotlink_enabled?: boolean;
  hotlink_allowed_domains?: string;
  
  // 维护模式
  is_maintenance_mode?: boolean;
  maintenance_allowed_paths?: string[];
  maintenance_message?: string;
  enabled_layouts?: string[];
}

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  media_id: string;
  reporter_id: string;
  reason: string;
  status: ReportStatus;
  result?: string | null;
  punishment?: string | null;
  created_at: string;
  updated_at: string;
  media_items?: MediaItem; // Joined data
  profiles?: Profile; // Joined data (reporter)
}

export interface AdminStatsSummary {
  users: number;
  pending: number;
  approved: number;
  archived: number;
  favorites: number;
  dislikes: number;
  views: number;
  pending_reports: number;
}

export interface Ad {
  id: string;
  type: 'splash' | 'waterfall' | 'popup' | 'in-feed';
  image_url: string | null;
  title: string | null;
  content: string | null;
  link: string | null;
  cta_url: string | null;
  cta_text: string | null;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  display_seconds: number;
  display_duration?: number;
  is_active: boolean;
  frequency: 'session' | 'always' | 'daily';
  frequency_type?: 'session' | 'always' | 'daily';
  allow_skip: boolean;
  placements?: string[];
  target_levels?: string[];
  appearance_probability?: number;
  feed_interval?: number;
  show_once_per_page?: boolean;
  badge_text?: string;
  theme_color?: string;
  badge_position?: string;
  image_rule?: string;
  created_at: string;
}

export interface RedemptionCode {
  id: string;
  code: string;
  type: 'invite' | 'points' | 'group';
  value: string | null;
  expires_at: string | null;
  max_uses: number;
  used_count: number;
  created_at: string;
  created_by: string | null;
}


export interface AppNotification {
  id: string;
  user_id: string | null;
  role_id?: string | null;
  title: string;
  content: string;
  type: 'audit' | 'system' | 'admin' | 'report' | 'reward';
  link: string | null;
  link_type: 'internal' | 'external';
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  channel?: 'in_app' | 'email' | 'all';
  count?: number; // 合并的通知数量
  media_ids?: string[]; // 相关作品ID列表
  merge_key?: string; // 合并键
}

export interface NotificationTemplate {
  id: string;
  name: string;
  title_template: string;
  content_template: string;
  category: string;
  variables?: string[];
  created_at: string;
  updated_at: string;
}

export interface RedemptionLog {
  id: string;
  code_id: string;
  user_id: string;
  created_at: string;
  redemption_codes?: RedemptionCode;
  profiles?: Profile;
}

export interface CheckIn {
  id: string;
  user_id: string;
  check_in_date: string;
  created_at: string;
}

export interface UserFieldConfig {
  id: string;
  field_key: string;
  field_name: string;
  field_type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'multi_select';
  placeholder: string | null;
  field_options: string[] | null;
  is_active: boolean;
  is_required: boolean;
  is_searchable: boolean;
  show_in_profile: boolean;
  show_in_center: boolean;
  show_in_register: boolean;
  sort_order: number;
}

export interface Tag {
  id: string;
  name: string;
  parent_id?: string | null;
  level?: number;
  weight?: number;
  is_visible?: boolean;
  min_role?: string;
  created_at: string;
  children?: Tag[]; // 用于树形结构展示
  count?: number; // 用于标签云展示
}

export interface MediaTag {
  media_id: string;
  tag_id: string;
  tags?: Tag;
}

export interface ContentCategory {
  id: string;
  name: string;
  icon?: string | null;
  sort_order: number;
  is_visible?: boolean;
  min_role?: string;
  created_at: string;
  count?: number; // 用于分类云展示
}

export interface AuditConfig {
  global_audit_enabled: boolean;
  bypass_audit_with_permission: boolean;
}

export interface DedupeConfig {
  trigger_mode: 'on_upload' | 'on_audit' | 'scheduled' | 'manual';
  similarity_threshold: number;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}

export interface AlbumCustomField {
  id: string;
  name: string;
  type: 'text' | 'select' | 'date' | 'multi_tag';
  options: string[];
  is_active: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  is_visible_on_front: boolean;
  created_at: string;
}

export interface AlbumFieldGroup {
  id: string;
  name: string;
  field_ids: string[];
  created_at: string;
}


export interface PhotoAlbum {
  id: string;
  title: string;
  album_type: string | null;
  photo_count: number;
  download_url: string | null;
  permission_group_id: string | null;
  allowed_group_ids?: string[];
  description: string | null;
  cover_url: string | null;
  custom_field_values: Record<string, any>;
  is_active: boolean;
  is_public: boolean;
  is_zonerama: boolean;
  auto_pdf_enabled: boolean;
  permission_levels?: string[];
  apply_switch?: boolean;
  user_manage_levels?: string[];
  level?: string;
  pdf_urls?: Record<string, string>;
  album_hashes?: Record<string, string>;
  created_at: string;
  permission_groups?: PermissionGroup;
}

export interface PhotoAlbumRequest {
  id: string;
  user_id: string;
  album_id: string;
  status: ItemStatus;
  reason?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  photo_albums?: PhotoAlbum;
}

export interface AlbumPhoto {
  id: string;
  album_id: string;
  url: string;
  thumbnail_url?: string | null;
  level: 'pending' | 'normal' | 'vip' | 'svip' | 'vvip' | 'restricted' | null;
  sort_order: number;
  file_md5?: string | null;
  content_hash?: string | null;
  custom_field_values?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  dedupe_error?: string | null;
  dedupe_ignored?: boolean;
  zonerama_photo_id?: string | null;
}

export interface AlbumPhotoLevelLog {
  id: string;
  photo_id: string;
  admin_id: string;
  old_level: string;
  new_level: string;
  created_at: string;
}
export interface Shortcode {
  id: string;
  key: string;
  value: string;
  description?: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GrowthLog {
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  type: string;
  created_at: string;
}

export interface KeywordReplacement {
  id: string;
  original_word: string;
  replacement_word: string;
  type: 'system' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SuperbedConfig {
  id: string;
  superbed_id: string;
  superbed_token: string;
  is_enabled: boolean;
  is_upload_page_enabled: boolean;
  allowed_groups: string[];
  thumbnail_params?: string;
  updated_at: string;
}




export interface DebugLogSetting {
  id: string;
  is_enabled: boolean;
  retention_minutes: number;
  updated_at: string;
}

export interface DebugLog {
  id: string;
  page_url: string;
  message: string;
  type: string;
  data?: any;
  created_at: string;
}

export interface UserSessionRecording {
  id: string;
  user_id: string;
  session_id: string;
  events: any[];
  metadata: any;
  created_at: string;
}

export interface MediaDownload {
  id: string;
  user_id: string;
  media_id?: string;
  album_id?: string;
  type: 'wallpaper' | 'album';
  points_spent: number;
  created_at: string;
  media_items?: MediaItem;
  photo_albums?: PhotoAlbum;
}

export interface WechatReply {
  id: string;
  config_id: string;
  type: 'keyword' | 'follow' | 'unsubscribe' | 'default';
  keyword?: string;
  match_type: 'exact' | 'fuzzy';
  content_type: 'text' | 'image' | 'voice' | 'video' | 'news';
  reply_content: string;
  category?: 'none' | 'login' | 'daily_gallery' | 'binding' | 'help' | 'check_in';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SystemBuild {
  id: string;
  version: string;
  status: 'pending' | 'building' | 'completed' | 'failed';
  download_url: string | null;
  logs: string | null;
  created_at: string;
  finished_at: string | null;
  created_by?: string;
}

