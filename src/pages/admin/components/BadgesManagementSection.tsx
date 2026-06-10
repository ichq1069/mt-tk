import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Award, Plus, Trash2, Edit, Save, Loader2, Upload, 
  Users, Target, Gift, CircleCheckBig, CircleX, Image as ImageIcon,
  Search, FileSpreadsheet, Download as DownloadIcon, UserCheck, X, Info,
  Layers, Trophy, Sparkles, Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import type { Profile } from '@/types';

interface BadgeItem {
  id: string;
  name: string;
  image_url: string;
  category: string;
  acquisition_method?: string;
  validity_days: number;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface BadgeTask {
  id: string;
  badge_id: string;
  task_type: string;
  target_value: number;
  claim_type: 'auto' | 'manual';
  is_active: boolean;
  badges?: BadgeItem;
}

const TASK_TYPE_LABELS = {
  upload_count: '上传审核通过图片数',
  favorite_count: '收藏数',
  checkin_count: '签到天数'
};

interface BadgeCategory {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  sort_order: number;
}

export function BadgesManagementSection({ defaultTab = 'list' }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [tasks, setTasks] = useState<BadgeTask[]>([]);
  const [categories, setCategories] = useState<BadgeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBadge, setEditingBadge] = useState<Partial<BadgeItem> | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<BadgeTask> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<BadgeCategory> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [uploading, setUploading] = useState(false);
  const [reissuing, setReissuing] = useState(false);

  // 扩展授予功能的状态
  const [grantMode, setGrantMode] = useState<'single' | 'group' | 'batch'>('single');
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [batchImportData, setBatchImportData] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    fetchData();
    fetchGroups();
  }, []);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const fetchGroups = async () => {
    const { data } = await supabase.from('permission_groups').select('*').order('name');
    if (data) setGroups(data);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearch.trim()) {
        handleSearchUsers();
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [userSearch]);

  const handleSearchUsers = async () => {
    setSearching(true);
    const { data } = await api.getAllProfiles(0, 10, userSearch);
    if (data) setSearchResults(data);
    setSearching(false);
  };

  const fetchData = async () => {
    setLoading(true);
    const [badgesRes, tasksRes, catsRes] = await Promise.all([
      api.getAllBadgesAdmin(),
      api.getBadgeTasks(),
      api.getBadgeCategories()
    ]);

    if (badgesRes.data) setBadges(badgesRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (catsRes.data) setCategories(catsRes.data);
    setLoading(false);
  };

  const handleSaveCategory = async () => {
    if (!editingCategory?.name) return toast.error('请填写分类名称');
    const { error } = await api.upsertBadgeCategory(editingCategory);
    if (error) {
      toast.error('保存失败: ' + error.message);
    } else {
      toast.success('分类已更新');
      setCategoryDialogOpen(false);
      fetchData();
    }
  };


  const handleAutoReissue = async () => {
    const confirm = await confirmAsync(
      '系统将遍历所有活跃用户，根据当前勋章任务配置，为满足条件但尚未获得勋章的用户补发勋章。此过程可能需要一点时间，确定开始吗？',
      {
        title: '自动补发全员勋章',
        confirmText: '开始补发',
        cancelText: '取消'
      }
    );

    if (!confirm) return;

    setReissuing(true);
    try {
      const { data: count, error } = await api.checkAllUsersBadges();
      if (error) throw error;
      toast.success(`补发完成！共为用户发放了 ${count || 0} 枚勋章。`);
      fetchData();
    } catch (e: any) {
      toast.error('补发失败: ' + e.message);
    } finally {
      setReissuing(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除此分类吗？', { variant: 'destructive' });
    if (!confirmed) return;
    const { error } = await api.deleteBadgeCategory(id);
    if (error) toast.error('删除失败');
    else {
      toast.success('分类已删除');
      fetchData();
    }
  };

  const handleSaveBadge = async () => {
    if (!editingBadge?.name || !editingBadge?.image_url) {
      return toast.error('请填写勋章名称和图片');
    }

    const { error } = await api.upsertBadge(editingBadge);
    if (error) {
      toast.error('保存失败: ' + error.message);
    } else {
      toast.success(editingBadge.id ? '勋章已更新' : '勋章已创建');
      setDialogOpen(false);
      setEditingBadge(null);
      fetchData();
    }
  };

  const handleDeleteBadge = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除此勋章吗？已授予的用户勋章也将被移除。', { variant: 'destructive' });
    if (!confirmed) return;

    const { error } = await api.deleteBadge(id);
    if (error) {
      toast.error('删除失败: ' + error.message);
    } else {
      toast.success('勋章已删除');
      fetchData();
    }
  };

  const handleSaveTask = async () => {
    if (!editingTask?.badge_id || !editingTask?.task_type || !editingTask?.target_value) {
      return toast.error('请填写完整任务配置');
    }

    // 确保 target_value 是数字
    const taskToSave = {
      ...editingTask,
      target_value: parseInt(String(editingTask.target_value)) || 0
    };

    const { error } = await api.upsertBadgeTask(taskToSave);
    if (error) {
      toast.error('保存失败: ' + (error.message || '未知错误'));
    } else {
      toast.success(editingTask.id ? '任务已更新' : '任务已创建');
      setTaskDialogOpen(false);
      setEditingTask(null);
      fetchData();
    }
  };

  const handleBatchGrant = async () => {
    if (!selectedBadgeId) return toast.error('请选择勋章');
    
    let userIds: string[] = [];
    if (grantMode === 'single') {
      if (!targetUserId) return toast.error('请选择用户');
      userIds = [targetUserId];
    } else if (grantMode === 'group') {
      if (!selectedGroupId) return toast.error('请选择权限组');
      setLoading(true);
      const { error } = await api.grantBadgeToGroup(selectedGroupId, selectedBadgeId, expiresAt || undefined);
      setLoading(false);
      if (error) return toast.error('授予失败: ' + error.message);
      toast.success('已为该权限组所有用户授予勋章');
      setGrantDialogOpen(false);
      return;
    } else if (grantMode === 'batch') {
      if (batchImportData.length === 0) return toast.error('请先导入用户数据');
      userIds = batchImportData.map(u => u.id);
    }

    if (userIds.length === 0) return toast.error('请先选择用户');

    setLoading(true);
    const { error } = await api.batchGrantBadges(userIds, selectedBadgeId, expiresAt || undefined);
    setLoading(false);

    if (error) {
      toast.error('授予失败: ' + error.message);
    } else {
      toast.success(`勋章已授予 ${userIds.length} 名用户`);
      setGrantDialogOpen(false);
      setSelectedBadgeId('');
      setTargetUserId('');
      setSelectedGroupId('');
      setBatchImportData([]);
      setExpiresAt('');
      setGrantMode('single');
    }
  };

  const handleExportTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { '用户ID': 'UUID-1234-5678', '昵称': '张三' },
      { '用户ID': 'UUID-8765-4321', '昵称': '李四' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "用户导入模板");
    XLSX.writeFile(wb, "勋章批量授勋模板.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];
      
      const parsedUsers = data.map(row => ({
        id: row['用户ID'] || row['id'] || row['ID'],
        name: row['昵称'] || row['username'] || row['姓名'] || '未知'
      })).filter(u => u.id);

      if (parsedUsers.length === 0) {
        toast.error('表格中未找到有效的用户ID');
      } else {
        setBatchImportData(parsedUsers);
        toast.success(`成功解析 ${parsedUsers.length} 名待授勋用户`);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleDeleteTask = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除此任务配置吗？', { variant: 'destructive' });
    if (!confirmed) return;

    const { error } = await api.deleteBadgeTask(id);
    if (error) {
      toast.error('删除失败: ' + error.message);
    } else {
      toast.success('任务已删除');
      fetchData();
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      return toast.error('图片大小不能超过 1MB');
    }

    setUploading(true);
    try {
      const sanitized = file.name.replace(/\s+/g, '_');
      const fileName = `badges/${Date.now()}_${sanitized}`;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      
      const { data, error } = await supabase.functions.invoke('upload-to-r2', {
        body: formData
      });

      if (error || !data?.success) throw new Error(error?.message || data?.error || '上传失败');

      setEditingBadge({ ...editingBadge, image_url: data.url });
      toast.success('勋章图片上传成功');
    } catch (err: any) {
      toast.error('上传失败: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            勋章系统管理
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理用户勋章、配置自动授勋任务、批量授予/收回勋章。
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button 
            variant="outline"
            className="rounded-2xl gap-2 font-black border-primary/20 text-primary hover:bg-primary/5 h-10 shadow-sm transition-all hover:shadow-md"
            onClick={handleAutoReissue}
            disabled={reissuing}
          >
            {reissuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            自动补发全员勋章
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 rounded-2xl h-12 p-1 bg-slate-100">
          <TabsTrigger value="list" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">勋章列表</TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">分类管理</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">任务配置</TabsTrigger>
          <TabsTrigger value="grant" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">授予管理</TabsTrigger>
        </TabsList>

        {/* 勋章列表 */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="rounded-2xl gap-2 font-bold"
                  onClick={() => setEditingBadge({ category: categories[0]?.name || 'achievement', validity_days: 0, is_active: true })}
                >
                  <Plus className="w-4 h-4" />
                  新增勋章
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-3xl">
                <DialogHeader>
                  <DialogTitle>{editingBadge?.id ? '编辑勋章' : '新增勋章'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>勋章图片</Label>
                    {editingBadge?.image_url && (
                      <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 mb-2">
                        <img referrerPolicy="no-referrer" src={editingBadge.image_url} alt="勋章预览" className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input 
                        placeholder="图片 URL"
                        value={editingBadge?.image_url || ''}
                        onChange={(e) => setEditingBadge({ ...editingBadge, image_url: e.target.value })}
                        className="rounded-xl"
                      />
                      <Button 
                        variant="outline" 
                        className="rounded-xl gap-2"
                        disabled={uploading}
                        onClick={() => document.getElementById('badge-image-upload')?.click()}
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        上传
                      </Button>
                      <input 
                        id="badge-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadImage}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>勋章名称</Label>
                    <Input 
                      placeholder="如：3月甜蜜达人"
                      value={editingBadge?.name || ''}
                      onChange={(e) => setEditingBadge({ ...editingBadge, name: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>分类</Label>
                    <Select 
                      value={editingBadge?.category || ''}
                      onValueChange={(v) => setEditingBadge({ ...editingBadge, category: v as any })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="选择勋章分类" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>获取方式</Label>
                    <Input 
                      placeholder="如：完成10次签到"
                      value={editingBadge?.acquisition_method || ''}
                      onChange={(e) => setEditingBadge({ ...editingBadge, acquisition_method: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>有效期（天）</Label>
                    <Input 
                      type="number"
                      placeholder="0 表示永久"
                      value={editingBadge?.validity_days || 0}
                      onChange={(e) => setEditingBadge({ ...editingBadge, validity_days: parseInt(e.target.value) || 0 })}
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>描述文案</Label>
                    <Textarea 
                      placeholder="勋章的详细描述"
                      value={editingBadge?.description || ''}
                      onChange={(e) => setEditingBadge({ ...editingBadge, description: e.target.value })}
                      className="rounded-xl"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={editingBadge?.is_active ?? true}
                      onCheckedChange={(v) => setEditingBadge({ ...editingBadge, is_active: v })}
                    />
                    <Label>启用此勋章</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">取消</Button>
                  <Button onClick={handleSaveBadge} className="rounded-xl gap-2">
                    <Save className="w-4 h-4" />
                    保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <Card key={badge.id} className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200 shrink-0">
                      <img referrerPolicy="no-referrer" src={badge.image_url} alt={badge.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-black text-slate-800 truncate">{badge.name}</h4>

                        <Badge variant={badge.is_active ? 'default' : 'secondary'} className="rounded-md text-[10px] shrink-0">
                          {badge.is_active ? '启用' : '禁用'}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="rounded-md text-[10px] mt-1">
                        {badge.category}
                      </Badge>
                      {badge.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{badge.description}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-xl gap-1 text-xs h-7"
                          onClick={() => {
                            setEditingBadge(badge);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                          编辑
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="rounded-xl gap-1 text-red-500 hover:text-red-600 h-7"
                          onClick={() => handleDeleteBadge(badge.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {badges.length === 0 && (
            <div className="text-center p-12 text-muted-foreground bg-white/5 rounded-3xl border border-dashed border-border mt-4">
              <Award className="w-12 h-12 mx-auto mb-4 opacity-20" />
              暂无勋章，点击右上角新增。
            </div>
          )}
        </TabsContent>

        {/* 分类管理 */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button 
              className="rounded-2xl gap-2 font-bold"
              onClick={() => {
                setEditingCategory({ sort_order: categories.length + 1 });
                setCategoryDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              新增分类
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <Card key={cat.id} className="border-none shadow-sm rounded-3xl overflow-hidden group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{cat.name}</h4>
                      <p className="text-xs text-muted-foreground">排序: {cat.sort_order}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-xl h-8 w-8 p-0"
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-xl h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDeleteCategory(cat.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogContent className="max-w-md rounded-3xl">
              <DialogHeader><DialogTitle>{editingCategory?.id ? '编辑分类' : '新增分类'}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>分类名称</Label>
                  <Input 
                    value={editingCategory?.name || ''} 
                    onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>排序权重 (数字越小越靠前)</Label>
                  <Input 
                    type="number"
                    value={editingCategory?.sort_order || 0} 
                    onChange={e => setEditingCategory({ ...editingCategory, sort_order: parseInt(e.target.value) || 0 })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCategoryDialogOpen(false)} className="rounded-xl">取消</Button>
                <Button onClick={handleSaveCategory} className="rounded-xl gap-2"><Save className="w-4 h-4" />保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* 任务配置 */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="rounded-2xl gap-2 font-bold"
                  onClick={() => setEditingTask({ is_active: true })}
                >
                  <Plus className="w-4 h-4" />
                  新增任务
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-3xl">
                <DialogHeader>
                  <DialogTitle>{editingTask?.id ? '编辑任务' : '新增任务'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>关联勋章</Label>
                    <Select 
                      value={editingTask?.badge_id || ''}
                      onValueChange={(v) => setEditingTask({ ...editingTask, badge_id: v })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="选择勋章" />
                      </SelectTrigger>
                      <SelectContent>
                        {badges.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground ml-1">完成此任务后用户将获得该勋章</p>
                  </div>

                  <div className="space-y-2">
                    <Label>任务类型</Label>
                    <Select 
                      value={editingTask?.task_type || ''}
                      onValueChange={(v) => setEditingTask({ ...editingTask, task_type: v })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="选择任务类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upload_count">上传审核通过图片数</SelectItem>
                        <SelectItem value="favorite_count">收藏数</SelectItem>
                        <SelectItem value="checkin_count">签到天数</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground ml-1">选择统计用户哪项指标作为达标条件</p>
                  </div>

                  <div className="space-y-2">
                    <Label>目标值</Label>
                    <Input 
                      type="number"
                      placeholder="如：10"
                      value={editingTask?.target_value || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, target_value: parseInt(e.target.value) || 0 })}
                      className="rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground ml-1">用户指标达到此数值时触发授勋</p>
                  </div>

                  <div className="space-y-2">
                    <Label>领取方式</Label>
                    <Select 
                      value={editingTask?.claim_type || 'auto'}
                      onValueChange={(v) => setEditingTask({ ...editingTask, claim_type: v as any })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="选择领取方式" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">自动发放</SelectItem>
                        <SelectItem value="manual">手动领取</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground ml-1">自动发放：满足条件后即刻拥有；手动领取：用户需在“我的任务”中确认</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={editingTask?.is_active ?? true}
                      onCheckedChange={(v) => setEditingTask({ ...editingTask, is_active: v })}
                    />
                    <Label>启用此任务</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTaskDialogOpen(false)} className="rounded-xl">取消</Button>
                  <Button onClick={handleSaveTask} className="rounded-xl gap-2">
                    <Save className="w-4 h-4" />
                    保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black">任务列表</CardTitle>
              <CardDescription>用户完成任务后自动授予对应勋章</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-200">
                        <img referrerPolicy="no-referrer" src={task.badges?.image_url} alt={task.badges?.name} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{task.badges?.name}</span>
                          <Badge variant={task.is_active ? 'default' : 'secondary'} className="rounded-md text-[10px]">
                            {task.is_active ? '启用' : '禁用'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS] || task.task_type} ≥ {task.target_value}
                          <span className="mx-2">|</span>
                          {task.claim_type === 'manual' ? '手动领取' : '自动发放'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl gap-1"
                        onClick={() => {
                          setEditingTask(task);
                          setTaskDialogOpen(true);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                        编辑
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {tasks.length === 0 && (
                <div className="text-center p-12 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  暂无任务配置，点击右上角新增。
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 授予管理 */}
        <TabsContent value="grant" className="space-y-4">
          <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-black">授予管理</CardTitle>
                  <CardDescription>为指定用户、权限组或批量导入用户授予勋章</CardDescription>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <Button 
                    variant={grantMode === 'single' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="rounded-lg text-xs h-8"
                    onClick={() => setGrantMode('single')}
                  >
                    按用户
                  </Button>
                  <Button 
                    variant={grantMode === 'group' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="rounded-lg text-xs h-8"
                    onClick={() => setGrantMode('group')}
                  >
                    按权限组
                  </Button>
                  <Button 
                    variant={grantMode === 'batch' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="rounded-lg text-xs h-8"
                    onClick={() => setGrantMode('batch')}
                  >
                    批量导入
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-500 font-bold text-xs uppercase ml-1">第一步：选择勋章</Label>
                    <Select value={selectedBadgeId} onValueChange={setSelectedBadgeId}>
                      <SelectTrigger className="rounded-2xl h-12 border-slate-200">
                        <SelectValue placeholder="选择要授予的勋章" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {badges.filter(b => b.is_active).map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            <div className="flex items-center gap-2">
                              <img referrerPolicy="no-referrer" src={b.image_url} alt="" className="w-5 h-5 rounded-md object-contain" />
                              {b.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-500 font-bold text-xs uppercase ml-1">第三步：过期时间（可选）</Label>
                    <Input 
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="rounded-2xl h-12 border-slate-200"
                    />
                    <p className="text-[10px] text-muted-foreground ml-1">留空表示永久有效</p>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col h-full">
                  <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 flex-1 space-y-4">
                    <Label className="text-slate-500 font-bold text-xs uppercase ml-1">第二步：选择目标</Label>
                    
                    {grantMode === 'single' && (
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="搜索昵称、数字ID、自定义字段..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="rounded-2xl pl-10 h-11 border-slate-200 bg-white"
                          />
                          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {searchResults.map((u) => (
                            <div 
                              key={u.id} 
                              onClick={() => setTargetUserId(u.id)}
                              className={cn(
                                "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                                targetUserId === u.id 
                                  ? "bg-primary/10 border-primary shadow-sm" 
                                  : "bg-white border-slate-100 hover:border-primary/30"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                  {u.avatar_url ? (
                                    <img referrerPolicy="no-referrer" src={u.avatar_url} className="w-full h-full object-contain" />
                                  ) : (
                                    <Users className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold truncate text-slate-700">{u.username}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">ID: {u.digital_id || u.id.slice(0, 8)}</p>
                                </div>
                              </div>
                              {targetUserId === u.id ? (
                                <CircleCheckBig className="w-5 h-5 text-primary" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-slate-200 group-hover:border-primary/50" />
                              )}
                            </div>
                          ))}
                          {userSearch && searchResults.length === 0 && !searching && (
                            <div className="p-8 text-center text-xs text-muted-foreground italic">未找到匹配用户</div>
                          )}
                          {!userSearch && (
                            <div className="p-8 text-center text-xs text-muted-foreground italic">请输入关键词进行搜索</div>
                          )}
                        </div>
                      </div>
                    )}

                    {grantMode === 'group' && (
                      <div className="space-y-4">
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                          <SelectTrigger className="rounded-2xl h-11 border-slate-200 bg-white">
                            <SelectValue placeholder="选择目标权限组" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {groups.map(g => (
                              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                          <Info className="w-5 h-5 text-amber-500 shrink-0" />
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            提示：按组授予将自动为该权限组下的<strong>所有用户</strong>发放勋章。操作不可撤销，如需收回请手动按用户操作。
                          </p>
                        </div>
                      </div>
                    )}

                    {grantMode === 'batch' && (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            className="flex-1 rounded-2xl h-11 gap-2 border-slate-200 bg-white hover:bg-slate-50"
                            onClick={() => document.getElementById('excel-import')?.click()}
                          >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                            导入 Excel
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="flex-1 rounded-2xl h-11 gap-2 text-slate-500 hover:bg-slate-100"
                            onClick={handleExportTemplate}
                          >
                            <DownloadIcon className="w-4 h-4" />
                            下载模板
                          </Button>
                          <input 
                            id="excel-import" 
                            type="file" 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                            onChange={handleImportExcel} 
                          />
                        </div>

                        {batchImportData.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                待导入列表 ({batchImportData.length} 人)
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 text-[10px] text-red-500 px-1 hover:bg-red-50"
                                onClick={() => setBatchImportData([])}
                              >
                                清空
                              </Button>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl max-h-[160px] overflow-y-auto divide-y divide-slate-50">
                              {batchImportData.map((u, i) => (
                                <div key={i} className="p-2.5 flex items-center justify-between">
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-700 truncate">{u.name}</p>
                                    <p className="text-[9px] text-slate-400 font-mono truncate">{u.id}</p>
                                  </div>
                                  <X 
                                    className="w-3 h-3 text-slate-300 hover:text-red-400 cursor-pointer" 
                                    onClick={() => setBatchImportData(prev => prev.filter((_, idx) => idx !== i))}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {batchImportData.length === 0 && (
                          <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                            <Upload className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-xs">请上传包含用户ID的 Excel 表格</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Button 
                      className="flex-1 rounded-2xl h-12 gap-2 font-black shadow-lg shadow-primary/10"
                      onClick={handleBatchGrant}
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                      确认授予勋章
                    </Button>
                    {grantMode === 'single' && (
                      <Button 
                        variant="outline"
                        className="rounded-2xl h-12 gap-2 font-black border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={async () => {
                          if (!selectedBadgeId || !targetUserId) return toast.error('请选择勋章和用户');
                          const { error } = await api.revokeBadge(targetUserId, selectedBadgeId);
                          if (error) toast.error('收回失败: ' + error.message);
                          else toast.success('勋章已从该用户身上收回');
                        }}
                      >
                        <CircleX className="w-4 h-4" />
                        收回
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
