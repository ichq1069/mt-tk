import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/db/api';
import { type AnalyticsStats } from './types';
import { Target, TrendingUp, CheckCircle } from 'lucide-react';

export default function GoalsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAnalyticsStats('7d');
      setStats(data as AnalyticsStats);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-black">目标转化</h1>
        <p className="text-sm text-muted-foreground mt-1">转化目标完成情况和转化率分析</p>
      </div>

      {/* 总转化概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">目标总数</p>
                <p className="text-2xl font-black">{stats?.goals?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">总转化数</p>
                <p className="text-2xl font-black">
                  {stats?.goals?.reduce((sum, g) => sum + g.conversions, 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">平均转化率</p>
                <p className="text-2xl font-black">
                  {stats?.goals?.length
                    ? (stats.goals.reduce((sum, g) => sum + g.rate, 0) / stats.goals.length).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 目标列表 */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-bold">转化目标详情</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !stats?.goals || stats.goals.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">暂无配置的目标</p>
          ) : (
            <div className="space-y-4">
              {stats.goals.map((goal, i) => (
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
