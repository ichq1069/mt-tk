import React, { useState, useEffect } from 'react';
import { cn, formatBeijingTime } from '@/lib/utils';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { MediaItem, Profile, StorageConfig, AppNotification, UserFieldConfig, Report, ReportStatus, PermissionGroup, Ad, RedemptionCode, NotificationTemplate } from '@/types';
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

export function NotificationsSection() {
const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const { logAction } = useAdminLogger('notifications');
const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
const [loading, setLoading] = useState(true);
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
const [users, setUsers] = useState<Profile[]>([]);
const [groups, setGroups] = useState<any[]>([]);
const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
const [isSending, setIsSending] = useState(false);
const [userSearch, setUserSearch] = useState('');
const [mediaSearch, setMediaSearch] = useState('');
const [filterType, setFilterType] = useState('all');
const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
const [templateFormData, setTemplateFormData] = useState({
  name: '',
  category: 'system',
  title_template: '',
  content_template: '',
  variables: [] as string[]
});
const [formData, setFormData] = useState({
target_type: 'all', // all, role, user
user_id: '',
role_id: '',
title: '',
content: '',
type: 'system',
link: '',
link_type: 'internal',
channel: 'all' as 'in_app' | 'email' | 'all'
});

useEffect(() => {
fetchData();
}, []);

const fetchData = async () => {
setLoading(true);
try {
const [{ data: notes }, { data: profiles }, { data: permGroups }, { data: templateData }] = await Promise.all([
api.getNotifications(undefined, true), // 管理员查询全部
api.getAllProfiles(0, 1000),
rbacApi.getPermissionGroups(),
api.getNotificationTemplates()
]);
setNotifications(notes || []);
setUsers(profiles || []);
setGroups(permGroups || []);
setTemplates(templateData || []);
} catch (e) {
toast.error('获取数据失败');
} finally {
setLoading(false);
}
};

const searchMedia = async (query: string) => {
if (!query) {
setMediaItems([]);
return;
}
try {
const { data } = await api.getMediaLibrary(0, 20, query, 'approved');
setMediaItems(data || []);
} catch (e) {
console.error(e);
}
};

const handleSend = async () => {
if (!formData.title || !formData.content) {
return toast.error('请填写标题和内容');
}

setIsSending(true);
try {
const newNotification: any = {
user_id: formData.target_type === 'user' ? formData.user_id : null,
role_id: formData.target_type === 'role' ? formData.role_id : null,
title: formData.title,
content: formData.content,
type: formData.type as any,
link: formData.link || null,
link_type: formData.link_type as any,
channel: formData.channel
};
const { error } = await api.createNotification(newNotification);
if (error) throw error;
toast.success('通知已发送');
setIsDialogOpen(false);
fetchData();
setFormData({ target_type: 'all', user_id: '', role_id: '', title: '', content: '', type: 'system', link: '', link_type: 'internal', channel: 'all' });
setSelectedTemplateId('');
} catch (e: any) {
toast.error(`发送失败: ${e.message}`);
} finally {
setIsSending(false);
}
};

  const [lastFocusedInput, setLastFocusedInput] = useState<'title' | 'content'>('content');

  const insertVariable = (variable: string) => {
    const textToInsert = `{${variable}}`;
    if (lastFocusedInput === 'title') {
      setTemplateFormData({
        ...templateFormData,
        title_template: templateFormData.title_template + textToInsert
      });
    } else {
      setTemplateFormData({
        ...templateFormData,
        content_template: templateFormData.content_template + textToInsert
      });
    }
  };

  const availableVariables = [
    { name: 'username', label: '用户名' },
    { name: 'points', label: '积分' },
    { name: 'title', label: '作品标题' },
    { name: 'reason', label: '理由/备注' },
    { name: 'time', label: '当前时间' },
    { name: 'amount', label: '变动数量' }
  ];

const handleTemplateSelect = (templateId: string) => {
  const template = templates.find(t => t.id === templateId);
  if (!template) return;
  
  let targetUser = users.find(u => u.id === formData.user_id);
  
  const replacements = {
    username: targetUser?.username || '用户',
    title: '作品标题',
    reason: '内容违规',
    amount: '10',
    time: formatBeijingTime(),
    duration: '2小时'
  };

  const processTemplate = (text: string) => {
    return text.replace(/\{(\w+)\}/g, (_, key) => replacements[key as keyof typeof replacements] || `{${key}}`);
  };

  setFormData({
    ...formData,
    title: processTemplate(template.title_template),
    content: processTemplate(template.content_template),
    type: template.category as any
  });
  setSelectedTemplateId(templateId);
};

const handleDelete = async (id: string) => {
const confirmed = await confirmAsync('确定要删除这条通知吗？', { variant: 'destructive' });
    if (!confirmed) return;
try {
const { error } = await api.deleteNotification(id);
if (error) throw error;
toast.success('已删除');
setNotifications(prev => prev.filter(n => n.id !== id));
} catch (e: any) {
toast.error(`删除失败: ${e.message}`);
}
};

const handleEditTemplate = (template: NotificationTemplate) => {
  setEditingTemplate(template);
  setTemplateFormData({
    name: template.name,
    category: template.category,
    title_template: template.title_template,
    content_template: template.content_template,
    variables: template.variables || []
  });
  setIsTemplateDialogOpen(true);
  logAction('打开编辑通知模板', { template: template.name });
};

const handleDeleteTemplate = async (templateId: string, templateName: string) => {
  const confirmed = await confirmAsync(`确定要删除模板"${templateName}"吗？`, { variant: 'destructive' });
    if (!confirmed) return;
  try {
    const { error } = await (supabase as any)
      .from('notification_templates')
      .delete()
      .eq('id', templateId);
    
    if (error) throw error;
    
    toast.success('模板已删除');
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    logAction('删除通知模板', { template: templateName });
  } catch (e: any) {
    toast.error(`删除失败: ${e.message}`);
  }
};

const handleSaveTemplate = async () => {
  if (!templateFormData.name || !templateFormData.title_template || !templateFormData.content_template) {
    toast.error('请填写完整信息');
    return;
  }

  try {
    if (editingTemplate) {
      // 更新现有模板
      const { error } = await (supabase as any)
        .from('notification_templates')
        .update({
          name: templateFormData.name,
          category: templateFormData.category,
          title_template: templateFormData.title_template,
          content_template: templateFormData.content_template
        })
        .eq('id', editingTemplate.id);
      
      if (error) throw error;
      
      toast.success('模板已更新');
      logAction('更新通知模板', { template: templateFormData.name });
    } else {
      // 创建新模板
      const { error } = await (supabase as any)
        .from('notification_templates')
        .insert({
          name: templateFormData.name,
          category: templateFormData.category,
          title_template: templateFormData.title_template,
          content_template: templateFormData.content_template
        });
      
      if (error) throw error;
      
      toast.success('模板已创建');
      logAction('创建通知模板', { template: templateFormData.name });
    }
    
    // 重新获取模板列表
    const { data: templateData } = await api.getNotificationTemplates();
    setTemplates(templateData || []);
    
    // 关闭对话框并重置表单
    setIsTemplateDialogOpen(false);
    setEditingTemplate(null);
    setTemplateFormData({
      name: '',
      category: 'system',
      title_template: '',
      content_template: '',
      variables: []
    });
  } catch (e: any) {
    toast.error(`保存失败: ${e.message}`);
  }
};

const handleCreateNewTemplate = () => {
  setEditingTemplate(null);
  setTemplateFormData({
    name: '',
    category: 'system',
    title_template: '',
    content_template: '',
    variables: []
  });
  setIsTemplateDialogOpen(true);
  logAction('打开创建通知模板');
};

const filteredNotifications = notifications.filter(note => {
if (filterType === 'all') return true;
return note.type === filterType;
});

const getNotificationTypeLabel = (type: string) => {
switch (type) {
case 'system': return '系统通知';
case 'audit': return '审核通知';
case 'reward': return '奖励通知';
case 'report': return '举报通知';
default: return type;
}
};

const filteredUsers = users.filter(u => 
u.username.toLowerCase().includes(userSearch.toLowerCase()) || 
u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
u.notes?.toLowerCase().includes(userSearch.toLowerCase())
);

const internalLinks = [
  { value: '/', label: '首页 / 探索' },
  { value: '/profile', label: '个人中心 - 全部' },
  { value: '/profile?tab=approved', label: '个人中心 - 已通过' },
  { value: '/profile?tab=rejected', label: '个人中心 - 被拒绝' },
  { value: '/profile?tab=pending', label: '个人中心 - 审核中' },
  { value: '/profile?tab=archived', label: '个人中心 - 已下架' },
  { value: '/upload', label: '作品发布页' },
  { value: '/notifications', label: '我的消息' },
  { value: '/daily-gallery', label: '每日图集' },
  { value: '/guides', label: '文档管理 / 帮助中心' },
  { value: '/check-in', label: '签到中心' },
  { value: '/points', label: '积分明细' },
  { value: '/fast-organize', label: '极速整理' },
];

return (
<div className="space-y-6">
<div className="flex items-center justify-between">
<div>
<h2 className="text-2xl font-black">通知管理</h2>
<p className="text-sm text-muted-foreground mt-1">给全站、权限组或特定用户发送系统通知</p>
</div>
<div className="flex items-center gap-3">
<Select value={filterType} onValueChange={setFilterType}>
<SelectTrigger className="w-[140px] rounded-xl h-11 border-border/40 bg-card/50 font-bold backdrop-blur-md shadow-sm">
<Filter className="w-4 h-4 mr-2" />
<SelectValue placeholder="筛选类型" />
</SelectTrigger>
<SelectContent className="rounded-2xl border-none shadow-xl">
<SelectItem value="all" className="py-2.5">全部通知</SelectItem>
<SelectItem value="system" className="py-2.5">系统通知</SelectItem>
<SelectItem value="audit" className="py-2.5">审核通知</SelectItem>
<SelectItem value="reward" className="py-2.5">奖励通知</SelectItem>
<SelectItem value="report" className="py-2.5">举报通知</SelectItem>
</SelectContent>
</Select>
<Button onClick={() => setIsDialogOpen(true)} className="rounded-xl font-bold px-6 h-11 shadow-lg shadow-primary/20">
<Bell className="w-4 h-4 mr-2" />
发布新通知
</Button>
</div>
</div>

        <Tabs defaultValue="list" className="w-full">
    <TabsList className="bg-muted/50 p-1 rounded-2xl mb-4 h-11">
      <TabsTrigger value="list" className="rounded-xl px-6 font-bold h-9">通知列表</TabsTrigger>
      <TabsTrigger value="templates" className="rounded-xl px-6 font-bold h-9">模板管理</TabsTrigger>
    </TabsList>

    <TabsContent value="list" className="space-y-4">
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent border-border/40">
              <TableHead className="w-[300px] h-12">标题/内容</TableHead>
              <TableHead>接收者/渠道</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>时间</TableHead>
              <TableHead className="text-right pr-6">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredNotifications.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-medium">暂无通知记录</TableCell></TableRow>
            ) : filteredNotifications.map((note) => (
              <TableRow key={note.id} className="border-border/40 hover:bg-muted/10 transition-colors">
                <TableCell>
                  <div className="flex flex-col gap-1 py-1">
                    <span className="font-bold text-sm text-foreground">{note.title}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">{note.content}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {note.user_id ? (
                        <span className="text-xs font-medium">
                          {users.find(u => u.id === note.user_id)?.username || '指定用户'}
                        </span>
                      ) : note.role_id ? (
                        <Badge className="rounded-lg bg-amber-500/10 text-amber-600 border-none text-[10px] font-bold px-2 py-0.5">
                          {groups.find(g => g.id === note.role_id)?.name || '权限组'}
                        </Badge>
                      ) : (
                        <Badge className="rounded-lg bg-primary/10 text-primary border-none text-[10px] font-bold px-2 py-0.5">全站广播</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-60">
                      {note.channel === 'email' ? <Mail className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                      <span className="text-[9px] uppercase font-bold">{note.channel || 'all'}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="rounded-lg text-[10px] uppercase font-bold border-border/60">
                    {getNotificationTypeLabel(note.type)}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">
                  {formatBeijingTime(note.created_at)}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => handleDelete(note.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </TabsContent>

    <TabsContent value="templates" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <Card key={template.id} className="rounded-3xl border-border/40 shadow-sm overflow-hidden group hover:border-primary/30 transition-all bg-card/50 backdrop-blur-md">
            <CardHeader className="p-5 pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="rounded-lg text-[9px] uppercase font-bold bg-muted/50">{template.category}</Badge>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary" onClick={() => handleEditTemplate(template)}><Edit3 className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500" onClick={() => handleDeleteTemplate(template.id, template.name)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <CardTitle className="text-sm font-black mt-2">{template.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">
              <div className="space-y-1 mt-2">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">标题模板</p>
                <p className="text-xs font-bold truncate bg-muted/30 p-2 rounded-lg">{template.title_template}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">内容模板</p>
                <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed bg-muted/30 p-2 rounded-lg min-h-[60px]">{template.content_template}</p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1">
                {['{username}', '{title}', '{reason}', '{amount}'].map(v => (
                  <span key={v} className="text-[8px] px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground">{v}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" className="h-auto min-h-[180px] rounded-3xl border-dashed border-2 hover:bg-muted/30 border-border/60 flex flex-col gap-3 group" onClick={handleCreateNewTemplate}>
          <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
            <Bell className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-muted-foreground group-hover:text-primary transition-colors">创建新模板</span>
        </Button>
      </div>
    </TabsContent>
  </Tabs>

<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
<DialogContent className="rounded-3xl max-w-2xl p-0 overflow-hidden border-none shadow-2xl flex flex-col max-h-[90vh]">
<DialogHeader className="p-8 pb-4 bg-muted/30 border-b">
<DialogTitle className="text-xl font-black flex items-center gap-2">
<Bell className="w-6 h-6 text-primary" />
发布系统通知
</DialogTitle>
<DialogDescription className="text-muted-foreground font-medium">向指定对象发送通知，支持模板快速填写和渠道选择</DialogDescription>
</DialogHeader>
<ScrollArea className="flex-1">
<div className="p-8 pt-4 space-y-5">
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">通知模板</Label>
      <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
        <SelectTrigger className="rounded-2xl h-11 border-border/60 bg-muted/10 font-bold">
          <SelectValue placeholder="选择快速模板" />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-none shadow-xl">
          {templates.map(t => (
            <SelectItem key={t.id} value={t.id} className="py-3 font-medium">{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">发送渠道</Label>
      <Select value={formData.channel} onValueChange={val => setFormData({...formData, channel: val as any})}>
        <SelectTrigger className="rounded-2xl h-11 border-border/60 bg-muted/10 font-bold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-none shadow-xl">
          <SelectItem value="all" className="py-3 font-medium">站内 + 邮件</SelectItem>
          <SelectItem value="in_app" className="py-3 font-medium">仅站内通知</SelectItem>
          <SelectItem value="email" className="py-3 font-medium">仅邮件通知</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
<div className="space-y-2">
<Label className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">通知对象</Label>
<Select value={formData.target_type} onValueChange={val => setFormData({...formData, target_type: val, user_id: '', role_id: ''})}>
<SelectTrigger className="rounded-2xl h-11 border-border/60 bg-muted/10 font-bold"><SelectValue /></SelectTrigger>
<SelectContent className="rounded-2xl border-none shadow-xl">
<SelectItem value="all" className="font-bold py-3">全站广播 (所有用户)</SelectItem>
<SelectItem value="role" className="font-bold py-3">权限组通知</SelectItem>
<SelectItem value="user" className="font-bold py-3">单个用户</SelectItem>
</SelectContent>
</Select>
</div>

{formData.target_type === 'role' && (
<div className="space-y-2">
<Label className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">选择权限组</Label>
<Select value={formData.role_id} onValueChange={val => setFormData({...formData, role_id: val})}>
<SelectTrigger className="rounded-2xl h-11 border-border/60 bg-muted/10 font-bold"><SelectValue placeholder="选择权限组" /></SelectTrigger>
<SelectContent className="rounded-2xl border-none shadow-xl">
{groups.map(g => <SelectItem key={g.id} value={g.id} className="py-3">{g.name}</SelectItem>)}
</SelectContent>
</Select>
</div>
)}

{formData.target_type === 'user' && (
<div className="space-y-2">
<Label className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">搜索用户</Label>
<Input 
placeholder="输入用户名、邮箱或备注搜索..." 
value={userSearch} 
onChange={e => setUserSearch(e.target.value)}
className="rounded-2xl h-11 border-border/60 bg-muted/10"
/>
{userSearch && (
<div className="max-h-40 overflow-y-auto border border-border/60 rounded-2xl bg-card">
{filteredUsers.map(u => (
<div 
key={u.id} 
className={cn(
"p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-3",
formData.user_id === u.id && "bg-primary/10"
)}
onClick={() => {
setFormData({...formData, user_id: u.id});
setUserSearch('');
}}
>
<div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
{u.username.charAt(0).toUpperCase()}
</div>
<div className="flex-1 min-w-0">
<p className="text-sm font-bold truncate">{u.username}</p>
<p className="text-xs text-muted-foreground truncate">{u.email}</p>
</div>
</div>
))}
</div>
)}
{formData.user_id && (
<div className="p-3 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
<span className="text-sm font-bold text-primary">
已选择: {users.find(u => u.id === formData.user_id)?.username}
</span>
<Button variant="ghost" size="sm" onClick={() => setFormData({...formData, user_id: ''})} className="h-7 text-xs">清除</Button>
</div>
)}
</div>
)}

<div className="space-y-2">
<Label className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">通知标题</Label>
<Input 
placeholder="简明扼要的标题" 
value={formData.title} 
onChange={e => setFormData({...formData, title: e.target.value})}
className="rounded-2xl h-11 border-border/60 bg-muted/10 font-bold"
/>
</div>
<div className="space-y-2">
<Label className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">通知内容</Label>
<Textarea 
placeholder="在此输入通知详情..." 
value={formData.content} 
onChange={e => setFormData({...formData, content: e.target.value})}
className="rounded-2xl border-border/60 bg-muted/10 font-medium text-sm p-4 min-h-[120px] resize-none"
rows={4}
/>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">链接类型</Label>
<Select value={formData.link_type} onValueChange={val => setFormData({...formData, link_type: val as any, link: ''})}>
<SelectTrigger className="rounded-2xl h-11 border-border/60 bg-muted/10 font-bold"><SelectValue /></SelectTrigger>
<SelectContent className="rounded-2xl border-none shadow-xl">
<SelectItem value="internal" className="py-3">应用内链</SelectItem>
<SelectItem value="external" className="py-3">外部链接</SelectItem>
</SelectContent>
</Select>
</div>
<div className="space-y-2">
<Label className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">跳转链接 (可选)</Label>
{formData.link_type === 'internal' ? (
<Select value={formData.link} onValueChange={val => setFormData({...formData, link: val})}>
<SelectTrigger className="rounded-2xl h-11 border-border/60 bg-muted/10 font-mono text-xs"><SelectValue placeholder="选择内链" /></SelectTrigger>
<SelectContent className="rounded-2xl border-none shadow-xl">
{internalLinks.map(l => <SelectItem key={l.value} value={l.value} className="py-3">{l.label}</SelectItem>)}
</SelectContent>
</Select>
) : (
<Input 
placeholder="https://example.com" 
value={formData.link} 
onChange={e => setFormData({...formData, link: e.target.value})}
className="rounded-2xl h-11 border-border/60 bg-muted/10 font-mono text-xs"
/>
)}
</div>
</div>
<div className="space-y-2">
<Label className="text-xs font-black uppercase tracking-wider text-muted-foreground pl-1">推荐作品 (可选)</Label>
<Input 
placeholder="搜索作品标题..." 
value={mediaSearch} 
onChange={e => {
setMediaSearch(e.target.value);
searchMedia(e.target.value);
}}
className="rounded-2xl h-11 border-border/60 bg-muted/10"
/>
{mediaItems.length > 0 && (
<div className="max-h-40 overflow-y-auto border border-border/60 rounded-2xl bg-card">
{mediaItems.map(m => (
<div 
key={m.id} 
className="p-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-3"
onClick={() => {
setFormData({...formData, link: `/media/${m.id}`, link_type: 'internal'});
setMediaSearch('');
setMediaItems([]);
}}
>
<img referrerPolicy="no-referrer" src={m.type === 'image' ? m.url : m.thumbnail_url || m.url} alt="" className="w-12 h-12 object-contain rounded-lg" />
<p className="text-sm font-bold truncate flex-1">{m.title || '无标题'}</p>
</div>
))}
</div>
)}
</div>
</div>
</ScrollArea>
<DialogFooter className="p-8 pt-2 bg-muted/10 border-t flex flex-row gap-2">
<Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-2xl font-bold h-12">取消</Button>
<Button onClick={handleSend} disabled={isSending} className="flex-1 rounded-2xl font-black bg-primary h-12 shadow-lg shadow-primary/20 active:scale-95 transition-all">
{isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
立即发送通知
</Button>
</DialogFooter>
</DialogContent>
</Dialog>

{/* 模板编辑对话框 */}
<Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>{editingTemplate ? '编辑通知模板' : '创建通知模板'}</DialogTitle>
      <DialogDescription>
        {editingTemplate ? '修改现有通知模板的内容和变量' : '创建新的通知模板，支持变量替换'}
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>模板名称</Label>
        <Input 
          value={templateFormData.name}
          onChange={(e) => setTemplateFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="例如：积分奖励通知"
        />
      </div>

      <div className="space-y-2">
        <Label>分类</Label>
        <Select 
          value={templateFormData.category}
          onValueChange={(value) => setTemplateFormData(prev => ({ ...prev, category: value }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">系统通知</SelectItem>
            <SelectItem value="audit">审核通知</SelectItem>
            <SelectItem value="reward">奖励通知</SelectItem>
            <SelectItem value="report">举报通知</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>标题模板</Label>
          <Badge variant="outline" className="text-[10px]">支持 {'{username}'} 等变量</Badge>
        </div>
        <Input 
          value={templateFormData.title_template}
          onChange={(e) => setTemplateFormData(prev => ({ ...prev, title_template: e.target.value }))}
          onFocus={() => setLastFocusedInput('title')}
          placeholder="例如：恭喜获得 {amount} 积分"
          className="rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label>内容模板</Label>
        <Textarea 
          value={templateFormData.content_template}
          onChange={(e) => setTemplateFormData(prev => ({ ...prev, content_template: e.target.value }))}
          onFocus={() => setLastFocusedInput('content')}
          placeholder="例如：您的作品《{title}》已通过审核，获得 {amount} 积分奖励！"
          className="rounded-xl h-32 resize-none"
        />
      </div>

      <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
        <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
          <Terminal className="w-3 h-3" />
          点击插入变量 (插入至: {lastFocusedInput === 'title' ? '标题' : '内容'})
        </Label>
        <div className="flex flex-wrap gap-2">
          {availableVariables.map(v => (
            <Button 
              key={v.name} 
              variant="secondary" 
              size="sm" 
              className="h-7 text-[10px] rounded-lg px-2 hover:bg-primary hover:text-white transition-colors"
              onClick={() => insertVariable(v.name)}
            >
              {v.label} {'{'+v.name+'}'}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>可用变量</Label>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="font-mono text-xs">{'{username}'}</Badge>
          <Badge variant="outline" className="font-mono text-xs">{'{title}'}</Badge>
          <Badge variant="outline" className="font-mono text-xs">{'{amount}'}</Badge>
          <Badge variant="outline" className="font-mono text-xs">{'{reason}'}</Badge>
          <Badge variant="outline" className="font-mono text-xs">{'{date}'}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">在标题或内容中使用这些变量，系统会自动替换为实际值</p>
      </div>
    </div>

    <DialogFooter>
      <Button variant="ghost" onClick={() => setIsTemplateDialogOpen(false)}>取消</Button>
      <Button onClick={handleSaveTemplate}>
        {editingTemplate ? '保存修改' : '创建模板'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

</div>
);
}

// ==================== 资料项配置 Section ====================
