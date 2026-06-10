import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/db/api';
import { type RealtimeData } from './types';
import { Users, Monitor, Smartphone, Tablet } from 'lucide-react';
import { formatBeijingTime } from '@/lib/utils';

export default function VisitorsPage() {
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<RealtimeData>({ count: 0, visitors: [] });

  const loadVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRealtimeVisitors();
      setVisitors(data);
    } catch (error) {
      console.error('Failed to load visitors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  const deviceIcon = (type?: string) => {
    switch (type) {
      case 'desktop': return <Monitor className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-xl font-black">访客分析</h1>
        <p className="text-sm text-muted-foreground mt-1">访客来源、设备及行为分析</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-bold">最近访客</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : visitors.visitors.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">暂无访客数据</p>
          ) : (
            <div className="space-y-3">
              {visitors.visitors.map((visitor, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {deviceIcon(visitor.visitor?.device_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {visitor.visitor?.country_code || 'Unknown'} · {visitor.visitor?.city_name || 'Unknown'}
                      {visitor.visitor?.openid && (
                        <span className="ml-2 text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-mono">
                          ID: {visitor.visitor.openid.substring(0, 8)}...
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{visitor.current_page}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium">{visitor.visitor?.browser_name || 'Unknown'}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBeijingTime(visitor.last_active_at)}</p>
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
