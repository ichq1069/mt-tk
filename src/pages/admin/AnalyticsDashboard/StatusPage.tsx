import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { analyticsApi } from '@/db/analytics_api';
import { supabase } from '@/db/supabase';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface WebsiteStatus {
  id: string;
  name: string;
  domain: string;
  pixel_key: string;
  is_enabled: boolean;
  last_event_at: string | null;
  sessions_today: number;
  events_today: number;
  status: 'online' | 'offline' | 'warning' | 'disabled';
}

interface SystemHealth {
  total_websites: number;
  online_websites: number;
  warning_websites: number;
  offline_websites: number;
  total_events_today: number;
  avg_response_ms: number;
  edge_function_status: 'online' | 'degraded' | 'offline';
}

interface HourlyData {
  hour: string;
  events: number;
  sessions: number;
}

export default function StatusPage() {
  const [websites, setWebsites] = useState<WebsiteStatus[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoAdding, setAutoAdding] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', domain: '' });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchStatusData = async () => {
    setLoading(true);
    try {
      // 获取所有网站
      const { data: websitesData, error: websitesError } = await supabase
        .from('analytics_websites')
        .select('id, name, domain, pixel_key, is_enabled, created_at')
        .order('created_at', { ascending: false });

      if (websitesError) throw websitesError;

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      // 获取今日事件统计（按网站聚合）
      const { data: eventsData } = await supabase
        .from('analytics_events')
        .select('website_id, created_at')
        .gte('created_at', todayIso)
        .order('created_at', { ascending: false });

      // 获取今日会话统计
      const { data: sessionsData } = await supabase
        .from('analytics_sessions')
        .select('website_id, started_at')
        .gte('started_at', todayIso);

      // 获取最近事件时间
      const { data: latestEvents } = await supabase
        .from('analytics_events')
        .select('website_id, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      // 构建网站状态映射
      const latestEventMap = new Map<string, string>();
      (latestEvents || []).forEach((e: any) => {
        if (!latestEventMap.has(e.website_id)) {
          latestEventMap.set(e.website_id, e.created_at);
        }
      });

      const eventsPerSite = new Map<string, number>();
      (eventsData || []).forEach((e: any) => {
        eventsPerSite.set(e.website_id, (eventsPerSite.get(e.website_id) || 0) + 1);
      });

      const sessionsPerSite = new Map<string, number>();
      (sessionsData || []).forEach((s: any) => {
        sessionsPerSite.set(s.website_id, (sessionsPerSite.get(s.website_id) || 0) + 1);
      });

      const now = Date.now();

      // 构建网站状态列表
      const siteStatuses: WebsiteStatus[] = (websitesData || []).map((site: any) => {
        const lastEventAt = latestEventMap.get(site.id);
        const lastEventTime = lastEventAt ? new Date(lastEventAt).getTime() : 0;
        const hasAnyEvent = lastEventTime > 0;
        const isActive = hasAnyEvent && (now - lastEventTime) < 30 * 60 * 1000; // 30分钟内活跃
        const isWarning = hasAnyEvent && (now - lastEventTime) >= 30 * 60 * 1000 && (now - lastEventTime) < 24 * 60 * 60 * 1000;

        let status: WebsiteStatus['status'] = 'offline';
        if (!site.is_enabled) {
          status = 'disabled';
        } else if (isActive) {
          status = 'online';
        } else if (isWarning) {
          status = 'warning';
        } else if (!hasAnyEvent) {
          // 已启用但从未收到事件：配置正确，等待数据
          status = 'online';
        }

        return {
          id: site.id,
          name: site.name,
          domain: site.domain,
          pixel_key: site.pixel_key,
          is_enabled: site.is_enabled,
          last_event_at: lastEventAt || null,
          sessions_today: sessionsPerSite.get(site.id) || 0,
          events_today: eventsPerSite.get(site.id) || 0,
          status,
        };
      });

      setWebsites(siteStatuses);

      // 构建系统健康状态
      const onlineCount = siteStatuses.filter(s => s.status === 'online').length;
      const warningCount = siteStatuses.filter(s => s.status === 'warning').length;
      const offlineCount = siteStatuses.filter(s => s.status === 'offline').length;
      const totalEventsToday = Array.from(eventsPerSite.values()).reduce((a, b) => a + b, 0);

      // 通过数据库最新事件判断服务响应能力
      let edgeStatus: SystemHealth['edge_function_status'] = 'online';
      let avgResponse = 0;
      try {
        const start = performance.now();
        const { data: latestEvent } = await supabase
          .from('analytics_events')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const elapsed = performance.now() - start;
        avgResponse = Math.round(elapsed);

        const event = latestEvent as { created_at?: string } | null;
        if (event?.created_at) {
          const lastTime = new Date(event.created_at).getTime();
          const now = Date.now();
          if (now - lastTime > 24 * 60 * 60 * 1000) {
            edgeStatus = 'offline';
          } else if (now - lastTime > 60 * 60 * 1000) {
            edgeStatus = 'degraded';
          }
        }
      } catch {
        edgeStatus = 'offline';
      }

      setHealth({
        total_websites: siteStatuses.length,
        online_websites: onlineCount,
        warning_websites: warningCount,
        offline_websites: offlineCount,
        total_events_today: totalEventsToday,
        avg_response_ms: avgResponse,
        edge_function_status: edgeStatus,
      });

      // 构建近24小时趋势数据
      const hourlyMap = new Map<string, { events: number; sessions: number }>();
      for (let i = 23; i >= 0; i--) {
        const d = new Date();
        d.setHours(d.getHours() - i);
        const key = `${d.getHours().toString().padStart(2, '0')}:00`;
        hourlyMap.set(key, { events: 0, sessions: 0 });
      }

      // 统计近24小时事件
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentEvents } = await supabase
        .from('analytics_events')
        .select('created_at')
        .gte('created_at', last24h)
        .order('created_at', { ascending: true });

      (recentEvents || []).forEach((e: any) => {
        const d = new Date(e.created_at);
        const key = `${d.getHours().toString().padStart(2, '0')}:00`;
        const entry = hourlyMap.get(key);
        if (entry) {
          entry.events += 1;
          hourlyMap.set(key, entry);
        }
      });

      const trendArray = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        hour,
        events: data.events,
        sessions: data.sessions,
      }));
      setHourlyData(trendArray);

    } catch (error) {
      console.error('Failed to fetch status data:', error);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  // 自动添加本站到监控
  const handleAutoAddSite = async () => {
    setAutoAdding(true);
    try {
      const currentDomain = window.location.hostname;
      const currentUrl = window.location.origin;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        throw new Error('请先登录');
      }

      // 使用 RPC 创建网站
      const pixelKey = `pix_${Math.random().toString(36).substring(2, 8)}_${Date.now().toString(36).substring(0, 4)}`;
      const { error } = await supabase
        .from('analytics_websites')
        .insert({
          user_id: userId,
          name: '本站监控',
          domain: currentDomain || currentUrl,
          pixel_key: pixelKey,
          is_enabled: true,
        } as any);

      if (error) throw error;

      // 刷新数据
      await fetchStatusData();
    } catch (error: any) {
      console.error('Failed to add site:', error);
      alert(error.message || '添加失败');
    } finally {
      setAutoAdding(false);
    }
  };

  // 手动添加网站
  const handleAddSite = async () => {
    if (!addForm.name.trim() || !addForm.domain.trim()) return;
    setAutoAdding(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('请先登录');

      const pixelKey = `pix_${Math.random().toString(36).substring(2, 8)}_${Date.now().toString(36).substring(0, 4)}`;
      const { error } = await supabase
        .from('analytics_websites')
        .insert({
          user_id: userId,
          name: addForm.name.trim(),
          domain: addForm.domain.trim(),
          pixel_key: pixelKey,
          is_enabled: true,
        } as any);

      if (error) throw error;
      setAddDialogOpen(false);
      setAddForm({ name: '', domain: '' });
      await fetchStatusData();
    } catch (error: any) {
      console.error('Failed to add site:', error);
      alert(error.message || '添加失败');
    } finally {
      setAutoAdding(false);
    }
  };

  useEffect(() => {
    fetchStatusData();
    const interval = setInterval(fetchStatusData, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = useMemo(() => ({
    online: { label: '正常运行', color: 'bg-emerald-500', icon: Wifi, text: 'text-emerald-600' },
    warning: { label: '数据延迟', color: 'bg-amber-500', icon: AlertCircle, text: 'text-amber-600' },
    offline: { label: '无数据', color: 'bg-red-500', icon: WifiOff, text: 'text-red-600' },
    disabled: { label: '已禁用', color: 'bg-slate-400', icon: Monitor, text: 'text-slate-500' },
  }), []);

  const getStatusBadge = (status: WebsiteStatus['status']) => {
    const cfg = statusConfig[status];
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={`gap-1 ${cfg.text}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </Badge>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* 标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black italic">状态监控</h1>
          <p className="text-sm text-muted-foreground mt-1">
            实时监控各网站统计 SDK 的健康状态与数据流量
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>上次刷新: {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: zhCN })}</span>
          <Button variant="outline" size="sm" onClick={fetchStatusData} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            刷新
          </Button>
        </div>
      </div>

      {/* 健康概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-black">{health?.online_websites ?? 0}</p>
              <p className="text-xs text-muted-foreground">正常运行</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black">{health?.warning_websites ?? 0}</p>
              <p className="text-xs text-muted-foreground">数据延迟</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-black">{health?.total_events_today ?? 0}</p>
              <p className="text-xs text-muted-foreground">今日事件</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black">{health?.avg_response_ms ?? 0}<span className="text-xs font-normal ml-1">ms</span></p>
              <p className="text-xs text-muted-foreground">平均响应</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edge Function 状态 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Edge Function 服务状态
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">数据采集服务 (analytics-track)</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${health?.edge_function_status === 'online' ? 'bg-emerald-500 animate-pulse' : health?.edge_function_status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium">
                {health?.edge_function_status === 'online' ? '正常运行' : health?.edge_function_status === 'degraded' ? '响应缓慢' : '连接中断'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">数据库连接</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium">已连接</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 近24小时数据流量趋势 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            近24小时数据流量
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickMargin={8}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="events"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEvents)"
                  name="事件数"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 网站监控列表 */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            网站/SDK 监控列表
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-3 h-3 mr-1" />
            添加网站
          </Button>
        </CardHeader>
        <CardContent>
          {loading && websites.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">正在加载监控数据...</span>
            </div>
          ) : websites.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无已配置的网站</p>
              <p className="text-xs mt-1 mb-4">默认监控本站，点击下方按钮快速启用</p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={handleAutoAddSite} disabled={autoAdding} size="sm">
                  {autoAdding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wifi className="w-3 h-3 mr-1" />}
                  自动监控本站
                </Button>
                <Button variant="outline" onClick={() => setAddDialogOpen(true)} size="sm">
                  <Plus className="w-3 h-3 mr-1" />
                  添加网站
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="w-full max-w-full overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">网站名称</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">域名</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">像素密钥</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">最后活跃</th>
                    <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">今日会话</th>
                    <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">今日事件</th>
                    <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {websites.map((site) => (
                    <tr key={site.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">{site.name}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap max-w-[200px] truncate">
                        {site.domain}
                      </td>
                      <td className="px-3 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        <span className="truncate max-w-[120px] inline-block">{site.pixel_key}</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {site.last_event_at
                            ? formatDistanceToNow(new Date(site.last_event_at), { addSuffix: true, locale: zhCN })
                            : '从未收到'}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-center whitespace-nowrap font-mono">{site.sessions_today}</td>
                      <td className="px-3 py-3 text-sm text-center whitespace-nowrap font-mono">{site.events_today}</td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        {getStatusBadge(site.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* 添加网站弹窗 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-base">添加监控网站</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-name" className="text-xs">网站名称</Label>
              <Input
                id="site-name"
                placeholder="例如：本站"
                value={addForm.name}
                onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-domain" className="text-xs">域名</Label>
              <Input
                id="site-domain"
                placeholder="例如：example.com"
                value={addForm.domain}
                onChange={(e) => setAddForm(f => ({ ...f, domain: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddDialogOpen(false)} size="sm">取消</Button>
              <Button className="flex-1" onClick={handleAddSite} disabled={autoAdding || !addForm.name.trim() || !addForm.domain.trim()} size="sm">
                {autoAdding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                确认添加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 异常概览 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            异常概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          {websites.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Globe className="w-5 h-5" />
              <span className="text-sm">暂无监控网站，请先添加网站后查看异常概览。</span>
            </div>
          ) : websites.filter(s => s.status === 'warning' || s.status === 'offline').length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-emerald-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">当前所有监控网站均处于正常状态，未检测到异常。</span>
            </div>
          ) : (
            <div className="space-y-2">
              {websites
                .filter(s => s.status === 'warning' || s.status === 'offline')
                .map((site) => (
                  <div
                    key={site.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      site.status === 'warning'
                        ? 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/50'
                        : 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {site.status === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{site.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {site.status === 'warning'
                            ? `超过 30 分钟未收到新数据，最后活跃于 ${site.last_event_at ? formatDistanceToNow(new Date(site.last_event_at), { addSuffix: true, locale: zhCN }) : '未知'}`
                            : '超过 24 小时未收到数据，请检查页面是否已集成统计 SDK'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={site.status === 'warning' ? 'secondary' : 'destructive'} className="shrink-0 text-xs">
                      {site.status === 'warning' ? '延迟' : '中断'}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
