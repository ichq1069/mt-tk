import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Users, Eye, MousePointer, Clock } from 'lucide-react';
import { api } from '@/db/api';
import { cn } from '@/lib/utils';
import { type AnalyticsStats, COLORS } from './types';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

function StatCard({ title, value, change, icon }: { title: string; value: string | number; change?: string; icon: React.ReactNode }) {
  return (
    <Card className="border-border/50">
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
}

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [stats, setStats] = useState<AnalyticsStats | null>(null);

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

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

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
          <h1 className="text-xl font-black">数据概览</h1>
          <p className="text-sm text-muted-foreground mt-1">网站流量和用户行为关键指标</p>
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

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="总访客数"
          value={stats?.total_visitors || 0}
          change="+12%"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="总浏览量"
          value={stats?.total_pageviews || 0}
          change="+8%"
          icon={<Eye className="w-5 h-5" />}
        />
        <StatCard
          title="平均停留"
          value={`${Math.floor((stats?.avg_duration || 0) / 60)}m`}
          change="+5%"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="跳出率"
          value={`${stats?.bounce_rate || 0}%`}
          change="-3%"
          icon={<MousePointer className="w-5 h-5" />}
        />
      </div>

      {/* 流量趋势 */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-bold">访问量趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 md:h-80 w-full min-w-0 overflow-hidden">
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

      {/* 设备分布 + 热门页面 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-bold">设备类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full min-w-0 overflow-hidden">
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
                    {(stats?.device_distribution || []).map((_entry: any, index: number) => (
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
    </div>
  );
}
