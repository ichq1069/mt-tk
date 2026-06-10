import React, { useState, useEffect } from 'react';
import { formatBeijingTime } from '@/lib/utils';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { MediaItem, Profile, StorageConfig, AppNotification, UserFieldConfig, Report, ReportStatus, PermissionGroup, Ad, RedemptionCode, RedemptionLog } from '@/types';
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

export function RedemptionCodesSection() {
const [codes, setCodes] = useState<RedemptionCode[]>([]);
const [logs, setLogs] = useState<RedemptionLog[]>([]);
  const { logAction } = useAdminLogger('redemption');
const [loading, setLoading] = useState(true);
const [loadingLogs, setLoadingLogs] = useState(false);
const [activeTab, setActiveTab] = useState('codes');
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [groups, setGroups] = useState<PermissionGroup[]>([]);
const [logPage, setLogPage] = useState(0);
const [logTotal, setLogTotal] = useState(0);
const logLimit = 15;

const [formData, setFormData] = useState<Partial<RedemptionCode>>({
code: '',
type: 'points',
value: '',
max_uses: 1,
expires_at: ''
});

useEffect(() => {
if (activeTab === 'codes') {
fetchCodes();
} else {
fetchLogs();
}
}, [activeTab, logPage]);

const fetchCodes = async () => {
setLoading(true);
const [{ data: cData }, { data: gData }] = await Promise.all([
api.getRedemptionCodes(),
rbacApi.getPermissionGroups()
]);
// 仅显示积分码和权限码，不显示邀请码
setCodes((cData || []).filter((c: any) => c.type !== 'invite'));
setGroups(gData || []);
setLoading(false);
};

const fetchLogs = async () => {
setLoadingLogs(true);
const { data, total } = await api.getRedemptionLogs(logPage, logLimit);
setLogs(data || []);
setLogTotal(total || 0);
setLoadingLogs(false);
};

const generateRandomCode = () => {
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let result = '';
for (let i = 0; i < 8; i++) {
result += chars.charAt(Math.floor(Math.random() * chars.length));
}
setFormData({ ...formData, code: result });
};

const handleCreate = async () => {
if (!formData.code) return toast.error('请输入或生成兑换码');
if (formData.type !== 'invite' && !formData.value) return toast.error('请输入兑换分值或选择权限组');

try {
const submissionData = {
...formData,
expires_at: formData.expires_at || null
};
const { error } = await api.createRedemptionCode(submissionData);
if (error) throw error;
toast.success('兑换码生成成功');
setIsDialogOpen(false);
fetchCodes();
} catch (e: any) {
toast.error(`生成失败: ${e.message}`);
}
};

const handleDelete = async (id: string) => {
const confirmed = await confirmAsync('确定要作废此兑换码吗？', { variant: 'destructive' });
    if (!confirmed) return;
await api.deleteRedemptionCode(id);
toast.success('已作废');
fetchCodes();
};

return (
<div className="space-y-6 pb-20">
<div className="flex items-center justify-between">
<div>
<h2 className="text-2xl font-black text-foreground">兑换码管理</h2>
<p className="text-sm text-muted-foreground mt-1">生成注册邀请码、积分兑换码或权限升级码</p>
</div>
<Button onClick={() => {
setFormData({ code: '', type: 'points', value: '', max_uses: 1, expires_at: '' });
setIsDialogOpen(true);
}} className="rounded-xl font-bold px-6">
<Key className="w-4 h-4 mr-2" />
生成兑换码
</Button>
</div>

<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
<TabsList className="bg-muted/50 p-1 rounded-xl mb-4">
<TabsTrigger value="codes" className="rounded-lg font-bold">兑换码列表</TabsTrigger>
<TabsTrigger value="logs" className="rounded-lg font-bold">兑换明细记录</TabsTrigger>
</TabsList>

<TabsContent value="codes" className="m-0">
<Card className="border-none shadow-sm rounded-3xl overflow-hidden">
<Table>
<TableHeader className="bg-muted/50">
<TableRow>
<TableHead className="font-bold">兑换码</TableHead>
<TableHead className="font-bold">类型</TableHead>
<TableHead className="font-bold">兑换内容</TableHead>
<TableHead className="font-bold">使用情况</TableHead>
<TableHead className="font-bold">有效期至</TableHead>
<TableHead className="text-right font-bold">操作</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{loading ? (
<TableRow><TableCell colSpan={6} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
) : codes.length === 0 ? (
<TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">暂无兑换码记录</TableCell></TableRow>
) : (
codes.map(code => (
<TableRow key={code.id}>
<TableCell className="font-mono font-bold text-primary">{code.code}</TableCell>
<TableCell>
<Badge variant="secondary" className="rounded-lg">
{code.type === 'invite' ? '邀请注册' : code.type === 'points' ? '积分兑换' : '权限兑换'}
</Badge>
</TableCell>
<TableCell>
{code.type === 'points' ? `${code.value} 积分` : 
code.type === 'group' ? (groups.find(g => g.id === code.value)?.name || '未知权限组') : 
'注册资格'}
</TableCell>
<TableCell>
<div className="flex items-center gap-2">
<div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
<div 
className="h-full bg-primary" 
style={{ width: `${Math.min(100, (code.used_count / code.max_uses) * 100)}%` }} 
/>
</div>
<span className="text-xs text-muted-foreground">{code.used_count}/{code.max_uses}</span>
</div>
</TableCell>
<TableCell className="text-xs text-muted-foreground">
{code.expires_at ? formatBeijingTime(code.expires_at) : '永久有效'}
</TableCell>
<TableCell className="text-right">
<Button variant="ghost" size="sm" className="text-primary mr-2" onClick={() => {
  // 可以点击跳转到该码的详情（此处先简单做成切换到 logs 并提示过滤）
  setActiveTab('logs');
}}>
查看明细
</Button>
<Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(code.id)}>
<Trash2 className="w-4 h-4" />
</Button>
</TableCell>
</TableRow>
))
)}
</TableBody>
</Table>
</Card>
</TabsContent>

<TabsContent value="logs" className="m-0">
<Card className="border-none shadow-sm rounded-3xl overflow-hidden">
<Table>
<TableHeader className="bg-muted/50">
<TableRow>
<TableHead className="font-bold">使用者</TableHead>
<TableHead className="font-bold">兑换码</TableHead>
<TableHead className="font-bold">类型</TableHead>
<TableHead className="font-bold">兑换时间</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{loadingLogs ? (
<TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
) : logs.length === 0 ? (
<TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">暂无兑换记录</TableCell></TableRow>
) : (
logs.map(log => (
<TableRow key={log.id}>
<TableCell>
<div className="flex items-center gap-2">
<div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden shrink-0">
{log.profiles?.avatar_url ? (
<img referrerPolicy="no-referrer" src={log.profiles.avatar_url} alt="" className="w-full h-full object-contain" />
) : (
log.profiles?.username?.charAt(0).toUpperCase() || '?'
)}
</div>
<div className="flex flex-col">
<span className="text-sm font-bold">{log.profiles?.username || '未知用户'}</span>
<span className="text-[10px] text-muted-foreground">{log.user_id}</span>
</div>
</div>
</TableCell>
<TableCell className="font-mono font-bold text-primary">{log.redemption_codes?.code || '已删代码'}</TableCell>
<TableCell>
<Badge variant="outline" className="rounded-lg text-[10px]">
{log.redemption_codes?.type === 'invite' ? '邀请注册' : log.redemption_codes?.type === 'points' ? '积分兑换' : '权限兑换'}
</Badge>
</TableCell>
<TableCell className="text-xs text-muted-foreground">
{formatBeijingTime(log.created_at)}
</TableCell>
</TableRow>
))
)}
</TableBody>
</Table>

{logTotal > logLimit && (
<div className="p-4 border-t flex items-center justify-center gap-4">
<Button 
variant="outline" 
size="sm" 
disabled={logPage === 0}
onClick={() => setLogPage(prev => prev - 1)}
className="rounded-xl"
>
上一页
</Button>
<span className="text-xs font-bold text-muted-foreground">
第 {logPage + 1} 页 / 共 {Math.ceil(logTotal / logLimit)} 页
</span>
<Button 
variant="outline" 
size="sm" 
disabled={(logPage + 1) * logLimit >= logTotal}
onClick={() => setLogPage(prev => prev + 1)}
className="rounded-xl"
>
下一页
</Button>
</div>
)}
</Card>
</TabsContent>
</Tabs>

<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
<DialogContent className="rounded-3xl max-w-md">
<DialogHeader>
<DialogTitle>生成新兑换码</DialogTitle>
<DialogDescription>创建一个新的积分兑换码，设置其价值和使用限制</DialogDescription>
</DialogHeader>
<div className="space-y-4 py-4">
<div className="space-y-2">
<Label>兑换码</Label>
<div className="flex gap-2">
<Input 
placeholder="手动输入或点击生成" 
value={formData.code} 
onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
className="rounded-xl font-mono uppercase"
/>
<Button variant="outline" onClick={generateRandomCode} className="rounded-xl">随机</Button>
</div>
</div>

<div className="space-y-2">
<Label>码类型</Label>
<Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v, value: '' })}>
<SelectTrigger className="rounded-xl">
<SelectValue />
</SelectTrigger>
<SelectContent className="rounded-xl">
<SelectItem value="invite">邀请码 (用于邀请制注册)</SelectItem>
<SelectItem value="points">积分码 (兑换账户积分)</SelectItem>
<SelectItem value="group">权限码 (兑换功能权限组)</SelectItem>
</SelectContent>
</Select>
</div>

{formData.type === 'points' && (
<div className="space-y-2">
<Label>兑换积分值</Label>
<Input 
type="number" 
placeholder="例如：100" 
value={formData.value || ''} 
onChange={e => setFormData({ ...formData, value: e.target.value })}
className="rounded-xl"
/>
</div>
)}

{formData.type === 'group' && (
<div className="space-y-2">
<Label>兑换权限组</Label>
<Select value={formData.value || undefined} onValueChange={v => setFormData({ ...formData, value: v })}>
<SelectTrigger className="rounded-xl">
<SelectValue placeholder="选择目标权限组" />
</SelectTrigger>
<SelectContent className="rounded-xl">
{groups.map(g => (
<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
))}
</SelectContent>
</Select>
</div>
)}

<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label>最大可用次数</Label>
<Input 
type="number" 
value={formData.max_uses} 
onChange={e => setFormData({ ...formData, max_uses: parseInt(e.target.value) || 1 })}
className="rounded-xl"
/>
</div>
<div className="space-y-2">
<Label>过期时间 (可选)</Label>
<Input 
type="datetime-local" 
value={formData.expires_at || ''} 
onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
className="rounded-xl"
/>
</div>
</div>
</div>
<DialogFooter>
<Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">取消</Button>
<Button onClick={handleCreate} className="rounded-xl px-8 font-bold">立即生成</Button>
</DialogFooter>
</DialogContent>
</Dialog>
</div>
);
}

// ==================== 数据库管理 Section ====================
