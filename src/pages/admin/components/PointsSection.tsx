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
import { EnhancedPagination } from '@/components/common/EnhancedPagination';
import { MediaPreview } from "@/components/MediaPreview";
import { 
  LayoutDashboard, FileCheck, Users as UsersIcon, Settings, Heart, ThumbsDown, Loader2, X, Edit2, Trash, 
  Archive, CircleArrowUp, CheckSquare, Square, CirclePlay, Video, Search, Edit3, Ban, UserCheck, 
  Mail, Calendar, Cloud, Save, LogOut, Share, Download, Database as DatabaseIcon, Monitor, 
  Image as ImageIcon, Filter, RefreshCcw, ListFilter, CircleCheckBig, Circle, MousePointer2, Trash2, 
  ArrowUp, ArrowDown, BarChart3, PieChart as PieChartIcon, TrendingUp, Activity, Users2, ShieldAlert, 
  Trophy, Crown, Flame, FileCode2, Server, Globe, Database, Key, Shield, Rocket, Terminal, 
  ExternalLink, Settings2, Info, TriangleAlert, Play, Bell, Eye, CalendarCheck, UserPlus
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { useAdminLogger } from '@/hooks/useAdminLogger';

import { RedemptionCodesSection } from './RedemptionCodesSection';

import { useKeywordReplacement } from '@/contexts/KeywordReplacementContext';
import { SystemText } from '@/components/common/KeywordText';

function PointsLogicConfig() {
  const { replaceSystem } = useKeywordReplacement();
  const [logic, setLogic] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLogic();
  }, []);

  const fetchLogic = async () => {
    const { data } = await api.getPointsLogic();
    if (data?.value) setLogic(data.value);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await api.updatePointsLogic(logic);
      if (error) throw error;
      toast.success('配置已保存');
    } catch (e: any) {
      toast.error('保存失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (action: string, field: string, value: any) => {
    setLogic((prev: any) => {
      const prevAction = prev?.[action] || {};
      return {
        ...prev,
        [action]: {
          ...prevAction,
          [field]: value
        }
      };
    });
  };

  if (loading) return <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const actions = [
    { key: 'image_publish', name: '发布图片', icon: ImageIcon },
    { key: 'video_publish', name: '发布视频', icon: Video },
    { key: 'favorite', name: '作品收藏', icon: Heart },
    { key: 'comment', name: '发表评论', icon: Edit3 },
    { key: 'report', name: '有效举报', icon: ShieldAlert },
    { key: 'daily_login', name: '每日登录', icon: LayoutDashboard },
    { key: 'invite_friend', name: '邀请好友', icon: UserPlus },
    { key: 'publish_work_daily', name: '每日发布作品任务', icon: Cloud },
    { key: 'publish_milestone_favorite', name: '作品里程碑 (100 收藏)', icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {actions.map((action) => (
          <Card key={action.key} className="border-none shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <action.icon className="w-4 h-4 text-primary" />
                {action.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">奖励积分</Label>
                  <Input 
                    type="number" 
                    value={logic?.[action.key]?.points || 0} 
                    onChange={e => handleChange(action.key, 'points', parseInt(e.target.value) || 0)}
                    className="rounded-xl h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">奖励{replaceSystem('成长值')} (EXP)</Label>
                  <Input 
                    type="number" 
                    value={logic?.[action.key]?.exp || 0} 
                    onChange={e => handleChange(action.key, 'exp', parseInt(e.target.value) || 0)}
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">限制次数</Label>
                  <Input 
                    type="number" 
                    value={logic?.[action.key]?.limit || 0} 
                    onChange={e => handleChange(action.key, 'limit', parseInt(e.target.value) || 0)}
                    className="rounded-xl h-10"
                  />
                  <p className="text-[10px] text-muted-foreground ml-1">0 表示无限制</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">限制周期 (天)</Label>
                  <Input 
                    type="number" 
                    value={logic?.[action.key]?.period || 1} 
                    onChange={e => handleChange(action.key, 'period', parseInt(e.target.value) || 1)}
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving} className="rounded-xl px-10 font-black shadow-lg shadow-primary/20">
          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          保存逻辑配置
        </Button>
      </div>
    </div>
  );
}

export function PointsSection() {
  const { logAction } = useAdminLogger('points');
  const [activeTab, setActiveTab] = useState('logs');
const [logs, setLogs] = useState<any[]>([]);
const [loading, setLoading] = useState(false);
const [page, setPage] = useState(0);
const [total, setTotal] = useState(0);
const [config, setConfig] = useState<StorageConfig | null>(null);
const [saving, setSaving] = useState(false);
const limit = 20;

useEffect(() => {
fetchConfig();
}, []);

const fetchConfig = async () => {
const { data } = await api.getStorageConfig();
if (data) setConfig(data);
};

const fetchLogs = async () => {
setLoading(true);
try {
const { data, total: t, error } = await api.getAllPointsLogs(page, limit);
if (error) throw error;
setLogs(Array.isArray(data) ? data : []);
setTotal(t || 0);
} catch (e: any) {
toast.error('获取积分日志失败: ' + e.message);
} finally {
setLoading(false);
}
};

useEffect(() => {
if (activeTab === 'logs') fetchLogs();
}, [activeTab, page]);

const handleSaveConfig = async () => {
if (!config) return;
setSaving(true);
try {
const { error } = await api.upsertStorageConfig(config);
if (error) throw error;
toast.success('配置已保存');
} catch (e: any) {
toast.error('保存失败: ' + e.message);
} finally {
setSaving(false);
}
};

return (
<div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
<div className="flex items-center justify-between">
<div>
<h2 className="text-2xl font-black text-foreground">积分管理</h2>
<p className="text-sm text-muted-foreground mt-1">管理用户积分获取规则与全站变动明细</p>
</div>
</div>

<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
<TabsList className="bg-muted/50 p-1 rounded-xl">
<TabsTrigger value="logs" className="rounded-lg px-6 font-bold">积分明细</TabsTrigger>
<TabsTrigger value="tasks" className="rounded-lg px-6 font-bold">奖励配置</TabsTrigger>
<TabsTrigger value="logic" className="rounded-lg px-6 font-bold">逻辑设置</TabsTrigger>
<TabsTrigger value="codes" className="rounded-lg px-6 font-bold">兑换码管理</TabsTrigger>
</TabsList>

<TabsContent value="logic" className="pt-4">
<PointsLogicConfig />
</TabsContent>

<TabsContent value="codes" className="pt-4">
<RedemptionCodesSection />
</TabsContent>

<TabsContent value="logs" className="pt-4">
<Card className="border-none shadow-sm rounded-3xl overflow-hidden">
{loading ? (
<div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
) : logs.length === 0 ? (
<div className="py-20 text-center text-muted-foreground">暂无积分变动记录</div>
) : (
<>
<div className="overflow-x-auto">
<Table>
<TableHeader className="bg-muted/30">
<TableRow>
<TableHead className="w-[180px]">变动时间</TableHead>
<TableHead>用户</TableHead>
<TableHead>变动额度</TableHead>
<TableHead>变更原因</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{logs.map((log) => (
<TableRow key={log.id}>
<TableCell className="text-muted-foreground text-xs">
{formatBeijingTime(log.created_at)}
</TableCell>
<TableCell className="font-medium text-foreground">
{log.profiles?.username || '未知用户'}
</TableCell>
<TableCell>
<span className={cn(
"font-black",
log.amount > 0 ? "text-green-500" : "text-red-500"
)}>
{log.amount > 0 ? '+' : ''}{log.amount}
</span>
</TableCell>
<TableCell className="text-muted-foreground text-sm">
  <SystemText>{log.reason || '积分变动'}</SystemText>
</TableCell>
</TableRow>
))}
</TableBody>
</Table>
</div>
  {total > limit && (
    <EnhancedPagination
      currentPage={page}
      totalPages={Math.ceil(total / limit)}
      onPageChange={setPage}
      pageSize={limit}
      onPageSizeChange={() => {}}
      totalItems={total}
      showPageSizeSelector={false}
      className="bg-transparent border-none p-4"
    />
  )}
</>
)}
</Card>
</TabsContent>

<TabsContent value="tasks" className="pt-4">
<div className="space-y-4">
  <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
    <CardHeader className="bg-muted/30">
      <CardTitle className="text-sm font-bold flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        基础任务 (每日刷新)
      </CardTitle>
      <CardDescription className="text-[10px]">这些任务已在「逻辑设置」中配置，每日自动刷新</CardDescription>
    </CardHeader>
    <CardContent className="p-4 space-y-3 pt-6">
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><LayoutDashboard className="w-5 h-5" /></div>
          <div>
            <div className="font-bold text-sm">每日登录</div>
            <div className="text-[10px] text-muted-foreground">登录即可自动完成</div>
          </div>
        </div>
        <Badge className="bg-primary/20 text-primary border-none text-[10px] rounded-lg">已配置</Badge>
      </div>
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"><Cloud className="w-5 h-5" /></div>
          <div>
            <div className="font-bold text-sm">每日发布作品任务</div>
            <div className="text-[10px] text-muted-foreground">每天成功发布一篇并通过审核</div>
          </div>
        </div>
        <Badge className="bg-primary/20 text-primary border-none text-[10px] rounded-lg">已配置</Badge>
      </div>
    </CardContent>
  </Card>

  <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
    <CardHeader className="bg-muted/30">
      <CardTitle className="text-sm font-bold flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-500" />
        进阶任务
      </CardTitle>
      <CardDescription className="text-[10px]">这些任务已在「逻辑设置」中配置，达成条件后自动触发</CardDescription>
    </CardHeader>
    <CardContent className="p-4 space-y-3 pt-6">
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><Heart className="w-5 h-5" /></div>
          <div>
            <div className="font-bold text-sm">作品里程碑 (100 收藏)</div>
            <div className="text-[10px] text-muted-foreground">单篇作品获得 100 次以上收藏</div>
          </div>
        </div>
        <Badge className="bg-primary/20 text-primary border-none text-[10px] rounded-lg">已配置</Badge>
      </div>
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><UserPlus className="w-5 h-5" /></div>
          <div>
            <div className="font-bold text-sm">邀请好友</div>
            <div className="text-[10px] text-muted-foreground">每邀请一位好友注册</div>
          </div>
        </div>
        <Badge className="bg-primary/20 text-primary border-none text-[10px] rounded-lg">已配置</Badge>
      </div>
    </CardContent>
  </Card>

  <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
    <div className="flex items-start gap-3">
      <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
      <div className="space-y-1">
        <div className="font-bold text-sm">配置说明</div>
        <div className="text-[10px] text-muted-foreground leading-relaxed">
          所有任务的积分与成长值奖励均可在「逻辑设置」标签页中进行配置。系统会根据您的配置自动触发奖励发放，无需额外开发。
        </div>
      </div>
    </div>
  </div>
</div>
</TabsContent>
</Tabs>
</div>
);
}

