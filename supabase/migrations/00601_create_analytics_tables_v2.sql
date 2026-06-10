-- =====================================================
-- 统计分析数据库表结构
-- =====================================================

-- 访问者信息表
CREATE TABLE IF NOT EXISTS analytics_visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_uuid UUID NOT NULL UNIQUE,
    website_id UUID NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    screen_resolution TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    browser_name TEXT,
    browser_version TEXT,
    os_name TEXT,
    os_version TEXT,
    continent_code TEXT,
    country_code TEXT,
    city_name TEXT,
    language TEXT,
    timezone TEXT,
    custom_parameters JSONB DEFAULT '{}',
    first_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_sessions INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_website_id ON analytics_visitors(website_id);
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_uuid ON analytics_visitors(visitor_uuid);
CREATE INDEX IF NOT EXISTS idx_visitors_country ON analytics_visitors(country_code);
CREATE INDEX IF NOT EXISTS idx_visitors_device ON analytics_visitors(device_type);

-- 会话表
CREATE TABLE IF NOT EXISTS analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_uuid UUID NOT NULL UNIQUE,
    visitor_id UUID REFERENCES analytics_visitors(id) ON DELETE CASCADE,
    website_id UUID NOT NULL,
    referrer_host TEXT,
    referrer_path TEXT,
    referrer_url TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    landing_page TEXT,
    exit_page TEXT,
    pageviews INT DEFAULT 1,
    duration INT DEFAULT 0,
    has_bounced BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON analytics_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_website_id ON analytics_sessions(website_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON analytics_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON analytics_sessions(is_active) WHERE is_active = TRUE;

-- 事件表
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES analytics_visitors(id) ON DELETE CASCADE,
    website_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'pageview', 'click', 'scroll', 'form_submit', 'resize',
        'custom_event', 'goal_conversion', 'outbound_click', 'file_download'
    )),
    event_category TEXT,
    event_label TEXT,
    event_value TEXT,
    page_path TEXT NOT NULL,
    page_title TEXT,
    page_url TEXT,
    element_selector TEXT,
    element_text TEXT,
    x_position INT,
    y_position INT,
    viewport_width INT,
    viewport_height INT,
    scroll_depth INT,
    time_on_page INT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_website_id ON analytics_events(website_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_page_path ON analytics_events(page_path);

-- 会话回放表
CREATE TABLE IF NOT EXISTS analytics_replays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES analytics_visitors(id) ON DELETE CASCADE,
    website_id UUID NOT NULL,
    events JSONB NOT NULL,
    events_count INT DEFAULT 0,
    duration INT DEFAULT 0,
    size_bytes INT,
    is_completed BOOLEAN DEFAULT FALSE,
    is_too_short BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_replays_session_id ON analytics_replays(session_id);
CREATE INDEX IF NOT EXISTS idx_replays_website_id ON analytics_replays(website_id);
CREATE INDEX IF NOT EXISTS idx_replays_created_at ON analytics_replays(created_at);
CREATE INDEX IF NOT EXISTS idx_replays_expires_at ON analytics_replays(expires_at) WHERE expires_at IS NOT NULL;

-- 热力图配置表
CREATE TABLE IF NOT EXISTS analytics_heatmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL,
    name TEXT NOT NULL,
    page_path TEXT NOT NULL,
    device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    sample_rate INT DEFAULT 100,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 热力图数据表
CREATE TABLE IF NOT EXISTS analytics_heatmap_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    heatmap_id UUID REFERENCES analytics_heatmaps(id) ON DELETE CASCADE,
    website_id UUID NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('click', 'scroll', 'hover')),
    x_position INT NOT NULL,
    y_position INT,
    scroll_depth INT,
    element_selector TEXT,
    element_text TEXT,
    click_count INT DEFAULT 1,
    unique_visitors INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_heatmap_data_heatmap_id ON analytics_heatmap_data(heatmap_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_data_website_id ON analytics_heatmap_data(website_id);

-- 目标转化表
CREATE TABLE IF NOT EXISTS analytics_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL,
    name TEXT NOT NULL,
    goal_key TEXT NOT NULL,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('pageview', 'custom', 'click', 'time_on_page', 'scroll_depth')),
    target_value TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 目标转化记录表
CREATE TABLE IF NOT EXISTS analytics_goal_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES analytics_goals(id) ON DELETE CASCADE,
    session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    visitor_id UUID REFERENCES analytics_visitors(id) ON DELETE CASCADE,
    website_id UUID NOT NULL,
    conversion_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_conversions_goal_id ON analytics_goal_conversions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_conversions_session_id ON analytics_goal_conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_goal_conversions_created_at ON analytics_goal_conversions(created_at);

-- 实时在线用户表
CREATE TABLE IF NOT EXISTS analytics_realtime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL,
    visitor_id UUID REFERENCES analytics_visitors(id) ON DELETE CASCADE,
    session_id UUID REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    current_page TEXT NOT NULL,
    page_title TEXT,
    referrer TEXT,
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_realtime_website_id ON analytics_realtime(website_id);
CREATE INDEX IF NOT EXISTS idx_realtime_is_online ON analytics_realtime(is_online) WHERE is_online = TRUE;
CREATE INDEX IF NOT EXISTS idx_realtime_last_active ON analytics_realtime(last_active_at);

-- 网站配置表
CREATE TABLE IF NOT EXISTS analytics_websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    website_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    pixel_key TEXT NOT NULL UNIQUE,
    tracking_type TEXT DEFAULT 'normal' CHECK (tracking_type IN ('normal', 'lightweight')),
    is_enabled BOOLEAN DEFAULT TRUE,
    bot_exclusion BOOLEAN DEFAULT TRUE,
    ip_storage_enabled BOOLEAN DEFAULT TRUE,
    sessions_replays_enabled BOOLEAN DEFAULT FALSE,
    heatmaps_enabled BOOLEAN DEFAULT FALSE,
    goals_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_websites_user_id ON analytics_websites(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_websites_pixel_key ON analytics_websites(pixel_key);

-- 自动更新 updated_at 触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 analytics_visitors 表创建触发器（使用 DO 块避免重复创建报错）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_analytics_visitors_updated_at'
        AND tgrelid = 'analytics_visitors'::regclass
    ) THEN
        CREATE TRIGGER update_analytics_visitors_updated_at
            BEFORE UPDATE ON analytics_visitors
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 为 analytics_websites 表创建触发器
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_analytics_websites_updated_at'
        AND tgrelid = 'analytics_websites'::regclass
    ) THEN
        CREATE TRIGGER update_analytics_websites_updated_at
            BEFORE UPDATE ON analytics_websites
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
