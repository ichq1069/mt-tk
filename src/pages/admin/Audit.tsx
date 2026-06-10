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
import type { MediaItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Check, X, Loader2, Edit2, CirclePlay, CheckSquare, Square, Trash, Archive, 
  CircleArrowUp, Heart, ThumbsDown, RotateCcw, Trash2, ChevronLeft, ChevronRight, 
  Image as ImageIcon 
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminNav } from '@/components/admin/AdminNav';
import { MediaPreview } from '@/components/MediaPreview';
import { EnhancedPagination } from '@/components/common/EnhancedPagination';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';

import { cn } from '@/lib/utils';

const cleanTitle = (name: string | null | undefined, maxLength = 30): string => {
  if (!name) return '未命名';
  let cleaned = name.replace(/\.[^/.]+$/, "");
  const invalidPatterns = [/^[0-9]{8,}$/, /^[a-f0-9]{32}$/i, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, /^[a-zA-Z0-9_-]{20,}$/, /^IMG_[0-9]+$/i, /^DSC[0-9]+$/i, /^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}$/, /^Screenshot_[0-9_-]+$/i, /^WechatIMG[0-9]+$/i, /^QQ图片[0-9]+$/];
  for (const pattern of invalidPatterns) if (pattern.test(cleaned)) return '未命名';
  cleaned = cleaned.trim();
  if (!cleaned) return '未命名';
  if (cleaned.length > maxLength) return cleaned.substring(0, maxLength) + '...';
  return cleaned;
};

const stripExtension = (name: string | null | undefined) => {
  if (!name) return '';
  return name.replace(/\.[^/.]+$/, "");
};

export default function Audit() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [isBatchReject, setIsBatchReject] = useState(false);
  const [reason, setReason] = useState('');
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isArchivingAll, setIsArchivingAll] = useState(false);

  // 监听全局关闭预览事件
  useEffect(() => {
    const handleClose = () => setPreviewIndex(-1);
    window.addEventListener('closeMediaPreview', handleClose);
    return () => window.removeEventListener('closeMediaPreview', handleClose);
  }, []);

  useEffect(() => {
    setPage(0);
  }, [activeTab]);

  useEffect(() => {
    fetchMedia();
    setSelectedIds([]);
  }, [activeTab, page, pageSize]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      let res;
      if (activeTab === 'pending') res = await api.getPendingMedia(page, pageSize);
      else if (activeTab === 'archived') res = await api.getArchivedMedia(page, pageSize);
      else if (activeTab === 'deleted') res = await api.getDeletedMedia(page, pageSize);
      else res = await api.getApprovedMedia(page, pageSize);
      
      if (res.error) throw res.error;
      
      const results = res.data || [];
      const totalCount = res.total || 0;

      // 如果当前页没有数据且总数大于 0
      if (results.length === 0 && totalCount > 0) {
        // 如果不是第一页且没数据，回退到上一页
        if (page > 0) {
          const maxPage = Math.max(0, Math.ceil(totalCount / pageSize) - 1);
          setPage(Math.min(page - 1, maxPage));
          return; // setPage 会触发 useEffect 再次调用 fetchMedia
        }
      }

      setItems(results);
      setTotal(totalCount);
    } catch (error: any) {
      toast.error(`获取内容失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const item = items.find(i => i.id === id);
    try {
      const { error } = await api.updateMediaStatus(id, 'approved');
      if (error) throw error;
      if (item?.user_id) api.createOrMergeAuditNotification({ user_id: item.user_id, media_id: id, media_title: item.title || '无标题', status: 'approved' });
      toast.success('审核通过');
      fetchMedia(); // 处理完后直接重新获取当前页数据，实现自动补全
    } catch (error: any) { toast.error(`操作失败: ${error.message}`); }
  };

  const handleUpdateStatus = async (id: string, status: any, reason?: string) => {
    try {
      const { error } = await api.updateMediaStatus(id, status, reason);
      if (error) throw error;
      toast.success(status === 'archived' ? '内容已下架' : '内容已上架');
      fetchMedia(); // 自动补全
    } catch (error: any) { toast.error(`操作失败: ${error.message}`); }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await api.batchUpdateMediaStatus(selectedIds, 'approved');
      if (error) throw error;
      toast.success(`批量通过成功: ${selectedIds.length} 条内容`);
      setSelectedIds([]);
      fetchMedia(); // 自动补全
    } catch (error: any) { toast.error(`批量操作失败: ${error.message}`); }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0 || !reason) return;
    try {
      const itemsToNotify = items.filter(i => selectedIds.includes(i.id));
      const { error } = await api.batchUpdateMediaStatus(selectedIds, 'rejected', reason);
      if (error) throw error;
      
      // 批量发送通知
      itemsToNotify.forEach(item => {
        if (item.user_id) {
          api.createOrMergeAuditNotification({
            user_id: item.user_id,
            media_id: item.id,
            media_title: item.title || '无标题',
            status: 'rejected',
            reason: reason
          });
        }
      });

      toast.success(`批量拒绝成功: ${selectedIds.length} 条内容`);
      setSelectedIds([]);
      setIsBatchReject(false);
      setReason('');
      fetchMedia(); // 自动补全
    } catch (error: any) { toast.error(`批量拒绝失败: ${error.message}`); }
  };

  const handleReject = async () => {
    if (isBatchReject) return handleBatchReject();
    if (!rejectingId || !reason) return;
    const item = items.find(i => i.id === rejectingId);
    try {
      const { error } = await api.updateMediaStatus(rejectingId, 'rejected', reason);
      if (error) throw error;
      if (item?.user_id) {
        api.createOrMergeAuditNotification({
          user_id: item.user_id,
          media_id: rejectingId,
          media_title: item.title || '无标题',
          status: 'rejected',
          reason: reason
        });
      }
      toast.success('已拒绝上传');
      setRejectingId(null);
      setReason('');
      fetchMedia(); // 自动补全
    } catch (error: any) { toast.error(`操作失败: ${error.message}`); }
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  const selectAll = () => setSelectedIds(selectedIds.length === items.length ? [] : items.map(i => i.id));

  const handleUpdate = async () => {
    if (!editingItem) return;
    setUpdating(true);
    try {
      const { error } = await api.updateMediaItem(editingItem.id, { title: editTitle, url: editUrl, thumbnail_url: editThumbnailUrl });
      if (error) throw error;
      toast.success('更新成功');
      setEditingItem(null);
      fetchMedia(); // 自动补全
    } catch (error: any) { toast.error(`更新失败: ${error.message}`); } finally { setUpdating(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await api.deleteMedia(id);
      if (error) throw error;
      toast.success('已移动至回收站');
      setItemToDelete(null);
      fetchMedia(); // 自动补全
    } catch (error: any) { toast.error(`删除失败: ${error.message}`); }
  };

  const handleClearTrash = async () => {
    try {
      setClearing(true);
      const { error } = await api.supabase
        .from('media_items')
        .delete()
        .eq('is_deleted', true);
      
      if (error) throw error;
      toast.success('回收站已清空');
      fetchMedia();
    } catch (error: any) {
      toast.error(`清空失败: ${error.message}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <AdminNav />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-background/50 backdrop-blur-md p-6 rounded-3xl border border-border/40 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">内容审核中心 <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none">{total}</Badge></h1>
          <p className="text-sm text-muted-foreground mt-1">管理用户上传的图片、视频、图集及待审核资源</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll} className="text-xs rounded-xl h-9 border-muted-foreground/20">
            {selectedIds.length === items.length ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
            {selectedIds.length === items.length ? '取消全选' : '全选当页'}
          </Button>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleBatchApprove} className="bg-green-500 hover:bg-green-600 rounded-xl h-9">通过 ({selectedIds.length})</Button>
              <Button variant="outline" size="sm" className="text-red-500 rounded-xl h-9" onClick={() => setIsBatchReject(true)}>拒绝 ({selectedIds.length})</Button>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl bg-muted/50 p-1">
          <TabsTrigger value="pending" className="rounded-lg">待审核</TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg">已发布</TabsTrigger>
          <TabsTrigger value="archived" className="rounded-lg">已下架</TabsTrigger>
          <TabsTrigger value="deleted" className="rounded-lg">回收站</TabsTrigger>
        </TabsList>

        <div className="pt-4 space-y-2">
          {activeTab === 'deleted' && items.length > 0 && (
            <div className="flex justify-end mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-500 rounded-xl h-9 border-red-200 hover:bg-red-50 gap-2"
                onClick={handleClearTrash}
                disabled={clearing}
              >
                {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                清空回收站
              </Button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground bg-muted/20 rounded-2xl border-2 border-dashed">暂无内容</div>
          ) : (
            <>
              {items.map((item) => (
                <div key={item.id} className={cn("flex items-center gap-3 p-2 bg-card border border-border/40 rounded-xl transition-all hover:bg-accent/5 cursor-pointer", selectedIds.includes(item.id) && "border-primary ring-2 ring-primary/20")} onClick={() => toggleSelect(item.id)}>
                  <div className="w-16 h-16 shrink-0 bg-muted rounded-lg overflow-hidden relative">
                    <ProtectedMedia src={item.thumbnail_url || item.url} className="w-full h-full object-contain" alt="" ruleKey="审核" type="image" />
                    {item.type === 'video' && <div className="absolute inset-0 flex items-center justify-center bg-black/10"><CirclePlay className="text-white w-6 h-6" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{cleanTitle(item.title)}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1">上传者: {item.profiles?.username || '未知'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {activeTab === 'pending' ? (
                      <>
                        <Button size="icon" variant="ghost" className="text-green-500 rounded-full" onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }}><Check className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-red-500 rounded-full" onClick={(e) => { e.stopPropagation(); setRejectingId(item.id); }}><X className="w-4 h-4" /></Button>
                      </>
                    ) : (
                      <Button size="icon" variant="ghost" className="text-red-400 rounded-full" onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id); }}><Trash className="w-3.5 h-3.5" /></Button>
                    )}
                  </div>
                </div>
              ))}
              <EnhancedPagination currentPage={page} totalPages={Math.ceil(total / pageSize)} onPageChange={setPage} pageSize={pageSize} onPageSizeChange={setPageSize} totalItems={total} className="mt-8" />
            </>
          )}
        </div>
      </Tabs>

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>编辑信息</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>标题</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditingItem(null)}>取消</Button><Button onClick={handleUpdate} disabled={updating}>保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {previewIndex >= 0 && <MediaPreview items={items} initialIndex={previewIndex} ruleKey="审核" onClose={() => setPreviewIndex(-1)} />}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该内容吗？内容将被移动至回收站。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => itemToDelete && handleDelete(itemToDelete)}
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
