
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
  ExternalLink, Settings2, Info, TriangleAlert, Play, Bell, Eye, CalendarCheck, Check
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { useAdminLogger } from '@/hooks/useAdminLogger';

export function UserFieldsSection() {
const [fields, setFields] = useState<UserFieldConfig[]>([]);
const [loading, setLoading] = useState(true);
  const { logAction } = useAdminLogger('userfields');
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [editingField, setEditingField] = useState<Partial<UserFieldConfig> | null>(null);
const [isSaving, setIsSaving] = useState(false);

useEffect(() => {
fetchFields();
}, []);

const fetchFields = async () => {
setLoading(true);
try {
const { data } = await api.getUserFieldConfigs();
setFields(data || []);
} catch (e) {
toast.error('获取配置失败');
} finally {
setLoading(false);
}
};

const handleSave = async () => {
if (!editingField?.field_key || !editingField?.field_name) {
return toast.error('请填写字段标识和名称');
}
setIsSaving(true);
try {
const { error } = await api.upsertUserFieldConfig(editingField);
if (error) throw error;
toast.success('保存成功');
setIsDialogOpen(false);
fetchFields();
} catch (e: any) {
toast.error(`保存失败: ${e.message}`);
} finally {
setIsSaving(false);
}
};

const handleDelete = async (id: string) => {
const confirmed = await confirmAsync('确定要删除这个字段配置吗？', { variant: 'destructive' });
    if (!confirmed) return;
try {
const { error } = await api.deleteUserFieldConfig(id);
if (error) throw error;
toast.success('已删除');
fetchFields();
} catch (e: any) {
toast.error(`删除失败: ${e.message}`);
}
};

const openDialog = (field?: UserFieldConfig) => {
setEditingField(field || {
field_key: '',
field_name: '',
field_type: 'text',
is_active: true,
is_required: false,
is_searchable: false,
show_in_profile: true,
show_in_center: true,
show_in_register: false,
sort_order: fields.length + 1
});
setIsDialogOpen(true);
};

return (
<div className="space-y-6">
<div className="flex items-center justify-between">
<div>
<h2 className="text-2xl font-black">资料项配置</h2>
<p className="text-sm text-muted-foreground mt-1">管理用户个人资料及注册时需要填写的自定义字段</p>
</div>
<Button onClick={() => openDialog()} className="rounded-xl font-bold px-6 h-11 shadow-lg shadow-primary/20 bg-emerald-600 hover:bg-emerald-700">
<Settings2 className="w-4 h-4 mr-2" />
新增资料项
</Button>
</div>

<div className="grid gap-4">
{loading ? (
<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
) : fields.length === 0 ? (
<div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50 text-muted-foreground font-medium">暂无配置项</div>
) : fields.map((field) => (
<Card key={field.id} className={cn("border-none shadow-sm rounded-2xl overflow-hidden", !field.is_active && "opacity-60")}>
<CardContent className="p-6 flex items-center justify-between">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black">
{field.sort_order}
</div>
<div>
<div className="flex items-center gap-2">
<h3 className="font-bold text-lg">{field.field_name}</h3>
<Badge variant="outline" className="text-[10px] uppercase font-mono">{field.field_key}</Badge>
{!field.is_active && <Badge variant="destructive" className="text-[10px]">已禁用</Badge>}
</div>
<div className="flex items-center gap-4 mt-1">
<span className="text-xs text-muted-foreground flex items-center gap-1">
{field.is_required && <span className="text-red-500">*</span>} 类型: {field.field_type}
</span>
<div className="flex gap-1.5">
{field.show_in_profile && <Badge className="bg-blue-500/10 text-blue-600 border-none text-[9px]">资料页</Badge>}
{field.show_in_center && <Badge className="bg-indigo-500/10 text-indigo-600 border-none text-[9px]">用户中心</Badge>}
{field.show_in_register && <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px]">注册页</Badge>}
</div>
</div>
</div>
</div>
<div className="flex items-center gap-2">
<Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => openDialog(field)}>编辑</Button>
<Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl" onClick={() => handleDelete(field.id)}>
<Trash2 className="w-4 h-4" />
</Button>
</div>
</CardContent>
</Card>
))}
</div>

<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
<DialogContent className="rounded-3xl max-w-md p-8 overflow-hidden border-none shadow-2xl">
<DialogHeader>
<DialogTitle className="text-xl font-black">资料项配置</DialogTitle>
<DialogDescription>添加或编辑用户资料的自定义字段</DialogDescription>
</DialogHeader>
<div className="space-y-5 py-4">
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label className="text-xs font-bold">字段标识 (Key)</Label>
<Input 
placeholder="如: age" 
value={editingField?.field_key || ''} 
onChange={e => setEditingField({...editingField, field_key: e.target.value})}
className="rounded-xl h-10"
/>
</div>
<div className="space-y-2">
<Label className="text-xs font-bold">显示名称</Label>
<Input 
placeholder="如: 年龄" 
value={editingField?.field_name || ''} 
onChange={e => setEditingField({...editingField, field_name: e.target.value})}
className="rounded-xl h-10"
/>
</div>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label className="text-xs font-bold">字段类型</Label>
<Select value={editingField?.field_type || 'text'} onValueChange={val => setEditingField({...editingField, field_type: val as any})}>
<SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
<SelectContent className="rounded-xl">
<SelectItem value="text">单行文本</SelectItem>
<SelectItem value="textarea">多行文本</SelectItem>
<SelectItem value="number">数字</SelectItem>
<SelectItem value="select">下拉选择</SelectItem>
<SelectItem value="multi_select">多选</SelectItem>
<SelectItem value="date">日期</SelectItem>
</SelectContent>
</Select>
</div>
<div className="space-y-2">
<Label className="text-xs font-bold">排序 (从小到大)</Label>
<Input 
type="number"
value={editingField?.sort_order || 0} 
onChange={e => setEditingField({...editingField, sort_order: parseInt(e.target.value)})}
className="rounded-xl h-10"
/>
</div>
</div>

{(editingField?.field_type === 'select' || editingField?.field_type === 'multi_select') && (
<div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
<Label className="text-xs font-bold">选项内容 (每行一个)</Label>
<Textarea 
placeholder="如:
男
女
其他"
value={editingField?.field_options?.join('\n') || ''} 
onChange={e => setEditingField({...editingField, field_options: e.target.value.split('\n').filter(Boolean)})}
className="rounded-xl min-h-[100px]"
/>
</div>
)}

<div className="space-y-3 pt-2">
<div className="flex items-center justify-between">
<Label className="text-sm font-medium">是否启用</Label>
<Switch checked={editingField?.is_active !== false} onCheckedChange={val => setEditingField({...editingField, is_active: val})} />
</div>
<div className="flex items-center justify-between">
<Label className="text-sm font-medium">是否必填</Label>
<Switch checked={editingField?.is_required === true} onCheckedChange={val => setEditingField({...editingField, is_required: val})} />
</div>
<div className="flex items-center justify-between">
<Label className="text-sm font-medium">支持搜索</Label>
<Switch checked={editingField?.is_searchable === true} onCheckedChange={val => setEditingField({...editingField, is_searchable: val})} />
</div>
<Separator />
<div className="grid grid-cols-3 gap-2">
<div className="flex flex-col items-center gap-2 p-2 bg-muted/30 rounded-xl">
<Label className="text-[10px]">资料页</Label>
<Switch checked={editingField?.show_in_profile !== false} onCheckedChange={val => setEditingField({...editingField, show_in_profile: val})} />
</div>
<div className="flex flex-col items-center gap-2 p-2 bg-muted/30 rounded-xl">
<Label className="text-[10px]">用户中心</Label>
<Switch checked={editingField?.show_in_center !== false} onCheckedChange={val => setEditingField({...editingField, show_in_center: val})} />
</div>
<div className="flex flex-col items-center gap-2 p-2 bg-muted/30 rounded-xl">
<Label className="text-[10px]">注册页</Label>
<Switch checked={editingField?.show_in_register === true} onCheckedChange={val => setEditingField({...editingField, show_in_register: val})} />
</div>
</div>
</div>
</div>
<DialogFooter className="pt-4 flex flex-row gap-2">
<Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-xl h-11">取消</Button>
<Button onClick={handleSave} disabled={isSaving} className="flex-1 rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700 font-bold">
{isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
保存配置
</Button>
</DialogFooter>
</DialogContent>
</Dialog>
</div>
);
}

// ==================== 系统设置 Section ====================


export function CustomFieldRenderer({ field, value, onChange }: { field: UserFieldConfig, value: any, onChange: (val: any) => void }) {
  if (field.field_type === 'textarea') {
    return (
      <textarea
        placeholder={`请输入${field.field_name}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[80px] p-3 rounded-xl border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
      />
    );
  }

  if (field.field_type === 'select') {
    return (
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="rounded-xl h-11 border-slate-200">
          <SelectValue placeholder={`请选择${field.field_name}`} />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {field.field_options?.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.field_type === 'multi_select') {
    const selected = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',').filter(Boolean) : []);
    const toggle = (opt: string) => {
      const newSelected = selected.includes(opt) 
        ? selected.filter((i: string) => i !== opt) 
        : [...selected, opt];
      onChange(newSelected);
    };
    return (
      <div className="flex flex-wrap gap-2 p-3 bg-muted/10 rounded-2xl border border-slate-100 min-h-[50px] transition-all">
        {field.field_options?.map(opt => (
          <Badge 
            key={opt} 
            variant={selected.includes(opt) ? "default" : "outline"}
            className={cn(
              "cursor-pointer px-4 py-1.5 rounded-xl transition-all border-none select-none h-8 flex items-center gap-1.5 shadow-sm",
              selected.includes(opt) ? "bg-primary text-primary-foreground font-bold" : "bg-white text-slate-500 hover:bg-slate-50"
            )}
            onClick={() => toggle(opt)}
          >
            {opt}
            {selected.includes(opt) && <Check className="w-3.5 h-3.5" />}
          </Badge>
        ))}
        {(!field.field_options || field.field_options.length === 0) && <span className="text-xs text-slate-400 italic">管理员未配置选项</span>}
      </div>
    );
  }

  if (field.field_type === 'date') {
    return (
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl h-11 border-slate-200 shadow-sm block w-full"
        style={{ appearance: 'none', WebkitAppearance: 'none' }}
      />
    );
  }

  if (field.field_type === 'number') {
    return (
      <Input
        type="number"
        placeholder={`请输入${field.field_name}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl h-11 border-slate-200 shadow-sm"
      />
    );
  }

  return (
    <Input
      type="text"
      placeholder={`请输入${field.field_name}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl h-11 border-slate-200 shadow-sm"
    />
  );
}
