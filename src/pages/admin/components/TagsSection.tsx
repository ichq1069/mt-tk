import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import type { Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from "sonner";
import { Loader2, Trash2, Tag as TagIcon, Plus, Edit2, Check, X, Image as ImageIcon } from "lucide-react";
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TagContentSection } from './TagContentSection';

export function TagsSection() {
  const [activeTab, setActiveTab] = useState('management');
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [minRole, setMinRole] = useState('pt');
  const [weight, setWeight] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIsVisible, setEditIsVisible] = useState(true);
  const [editMinRole, setEditMinRole] = useState('pt');
  const [editWeight, setEditWeight] = useState(0);

  const { logAction } = useAdminLogger('tags');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data } = await api.getTagManagementStats();
      setTags(data || []);
    } catch (error: any) {
      toast.error('获取标签统计失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await api.createTag({ 
        name: newTagName.trim(),
        is_visible: isVisible,
        min_role: minRole,
        weight: weight
      });
      if (error) throw error;
      toast.success('标签创建成功');
      setNewTagName('');
      setIsVisible(true);
      setMinRole('pt');
      setWeight(0);
      fetchTags();
      logAction('create_tag', { name: newTagName.trim() });
    } catch (e: any) {
      toast.error(`创建失败: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditIsVisible(tag.is_visible ?? true);
    setEditMinRole(tag.min_role || 'pt');
    setEditWeight(tag.weight || 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdateTag = async () => {
    if (!editingId || !editName.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await api.updateTag(editingId, {
        name: editName.trim(),
        is_visible: editIsVisible,
        min_role: editMinRole,
        weight: editWeight
      });
      if (error) throw error;
      toast.success('标签已更新');
      setEditingId(null);
      fetchTags();
    } catch (e: any) {
      toast.error(`更新失败: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除此标签吗？这不会删除已标记的作品，但会移除作品上的此标签。', { variant: 'destructive' });
    if (!confirmed) return;
    
    try {
      const { error } = await api.deleteTag(id);
      if (error) throw error;
      toast.success('标签已删除');
      fetchTags();
    } catch (e: any) {
      toast.error(`删除失败: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-foreground">标签中心</h2>
            <p className="text-sm text-muted-foreground mt-1">设置用于自动识别作品来源或分类的标签关键字及其内容管理</p>
          </div>
          
          <TabsList className="grid grid-cols-2 w-full md:w-[300px] rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="management" className="rounded-lg gap-2 text-xs">
              <TagIcon className="w-3.5 h-3.5" />
              标签定义
            </TabsTrigger>
            <TabsTrigger value="content" className="rounded-lg gap-2 text-xs">
              <ImageIcon className="w-3.5 h-3.5" />
              标签图集
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="management" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-bold">添加新标签</CardTitle>
                <CardDescription>当作品标题包含此文字时，系统会自动打上此标签</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTag} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">标签名称</Label>
                    <Input 
                      placeholder="例如：小红书、微博" 
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="rounded-xl"
                      disabled={submitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">显示权重 (0-100)</Label>
                    <Input 
                      type="number"
                      placeholder="权重越高标签越大" 
                      value={weight}
                      onChange={(e) => setWeight(parseInt(e.target.value) || 0)}
                      className="rounded-xl"
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold">前端显示</Label>
                      <p className="text-[10px] text-muted-foreground">是否在标签云等页面展示</p>
                    </div>
                    <Switch checked={isVisible} onCheckedChange={setIsVisible} disabled={submitting} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold">最低访问权限</Label>
                    <Select value={minRole} onValueChange={setMinRole} disabled={submitting}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="pt">普通用户 (PT)</SelectItem>
                        <SelectItem value="vip">黄金会员 (VIP)</SelectItem>
                        <SelectItem value="svip">铂金会员 (SVIP)</SelectItem>
                        <SelectItem value="vvip">黑钻会员 (VVIP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full rounded-xl font-bold" 
                    disabled={submitting || !newTagName.trim()}
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    添加标签
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">标签信息</TableHead>
                    <TableHead className="font-bold">媒体数量</TableHead>
                    <TableHead className="font-bold">可见性</TableHead>
                    <TableHead className="font-bold">权限</TableHead>
                    <TableHead className="text-right font-bold">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : tags.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        暂无标签记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    tags.map(tag => (
                      <TableRow key={tag.id} className={cn(editingId === tag.id && "bg-primary/5")}>
                        <TableCell>
                          {editingId === tag.id ? (
                            <div className="space-y-2">
                              <Input 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-8 rounded-lg text-sm"
                              />
                              <div className="flex items-center gap-2">
                                <Label className="text-[10px] text-muted-foreground">权重:</Label>
                                <Input 
                                  type="number"
                                  value={editWeight}
                                  onChange={(e) => setEditWeight(parseInt(e.target.value) || 0)}
                                  className="h-7 w-20 rounded-lg text-xs"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <TagIcon className="w-4 h-4 text-primary" />
                                <span className="font-bold">{tag.name}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">权重: {tag.weight || 0}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-lg font-mono text-[10px]">
                            {(tag as any).media_count || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editingId === tag.id ? (
                            <Switch checked={editIsVisible} onCheckedChange={setEditIsVisible} />
                          ) : (
                            <Badge variant={tag.is_visible ? "outline" : "destructive"} className="rounded-lg text-[10px]">
                              {tag.is_visible ? "显示" : "隐藏"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === tag.id ? (
                            <Select value={editMinRole} onValueChange={setEditMinRole}>
                              <SelectTrigger className="h-8 w-24 rounded-lg text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="pt">PT</SelectItem>
                                <SelectItem value="vip">VIP</SelectItem>
                                <SelectItem value="svip">SVIP</SelectItem>
                                <SelectItem value="vvip">VVIP</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="rounded-lg text-[10px] uppercase">
                              {tag.min_role || 'pt'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === tag.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="text-green-500 rounded-full h-8 w-8 hover:bg-green-50" 
                                onClick={handleUpdateTag}
                                disabled={submitting}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="text-muted-foreground rounded-full h-8 w-8 hover:bg-muted" 
                                onClick={cancelEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-primary rounded-full h-8 w-8 hover:bg-primary/5" 
                                onClick={() => startEdit(tag)}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 rounded-full h-8 w-8 hover:bg-red-50" 
                                onClick={() => handleDeleteTag(tag.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="mt-0">
          <TagContentSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
