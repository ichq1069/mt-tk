import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/db/api';
import { type RealtimeData } from './types';
import { Activity, Globe, Monitor, Smartphone, Tablet, Navigation, Eye, MapPin, UserCheck, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatBeijingTime } from '@/lib/utils';

export default function RealtimePage() {
  const [realtime, setRealtime] = useState<RealtimeData>({ count: 0, visitors: [] });
  const [loading, setLoading] = useState(true);
  const [prevCount, setPrevCount] = useState(0);

  const loadRealtime = useCallback(async () => {
    try {
      const data = await api.getRealtimeVisitors();
      setRealtime(prev => {
        setPrevCount(prev.count);
        return data;
      });
    } catch (error) {
      console.error('Failed to load realtime:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealtime();
    const interval = setInterval(loadRealtime, 5000); // 缩短刷新间隔到 5 秒
    return () => clearInterval(interval);
  }, [loadRealtime]);

  const deviceGroups = useMemo(() => ({
    desktop: realtime.visitors.filter((v) => v.visitor?.device_type === 'desktop'),
    mobile: realtime.visitors.filter((v) => v.visitor?.device_type === 'mobile'),
    tablet: realtime.visitors.filter((v) => v.visitor?.device_type === 'tablet'),
    other: realtime.visitors.filter((v) => !v.visitor?.device_type || !['desktop', 'mobile', 'tablet'].includes(v.visitor.device_type)),
  }), [realtime.visitors]);

  // 热门实时页面
  const activePages = useMemo(() => {
    const pages: Record<string, { count: number; title: string }> = {};
    realtime.visitors.forEach(v => {
      if (!pages[v.current_page]) {
        pages[v.current_page] = { count: 0, title: v.page_title || v.current_page };
      }
      pages[v.current_page].count++;
    });
    return Object.entries(pages)
      .map(([path, data]) => ({ path, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [realtime.visitors]);

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case 'desktop': return <Monitor className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <UserCheck className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            实时监控中心
          </h1>
          <p className="text-sm text-muted-foreground mt-1">当前正在访问网站的用户动态，每 5 秒刷新一次</p>
        </div>
        <div className="flex items-center gap-3 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Monitoring</span>
        </div>
      </div>

      {/* 实时核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <Activity className="w-12 h-12" />
          </div>
          <CardContent className="p-4 md:p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">当前在线</p>
            <div className="flex items-baseline gap-2 mt-2">
              <motion.p 
                key={realtime.count}
                initial={{ scale: 1.2, color: realtime.count > prevCount ? '#10b981' : realtime.count < prevCount ? '#ef4444' : 'currentColor' }}
                animate={{ scale: 1, color: 'currentColor' }}
                className="text-3xl font-black"
              >
                {realtime.count}
              </motion.p>
              <span className="text-xs text-muted-foreground">人</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50">
          <CardContent className="p-4 md:p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">移动端访问</p>
            <div className="flex items-center gap-2 mt-2">
              <Smartphone className="w-5 h-5 text-primary" />
              <p className="text-2xl font-black">{deviceGroups.mobile.length}</p>
              <span className="text-xs text-muted-foreground">({realtime.count > 0 ? Math.round((deviceGroups.mobile.length / realtime.count) * 100) : 0}%)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 md:p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">热门地区</p>
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="w-5 h-5 text-primary" />
              <p className="text-2xl font-black">
                {new Set(realtime.visitors.map((v) => v.visitor?.country_code).filter(Boolean)).size}
              </p>
              <span className="text-xs text-muted-foreground">个国家/地区</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4 md:p-6">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">活跃页面</p>
            <div className="flex items-center gap-2 mt-2">
              <Navigation className="w-5 h-5 text-primary" />
              <p className="text-2xl font-black">{activePages.length}</p>
              <span className="text-xs text-muted-foreground">个路径</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 实时活跃页面排行 */}
        <Card className="border-border/50 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              活跃页面排行
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activePages.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">无活跃页面</div>
            ) : (
              <div className="space-y-4">
                {activePages.map((page, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate max-w-[200px]" title={page.path}>{page.title}</span>
                      <span className="font-bold text-primary">{page.count} 人</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(page.count / realtime.count) * 100}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 详细访客动态 */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              访客行为追踪
            </CardTitle>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Last Activity</span>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : realtime.visitors.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">暂无实时访客数据</div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                <AnimatePresence mode="popLayout">
                  {realtime.visitors.map((visitor) => (
                    <motion.div 
                      key={visitor.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors group"
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                          {getDeviceIcon(visitor.visitor?.device_type)}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background ring-2 ring-green-500/20" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate">{visitor.page_title || visitor.current_page}</p>
                          {visitor.visitor?.openid && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold">
                              ID:{visitor.visitor.openid.slice(-6)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {visitor.visitor?.city_name || visitor.visitor?.country_code || '未知地区'}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {visitor.visitor?.browser_name} / {visitor.visitor?.os_name}
                          </span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-end gap-1">
                          <Navigation className="w-3 h-3" />
                          {visitor.current_page}
                        </div>
                        <div className="text-[10px] mt-1 font-mono text-primary bg-primary/5 px-2 py-0.5 rounded-full inline-block">
                          {formatBeijingTime(visitor.last_active_at)}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

