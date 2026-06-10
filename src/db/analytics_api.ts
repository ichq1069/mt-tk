import { supabase } from './supabase';

function getDateRange(range: string): string {
  const now = new Date();
  const days = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}


async function decompressFromBase64(base64: string): Promise<string> {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(decompressedStream);
  return await response.text();
}

export const analyticsApi = {
  // 获取统计数据
  async getAnalyticsStats(timeRange: string = '7d') {
    const startDate = getDateRange(timeRange);

    // 并行获取各种统计
    const [
      { data: visitors },
      { data: sessions },
      { data: pageviews },
      { data: events },
      { data: goals },
      { data: goalConversions }
    ] = await Promise.all([
      supabase.from('analytics_visitors').select('id, device_type, openid, user_id').gte('created_at', startDate),
      supabase.from('analytics_sessions').select('id, duration, has_bounced, pageviews, openid, user_id').gte('started_at', startDate),
      supabase.from('analytics_events').select('id, page_path, created_at').eq('event_type', 'pageview').gte('created_at', startDate),
      supabase.from('analytics_events').select('id, event_type, created_at').gte('created_at', startDate),
      supabase.from('analytics_goals').select('*').eq('is_active', true),
      supabase.from('analytics_goal_conversions').select('goal_id').gte('created_at', startDate)
    ]);

    // 计算设备分布
    const deviceMap = new Map<string, number>();
    (visitors || []).forEach((v: any) => {
      const device = v.device_type || 'unknown';
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
    });

    // 计算趋势数据
    const trendMap = new Map<string, { pageviews: number; visitors: Set<string> }>();
    (pageviews || []).forEach((p: any) => {
      const date = p.created_at.split('T')[0];
      const entry = trendMap.get(date) || { pageviews: 0, visitors: new Set() };
      entry.pageviews++;
      trendMap.set(date, entry);
    });

    const pageViewsTrend = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, pageviews: data.pageviews, visitors: data.visitors.size }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 计算热门页面
    const pageMap = new Map<string, number>();
    (pageviews || []).forEach((p: any) => {
      const path = p.page_path || '/';
      pageMap.set(path, (pageMap.get(path) || 0) + 1);
    });

    const topPages = Array.from(pageMap.entries())
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    // 计算目标转化
    const goalConversionMap = new Map<string, number>();
    (goalConversions || []).forEach((c: any) => {
      goalConversionMap.set(c.goal_id, (goalConversionMap.get(c.goal_id) || 0) + 1);
    });

    const goalsData = (goals || []).map((g: any) => ({
      name: g.name,
      conversions: goalConversionMap.get(g.id) || 0,
      rate: sessions?.length ? Math.round(((goalConversionMap.get(g.id) || 0) / (sessions?.length || 1)) * 100) : 0
    }));

    const totalDuration = (sessions || []).reduce((sum: number, s: any) => sum + (s.duration || 0), 0);
    const bouncedSessions = (sessions || []).filter((s: any) => s.has_bounced).length;

    return {
      total_visitors: visitors?.length || 0,
      total_sessions: sessions?.length || 0,
      total_pageviews: pageviews?.length || 0,
      avg_duration: sessions?.length ? Math.round(totalDuration / sessions.length) : 0,
      bounce_rate: sessions?.length ? Math.round((bouncedSessions / sessions.length) * 100) : 0,
      device_distribution: Array.from(deviceMap.entries()).map(([name, value]) => ({ name, value })),
      page_views_trend: pageViewsTrend,
      top_pages: topPages,
      goals: goalsData
    };
  },

  // 获取实时访客
  async getRealtimeVisitors() {
    // 缩短在线判定时间从 5 分钟到 2 分钟，使实时数据更精准
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('analytics_realtime')
      .select(`
        *,
        visitor:analytics_visitors!visitor_id (
          visitor_uuid,
          device_type,
          browser_name,
          os_name,
          country_code,
          city_name,
          openid,
          user_id,
          language,
          screen_resolution
        )
      `)
      .eq('is_online', true)
      .gte('last_active_at', twoMinutesAgo)
      .order('last_active_at', { ascending: false });

    if (error) throw error;
    return { visitors: data || [], count: data?.length || 0 };
  },

  // 获取目标列表
  async getAnalyticsGoals() {
    const { data, error } = await supabase
      .from('analytics_goals')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data;
  },

  // 创建目标
  async createAnalyticsGoal(goal: { name: string; goal_key: string; goal_type: string; target_value?: string; website_id: string }) {
    const { data, error } = await supabase
      .from('analytics_goals')
      .insert(goal)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 获取热力图数据
  async getHeatmapData(heatmapId: string) {
    const { data, error } = await supabase
      .from('analytics_heatmap_data')
      .select('*')
      .eq('heatmap_id', heatmapId);

    if (error) throw error;
    return data;
  },

  // 获取页面分析
  async getPageAnalytics(path: string, timeRange: string = '7d') {
    const startDate = getDateRange(timeRange);

    const { data, error } = await supabase
      .from('analytics_events')
      .select(`
        id,
        event_type,
        created_at,
        session:analytics_sessions!session_id (
          duration,
          pageviews
        )
      `)
      .eq('page_path', path)
      .gte('created_at', startDate);

    if (error) throw error;

    const totalViews = data?.length || 0;
    const avgDuration = data?.reduce((sum: number, e: any) => sum + (e.session?.duration || 0), 0) || 0;
    const uniqueVisitors = new Set(data?.map((e: any) => e.session_id) || []).size;

    return {
      path,
      total_views: totalViews,
      unique_visitors: uniqueVisitors,
      avg_duration: totalViews ? Math.round(avgDuration / totalViews) : 0,
      events: data || []
    };
  },

  // 获取性能监控数据
  async getPerformanceStats(timeRange: string = '7d') {
    const startDate = getDateRange(timeRange);

    const { data: performanceData, error: perfError } = await supabase
      .from('analytics_performance')
      .select(`
        metric_name,
        metric_value,
        session_id,
        page_path,
        created_at
      `)
      .gte('created_at', startDate);

    if (perfError) throw perfError;

    // 获取有转化的会话 ID
    const { data: conversionSessions, error: convError } = await supabase
      .from('analytics_goal_conversions')
      .select('session_id')
      .gte('created_at', startDate);
    
    if (convError) throw convError;

    const convertedSessionIds = new Set(conversionSessions?.map(s => s.session_id));

    // 按指标分组并计算平均值，以及是否有转化的分布
    const stats: any = {};
    (performanceData || []).forEach(item => {
      if (!stats[item.metric_name]) {
        stats[item.metric_name] = {
          sum: 0,
          count: 0,
          convertedSum: 0,
          convertedCount: 0,
          notConvertedSum: 0,
          notConvertedCount: 0
        };
      }
      const s = stats[item.metric_name];
      s.sum += item.metric_value;
      s.count++;

      if (convertedSessionIds.has(item.session_id)) {
        s.convertedSum += item.metric_value;
        s.convertedCount++;
      } else {
        s.notConvertedSum += item.metric_value;
        s.notConvertedCount++;
      }
    });

    const result = Object.entries(stats).map(([name, s]: [string, any]) => ({
      name,
      avg: s.count ? s.sum / s.count : 0,
      convertedAvg: s.convertedCount ? s.convertedSum / s.convertedCount : 0,
      notConvertedAvg: s.notConvertedCount ? s.notConvertedSum / s.notConvertedCount : 0,
      count: s.count
    }));

    return result;
  },

  // 创建网站配置
  async createAnalyticsWebsite(config: { name: string; domain: string; user_id: string }) {
    const pixelKey = `pix_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;

    const { data, error } = await supabase
      .from('analytics_websites')
      .insert({
        ...config,
        pixel_key: pixelKey
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 获取网站配置
  async getAnalyticsWebsites(userId?: string) {
    let query = supabase.from('analytics_websites').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // 获取指定用户的会话数据
  async getUserSessions(userId: string, limit = 20) {
    const { data, error } = await supabase
      .from('analytics_sessions')
      .select(`
        id, session_uuid, landing_page, exit_page, pageviews, duration,
        started_at, ended_at, is_active, created_at,
        visitor:analytics_visitors!visitor_id(visitor_uuid, openid)
      `)
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // 获取指定 openid 的会话数据
  async getOpenidSessions(openid: string, limit = 20) {
    const { data, error } = await supabase
      .from('analytics_sessions')
      .select(`
        id, session_uuid, landing_page, exit_page, pageviews, duration,
        started_at, ended_at, is_active, created_at,
        visitor:analytics_visitors!visitor_id(visitor_uuid, openid, user_id)
      `)
      .eq('openid', openid)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // 获取每日图集页面的访客行为统计
  async getDailyGalleryAnalytics(options: { 
    startDate?: string; 
    endDate?: string; 
    openid?: string; 
    password?: string;
    page?: number;
    pageSize?: number;
    type?: 'all' | 'pageviews' | 'accessLogs'
  } = {}) {
    const today = new Date().toISOString().split('T')[0];
    const { 
      startDate = today, 
      endDate = today, 
      openid, 
      password, 
      page = 1, 
      pageSize = 20,
      type = 'all'
    } = options;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let pageviews: any[] = [];
    let accessLogs: any[] = [];
    let pageviewsCount = 0;
    let accessLogsCount = 0;
    let uniqueVisitorsCount = 0;
    let uniqueOpenidsCount = 0;
    let dailyStats: Record<string, any> = {};

    // 基础查询条件
    const startRange = `${startDate}T00:00:00Z`;
    const endRange = `${endDate}T23:59:59Z`;

    // 1. 如果是全量查询（用于概览和每日汇总），执行聚合分析
    if (type === 'all') {
      const [{ data: allPv }, { data: allAl }] = await Promise.all([
        supabase
          .from('analytics_events')
          .select('created_at, visitor_id, visitor:analytics_visitors!visitor_id(openid)')
          .ilike('page_path', '/daily-gallery%')
          .gte('created_at', startRange)
          .lte('created_at', endRange),
        supabase
          .from('daily_gallery_access_logs')
          .select('accessed_at, user_openid')
          .gte('accessed_at', startRange)
          .lte('accessed_at', endRange)
      ]);

      const visitorsSet = new Set();
      const openidsSet = new Set();
      
      (allPv || []).forEach((p: any) => {
        const date = p.created_at.split('T')[0];
        if (!dailyStats[date]) dailyStats[date] = { pageviews: 0, visitors: new Set(), openids: new Set(), accessLogs: 0 };
        
        dailyStats[date].pageviews++;
        if (p.visitor_id) {
          visitorsSet.add(p.visitor_id);
          dailyStats[date].visitors.add(p.visitor_id);
        }
        if (p.visitor?.openid) {
          openidsSet.add(p.visitor.openid);
          dailyStats[date].openids.add(p.visitor.openid);
        }
      });

      (allAl || []).forEach((l: any) => {
        const date = l.accessed_at.split('T')[0];
        if (!dailyStats[date]) dailyStats[date] = { pageviews: 0, visitors: new Set(), openids: new Set(), accessLogs: 0 };
        
        dailyStats[date].accessLogs++;
      });

      uniqueVisitorsCount = visitorsSet.size;
      uniqueOpenidsCount = openidsSet.size;
      
      // 将 Set 转换为数字，以便前端直接使用
      Object.keys(dailyStats).forEach(date => {
        dailyStats[date].visitorsCount = dailyStats[date].visitors.size;
        dailyStats[date].openidsCount = dailyStats[date].openids.size;
        delete dailyStats[date].visitors;
        delete dailyStats[date].openids;
      });
    }

    // 2. 获取分页的页面浏览记录
    if (type === 'all' || type === 'pageviews') {
      let query = supabase
        .from('analytics_events')
        .select('id, page_path, metadata, created_at, visitor_id, visitor:analytics_visitors!visitor_id(visitor_uuid, openid, device_type, browser_name, os_name, country_code)', { count: 'exact' })
        .ilike('page_path', '/daily-gallery%')
        .gte('created_at', startRange)
        .lte('created_at', endRange);

      if (openid) {
        const { data: visitors } = await supabase
          .from('analytics_visitors')
          .select('id')
          .ilike('openid', `%${openid}%`);
        
        if (visitors && visitors.length > 0) {
          query = query.in('visitor_id', visitors.map(v => v.id));
        } else {
          query = query.eq('visitor_id', -1);
        }
      }

      const { data, count, error: pvError } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (pvError) throw pvError;
      pageviews = data || [];
      pageviewsCount = count || 0;
    }

    // 3. 获取分页的密码访问记录
    if (type === 'all' || type === 'accessLogs') {
      let query = supabase
        .from('daily_gallery_access_logs')
        .select('id, post_id, user_openid, user_id, password_used, access_type, browser_fingerprint, ip_address, accessed_at', { count: 'exact' })
        .gte('accessed_at', startRange)
        .lte('accessed_at', endRange);

      if (openid) {
        query = query.ilike('user_openid', `%${openid}%`);
      }

      if (password) {
        query = query.ilike('password_used', `%${password}%`);
      }

      const { data, count, error: alError } = await query
        .order('accessed_at', { ascending: false })
        .range(from, to);

      if (alError) throw alError;
      accessLogs = data || [];
      accessLogsCount = count || 0;
    }

    return {
      pageviews,
      accessLogs,
      pageviewsCount,
      accessLogsCount,
      uniqueVisitorsCount,
      uniqueOpenidsCount,
      dailyStats,
      period: { start: startDate, end: endDate }
    };
  },
  // 清空每日图集相关分析数据
  async clearDailyGalleryAnalytics(type: 'pageviews' | 'accessLogs' | 'all') {
    if (type === 'all' || type === 'pageviews') {
      const { error } = await supabase
        .from('analytics_events')
        .delete()
        .ilike('page_path', '/daily-gallery%');
      if (error) throw error;
    }

    if (type === 'all' || type === 'accessLogs') {
      const { error } = await supabase
        .from('daily_gallery_access_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      if (error) throw error;
    }

    return { success: true };
  }

};
