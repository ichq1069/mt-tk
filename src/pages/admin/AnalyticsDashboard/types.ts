export interface AnalyticsStats {
  total_visitors: number;
  total_sessions: number;
  total_pageviews: number;
  avg_duration: number;
  bounce_rate: number;
  device_distribution: { name: string; value: number }[];
  page_views_trend: { date: string; pageviews: number; visitors: number }[];
  top_pages: { path: string; views: number }[];
  goals: { name: string; conversions: number; rate: number }[];
}

export interface RealtimeData {
  count: number;
  visitors: RealtimeVisitor[];
}

export interface RealtimeVisitor {
  id: string;
  current_page: string;
  page_title?: string;
  last_active_at: string;
  visitor?: {
    device_type?: string;
    country_code?: string;
    city_name?: string;
    browser_name?: string;
    os_name?: string;
    openid?: string;
    user_id?: string;
  };
}

export const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}
