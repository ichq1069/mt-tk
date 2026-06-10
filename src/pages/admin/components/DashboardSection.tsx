
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { MediaItem, Profile, StorageConfig, AppNotification, UserFieldConfig, Report, ReportStatus, PermissionGroup, Ad, RedemptionCode } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
  ExternalLink, Settings2, Info, TriangleAlert, Play, Bell, Eye, CalendarCheck
} from "lucide-react";
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";

// StatCard 组件
function StatCard({ title, value, color, icon, onClick }: { 
  title: string; 
  value: number; 
  color: string; 
  icon?: React.ReactNode; 
  onClick?: () => void;
}) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    zinc: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
  };

  return (
    <Card 
      className={cn(
        "border rounded-2xl cursor-pointer transition-all hover:shadow-md",
        colorClasses[color] || colorClasses.primary
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold opacity-70">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardSection({ setActiveMenu }: { setActiveMenu: (m: string) => void }) {
  const { logAction } = useAdminLogger('dashboard');
const [stats, setStats] = useState({ 
  users: 0, 
  pending: 0, 
  approved: 0, 
  archived: 0, 
  favorites: 0, 
  dislikes: 0, 
  views: 0, 
  pending_reports: 0,
  pending_album_requests: 0,
  daily_gallery: { views: 0, visitors: 0, today_views: 0, today_visitors: 0, pwd_usages: 0 }
});
const [topMedia, setTopMedia] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
fetchStats();
}, []);

const fetchStats = async () => {
setLoading(true);
try {
const [s, dg] = await Promise.all([
  api.getAdminStats(),
  api.getDailyGalleryStats()
]);

if (!s.error) {
      setStats(prev => ({
        ...prev,
        users: Number(s.users || 0),
        pending: Number(s.pending || 0),
        approved: Number(s.approved || 0),
        archived: Number(s.archived || 0),
        favorites: Number(s.favorites || 0),
        dislikes: Number(s.dislikes || 0),
        views: Number(s.views || 0),
        pending_reports: Number(s.pending_reports || 0),
        pending_album_requests: Number(s.pending_album_requests || 0)
      }));
}

  if (!dg.error && Array.isArray(dg.data)) {
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
    
    setStats(prev => ({
      ...prev,
      daily_gallery: summary
    }));
  }

const { data: top } = await api.getTopMedia(10);
setTopMedia(top || []);
} catch (e) {
console.error(e);
} finally {
setLoading(false);
}
};

if (loading) {
return (
<div className="flex items-center justify-center py-20">
<Loader2 className="w-8 h-8 animate-spin text-primary" />
</div>
);
}

return (
<div className="space-y-6">
<div>
<h2 className="text-2xl font-black">控制台</h2>
<p className="text-sm text-muted-foreground mt-1">全站数据统计概览</p>
</div>

{/* 统计卡片 */}
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
<StatCard title="待审核" value={stats.pending} color="primary" onClick={() => setActiveMenu('content')} />
<StatCard title="待处理举报" value={stats.pending_reports} color="red" onClick={() => setActiveMenu('content')} icon={<TriangleAlert className="w-4 h-4" />} />
<StatCard title="已发布" value={stats.approved} color="blue" onClick={() => setActiveMenu('library')} />
<StatCard title="已下架" value={stats.archived} color="amber" onClick={() => setActiveMenu('library')} />
<StatCard title="每日图集总浏览" value={stats.daily_gallery?.views || 0} color="purple" icon={<Eye className="w-4 h-4" />} onClick={() => setActiveMenu('daily-gallery')} />
<StatCard title="每日图集今日访客" value={stats.daily_gallery?.today_visitors || 0} color="orange" icon={<Users2 className="w-4 h-4" />} onClick={() => setActiveMenu('daily-gallery')} />
<StatCard title="总用户" value={stats.users} color="indigo" onClick={() => setActiveMenu('users')} />
<StatCard title="总浏览量" value={stats.views || 0} color="emerald" icon={<Activity className="w-4 h-4" />} />
<StatCard title="收藏总数" value={stats.favorites} color="red" icon={<Heart className="w-4 h-4 fill-current" />} />
<StatCard title="不喜欢总数" value={stats.dislikes} color="zinc" icon={<ThumbsDown className="w-4 h-4 fill-current" />} />
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
<Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-muted/20">
<CardHeader>
<CardTitle className="text-lg font-black flex items-center gap-2">
<CircleCheckBig className="w-5 h-5 text-primary" />
待办事项
</CardTitle>
</CardHeader>
<CardContent className="space-y-4">
<div 
className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border/40 cursor-pointer hover:border-primary/50 transition-all"
onClick={() => setActiveMenu('content')}
>
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
<FileCheck className="w-5 h-5" />
</div>
<div>
<div className="font-bold text-sm">内容审核</div>
<div className="text-xs text-muted-foreground">当前有 {stats.pending} 条内容等待审核</div>
</div>
</div>
<Badge className="bg-primary">{stats.pending}</Badge>
</div>

<div 
className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border/40 cursor-pointer hover:border-red-500/50 transition-all"
onClick={() => setActiveMenu('content')}
>
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
<TriangleAlert className="w-5 h-5" />
</div>
<div>
<div className="font-bold text-sm">举报投诉处理</div>
<div className="text-xs text-muted-foreground">当前有 {stats.pending_reports} 条举报投诉待处理</div>
</div>
</div>
<Badge className="bg-red-500">{stats.pending_reports}</Badge>
</div>

<div 
className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border/40 cursor-pointer hover:border-blue-500/50 transition-all"
onClick={() => setActiveMenu('albums')}
>
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
<ShieldAlert className="w-5 h-5" />
</div>
<div>
<div className="font-bold text-sm">图集权限申请</div>
<div className="text-xs text-muted-foreground">当前有 {stats.pending_album_requests} 条权限申请待审核</div>
</div>
</div>
<Badge className="bg-blue-500">{stats.pending_album_requests}</Badge>
</div>
</CardContent>
</Card>

<Card className="border-none shadow-sm rounded-3xl overflow-hidden">
<CardHeader>
<CardTitle className="text-lg font-black flex items-center gap-2">
<TrendingUp className="w-5 h-5 text-blue-500" />
热门趋势
</CardTitle>
</CardHeader>
<CardContent>
{topMedia.length === 0 ? (
<div className="text-center py-10 text-muted-foreground text-sm italic">暂无热门数据</div>
) : (
<div className="space-y-3">
{topMedia.slice(0, 5).map((m, i) => (
<div key={m.id} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-xl transition-all">
<span className="w-5 text-center font-black italic text-muted-foreground">{i + 1}</span>
<img referrerPolicy="no-referrer" src={m.thumbnail_url || m.url} className="w-10 h-10 rounded-lg object-contain" />
<div className="flex-1 min-w-0">
<div className="text-sm font-bold truncate">{m.title || '无标题'}</div>
<div className="text-[10px] text-muted-foreground">收藏: {m.favorite_count || 0}</div>
</div>
</div>
))}
</div>
)}
</CardContent>
</Card>
</div>
</div>
);
}


// ==================== 排行榜 Section ====================
