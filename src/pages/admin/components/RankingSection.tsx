import React, { useState, useEffect } from 'react';
import { cn, formatBeijingTime } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { MediaItem, Profile, StorageConfig, AppNotification, UserFieldConfig, Report, ReportStatus, PermissionGroup, Ad, RedemptionCode } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { useAdminLogger } from '@/hooks/useAdminLogger';

// 辅助函数：移除文件后缀名
const stripExtension = (name: string | null | undefined) => {
  if (!name) return '';
  return name.replace(/\.[^/.]+$/, "");
};

export function RankingSection() {
const [topFavorited, setTopFavorited] = useState<any[]>([]);
const [topDisliked, setTopDisliked] = useState<any[]>([]);
  const { logAction } = useAdminLogger('ranking');
const [loading, setLoading] = useState(true);
const [activeTab, setActiveTab] = useState('favorites');

useEffect(() => {
fetchRanking();
}, []);

const fetchRanking = async () => {
setLoading(true);
try {
const [favRes, dislikeRes] = await Promise.all([
api.getTopMedia(50),
api.getTopDislikedMedia(50)
]);
setTopFavorited(favRes.data || []);
setTopDisliked(dislikeRes.data || []);
} catch (e) {
console.error(e);
} finally {
setLoading(false);
}
};

const currentData = activeTab === 'favorites' ? topFavorited : topDisliked;

if (loading) {
return (
<div className="flex items-center justify-center py-20">
<Loader2 className="w-8 h-8 animate-spin text-primary" />
</div>
);
}

return (
<div className="space-y-6">
<div className="flex items-center justify-between">
<div>
<h2 className="text-2xl font-black">媒体排行榜</h2>
<p className="text-sm text-muted-foreground mt-1">全站媒体收藏与不喜欢数据实时追踪</p>
</div>
<div className="flex items-center gap-4">
<Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
<TabsList className="rounded-xl">
<TabsTrigger value="favorites" className="rounded-lg gap-2">
<Heart className="w-4 h-4 text-red-500 fill-red-500" />
收藏排行
</TabsTrigger>
<TabsTrigger value="dislikes" className="rounded-lg gap-2">
<ThumbsDown className="w-4 h-4 text-zinc-500 fill-zinc-500" />
不喜欢排行
</TabsTrigger>
</TabsList>
</Tabs>
<Button variant="outline" size="sm" onClick={fetchRanking} className="rounded-xl h-10">
<RefreshCcw className="w-4 h-4 mr-2" />
刷新数据
</Button>
</div>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
{currentData.map((item, index) => (
<Card key={item.id} className="group border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
<div className="relative aspect-square bg-muted">
<img referrerPolicy="no-referrer" 
src={item.thumbnail_url || item.url} 
alt={item.title} 
className="w-full h-full object-contain transition-transform group-hover:scale-105" 
/>

{/* 排名标识 */}
<div className={cn(
"absolute top-4 left-4 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md border border-white/20",
index === 0 ? "bg-yellow-500 text-white" : 
index === 1 ? "bg-slate-300 text-slate-800" :
index === 2 ? "bg-amber-600 text-white" : "bg-black/60 text-white"
)}>
{index < 3 ? <Crown className="w-5 h-5" /> : <span className="font-black text-lg">{index + 1}</span>}
</div>

{/* 计数值 */}
<div className={cn(
"absolute top-4 right-4 backdrop-blur-md px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-lg border",
activeTab === 'favorites' 
? "bg-red-500/90 border-red-400/20" 
: "bg-zinc-800/90 border-zinc-700/20"
)}>
{activeTab === 'favorites' ? (
<Heart className="w-3.5 h-3.5 fill-white text-white" />
) : (
<ThumbsDown className="w-3.5 h-3.5 fill-white text-white" />
)}
<span className="text-sm font-black text-white tabular-nums">
{activeTab === 'favorites' ? item.favorite_count : item.dislike_count}
</span>
</div>

{/* 底部信息屏障 */}
<div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
<h3 className="text-white font-bold text-sm truncate mb-1">{stripExtension(item.title) || '无标题'}</h3>
<div className="flex items-center gap-3 text-white/60 text-xs">
<span className="flex items-center gap-1">
<Monitor className="w-3 h-3" />
{item.views_count || 0}
</span>
<span className="flex items-center gap-1">
<Calendar className="w-3 h-3" />
{formatBeijingTime(item.created_at)}
</span>
</div>
</div>
</div>
</Card>
))}
{currentData.length === 0 && (
<div className="col-span-full py-20 text-center bg-muted/20 rounded-3xl border-2 border-dashed border-border/40">
<p className="text-muted-foreground">暂无排行数据</p>
</div>
)}
</div>
</div>
);
}

// ==================== 大数据中心 Section ====================
