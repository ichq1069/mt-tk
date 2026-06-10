import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Bell, Plus, Trash2, Edit, Save, X, Megaphone, 
  CheckCircle, Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { formatBeijingTime } from '@/lib/utils';

export function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'bar', // 'bar' | 'modal'
    is_active: true,
    is_mandatory: false,
    end_time: ''
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getAllAnnouncements();
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      console.error('Fetch announcements error:', error);
      toast.error(`获取公告失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (announcement?: any) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title || '',
        content: announcement.content || '',
        type: announcement.type || 'bar',
        is_active: announcement.is_active ?? true,
        is_mandatory: announcement.is_mandatory ?? false,
        end_time: announcement.end_time ? new Date(announcement.end_time).toISOString().slice(0, 16) : ''
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        content: '',
        type: 'bar',
        is_active: true,
        is_mandatory: false,
        end_time: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title?.trim() || !formData.content?.trim()) {
      toast.error('请填写标题和内容');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        type: formData.type,
        is_active: formData.is_active,
        is_mandatory: formData.is_mandatory,
        id: editingAnnouncement?.id,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null
      };
      
      const { error } = await api.upsertAnnouncement(payload);
      if (error) throw error;
      
      toast.success(editingAnnouncement ? '更新成功' : '创建成功');
      setDialogOpen(false);
      fetchAnnouncements();
    } catch (error: any) {
      console.error('Save announcement error:', error);
      toast.error(`保存失败: ${error.message || '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除这条公告吗？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteAnnouncement(id);
      if (error) throw error;
      toast.success('删除成功');
      fetchAnnouncements();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" />
            公告管理
          </h2>
          <p className="text-sm text-muted-foreground">管理系统顶部公告栏和弹窗公告</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-2xl gap-2 font-bold h-11 px-6 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          发布公告
        </Button>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px] font-bold">标题</TableHead>
                <TableHead className="font-bold">内容预览</TableHead>
                <TableHead className="font-bold">展示方式</TableHead>
                <TableHead className="font-bold">状态</TableHead>
                <TableHead className="font-bold">到期时间</TableHead>
                <TableHead className="text-right font-bold">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : announcements.length > 0 ? (
                announcements.map((ann) => (
                  <TableRow key={ann.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold">{ann.title}</TableCell>
                    <TableCell className="max-w-md truncate text-xs text-muted-foreground">{ann.content}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {ann.type === 'bar' ? (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-none px-2 py-0.5 rounded-lg text-[10px]">
                            顶部公告栏
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-none px-2 py-0.5 rounded-lg text-[10px]">
                            页面弹窗
                          </Badge>
                        )}
                        {ann.is_mandatory && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-none px-2 py-0.5 rounded-lg text-[10px]">
                            强制确认
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {ann.is_active ? (
                        <Badge className="bg-green-500/10 text-green-600 border-none px-2 py-0.5 rounded-lg text-[10px]">
                          展示中
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="px-2 py-0.5 rounded-lg text-[10px]">已关闭</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ann.end_time ? formatBeijingTime(ann.end_time) : '永久展示'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenDialog(ann)}
                          className="w-8 h-8 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(ann.id)}
                          className="w-8 h-8 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                    <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-10" />
                    <p className="font-medium">暂无公告内容</p>
                    <p className="text-xs mt-1">发布公告告知用户最新动态</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] p-8 border-none bg-slate-900/95 backdrop-blur-2xl text-white shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingAnnouncement ? '编辑公告' : '发布新公告'}</DialogTitle>
            <CardDescription className="text-slate-400">配置公告的展示内容、类型和有效期</CardDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label className="text-sm font-bold ml-1">公告标题</Label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：系统维护通知"
                className="rounded-2xl h-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:ring-primary/20"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-bold ml-1">公告内容</Label>
              <Textarea 
                value={formData.content} 
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="请输入详细的公告内容..."
                className="rounded-2xl min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-sm font-bold ml-1">展示方式</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className="rounded-2xl h-12 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="选择展示方式" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-white/10 bg-slate-900 text-white">
                    <SelectItem value="bar">顶部公告栏</SelectItem>
                    <SelectItem value="modal">页面弹窗</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-sm font-bold ml-1">到期时间 (可选)</Label>
                <Input 
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="rounded-2xl h-12 bg-white/5 border-white/10 text-white [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">是否激活</Label>
                <p className="text-xs text-slate-400">关闭后公告将立即停止展示</p>
              </div>
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>
            {formData.type === 'modal' && (
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">强制确认</Label>
                  <p className="text-xs text-slate-400">用户必须点击确认才能关闭弹窗</p>
                </div>
                <Switch 
                  checked={formData.is_mandatory}
                  onCheckedChange={(v) => setFormData({ ...formData, is_mandatory: v })}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => setDialogOpen(false)}
              className="rounded-2xl h-12 font-bold px-6 text-slate-400 hover:text-white hover:bg-white/5"
            >
              取消
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="rounded-2xl h-12 font-black px-8 shadow-xl shadow-primary/20"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {editingAnnouncement ? '保存更改' : '立即发布'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
