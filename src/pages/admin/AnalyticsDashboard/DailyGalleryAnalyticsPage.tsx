import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, 
  Calendar, 
  Eye, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Monitor, 
  Smartphone, 
  Tablet,
  Lock,
  Trash2,
  AlertTriangle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Eraser
} from 'lucide-react';
import { analyticsApi } from '@/db/analytics_api';
import { supabase } from '@/db/supabase';
import { toast } from 'sonner';
import { formatBeijingTime } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function DailyGalleryAnalyticsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>({ 
    pageviews: [], 
    accessLogs: [], 
    pageviewsCount: 0,
    accessLogsCount: 0,
    period: { start: '', end: '' } 
  });

  // 筛选和分页状态
  const [pageviewsOpenid, setPageviewsOpenid] = useState('');
  const [accessLogsOpenid, setAccessLogsOpenid] = useState('');
  const [accessLogsPassword, setAccessLogsPassword] = useState('');
  const [pageviewsPage, setPageviewsPage] = useState(1);
  const [accessLogsPage, setAccessLogsPage] = useState(1);
  const pageSize = 20;

  // 清理功能状态
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<any>(null);

  const handleClearData = async (type: 'pageviews' | 'accessLogs') => {
    if (!window.confirm(`确定要清空所有${type === 'pageviews' ? '访客行为' : '密码使用'}记录吗？此操作不可撤销。`)) return;
    
    setLoading(true);
    try {
      await analyticsApi.clearDailyGalleryAnalytics(type);
      toast.success('数据已成功清空');
      if (type === 'pageviews') {
        fetchPageviews();
      } else {
        fetchAccessLogs();
      }
      fetchSummary();
    } catch (e: any) {
      toast.error('清空失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPageviews = async (overrideOpenid?: string) => {
    setLoading(true);
    try {
      const result = await analyticsApi.getDailyGalleryAnalytics({
        startDate,
        endDate,
        openid: (overrideOpenid !== undefined ? overrideOpenid : pageviewsOpenid) || undefined,
        page: overrideOpenid !== undefined ? 1 : pageviewsPage,
        pageSize,
        type: 'pageviews'
      });
      setData((prev: any) => ({ 
        ...prev, 
        pageviews: result.pageviews,
        pageviewsCount: result.pageviewsCount
      }));
      if (overrideOpenid !== undefined) {
        setPageviewsPage(1);
      }
    } catch (e) {
      toast.error('获取访客行为数据失败');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccessLogs = async (overrideOpenid?: string) => {
    setLoading(true);
    try {
      const result = await analyticsApi.getDailyGalleryAnalytics({
        startDate,
        endDate,
        openid: (overrideOpenid !== undefined ? overrideOpenid : accessLogsOpenid) || undefined,
        password: accessLogsPassword || undefined,
        page: overrideOpenid !== undefined ? 1 : accessLogsPage,
        pageSize,
        type: 'accessLogs'
      });
      setData((prev: any) => ({ 
        ...prev, 
        accessLogs: result.accessLogs,
        accessLogsCount: result.accessLogsCount
      }));
      if (overrideOpenid !== undefined) {
        setAccessLogsPage(1);
      }
    } catch (e) {
      toast.error('获取密码使用数据失败');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const result = await analyticsApi.getDailyGalleryAnalytics({
        startDate,
        endDate,
        type: 'all'
      });
      setData(result);
    } catch (e) {
      toast.error('获取每日图集分析数据失败');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (strategy: string) => {
    setCleanupLoading(true);
    setCleanupResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('analytics-cleanup', {
        method: 'POST',
        body: { strategy },
      });
      if (error) {
        const msg = await error.context?.text?.() || error.message;
        throw new Error(msg);
      }
      setCleanupResult(data);
      if (data?.deleted > 0) {
        toast.success(`成功清理 ${data.deleted} 条无效数据`);
        fetchSummary();
      }
    } catch (e: any) {
      setCleanupResult({ error: e.message });
      toast.error('清理失败: ' + e.message);
    } finally {
      setCleanupLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [startDate, endDate]);

  useEffect(() => {
    fetchPageviews();
  }, [pageviewsPage]);

  useEffect(() => {
    fetchAccessLogs();
  }, [accessLogsPage]);

  const handleSearchPageviews = () => {
    setPageviewsPage(1);
    fetchPageviews();
  };

  const handleSearchAccessLogs = () => {
    setAccessLogsPage(1);
    fetchAccessLogs();
  };

  // 统计指标
  const totalPageviews = data.pageviewsCount || 0;
  const totalAccessLogs = data.accessLogsCount || 0;
  const uniqueVisitors = data.uniqueVisitorsCount || 0;
  const uniqueOpenids = data.uniqueOpenidsCount || 0;
  const uniquePasswords = new Set(data.accessLogs?.map((l: any) => l.password_used).filter(Boolean)).size;

  // 设备分布统计
  const deviceStats: Record<string, number> = {};
  data.pageviews?.forEach((p: any) => {
    const device = p.visitor?.device_type || 'unknown';
    deviceStats[device] = (deviceStats[device] || 0) + 1;
  });

  const sortedDates = Object.keys(data.dailyStats || {}).sort((a, b) => b.localeCompare(a));

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题与筛选 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            每日图集分析
          </h2>
          <p className="text-sm text-muted-foreground mt-1">汇总每日图集页面的访客行为、密码使用及 openid 用户数据</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">开始</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36 h-9 rounded-xl text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">结束</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36 h-9 rounded-xl text-xs" />
          </div>
          <Button size="sm" className="rounded-xl h-9 text-xs" onClick={fetchSummary} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart3 className="w-3.5 h-3.5" />}
            查询
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCleanupDialogOpen(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            清理
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Eye className="w-5 h-5 text-blue-500" /></div>
              <div>
                <div className="text-2xl font-black">{totalPageviews}</div>
                <div className="text-xs text-muted-foreground">页面浏览</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><Users className="w-5 h-5 text-emerald-500" /></div>
              <div>
                <div className="text-2xl font-black">{uniqueVisitors}</div>
                <div className="text-xs text-muted-foreground">独立访客</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><Lock className="w-5 h-5 text-purple-500" /></div>
              <div>
                <div className="text-2xl font-black">{totalAccessLogs}</div>
                <div className="text-xs text-muted-foreground">密码使用次数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-amber-500" /></div>
              <div>
                <div className="text-2xl font-black">{uniqueOpenids}</div>
                <div className="text-xs text-muted-foreground">OpenID 用户数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 设备分布 */}
      {Object.keys(deviceStats).length > 0 && (
        <Card className="border-none shadow-sm rounded-2xl">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">设备分布</CardTitle>
            <CardDescription>访客使用的设备类型分布</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(deviceStats).map(([device, count]) => (
                <div key={device} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {getDeviceIcon(device)}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{count}</div>
                    <div className="text-xs text-muted-foreground">
                      {device === 'mobile' ? '移动端' : device === 'tablet' ? '平板' : device === 'desktop' ? '桌面端' : '其他'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 每日统计表格 */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">每日汇总</CardTitle>
          <CardDescription>按日期统计每日图集的访客行为与密码使用</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
          ) : sortedDates.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">该时间段暂无每日图集访客数据</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>页面浏览</TableHead>
                    <TableHead>独立访客</TableHead>
                    <TableHead>OpenID 用户</TableHead>
                    <TableHead>密码使用</TableHead>
                    <TableHead>人均浏览</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDates.map((date) => {
                    const stat = data.dailyStats[date];
                    const pv = stat.pageviews;
                    const uv = stat.visitorsCount;
                    const ov = stat.openidsCount;
                    const al = stat.accessLogs;
                    return (
                      <TableRow key={date}>
                        <TableCell className="font-medium">{date}</TableCell>
                        <TableCell>{pv}</TableCell>
                        <TableCell>{uv}</TableCell>
                        <TableCell>{ov > 0 ? <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 text-[10px]">{ov} 人</Badge> : <span className="text-muted-foreground text-xs">-</span>}</TableCell>
                        <TableCell>{al > 0 ? <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-[10px]">{al} 次</Badge> : <span className="text-muted-foreground text-xs">-</span>}</TableCell>
                        <TableCell>{uv > 0 ? (pv / uv).toFixed(1) : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 访客明细 */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-0 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            访客行为明细
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8 rounded-lg"
            onClick={() => handleClearData('pageviews')}
          >
            <Eraser className="w-3.5 h-3.5 mr-1" />
            清空列表
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
          ) : (data.pageviews || []).length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">暂无访客数据</div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="通过 OpenID 筛选..." 
                    className="pl-9 h-9 rounded-xl text-xs"
                    value={pageviewsOpenid}
                    onChange={(e) => setPageviewsOpenid(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchPageviews()}
                  />
                </div>
                <Button size="sm" variant="secondary" className="h-9 rounded-xl px-4" onClick={handleSearchPageviews} disabled={loading}>
                  搜索
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>访客 ID</TableHead>
                      <TableHead>OpenID</TableHead>
                      <TableHead>设备</TableHead>
                      <TableHead>页面路径</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.pageviews || []).map((pv: any) => (
                      <TableRow key={pv.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatBeijingTime(pv.created_at)}</TableCell>
                        <TableCell className="text-xs font-mono">{pv.visitor?.visitor_uuid?.substring(0, 8)}...</TableCell>
                        <TableCell className="text-xs font-mono">
                          {pv.visitor?.openid ? (
                            <span 
                              className="cursor-pointer hover:text-primary hover:underline transition-colors"
                              onClick={() => {
                                setPageviewsOpenid(pv.visitor.openid);
                                fetchPageviews(pv.visitor.openid);
                              }}
                              title="点击筛选此 OpenID"
                            >
                              {pv.visitor.openid.substring(0, 12)}...
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs">{pv.visitor?.device_type || '-'}</TableCell>
                        <TableCell className="text-xs truncate max-w-[200px]">{pv.page_path || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.pageviewsCount > pageSize && (
                  <div className="flex items-center justify-between px-4 py-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      共 {data.pageviewsCount} 条记录 · 第 {pageviewsPage}/{Math.ceil(data.pageviewsCount / pageSize)} 页
                    </p>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg" 
                        disabled={pageviewsPage <= 1 || loading}
                        onClick={() => setPageviewsPage(p => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg" 
                        disabled={pageviewsPage >= Math.ceil(data.pageviewsCount / pageSize) || loading}
                        onClick={() => setPageviewsPage(p => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 密码使用明细 */}
      <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-0 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            密码使用明细
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8 rounded-lg"
            onClick={() => handleClearData('accessLogs')}
          >
            <Eraser className="w-3.5 h-3.5 mr-1" />
            清空列表
          </Button>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {loading && !data.accessLogs?.length ? (
            <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row items-center gap-2">
                <div className="flex-1 relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="通过 OpenID 筛选..." 
                    className="pl-9 h-9 rounded-xl text-xs"
                    value={accessLogsOpenid}
                    onChange={(e) => setAccessLogsOpenid(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchAccessLogs()}
                  />
                </div>
                <div className="flex-1 relative w-full">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="通过密码筛选..." 
                    className="pl-9 h-9 rounded-xl text-xs"
                    value={accessLogsPassword}
                    onChange={(e) => setAccessLogsPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchAccessLogs()}
                  />
                </div>
                <Button size="sm" variant="secondary" className="h-9 rounded-xl px-4 w-full md:w-auto" onClick={handleSearchAccessLogs} disabled={loading}>
                  搜索
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>时间</TableHead>
                      <TableHead>访问密码</TableHead>
                      <TableHead>密码类型</TableHead>
                      <TableHead>OpenID</TableHead>
                      <TableHead>浏览器指纹</TableHead>
                      <TableHead>访问 IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.accessLogs || []).map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">{formatBeijingTime(log.accessed_at)}</TableCell>
                        <TableCell className="text-xs font-mono">{log.password_used || '-'}</TableCell>
                        <TableCell className="text-xs">
                          {log.access_type === 'password' || log.access_type === 'post_fixed' ? <Badge variant="secondary" className="bg-blue-100 text-blue-600 border-none text-[10px]">帖子密码</Badge> : 
                           log.access_type === 'universal' ? <Badge variant="secondary" className="bg-indigo-100 text-indigo-600 border-none text-[10px]">通用密码</Badge> :
                           log.access_type === 'ad_unlock' ? <Badge variant="secondary" className="bg-green-100 text-green-600 border-none text-[10px]">广告解锁</Badge> :
                           log.access_type?.startsWith('special:') ? (
                             <Badge variant="secondary" className="bg-purple-100 text-purple-600 border-none text-[10px]">
                               {log.access_type.split(':')[1] === 'one_time' ? '单次码' :
                                log.access_type.split(':')[1] === 'periodic_single_user' ? '专属码' :
                                log.access_type.split(':')[1] === 'periodic_multi_user' ? '多用码' : '特权码'}
                             </Badge>
                           ) : 
                           log.access_type === 'account' ? <Badge variant="secondary" className="bg-orange-100 text-orange-600 border-none text-[10px]">账户密码</Badge> :
                           log.access_type === 'user_fixed' ? <Badge variant="secondary" className="bg-cyan-100 text-cyan-600 border-none text-[10px]">用户固定</Badge> :
                           log.access_type === 'view' ? <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none text-[10px]">查看</Badge> :
                           <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none text-[10px]">{log.access_type || '未知'}</Badge>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.user_openid ? (
                            <span 
                              className="cursor-pointer hover:text-primary hover:underline transition-colors"
                              onClick={() => {
                                setAccessLogsOpenid(log.user_openid);
                                fetchAccessLogs(log.user_openid);
                              }}
                              title="点击筛选此 OpenID"
                            >
                              {log.user_openid.substring(0, 12)}...
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.browser_fingerprint?.substring(0, 12) || '-'}</TableCell>
                        <TableCell className="text-xs">{log.ip_address || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {data.accessLogsCount > pageSize && (
                  <div className="flex items-center justify-between px-4 py-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      共 {data.accessLogsCount} 条记录 · 第 {accessLogsPage}/{Math.ceil(data.accessLogsCount / pageSize)} 页
                    </p>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg" 
                        disabled={accessLogsPage <= 1 || loading}
                        onClick={() => setAccessLogsPage(p => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg" 
                        disabled={accessLogsPage >= Math.ceil(data.accessLogsCount / pageSize) || loading}
                        onClick={() => setAccessLogsPage(p => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 清理弹窗 */}
      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              清理分析数据
            </DialogTitle>
            <DialogDescription>
              清理过期的分析事件和会话数据，优化存储占用。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Button variant="outline" className="w-full justify-start h-auto py-3 px-4 rounded-xl" onClick={() => handleCleanup('events')} disabled={cleanupLoading}>
              <div className="text-left">
                <div className="font-bold text-sm">清理过期事件</div>
                <div className="text-xs text-muted-foreground">删除超过 90 天的旧事件记录</div>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start h-auto py-3 px-4 rounded-xl" onClick={() => handleCleanup('auto')} disabled={cleanupLoading}>
              <div className="text-left">
                <div className="font-bold text-sm">智能深度清理</div>
                <div className="text-xs text-muted-foreground">同时清理过期事件、会话及性能数据</div>
              </div>
            </Button>
          </div>

          {cleanupLoading && (
            <div className="py-4 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground mt-2">正在清理...</p>
            </div>
          )}

          {cleanupResult && !cleanupLoading && (
            <div className={`p-3 rounded-xl text-sm ${cleanupResult.error ? 'bg-destructive/10 text-destructive' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
              {cleanupResult.error ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {cleanupResult.error}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-bold">清理完成：删除 {cleanupResult.deleted} 条记录</div>
                  {cleanupResult.details?.map((d: string, i: number) => (
                    <div key={i} className="text-xs opacity-80">{d}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="ghost" className="rounded-xl" onClick={() => { setCleanupDialogOpen(false); setCleanupResult(null); }}>完成</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
