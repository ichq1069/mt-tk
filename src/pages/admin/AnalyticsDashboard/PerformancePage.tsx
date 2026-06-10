import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Zap, 
  Clock, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Filter
} from 'lucide-react';
import { analyticsApi } from '@/db/analytics_api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PerformancePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.getPerformanceStats(timeRange);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch performance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricInfo = (name: string) => {
    switch (name) {
      case 'LCP':
        return {
          title: 'Largest Contentful Paint (LCP)',
          description: '衡量首屏最大内容渲染完成的时间。',
          good: 2500,
          unit: 'ms'
        };
      case 'INP':
        return {
          title: 'Interaction to Next Paint (INP)',
          description: '衡量用户与页面交互后的整体响应性（替代了 FID）。',
          good: 200,
          unit: 'ms'
        };
      case 'FID':
        return {
          title: 'First Input Delay (FID)',
          description: '衡量用户首次交互时的响应延迟。',
          good: 100,
          unit: 'ms'
        };
      case 'CLS':
        return {
          title: 'Cumulative Layout Shift (CLS)',
          description: '衡量页面内容的视觉稳定性（累计布局偏移）。',
          good: 0.1,
          unit: ''
        };
      case 'FCP':
        return {
          title: 'First Contentful Paint (FCP)',
          description: '衡量首个 DOM 内容渲染的时间。',
          good: 1800,
          unit: 'ms'
        };
      case 'TTFB':
        return {
          title: 'Time to First Byte (TTFB)',
          description: '衡量服务器响应的时间。',
          good: 800,
          unit: 'ms'
        };
      default:
        return { title: name, description: '', good: 0, unit: '' };
    }
  };

  const getStatusColor = (name: string, value: number) => {
    const info = getMetricInfo(name);
    if (value <= info.good) return 'text-emerald-500';
    if (value <= info.good * 2) return 'text-orange-500';
    return 'text-red-500';
  };

  const formatValue = (name: string, value: number) => {
    const info = getMetricInfo(name);
    if (name === 'CLS') return value.toFixed(3);
    return Math.round(value) + info.unit;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Web Vitals 性能监控
          </h1>
          <p className="text-sm text-muted-foreground mt-1">分析核心性能指标对转化率的影响</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="时间范围" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">最近 24 小时</SelectItem>
              <SelectItem value="7d">最近 7 天</SelectItem>
              <SelectItem value="30d">最近 30 天</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '刷新'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">正在加载性能分析数据...</p>
        </div>
      ) : stats.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center">
            <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">暂无性能数据</p>
            <p className="text-xs text-muted-foreground/60 mt-2">确保网站已集成最新的 SDK 并有访客访问</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stats.map((metric) => {
              const info = getMetricInfo(metric.name);
              const impact = metric.convertedAvg - metric.notConvertedAvg;
              const isBetterWhenConverted = impact < 0; // 对于延迟类指标，转换会话的平均值更低表示性能更好

              return (
                <Card key={metric.name} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-bold">{metric.name}</CardTitle>
                      <Badge variant="outline" className={getStatusColor(metric.name, metric.avg)}>
                        {metric.avg <= info.good ? '优秀' : metric.avg <= info.good * 2 ? '待改进' : '较差'}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{info.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-end gap-2">
                      <div className={`text-3xl font-black ${getStatusColor(metric.name, metric.avg)}`}>
                        {formatValue(metric.name, metric.avg)}
                      </div>
                      <div className="text-xs text-muted-foreground mb-1.5">平均值</div>
                    </div>

                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          已转化会话
                        </span>
                        <span className="font-bold">{formatValue(metric.name, metric.convertedAvg)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Info className="w-3 h-3 text-blue-500" />
                          未转化会话
                        </span>
                        <span className="font-bold">{formatValue(metric.name, metric.notConvertedAvg)}</span>
                      </div>
                    </div>

                    <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-2 ${isBetterWhenConverted ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                      <TrendingUp className="w-4 h-4" />
                      <span>
                        已转化用户的 {metric.name} 比未转化用户{isBetterWhenConverted ? '快' : '慢'} {Math.abs(Math.round(impact / (metric.notConvertedAvg || 1) * 100))}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>性能指标与转化率相关性分析</CardTitle>
              <CardDescription>对比已转化与未转化会话的平均性能指标（数值越低通常表示性能越好）</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                    />
                    <Legend />
                    <Bar name="已转化会话" dataKey="convertedAvg" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name="未转化会话" dataKey="notConvertedAvg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
