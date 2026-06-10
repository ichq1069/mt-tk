import React, { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from '@/db/api';
import type { Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit2, Trash2, Hash, ChevronRight, FolderTree } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function TagManagement() {
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    parent_id: 'none',
    level: 0,
    weight: 0,
  });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data } = await api.getTags();
      setTags(data || []);
    } catch (e) {
      console.error('Failed to fetch tags:', e);
      toast.error('加载标签失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        name: tag.name,
        parent_id: tag.parent_id || 'none',
        level: tag.level || 0,
        weight: tag.weight || 0,
      });
    } else {
      setEditingTag(null);
      setFormData({
        name: '',
        parent_id: 'none',
        level: 0,
        weight: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('标签名称不能为空');
      return;
    }

    try {
      if (editingTag) {
        await api.updateTag(editingTag.id, {
          name: formData.name,
          parent_id: formData.parent_id === 'none' ? null : formData.parent_id,
          level: formData.level,
          weight: formData.weight,
        });
        toast.success('标签已更新');
      } else {
        await api.createTag({
          name: formData.name,
          parent_id: formData.parent_id === 'none' ? null : formData.parent_id,
          level: formData.level,
          weight: formData.weight,
        });
        toast.success('标签已创建');
      }
      setIsDialogOpen(false);
      fetchTags();
    } catch (e: any) {
      toast.error(`操作失败: ${e.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteTag(id);
      toast.success('标签已删除');
      setTagToDelete(null);
      fetchTags();
    } catch (e: any) {
      toast.error(`删除失败: ${e.message}`);
    }
  };

  // 构建标签树结构
  const buildTagTree = (tags: Tag[]): Tag[] => {
    const tagMap = new Map<string, Tag & { children?: Tag[] }>();
    tags.forEach(tag => tagMap.set(tag.id, { ...tag, children: [] }));

    const roots: Tag[] = [];
    tagMap.forEach(tag => {
      if (tag.parent_id && tagMap.has(tag.parent_id)) {
        tagMap.get(tag.parent_id)!.children!.push(tag);
      } else {
        roots.push(tag);
      }
    });

    return roots;
  };

  const renderTagTree = (tags: Tag[], depth = 0) => {
    return tags.map(tag => (
      <div key={tag.id} className={cn("border-l-2 border-border/30", depth > 0 && "ml-6")}>
        <div className="flex items-center justify-between p-3 hover:bg-muted/30 rounded-lg transition-colors group">
          <div className="flex items-center gap-3 flex-1">
            {depth > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <Hash className="w-4 h-4 text-primary" />
            <span className="font-medium">{tag.name}</span>
            <Badge variant="secondary" className="text-xs">
              权重: {tag.weight || 0}
            </Badge>
            {tag.level !== undefined && tag.level > 0 && (
              <Badge variant="outline" className="text-xs">
                L{tag.level}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleOpenDialog(tag)}
            >
              <Edit2 className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setTagToDelete(tag.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        {(tag as any).children && (tag as any).children.length > 0 && (
          <div className="ml-4">
            {renderTagTree((tag as any).children, depth + 1)}
          </div>
        )}
      </div>
    ));
  };

  const tagTree = buildTagTree(tags);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">标签管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理内容标签，支持多级分类与权重配置
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          新建标签
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-primary" />
            标签树
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : tagTree.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              暂无标签，点击右上角新建标签
            </div>
          ) : (
            <div className="space-y-1">
              {renderTagTree(tagTree)}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTag ? '编辑标签' : '新建标签'}</DialogTitle>
            <DialogDescription>
              配置标签名称、父标签、层级与权重
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">标签名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入标签名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parent">父标签（可选）</Label>
              <Select
                value={formData.parent_id}
                onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择父标签" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无（根标签）</SelectItem>
                  {tags
                    .filter(t => t.id !== editingTag?.id)
                    .map(tag => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">层级</Label>
              <Input
                id="level"
                type="number"
                min="0"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">权重</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                权重越高，标签在标签云中显示越大
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除标签</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除此标签吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => tagToDelete && handleDelete(tagToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
