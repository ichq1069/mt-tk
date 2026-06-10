import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Activity, Database, Zap } from 'lucide-react';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface WebVitalsStats {
  metric_name: string;
  total_count: number;
  avg_value: number;
  p50_value: number;
  p75_value: number;
  p95_value: number;
  good_count: number;
  needs_improvement_count: number;
  poor_count: number;
  good_percentage: number;
}

interface CacheStats {
  cache_key: string;
  hit_count: number;
  miss_count: number;
  hit_rate: number;
}

export default function PerformanceMonitor() {
  const [webVitalsStats, setWebVitalsStats] = useState<WebVitalsStats[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vitals' | 'cache'>('vitals');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 获取 Web Vitals 统计
      const { data: vitalsData, error: vitalsError } = await (supabase.rpc as any)('get_web_vitals_stats', {
        p_metric_name: null,
        p_days: 7,
      });

      if (vitalsError) {
        toast.error(`获取 Web Vitals 统计失败: ${vitalsError.message}`);
      } else {
        setWebVitalsStats((vitalsData as WebVitalsStats[]) || []);
      }

      // 获取所有缓存统计
      const { data: cacheData, error: cacheError } = await (supabase.rpc as any)('get_all_cache_stats');
      
      if (cacheError) {
        toast.error(`获取缓存统计失败: ${cacheError.message}`);
      } else {
        setCacheStats((cacheData as CacheStats[]) || []);
      }
    } catch (e: any) {
      console.error('Failed to fetch performance data:', e);
      toast.error('加载性能数据失败：' + (e.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'good':
        return <Badge variant="default" className="bg-green-500">优秀</Badge>;
      case 'needs-improvement':
        return <Badge variant="secondary" className="bg-yellow-500">需改进</Badge>;
      case 'poor':
        return <Badge variant="destructive">较差</Badge>;
      default:
        return null;
    }
  };

  const getMetricName = (name: string) => {
    const names: Record<string, string> = {
      'LCP': '最大内容绘制',
      'FID': '首次输入延迟',
      'CLS': '累积布局偏移',
      'FCP': '首次内容绘制',
      'TTFB': '首字节时间',
    };
    return names[name] || name;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">性能监控</h1>
          <p className="text-sm text-muted-foreground mt-1">
            实时监控应用性能指标与缓存命中率
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <Activity className="w-4 h-4 mr-2" />
          刷新数据
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vitals" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Web Vitals
          </TabsTrigger>
          <TabsTrigger value="cache" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            缓存统计
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Web Vitals 性能指标</CardTitle>
              <CardDescription>最近 7 天的性能数据统计</CardDescription>
            </CardHeader>
            <CardContent>
              {webVitalsStats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">暂无性能数据</p>
                  <p className="text-xs mt-2">性能数据将在用户访问时自动采集</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>指标</TableHead>
                      <TableHead>平均值</TableHead>
                      <TableHead>P50</TableHead>
                      <TableHead>P75</TableHead>
                      <TableHead>P95</TableHead>
                      <TableHead>优秀率</TableHead>
                      <TableHead>样本数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webVitalsStats.map((stat) => (
                      <TableRow key={stat.metric_name}>
                        <TableCell className="font-medium">
                          {getMetricName(stat.metric_name)}
                        </TableCell>
                        <TableCell>{stat.avg_value.toFixed(2)}ms</TableCell>
                        <TableCell>{stat.p50_value.toFixed(2)}ms</TableCell>
                        <TableCell>{stat.p75_value.toFixed(2)}ms</TableCell>
                        <TableCell>{stat.p95_value.toFixed(2)}ms</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{stat.good_percentage.toFixed(1)}%</span>
                            {stat.good_percentage >= 75 ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{stat.total_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>缓存命中率统计</CardTitle>
              <CardDescription>各类缓存的命中率与使用情况</CardDescription>
            </CardHeader>
            <CardContent>
              {cacheStats.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">暂无缓存统计数据</p>
                  <p className="text-xs mt-2">缓存统计将在系统运行时自动记录</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>缓存键</TableHead>
                      <TableHead>命中次数</TableHead>
                      <TableHead>未命中次数</TableHead>
                      <TableHead>命中率</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cacheStats.map((stat) => (
                      <TableRow key={stat.cache_key}>
                        <TableCell className="font-medium">{stat.cache_key}</TableCell>
                        <TableCell>{stat.hit_count}</TableCell>
                        <TableCell>{stat.miss_count}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{stat.hit_rate.toFixed(1)}%</span>
                            {stat.hit_rate >= 70 ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {stat.hit_rate >= 70 ? (
                            <Badge variant="default" className="bg-green-500">健康</Badge>
                          ) : stat.hit_rate >= 50 ? (
                            <Badge variant="secondary" className="bg-yellow-500">一般</Badge>
                          ) : (
                            <Badge variant="destructive">需优化</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
