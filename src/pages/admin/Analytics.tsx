import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { RefreshCw, Users, Eye, MousePointer, Clock } from 'lucide-react';
import { api } from '@/db/api';
import { cn } from '@/lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface AnalyticsStats {
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

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [realtime, setRealtime] = useState({ count: 0, visitors: [] as any[] });

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAnalyticsStats(timeRange);
      setStats(data as AnalyticsStats);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const loadRealtime = useCallback(async () => {
    try {
      const data = await api.getRealtimeVisitors();
      setRealtime(data);
    } catch (error) {
      console.error('Failed to load realtime:', error);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
    loadRealtime();

    const interval = setInterval(loadRealtime, 10000);
    return () => clearInterval(interval);
  }, [loadAnalytics, loadRealtime]);

  const StatCard = ({ title, value, change, icon, color }: any) => (
    <Card className={cn('border-border/50', color)}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-black mt-1">{value}</p>
            {change && (
              <p className="text-xs font-medium text-green-500 mt-1">{change}</p>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* 页面标题 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">统计分析</h1>
          <p className="text-sm text-muted-foreground mt-1">网站流量和用户行为分析</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border rounded-lg px-4 py-2 text-sm bg-background"
          >
            <option value="1d">最近24小时</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
          </select>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </div>
      </div>

      {/* 实时在线 */}
      <Card className="border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm font-bold">实时在线</p>
              <p className="text-2xl font-black mt-0.5">{realtime.count}</p>
            </div>
            <p className="text-xs text-muted-foreground ml-auto">当前正在访问的用户数</p>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="总访客数"
          value={stats?.total_visitors || 0}
          change="+12%"
          icon={<Users className="w-5 h-5" />}
          color=""
        />
        <StatCard
          title="总浏览量"
          value={stats?.total_pageviews || 0}
          change="+8%"
          icon={<Eye className="w-5 h-5" />}
          color=""
        />
        <StatCard
          title="平均停留"
          value={`${Math.floor((stats?.avg_duration || 0) / 60)}m`}
          change="+5%"
          icon={<Clock className="w-5 h-5" />}
          color=""
        />
        <StatCard
          title="跳出率"
          value={`${stats?.bounce_rate || 0}%`}
          change="-3%"
          icon={<MousePointer className="w-5 h-5" />}
          color=""
        />
      </div>

      {/* 图表区域 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="visitors">访客分析</TabsTrigger>
          <TabsTrigger value="pages">页面分析</TabsTrigger>
          <TabsTrigger value="realtime">实时监控</TabsTrigger>
          <TabsTrigger value="goals">目标转化</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* 流量趋势 */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-bold">访问量趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.page_views_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="pageviews" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="浏览量" />
                    <Area type="monotone" dataKey="visitors" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="访客数" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 设备分布 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-sm font-bold">设备类型分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.device_distribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {(stats?.device_distribution || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-sm font-bold">热门页面</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(stats?.top_pages || []).slice(0, 5).map((page: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <p className="text-sm truncate max-w-[200px] md:max-w-[300px]">{page.path}</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min((page.views / (stats?.top_pages?.[0]?.views || 1)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{page.views}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="visitors" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-bold">访客详情</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {realtime.visitors.slice(0, 10).map((visitor: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {visitor.visitor?.device_type?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {visitor.visitor?.country_code || 'Unknown'} · {visitor.visitor?.city_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{visitor.current_page}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTimeAgo(visitor.last_active_at)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-bold">页面访问排行</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.top_pages?.slice(0, 10) || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="path" type="category" width={150} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="views" fill="#3b82f6" name="浏览量" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-bold">实时访客</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {realtime.visitors.map((visitor: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{visitor.current_page}</p>
                      <p className="text-xs text-muted-foreground">
                        {visitor.visitor?.browser_name || 'Unknown'} on {visitor.visitor?.os_name || 'Unknown'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTimeAgo(visitor.last_active_at)}</span>
                  </div>
                ))}
                {realtime.visitors.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">暂无实时访客</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-bold">目标转化</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(stats?.goals || []).map((goal: any, i: number) => (
                  <div key={i} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold">{goal.name}</p>
                        <p className="text-xs text-muted-foreground">{goal.conversions} 转化</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black">{goal.rate}%</p>
                        <p className="text-xs text-muted-foreground">转化率</p>
                      </div>
                    </div>
                    <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(goal.rate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!stats?.goals || stats.goals.length === 0) && (
                  <p className="text-center text-sm text-muted-foreground py-8">暂无配置的目标</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}
