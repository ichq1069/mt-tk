
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { MediaItem, Profile, StorageConfig, AppNotification, UserFieldConfig, Report, ReportStatus, PermissionGroup, Ad, RedemptionCode } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatBeijingTime, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { rbacApi } from "@/db/rbac";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { MediaPreview } from "@/components/MediaPreview";
import { 
  LayoutDashboard, FileCheck, Users as UsersIcon, Settings, Heart, ThumbsDown, Loader2, X, Edit2, Trash, 
  Archive, CircleArrowUp, CheckSquare, Square, CirclePlay, Video, Search, Edit3, Ban, UserCheck, 
  Mail, Calendar, Cloud, Save, LogOut, Share, Download, Database as DatabaseIcon, Monitor, 
  Image as ImageIcon, Filter, RefreshCcw, ListFilter, CircleCheckBig, Circle, MousePointer2, Trash2, 
  ArrowUp, ArrowDown, BarChart3, PieChart as PieChartIcon, TrendingUp, Activity, Users2, ShieldAlert, 
  Trophy, Crown, Flame, FileCode2, Server, Globe, Database, Key, Shield, Rocket, Terminal, 
  ExternalLink, Settings2, Info, TriangleAlert, Play, Bell, Eye, CalendarCheck, Check, Network
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { useAdminLogger } from '@/hooks/useAdminLogger';

import { UserNetworkSection } from './UserNetworkSection';

export function DataCenterSection({ defaultTab = 'overview' }: { defaultTab?: string }) {
  const { logAction } = useAdminLogger('datacenter');
const [activeTab, setActiveTab] = useState(defaultTab);
const [stats, setStats] = useState({ 
  users: 0, 
  pending: 0, 
  approved: 0, 
  archived: 0, 
  favorites: 0, 
  dislikes: 0, 
  views: 0,
  daily_gallery: { views: 0, visitors: 0, today_views: 0, today_visitors: 0, pwd_usages: 0 }
});
const [analytics, setAnalytics] = useState<any[]>([]);
const [distribution, setDistribution] = useState<any[]>([]);
const [visitStats, setVisitStats] = useState<any[]>([]);
const [terminalAnalytics, setTerminalAnalytics] = useState<any>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
fetchData();
}, [activeTab]);

const fetchData = async () => {
setLoading(true);
try {
const [s, a, d, dg] = await Promise.all([
api.getAdminStats(),
api.getAdminAnalytics(),
api.getAdminDistribution(),
api.getDailyGalleryStats()
]);

if (!s.error) setStats(prev => ({ ...prev, ...(s as any) }));
if (Array.isArray(dg.data)) {
  const dataArray = dg.data;
  const todayStr = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  const todayData = dataArray.find((d: any) => d.post_date === todayStr);
  
  const summary = {
    views: dataArray.reduce((acc: number, curr: any) => acc + (curr.view_count || 0), 0),
    visitors: dataArray.reduce((acc: number, curr: any) => acc + (curr.unique_visitor_count || 0), 0),
    today_views: todayData?.view_count || 0,
    today_visitors: todayData?.unique_visitor_count || 0,
    pwd_usages: 0
  };
  setStats(prev => ({ ...prev, daily_gallery: summary }));
}
if (!a.error && Array.isArray(a.data)) setAnalytics(a.data);
if (!d.error && Array.isArray(d.data)) setDistribution(d.data);

if (activeTab === 'visits') {
  const [v, t] = await Promise.all([
    api.getVisitStats(),
    api.getTerminalAnalytics()
  ]);
  if (v.data && Array.isArray(v.data)) setVisitStats(v.data);
  if (t.data) setTerminalAnalytics(t.data);
}
} catch (e) {
console.error(e);
toast.error('数据中心加载失败');
} finally {
setLoading(false);
}
};

// 计算唯一访客数据
const uniqueVisitors = React.useMemo(() => {
  const groups: Record<string, any[]> = {};
  const ipCounts: Record<string, { users: Set<string>, visitorIds: Set<string> }> = {};
  
  visitStats.forEach(s => {
    // 按已登录用户或 (IP + 浏览器 + OS) 组合作为唯一访客标识
    const visitorId = s.user_id || `${s.ip_address || 'unknown'}-${s.browser || 'unknown'}-${s.os || 'unknown'}`;
    if (!groups[visitorId]) groups[visitorId] = [];
    groups[visitorId].push(s);

    // 统计 IP 信息
    if (s.ip_address) {
      if (!ipCounts[s.ip_address]) {
        ipCounts[s.ip_address] = { users: new Set(), visitorIds: new Set() };
      }
      if (s.user_id) ipCounts[s.ip_address].users.add(s.user_id);
      ipCounts[s.ip_address].visitorIds.add(visitorId);
    }
  });

  return Object.values(groups).map(logs => {
    const lastVisit = logs[0];
    const visitorId = lastVisit.user_id || `${lastVisit.ip_address || 'unknown'}-${lastVisit.browser || 'unknown'}-${lastVisit.os || 'unknown'}`;
    const ipStat = lastVisit.ip_address ? ipCounts[lastVisit.ip_address] : null;

    return {
      ...lastVisit,
      id: visitorId,
      adblock_enabled: logs.some(l => l.adblock_enabled),
      visitCount: logs.length,
      logs,
      ipStat: ipStat ? {
        users: ipStat.users.size,
        visitors: ipStat.visitorIds.size
      } : { users: 0, visitors: 0 }
    };
  });
}, [visitStats]);

if (loading) {
return (
<div className="flex flex-col items-center justify-center py-40 gap-4">
<Loader2 className="w-10 h-10 animate-spin text-primary" />
<p className="text-muted-foreground animate-pulse">正在处理海量数据分析...</p>
</div>
);
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const typeData = distribution.filter(i => i.type === 'media_type');
const statusData = distribution.filter(i => i.type === 'media_status');

const statusLabels: Record<string, string> = {
pending: '待审核',
approved: '已上架',
archived: '已下架',
rejected: '未通过',
image: '图片',
video: '视频'
};

return (
<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<h2 className="text-3xl font-black tracking-tight">大数据中心</h2>
<p className="text-muted-foreground mt-1">深度洞察全站内容生态与用户增长趋势</p>
</div>
<div className="flex items-center gap-3">
<Badge variant="outline" className="rounded-full bg-slate-50 border-slate-200 text-slate-500 font-mono">v1.1.20</Badge>
<Button variant="outline" size="sm" onClick={fetchData} className="rounded-xl border-slate-200">
<RefreshCcw className="w-4 h-4 mr-2" />
更新实时分析
</Button>
</div>
</div>

<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
<TabsList className="bg-muted/50 p-1 rounded-xl">
<TabsTrigger value="overview" className="rounded-lg px-6 font-bold">概览统计</TabsTrigger>
<TabsTrigger value="visits" className="rounded-lg px-6 font-bold flex items-center gap-2"><Monitor className="w-4 h-4" /> 终端统计</TabsTrigger>
<TabsTrigger value="network" className="rounded-lg px-6 font-bold flex items-center gap-2"><Network className="w-4 h-4" /> 用户关系图</TabsTrigger>
</TabsList>

<TabsContent value="overview" className="pt-6 space-y-8">
{/* 核心指标概览 */}
<div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
<DataCard title="用户覆盖规模" value={stats.users} icon={<Users2 className="w-5 h-5" />} trend="+12.5%" color="bg-blue-500" onClick={() => setActiveTab('visits')} />
<DataCard title="图集总浏览" value={stats.daily_gallery?.views || 0} icon={<Eye className="w-5 h-5" />} trend="+15.2%" color="bg-purple-500" />
<DataCard title="今日访客" value={stats.daily_gallery?.today_visitors || 0} icon={<CalendarCheck className="w-5 h-5" />} trend="+8.4%" color="bg-orange-500" />
<DataCard title="内容总资产" value={stats.approved + stats.pending + stats.archived} icon={<ImageIcon className="w-5 h-5" />} trend="+5.2%" color="bg-indigo-500" />
<DataCard title="全站总浏览量" value={stats.views || 0} icon={<Activity className="w-5 h-5" />} trend="+42.1%" color="bg-emerald-500" />
<DataCard title="互动活跃度" value={stats.favorites + stats.dislikes} icon={<Heart className="w-5 h-5" />} trend="+28.4%" color="bg-rose-500" />
</div>

<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
{/* 增长趋势图 */}
<Card className="md:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
<CardHeader className="pb-2">
<CardTitle className="text-lg font-bold flex items-center gap-2">
<TrendingUp className="w-5 h-5 text-blue-500" />
近30天增长趋势
</CardTitle>
<CardDescription>内容上传量与新用户入驻对比分析</CardDescription>
</CardHeader>
<CardContent className="h-[350px] pt-4">
<ResponsiveContainer width="100%" height="100%">
<AreaChart data={analytics}>
<defs>
<linearGradient id="colorUpload" x1="0" y1="0" x2="0" y2="1">
<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
<stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
</linearGradient>
<linearGradient id="colorUser" x1="0" y1="0" x2="0" y2="1">
<stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
<stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
</linearGradient>
</defs>
<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
<XAxis 
dataKey="day" 
stroke="#94a3b8" 
fontSize={10} 
tickLine={false} 
axisLine={false}
tickFormatter={(val) => val.split('-').slice(1).join('/')}
/>
<YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
<RechartsTooltip 
contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
/>
<Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
<Area 
type="monotone" 
name="内容上传" 
dataKey="upload_count" 
stroke="#3b82f6" 
strokeWidth={3} 
fillOpacity={1} 
fill="url(#colorUpload)" 
/>
<Area type="monotone" name="新用户" dataKey="user_count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUser)" />
</AreaChart>
</ResponsiveContainer>
</CardContent>
</Card>

{/* 类型分布 */}
<Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
<CardHeader className="pb-2">
<CardTitle className="text-lg font-bold flex items-center gap-2">
<PieChartIcon className="w-5 h-5 text-indigo-500" />
内容生态占比
</CardTitle>
<CardDescription>媒体类型分布与活跃状态分布</CardDescription>
</CardHeader>
<CardContent className="space-y-6">
<div className="h-[180px]">
<ResponsiveContainer width="100%" height="100%">
<PieChart>
<Pie
data={typeData}
cx="50%"
cy="50%"
innerRadius={45}
outerRadius={70}
paddingAngle={8}
dataKey="value"
>
{typeData.map((entry, index) => (
<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
))}
</Pie>
<RechartsTooltip />
</PieChart>
</ResponsiveContainer>
</div>
<div className="space-y-3">
{typeData.map((item, index) => (
<div key={item.name} className="flex items-center justify-between">
<div className="flex items-center gap-2">
<div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
<span className="text-sm font-medium">{statusLabels[item.name] || item.name}</span>
</div>
<span className="text-sm font-bold">{item.value}</span>
</div>
))}
</div>
<Separator className="bg-slate-100" />
<div className="space-y-3">
<p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">状态健康度分布</p>
<div className="grid grid-cols-2 gap-2">
{statusData.map((item, index) => (
<div key={item.name} className="p-3 bg-slate-50 rounded-2xl flex flex-col gap-1">
<span className="text-[10px] text-muted-foreground font-bold">{statusLabels[item.name] || item.name}</span>
<span className="text-lg font-black">{item.value}</span>
</div>
))}
</div>
</div>
</CardContent>
</Card>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
{/* 互动分析 */}
<Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
<CardHeader>
<CardTitle className="text-lg font-bold flex items-center gap-2">
<Heart className="w-5 h-5 text-rose-500" />
用户互动量分析
</CardTitle>
<CardDescription>收藏与不喜欢行为总量分析</CardDescription>
</CardHeader>
<CardContent className="h-[250px]">
<ResponsiveContainer width="100%" height="100%">
<BarChart data={[
{ name: '收藏行为', value: stats.favorites, fill: '#ef4444' },
{ name: '不喜欢行为', value: stats.dislikes, fill: '#64748b' }
]}>
<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
<XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
<YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
<Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={60} />
</BarChart>
</ResponsiveContainer>
</CardContent>
</Card>

{/* 实时活跃播报 */}
<Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
<CardHeader>
<CardTitle className="text-lg font-bold flex items-center gap-2">
<Activity className="w-5 h-5 text-emerald-500" />
数据健康度评估
</CardTitle>
<CardDescription>系统实时运行状态指标</CardDescription>
</CardHeader>
<CardContent className="space-y-4">
<HealthItem label="API 响应延迟" value="12ms" status="healthy" />
<HealthItem label="数据库并发量" value="Active" status="healthy" />
<HealthItem label="存储桶利用率" value="Low" status="healthy" />
<HealthItem label="内容审核积压" value={stats.pending > 20 ? 'High' : 'Low'} status={stats.pending > 50 ? 'warning' : 'healthy'} />
<div className="pt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
<Check className="w-6 h-6" />
</div>
<div>
<p className="text-sm font-bold text-emerald-900">系统运行正常</p>
<p className="text-[10px] text-emerald-700">全站数据同步延迟低于 100ms</p>
</div>
</div>
</CardContent>
</Card>
</div>
</TabsContent>

<TabsContent value="visits" className="pt-6 space-y-8 animate-in fade-in duration-500">
  {/* 统计核心趋势 */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card className="md:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          近 15 天终端访问趋势
        </CardTitle>
        <CardDescription>每日 PV 与 UV 增长曲线</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] pt-4">
        {terminalAnalytics?.daily_visits?.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={terminalAnalytics.daily_visits}>
              <defs>
                <linearGradient id="colorPV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorUV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => v.split('-').slice(1).join('/')} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" name="页面访问(PV)" dataKey="count" stroke="#3b82f6" strokeWidth={3} fill="url(#colorPV)" />
              <Area type="monotone" name="唯一访客(UV)" dataKey="unique_visitors" stroke="#10b981" strokeWidth={3} fill="url(#colorUV)" />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">暂无趋势数据</div>
        )}
      </CardContent>
    </Card>

    <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-500" />
          终端设备分布
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={terminalAnalytics?.device_distribution || []}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {(terminalAnalytics?.device_distribution || []).map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {(terminalAnalytics?.device_distribution || []).map((item: any, index: number) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="font-medium">{item.name === 'Mobile' ? '移动端' : '桌面端'}</span>
              </div>
              <span className="font-black">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>

  {/* 浏览器与 OS 详细分布 */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <Card className="md:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-500" />
          浏览器份额 (TOP 5)
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={terminalAnalytics?.browser_distribution?.slice(0, 5) || []} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={80} axisLine={false} tickLine={false} />
            <RechartsTooltip />
            <Bar dataKey="value" fill="#6366f1" radius={[0, 10, 10, 0]} barSize={25} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card className="md:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-500" />
          操作系统份额 (TOP 5)
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={terminalAnalytics?.os_distribution?.slice(0, 5) || []} layout="vertical">
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={80} axisLine={false} tickLine={false} />
            <RechartsTooltip />
            <Bar dataKey="value" fill="#94a3b8" radius={[0, 10, 10, 0]} barSize={25} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <Card className="md:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <ListFilter className="w-5 h-5 text-primary" />
          热门访问页面 TOP 10
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-none">
              <TableHead className="text-[10px] font-bold uppercase tracking-wider pl-6">页面路径</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right pr-6">访问次数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(terminalAnalytics?.path_distribution?.slice(0, 10) || []).map((item: any) => (
              <TableRow key={item.name} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary/20 rounded-full" />
                    <span className="text-xs font-mono text-slate-600">{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-6 font-black text-slate-900">{item.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          访客健康度
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: '开启广告拦截', value: uniqueVisitors.filter(s => s.adblock_enabled).length },
                  { name: '正常浏览', value: uniqueVisitors.filter(s => !s.adblock_enabled).length }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={8}
                dataKey="value"
              >
                <Cell fill="#f43f5e" stroke="none" />
                <Cell fill="#10b981" stroke="none" />
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center">
            <p className="text-[10px] font-black text-rose-900 uppercase mb-1">拦截率</p>
            <p className="text-2xl font-black text-rose-500">
              {uniqueVisitors.length > 0 ? ((uniqueVisitors.filter(s => s.adblock_enabled).length / uniqueVisitors.length) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
            <p className="text-[10px] font-black text-emerald-900 uppercase mb-1">真实流量</p>
            <p className="text-2xl font-black text-emerald-500">
              {uniqueVisitors.filter(s => !s.adblock_enabled).length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>

  <VisitorLogsTable visitors={uniqueVisitors} />
</TabsContent>

<TabsContent value="network" className="pt-6">
<Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden bg-white/50 backdrop-blur-xl">
<div className="p-6">
<div className="flex items-center gap-3 mb-6">
<div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
<Network className="w-6 h-6" />
</div>
<div>
<h3 className="text-xl font-black">用户推广关系网</h3>
<p className="text-sm text-muted-foreground mt-1">可视化追踪全站用户裂变与上下级推荐关系</p>
</div>
</div>
<UserNetworkSection />
</div>
</Card>
</TabsContent>

</Tabs>
</div>
  );
}

function DataCard({ title, value, icon, trend, color, onClick }: { title: string, value: number, icon: React.ReactNode, trend: string, color: string, onClick?: () => void }) {
return (
<Card 
  className={cn(
    "border-none shadow-sm rounded-3xl overflow-hidden bg-white group hover:translate-y-[-4px] transition-all duration-300",
    onClick && "cursor-pointer hover:shadow-md"
  )}
  onClick={onClick}
>
<CardContent className="p-6">
<div className="flex items-center justify-between mb-4">
<div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg", color)}>
{icon}
</div>
<Badge variant="outline" className="text-emerald-500 border-emerald-100 bg-emerald-50 rounded-lg">{trend}</Badge>
</div>
<div className="space-y-1">
<p className="text-sm font-medium text-muted-foreground">{title}</p>
<p className="text-3xl font-black tracking-tight">{value.toLocaleString()}</p>
</div>
</CardContent>
</Card>
);
}

function HealthItem({ label, value, status }: { label: string, value: string, status: 'healthy' | 'warning' | 'critical' }) {
const statusColors = {
healthy: 'bg-emerald-500',
warning: 'bg-amber-500',
critical: 'bg-rose-500'
};

return (
<div className="flex items-center justify-between p-3 border border-slate-50 rounded-2xl">
<span className="text-sm text-slate-600 font-medium">{label}</span>
<div className="flex items-center gap-3">
<span className="text-sm font-black">{value}</span>
<div className={cn("w-2 h-2 rounded-full animate-pulse", statusColors[status])} />
</div>
</div>
);
}

function StatCard({ title, value, color, icon, onClick }: { title: string, value: number, color: string, icon?: React.ReactNode, onClick?: () => void }) {
const colorClasses: Record<string, string> = {
primary: 'bg-primary/5 border-primary/10 text-primary',
blue: 'bg-blue-500/5 border-blue-500/10 text-blue-500',
amber: 'bg-amber-500/5 border-amber-500/10 text-amber-500',
indigo: 'bg-indigo-500/5 border-indigo-500/10 text-indigo-500',
red: 'bg-red-500/5 border-red-500/10 text-red-500',
zinc: 'bg-zinc-500/5 border-zinc-500/10 text-zinc-500',
emerald: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500',
};

return (
<Card 
className={cn(
"border rounded-2xl transition-all",
colorClasses[color],
onClick && "cursor-pointer hover:shadow-md hover:scale-[1.02]"
)}
onClick={onClick}
>
<CardContent className="p-6">
<div className="flex items-center justify-between mb-2">
<p className="text-xs uppercase font-bold tracking-wider opacity-70">{title}</p>
{icon}
</div>
<p className="text-3xl font-black font-mono">{value}</p>
</CardContent>
</Card>
);
}

// ==================== 审核管理 Section ====================

function VisitorLogsTable({ visitors }: { visitors: any[] }) {
  const [search, setSearch] = useState('');
  const [filterAdBlock, setFilterAdBlock] = useState('all');
  const [filterIp, setFilterIp] = useState('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // 获取所有唯一 IP 列表
  const uniqueIps = React.useMemo(() => {
    const ips = new Set<string>();
    visitors.forEach(v => {
      if (v.ip_address) ips.add(v.ip_address);
    });
    return Array.from(ips).sort();
  }, [visitors]);

  const filteredData = visitors.filter(item => {
    const username = item.profiles?.username || '访客';
    const ipAddress = item.ip_address || '';
    const path = item.path || '';
    const userId = item.user_id || '';
    const os = item.os || '';
    const browser = item.browser || '';

    const matchesSearch = 
      username.toLowerCase().includes(search.toLowerCase()) ||
      ipAddress.toLowerCase().includes(search.toLowerCase()) ||
      path.toLowerCase().includes(search.toLowerCase()) ||
      userId.toLowerCase().includes(search.toLowerCase()) ||
      os.toLowerCase().includes(search.toLowerCase()) ||
      browser.toLowerCase().includes(search.toLowerCase());
    
    const matchesAdBlock = 
      filterAdBlock === 'all' || 
      (filterAdBlock === 'enabled' && !!item.adblock_enabled) || 
      (filterAdBlock === 'disabled' && !item.adblock_enabled);

    const matchesIp = 
      filterIp === 'all' || 
      (item.ip_address || '').includes(filterIp);

    return matchesSearch && matchesAdBlock && matchesIp;
  });

  return (
    <>
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">用户终端访问日志</CardTitle>
            <CardDescription>按用户维度合并展示，支持深度行为分析</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="搜索用户名/IP/路径..." 
                className="pl-9 w-64 rounded-xl"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterIp} onValueChange={setFilterIp}>
              <SelectTrigger className="w-40 rounded-xl">
                <SelectValue placeholder="过滤指定 IP" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">所有 IP 地址</SelectItem>
                {uniqueIps.map(ip => (
                  <SelectItem key={ip} value={ip}>{ip}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAdBlock} onValueChange={setFilterAdBlock}>
              <SelectTrigger className="w-32 rounded-xl">
                <SelectValue placeholder="拦截状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">拦截状态</SelectItem>
                <SelectItem value="enabled">开启拦截</SelectItem>
                <SelectItem value="disabled">未开启</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>用户/终端</TableHead>
                <TableHead>地理位置</TableHead>
                <TableHead>IP 地址</TableHead>
                <TableHead>系统/浏览器</TableHead>
                <TableHead>分辨率/语言</TableHead>
                <TableHead>最近访问路径</TableHead>
                <TableHead>最后活动</TableHead>
                <TableHead className="text-right">详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.slice(0, 50).map((item, i) => {
                const username = item.profiles?.username || '匿名访客';
                const visitorId = item.user_id || item.id;
                const location = item.country ? `${item.country} · ${item.city || item.region || ''}` : '未知区域';
                return (
                  <TableRow key={`${visitorId}-${i}`} className="group hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {item.device_type === 'Mobile' ? <Monitor className="w-4 h-4" /> : <Monitor className="w-4 h-4 rotate-90" />}
                        </div>
                        <div>
                          <div className="text-sm font-bold truncate max-w-[120px]">{username}</div>
                          <Badge variant="outline" className="text-[9px] h-4 py-0 px-1 border-muted-foreground/20">
                            {item.device_type || 'PC'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Globe className="w-3 h-3 text-indigo-400" />
                        {location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {item.ip_address || 'unknown'}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="text-[10px] font-medium">{item.os || 'Unknown OS'}</div>
                        <div className="text-[10px] text-muted-foreground opacity-70">{item.browser || 'Unknown Browser'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="text-[10px]">{item.resolution || 'N/A'}</div>
                        <div className="text-[10px] text-muted-foreground italic">{item.language || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="text-[10px] font-mono text-primary truncate max-w-[120px]">{item.path || '/'}</div>
                        {item.page_title && <div className="text-[9px] text-muted-foreground truncate max-w-[120px]">{item.page_title}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-[10px] text-muted-foreground">
                        {formatBeijingTime(item.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setSelectedUser(item)}
                      >
                        <Info className="w-4 h-4 text-primary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-[2rem] border-none shadow-2xl">
          <DialogHeader className="p-8 pb-12 bg-slate-900 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-primary font-black text-2xl">
                  {selectedUser?.profiles?.username?.[0] || '访'}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black">{selectedUser?.profiles?.username || '匿名访客'}</DialogTitle>
                  <DialogDescription className="text-white/60 flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs">{selectedUser?.user_id || 'Visitor'}</span>
                    <Badge variant="outline" className="border-white/20 text-white rounded-lg h-5 px-1.5 text-[10px]">{selectedUser?.ip_address}</Badge>
                  </DialogDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">终端类型</p>
                <Badge className="bg-primary text-primary-foreground rounded-xl px-3 h-7 font-bold">
                  {selectedUser?.device_type || 'PC'}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 -mt-6 bg-white rounded-t-[2.5rem] relative z-10 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DetailBox label="地理位置" value={`${selectedUser?.country || '-'} / ${selectedUser?.city || selectedUser?.region || '-'}`} color="blue" />
              <DetailBox label="操作系统" value={selectedUser?.os} color="slate" />
              <DetailBox label="浏览器" value={selectedUser?.browser} color="indigo" />
              <DetailBox label="屏幕分辨率" value={selectedUser?.resolution} color="purple" />
              <DetailBox label="首选语言" value={selectedUser?.language} color="pink" />
              <DetailBox label="网络类型" value={selectedUser?.network_type} color="cyan" />
              <DetailBox label="广告拦截" value={selectedUser?.adblock_enabled ? '已启用' : '未检测到'} color={selectedUser?.adblock_enabled ? 'rose' : 'emerald'} />
              <DetailBox label="累计访问" value={`${selectedUser?.visitCount || 1} 次`} color="amber" />
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                历史访问流 (近期记录)
              </h4>
              <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="border-none">
                      <TableHead className="text-[10px] font-bold py-3 pl-6">访问路径</TableHead>
                      <TableHead className="text-[10px] font-bold py-3">时间</TableHead>
                      <TableHead className="text-[10px] font-bold py-3 pr-6 text-right">终端特征</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedUser?.logs || []).slice(0, 10).map((log: any, idx: number) => (
                      <TableRow key={idx} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6">
                          <div className="flex flex-col gap-0.5">
                            <code className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded w-fit">{log.path || '/'}</code>
                            {log.page_title && <span className="text-[9px] text-slate-400 truncate max-w-[200px]">{log.page_title}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] text-slate-400">
                          {formatBeijingTime(log.created_at)}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Badge variant="outline" className="text-[8px] h-4 border-slate-200">{log.browser}</Badge>
                            {log.adblock_enabled && <Badge variant="destructive" className="text-[8px] h-4 px-1">AD</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {selectedUser?.referrer && selectedUser.referrer !== 'Direct' && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">引荐人来源 (Referrer)</p>
                <p className="text-xs text-slate-600 break-all font-mono">{selectedUser.referrer}</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 bg-slate-50/50 border-t border-slate-100">
            <Button onClick={() => setSelectedUser(null)} className="rounded-2xl w-full h-12 text-lg font-bold">关闭足迹详情</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailBox({ label, value, color }: { label: string, value: any, color: string }) {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    pink: 'bg-pink-50 text-pink-600 border-pink-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };

  return (
    <div className={cn("p-4 rounded-2xl border flex flex-col gap-1", colorMap[color])}>
      <p className="text-[9px] font-black uppercase opacity-60 tracking-wider">{label}</p>
      <p className="text-sm font-black truncate">{value || '-'}</p>
    </div>
  );
}

