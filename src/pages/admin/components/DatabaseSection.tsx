
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
  Trophy, Crown, Flame, FileCode2, Server, Globe, Database, Key, Shield, Rocket, Terminal, Zap,
  ExternalLink, Settings2, Info, TriangleAlert, Play, Bell, Eye, CalendarCheck
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { useAdminLogger } from '@/hooks/useAdminLogger';

export function DatabaseSection() {
const [stats, setStats] = useState<any>(null);
const [loading, setLoading] = useState(true);
  const { logAction } = useAdminLogger('database');
const [optimizing, setOptimizing] = useState<string | null>(null);

useEffect(() => {
fetchStats();
}, []);

const fetchStats = async () => {
setLoading(true);
const { data } = await api.getDatabaseStats();
setStats(data || null);
setLoading(false);
};

const handleOptimize = async (tableName?: string) => {
  setOptimizing(tableName || 'all');
  try {
    if (!tableName) {
      const data = await api.fullOptimizeDatabase();
      toast.success('全库维护完成');
    } else {
      const { data, error } = await api.optimizeDatabase(tableName);
      if (error) throw error;
      toast.success(data || '优化成功');
    }
    fetchStats();
  } catch (e: any) {
    toast.error(`优化失败: ${e.message}`);
  } finally {
    setOptimizing(null);
  }
};

return (
<div className="space-y-6 pb-20">
<div className="flex items-center justify-between">
<div>
<h2 className="text-2xl font-black text-foreground">数据库管理</h2>
<p className="text-sm text-muted-foreground mt-1">监控数据表容量、行数及执行在线表优化</p>
</div>
<Button 
  variant="default" 
  onClick={() => handleOptimize()} 
  disabled={!!optimizing}
  className="rounded-xl bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
>
  {optimizing === 'all' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
  开始数据库优化
</Button>
</div>

<div className="grid grid-cols-1 gap-6">
<Card className="border-none shadow-sm rounded-3xl overflow-hidden">
<Table>
<TableHeader className="bg-muted/50">
<TableRow>
<TableHead className="font-bold">数据表名</TableHead>
<TableHead className="font-bold">功能描述</TableHead>
<TableHead className="font-bold">估计行数</TableHead>
<TableHead className="font-bold">总大小 (含索引)</TableHead>
<TableHead className="font-bold">数据/索引</TableHead>
<TableHead className="text-right font-bold">操作</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{loading ? (
<TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="w-10 h-10 animate-spin mx-auto text-primary/20" /></TableCell></TableRow>
) : (!stats?.tables || stats.tables.length === 0) ? (
<TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground">无法获取数据库统计信息</TableCell></TableRow>
) : (
stats.tables.map((table: any) => (
<TableRow key={table.table_name}>
<TableCell className="font-mono font-bold">{table.table_name}</TableCell>
<TableCell className="text-xs text-muted-foreground">{table.description || '-'}</TableCell>
<TableCell>{(table.row_count || 0).toLocaleString()}</TableCell>
<TableCell className="font-medium">{table.total_size}</TableCell>
<TableCell className="text-[10px] text-muted-foreground">
{table.data_size} / {table.index_size}
</TableCell>
<TableCell className="text-right">
<Button 
variant="ghost" 
size="sm" 
className="rounded-lg text-primary" 
disabled={optimizing === table.table_name}
onClick={() => handleOptimize(table.table_name)}
>
{optimizing === table.table_name ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCcw className="w-3 h-3 mr-1" />}
优化
</Button>
</TableCell>
</TableRow>
))
)}
</TableBody>
</Table>
</Card>

<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card className="p-6 border-none shadow-sm rounded-3xl bg-primary/5">
    <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
      <Shield className="w-4 h-4" />
      一键维护说明
    </h4>
    <p className="text-xs text-muted-foreground leading-relaxed">
      此操作将运行一系列 PostgreSQL 优化指令，帮助查询计划器获得最新统计并压缩索引大小。该过程不会阻塞业务读写。
    </p>
  </Card>
  <Card className="p-6 border-none shadow-sm rounded-3xl bg-amber-50">
    <h4 className="text-sm font-bold text-amber-600 mb-2 flex items-center gap-2">
      <TriangleAlert className="w-4 h-4" />
      存储配额监控
    </h4>
    <p className="text-xs text-muted-foreground leading-relaxed">
      当前数据库运行于 Supabase 托管环境。请注意单表大小建议不超过 100GB 以保持索引效率。
    </p>
  </Card>
  <Card className="p-6 border-none shadow-sm rounded-3xl bg-blue-50">
    <h4 className="text-sm font-bold text-blue-600 mb-2 flex items-center gap-2">
      <Zap className="w-4 h-4" />
      性能建议
    </h4>
    <p className="text-xs text-muted-foreground leading-relaxed">
      定期执行“全库维护”可清理数据库中的“僵尸行”（Dead Tuples），优化查询性能并释放磁盘空间。
    </p>
  </Card>
</div>

  </div>
</div>
);
}




