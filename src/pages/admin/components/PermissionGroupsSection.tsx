
import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
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
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { useAdminLogger } from '@/hooks/useAdminLogger';

export function PermissionGroupsSection() {
const [groups, setGroups] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
  const { logAction } = useAdminLogger('permissions');
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [editingGroup, setEditingGroup] = useState<any>(null);
const [formData, setFormData] = useState({ name: '', description: '', permissions: [] as string[] });

const permissionOptions = [
{ id: 'upload', label: '文件上传', desc: '允许用户从本地上传图片或视频' },
{ id: 'link_import', label: '链接导入', desc: '允许用户通过 URL 链接导入内容' },
{ id: 'remove_watermark', label: '去除水印', desc: '允许该用户在预览时隐藏全站水印' },
{ id: 'admin_dashboard', label: '查看看板', desc: '允许进入管理后台并查看统计数据' },
{ id: 'admin_ranking', label: '收藏排行', desc: '允许查看媒体内容的收藏与浏览排行榜' },
{ id: 'admin_datacenter', label: '数据中心', desc: '允许查看高级数据分析图表' },
{ id: 'admin_audit', label: '内容审核', desc: '允许对待审核内容进行上架/驳回/下架操作' },
{ id: 'admin_reports', label: '举报管理', desc: '允许查看并处理用户提交的违规举报' },
{ id: 'admin_library', label: '媒体库管理', desc: '允许管理全站已发布的媒体内容' },
{ id: 'admin_points', label: '积分管理', desc: '允许管理积分配置与明细' },
{ id: 'admin_users', label: '用户与权限', desc: '允许管理用户信息与分配功能权限组' },
{ id: 'admin_userfields', label: '用户字段', desc: '允许管理用户自定义字段设置' },
{ id: 'admin_notifications', label: '通知模板', desc: '允许管理系统通知模板' },
{ id: 'admin_storage', label: '系统设置', desc: '允许修改存储桶与全局系统配置' },
{ id: 'admin_ads', label: '广告管理', desc: '允许管理开屏、弹窗、瀑布流广告' },
{ id: 'admin_invites', label: '邀请管理', desc: '允许管理系统生成的邀请码与绑定权限' },
{ id: 'admin_network', label: '关系网络', desc: '允许查看全站用户的邀请层级与裂变网络' },
{ id: 'admin_codes', label: '兑换码管理', desc: '允许生成注册/积分/权限兑换码' },
{ id: 'admin_db', label: '数据库管理', desc: '允许查看数据库表状态及手动优化' },
{ id: 'admin_categories', label: '内容类型管理', desc: '允许管理系统中的图片和视频分类' },
{ id: 'admin_tags', label: '标签管理', desc: '允许管理媒体内容的标签与分类' },
{ id: 'content_classification', label: '极速分类', desc: '允许通过极速分类界面快速对内容进行归类' },
{ id: 'album_browse', label: '图集浏览', desc: '允许在前端查看图集写真内容' },
{ id: 'album_level_pt', label: '写真-普通级', desc: '允许查看标记为普通级(pt)的写真内容' },
{ id: 'album_level_vip', label: '写真-非限制级(VIP)', desc: '允许查看标记为非限制级(vip)的写真内容' },
{ id: 'album_level_svip', label: '写真-非限制级(SVIP)', desc: '允许查看标记为非限制级(svip)的写真内容' },
{ id: 'album_level_vvip', label: '写真-限制级(VVIP)', desc: '允许查看标记为限制级(vvip)的写真内容' },
{ id: 'album_download', label: '图集下载', desc: '允许打包下载图集内容' },
];

useEffect(() => {
fetchGroups();
}, []);

const fetchGroups = async () => {
setLoading(true);
const { data } = await rbacApi.getPermissionGroups();
setGroups(data || []);
setLoading(false);
};

const handleOpenDialog = (group: any = null) => {
if (group) {
setEditingGroup(group);
setFormData({ 
name: group.name, 
description: group.description || '', 
permissions: group.permissions || [] 
});
} else {
setEditingGroup(null);
setFormData({ name: '', description: '', permissions: ['upload', 'link_import'] });
}
setIsDialogOpen(true);
};

const handleSave = async () => {
if (!formData.name.trim()) return toast.error('请输入权限组名称');

try {
if (editingGroup) {
await rbacApi.updatePermissionGroup(editingGroup.id, formData);
toast.success('更新成功');
} else {
await rbacApi.createPermissionGroup(formData);
toast.success('创建成功');
}
setIsDialogOpen(false);
fetchGroups();
} catch (e: any) {
toast.error('操作失败: ' + e.message);
}
};

const handleDelete = async (id: string) => {
const confirmed = await confirmAsync('确定要删除此权限组吗？相关用户将失去权限。', { variant: 'destructive' });
    if (!confirmed) return;
await rbacApi.deletePermissionGroup(id);
toast.success('已删除');
fetchGroups();
};

const handleSetDefault = async (id: string) => {
await rbacApi.setDefaultGroup(id);
toast.success('已设为默认组');
fetchGroups();
};

const togglePermission = (permId: string) => {
  setFormData(prev => {
    let newPermissions = [...prev.permissions];
    const isCurrentlySelected = newPermissions.includes(permId);

    if (isCurrentlySelected) {
      newPermissions = newPermissions.filter(p => p !== permId);
      
      // 如果取消了图集浏览，也取消所有相关级别
      if (permId === 'album_browse') {
        newPermissions = newPermissions.filter(p => !p.startsWith('album_level_'));
      }
      
      // 向下兼容的取消逻辑
      if (permId === 'album_level_pt') {
        newPermissions = newPermissions.filter(p => !p.startsWith('album_level_') && p !== 'album_browse');
      } else if (permId === 'album_level_vip') {
        newPermissions = newPermissions.filter(p => p !== 'album_level_svip' && p !== 'album_level_vvip');
      } else if (permId === 'album_level_svip') {
        newPermissions = newPermissions.filter(p => p !== 'album_level_vvip');
      }

      // 如果没有任何级别了，取消图集浏览
      if (newPermissions.includes('album_browse') && !newPermissions.some(p => p.startsWith('album_level_'))) {
        newPermissions = newPermissions.filter(p => p !== 'album_browse');
      }
    } else {
      newPermissions.push(permId);
      
      // 如果开启了图集浏览，默认开启普通级
      if (permId === 'album_browse') {
        if (!newPermissions.includes('album_level_pt')) {
          newPermissions.push('album_level_pt');
        }
      }
      
      // 如果开启了某个级别，确保开启了图集浏览
      if (permId.startsWith('album_level_')) {
        if (!newPermissions.includes('album_browse')) {
          newPermissions.push('album_browse');
        }
        
        // 向下兼容逻辑
        if (permId === 'album_level_vvip') {
          if (!newPermissions.includes('album_level_svip')) newPermissions.push('album_level_svip');
          if (!newPermissions.includes('album_level_vip')) newPermissions.push('album_level_vip');
          if (!newPermissions.includes('album_level_pt')) newPermissions.push('album_level_pt');
        } else if (permId === 'album_level_svip') {
          if (!newPermissions.includes('album_level_vip')) newPermissions.push('album_level_vip');
          if (!newPermissions.includes('album_level_pt')) newPermissions.push('album_level_pt');
        } else if (permId === 'album_level_vip') {
          if (!newPermissions.includes('album_level_pt')) newPermissions.push('album_level_pt');
        }
      }
    }

    return { ...prev, permissions: Array.from(new Set(newPermissions)) };
  });
};

if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

return (
<div className="space-y-6">
<div className="flex items-center justify-between">
<div>
<h3 className="text-lg font-bold">权限组管理</h3>
<p className="text-sm text-muted-foreground">定义不同的权限等级，分配给不同类型的用户</p>
</div>
<Button onClick={() => handleOpenDialog()} className="rounded-xl font-bold">
<Users2 className="w-4 h-4 mr-2" />
创建权限组
</Button>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
{groups.map((group) => (
<Card key={group.id} className={cn("border-none shadow-sm rounded-2xl relative overflow-hidden", group.is_default && "ring-2 ring-primary")}>
{group.is_default && (
<div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">
默认组
</div>
)}
<CardHeader>
<CardTitle className="text-base">{group.name}</CardTitle>
<CardDescription className="line-clamp-1">{group.description || '暂无描述'}</CardDescription>
</CardHeader>
<CardContent className="space-y-4">
<div className="flex flex-wrap gap-2">
{(group.permissions || []).map((p: string) => (
<Badge key={p} variant="secondary" className="rounded-lg text-[10px]">
{permissionOptions.find(opt => opt.id === p)?.label || p}
</Badge>
))}
{(group.permissions || []).length === 0 && <span className="text-xs text-muted-foreground italic">无任何权限</span>}
</div>

<div className="flex items-center gap-2 pt-2">
<Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs h-8" onClick={() => handleOpenDialog(group)}>
<Edit2 className="w-3 h-3 mr-1" />
编辑
</Button>
{!group.is_default && (
<>
<Button variant="outline" size="sm" className="flex-1 rounded-lg text-xs h-8" onClick={() => handleSetDefault(group.id)}>
设为默认组
</Button>
<Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(group.id)}>
<Trash2 className="w-4 h-4" />
</Button>
</>
)}
</div>
</CardContent>
</Card>
))}
</div>

<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
<DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
<DialogHeader className="p-6 pb-2">
<DialogTitle>{editingGroup ? '编辑权限组' : '创建权限组'}</DialogTitle>
<DialogDescription>设置权限组的名称、描述及其包含的具体权限项</DialogDescription>
</DialogHeader>
<ScrollArea className="flex-1 px-6">
<div className="space-y-4 py-4">
<div className="space-y-2">
<Label>组名称</Label>
<Input 
placeholder="例如：高级用户、VIP" 
value={formData.name} 
onChange={e => setFormData({...formData, name: e.target.value})}
className="rounded-xl"
/>
</div>
<div className="space-y-2">
<Label>描述</Label>
<Textarea 
placeholder="该组的权限范围说明..." 
value={formData.description} 
onChange={e => setFormData({...formData, description: e.target.value})}
className="rounded-xl resize-none"
rows={2}
/>
</div>
<div className="space-y-3">
<Label className="flex items-center justify-between">
<span>勾选权限点</span>
<span className="text-[10px] text-muted-foreground font-normal">支持上下滑动查看更多</span>
</Label>
<ScrollArea className="h-[360px] pr-3 -mr-3">
<div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
{permissionOptions.map((opt) => {
  if (opt.id.startsWith('album_level_') && !formData.permissions.includes('album_browse')) {
    return null;
  }
  return (
<div 
key={opt.id} 
className={cn(
"flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer",
formData.permissions.includes(opt.id) ? "bg-primary/5 border-primary" : "border-border/60 hover:border-border"
)}
onClick={(e) => {
e.preventDefault();
togglePermission(opt.id);
}}
>
<div className="pt-0.5 pointer-events-none">
<Checkbox checked={formData.permissions.includes(opt.id)} />
</div>
<div className="space-y-0.5 pointer-events-none">
<p className="text-sm font-bold leading-none">{opt.label}</p>
<p className="text-xs text-muted-foreground line-clamp-2">{opt.desc}</p>
</div>
</div>
)})}
</div>
</ScrollArea>
</div>
</div>
</ScrollArea>
<DialogFooter className="p-6 pt-2 border-t mt-auto">
<Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">取消</Button>
<Button onClick={handleSave} className="rounded-xl px-8 font-bold">确定保存</Button>
</DialogFooter>
</DialogContent>
</Dialog>
</div>
);
}



// ==================== 广告管理 Section ====================
