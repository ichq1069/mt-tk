import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/db/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { MediaItem, ContentCategory } from '@/types';

interface EditMediaDialogProps {
  item: MediaItem | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedItem: MediaItem) => void;
}

export function EditMediaDialog({ item, isOpen, onOpenChange, onSave }: EditMediaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    video_url: '',
    thumbnail_url: '',
    category_id: '',
    tags: '',
  });
  const [categories, setCategories] = useState<ContentCategory[]>([]);

  useEffect(() => {
    if (item && isOpen) {
      setFormData({
        title: item.title || '',
        url: item.url || '',
        video_url: (item.metadata as any)?.video_url || '',
        thumbnail_url: item.thumbnail_url || '',
        category_id: item.category_id || 'none',
        tags: item.tags?.join(', ') || item.media_tags?.map(mt => mt.tags?.name).filter(Boolean).join(', ') || '',
      });
    }
  }, [item, isOpen]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data } = await api.getContentCategories();
        setCategories(data || []);
      } catch (e) {
        console.error('Failed to fetch categories:', e);
      }
    };
    if (isOpen) fetchCats();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setLoading(true);
    try {
      const tagList = formData.tags.split(/[，,]+/).map(t => t.trim()).filter(Boolean);
      const updates: any = {
        title: formData.title,
        url: formData.url,
        thumbnail_url: formData.thumbnail_url,
        category_id: formData.category_id === 'none' ? null : formData.category_id,
        tags: tagList,
        metadata: {
          ...(item.metadata || {}),
          video_url: formData.video_url
        }
      };

      // 这里直接使用 api.updateMediaItem，我们需要在 api 中确保它也能同步 media_tags
      const { data, error } = await api.updateMediaItem(item.id, updates);
      if (error) throw error;

      toast.success('更新成功');
      onSave(data);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Update failed:', error);
      toast.error('更新失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg rounded-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">编辑作品信息</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider opacity-60">标题</Label>
            <Input 
              className="rounded-xl border-border/50 bg-muted/30 h-11"
              value={formData.title} 
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="请输入作品标题"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider opacity-60">内容地址 (图片/视频链接)</Label>
            <Input 
              className="rounded-xl border-border/50 bg-muted/30 h-11"
              value={formData.url} 
              onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="请输入图片或视频原始地址"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider opacity-60">视频直链 (可选)</Label>
            <Input 
              className="rounded-xl border-border/50 bg-muted/30 h-11"
              value={formData.video_url} 
              onChange={e => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
              placeholder="请输入视频 MP4 地址"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider opacity-60">封面地址 (缩略图)</Label>
            <Input 
              className="rounded-xl border-border/50 bg-muted/30 h-11"
              value={formData.thumbnail_url} 
              onChange={e => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
              placeholder="请输入封面图片地址"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">分类</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={val => setFormData(prev => ({ ...prev, category_id: val }))}
              >
                <SelectTrigger className="rounded-xl border-border/50 bg-muted/30 h-11">
                  <SelectValue placeholder="请选择分类" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">无分类</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider opacity-60">标签 (逗号或空格分隔)</Label>
            <Input 
              className="rounded-xl border-border/50 bg-muted/30 h-11"
              value={formData.tags} 
              onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="例如: 小红书, 泳装, 模特"
            />
          </div>

          <DialogFooter className="pt-6 flex flex-col-reverse md:flex-row gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="rounded-xl h-12 font-bold flex-1"
            >
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="rounded-xl h-12 font-bold flex-1 shadow-lg shadow-primary/20"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              保存修改
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default EditMediaDialog;
