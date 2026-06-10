import React, { useState, useEffect } from 'react';
import { formatBeijingTime } from '@/lib/utils';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import type { ContentCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Edit2, Trash2, Folder as Folder, ListFilter, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoryContentSection } from './CategoryContentSection';

export function CategoriesSection({ defaultTab = 'management' }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<ContentCategory | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [minRole, setMinRole] = useState('pt');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getContentCategories();
      if (error) throw error;
      setCategories(data);
    } catch (error: any) {
      toast.error(`获取分类失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const { error } = await api.createContentCategory({ 
        name, 
        sort_order: sortOrder,
        is_visible: isVisible,
        min_role: minRole
      });
      if (error) throw error;
      toast.success('分类已创建');
      setIsAddOpen(false);
      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast.error(`创建失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory || !name) return;
    setSaving(true);
    try {
      const { error } = await api.updateContentCategory(editingCategory.id, { 
        name, 
        sort_order: sortOrder,
        is_visible: isVisible,
        min_role: minRole
      });
      if (error) throw error;
      toast.success('分类已更新');
      setEditingCategory(null);
      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSortOrder(0);
    setIsVisible(true);
    setMinRole('pt');
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除此分类吗？删除后此分类下的内容将变为未分类状态。', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteContentCategory(id);
      if (error) throw error;
      toast.success('分类已删除');
      fetchCategories();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const handleToggleVisible = async (cat: ContentCategory) => {
    try {
      const { error } = await api.updateContentCategory(cat.id, { 
        is_visible: !cat.is_visible
      });
      if (error) throw error;
      toast.success(`已${cat.is_visible ? '隐藏' : '显示'}分类`);
      fetchCategories();
    } catch (error: any) {
      toast.error(`操作失败: ${error.message}`);
    }
  };

  const openEdit = (cat: ContentCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSortOrder(cat.sort_order);
    setIsVisible(cat.is_visible ?? true);
    setMinRole(cat.min_role || 'pt');
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">分类中心</h2>
            <p className="text-sm text-muted-foreground mt-1">管理全站内容分类定义及其已归属的资源内容</p>
          </div>
          
          <TabsList className="grid grid-cols-2 w-full md:w-[300px] rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="management" className="rounded-lg gap-2 text-xs">
              <Settings2 className="w-3.5 h-3.5" />
              分类定义
            </TabsTrigger>
            <TabsTrigger value="content" className="rounded-lg gap-2 text-xs">
              <ListFilter className="w-3.5 h-3.5" />
              分类内容
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="management" className="mt-0 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Folder className="w-5 h-5 text-primary" />
              分类列表
            </h3>
            <Button onClick={() => setIsAddOpen(true)} className="rounded-xl h-9">
              <Plus className="w-4 h-4 mr-2" />
              创建新分类
            </Button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Folder className="w-12 h-12 mb-4 opacity-20" />
                <p>暂无分类数据</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[100px]">序号</TableHead>
                    <TableHead>分类名称</TableHead>
                    <TableHead>显示设置</TableHead>
                    <TableHead>最低权限</TableHead>
                    <TableHead>排序权重</TableHead>
                    <TableHead>创建日期</TableHead>
                    <TableHead className="text-right">管理操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat, index) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="px-3 py-1 rounded-lg">
                          {cat.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={cat.is_visible !== false} 
                            onCheckedChange={() => handleToggleVisible(cat)}
                            className="scale-75"
                          />
                          <Badge variant={cat.is_visible ? "outline" : "destructive"} className="rounded-lg text-[10px]">
                            {cat.is_visible ? "前端显示" : "隐藏"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-lg text-[10px] uppercase">
                          {cat.min_role || 'pt'}
                        </Badge>
                      </TableCell>
                      <TableCell>{cat.sort_order}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatBeijingTime(cat.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-primary hover:bg-primary/10 rounded-full"
                            onClick={() => openEdit(cat)}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full"
                            onClick={() => handleDelete(cat.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="content" className="mt-0">
          <CategoryContentSection />
        </TabsContent>
      </Tabs>

      {/* 创建/编辑弹窗保持不变 */}
      <Dialog 
        open={isAddOpen || !!editingCategory} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingCategory(null);
            setName('');
            setSortOrder(0);
          }
        }}
      >
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? '编辑分类' : '创建分类'}</DialogTitle>
            <DialogDescription>
              分类将用于内容的分类管理和推送给特定用户。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">分类名称</Label>
              <Input 
                id="cat-name" 
                placeholder="例如：极品视频, 写真图集..." 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-sort">排序权重</Label>
              <Input 
                id="cat-sort" 
                type="number" 
                value={sortOrder} 
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">前端显示</Label>
                <p className="text-[10px] text-muted-foreground">是否在探索页、分类云等前端页面展示</p>
              </div>
              <Switch checked={isVisible} onCheckedChange={setIsVisible} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold">最低访问权限</Label>
              <Select value={minRole} onValueChange={setMinRole}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="选择最低权限" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pt">普通用户 (PT)</SelectItem>
                  <SelectItem value="vip">黄金会员 (VIP)</SelectItem>
                  <SelectItem value="svip">铂金会员 (SVIP)</SelectItem>
                  <SelectItem value="vvip">黑钻会员 (VVIP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setIsAddOpen(false);
              setEditingCategory(null);
            }} className="rounded-xl">取消</Button>
            <Button 
              onClick={editingCategory ? handleUpdate : handleCreate} 
              disabled={saving || !name} 
              className="rounded-xl"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCategory ? '保存修改' : '确认创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
