
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
import { formatBeijingTime, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
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
import { SystemText, UserText } from '@/components/common/KeywordText';
import { 
  LayoutDashboard, FileCheck, Users as UsersIcon, Settings, Heart, ThumbsDown, Loader2, X, Edit2, Trash, 
  Archive, CircleArrowUp, CheckSquare, Square, CirclePlay, Video, Search, Edit3, Ban, UserCheck, 
  Mail, Calendar, Cloud, Save, LogOut, Share, Download, Database as DatabaseIcon, Monitor, 
  Image as ImageIcon, Filter, RefreshCcw, ListFilter, CircleCheckBig, Circle, MousePointer2, Trash2, FolderPlus, Tags, Layers,
  Check, RotateCcw,
  ArrowUp, ArrowDown, BarChart3, PieChart as PieChartIcon, TrendingUp, Activity, Users2, ShieldAlert, 
  Trophy, Crown, Flame, FileCode2, Server, Globe, Database, Key, Shield, Rocket, Terminal, 
  ExternalLink, Settings2, Info, TriangleAlert, Play, Bell, Eye, CalendarCheck
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { EnhancedPagination } from '@/components/common/EnhancedPagination';
import MultiSelect from '@/components/ui/multi-select';
import { api as myApi } from '@/db/api'; // Avoid conflict with any existing 'api'

import { ProtectedMedia } from '@/components/common/ProtectedMedia';

// 辅助函数：移除文件后缀名
const stripExtension = (name: string | null | undefined) => {
  if (!name) return '';
  return name.replace(/\.[^/.]+$/, "");
};

export function AuditSection({ onAction }: { onAction?: () => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const { logAction } = useAdminLogger('audit');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [jumpPage, setJumpPage] = useState('');
  
  // 筛选与搜索
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

const [categories, setCategories] = useState<any[]>([]);
const fetchCategories = async () => {
  const { data } = await supabase.from('content_categories').select('*').order('name');
  setCategories(data || []);
};

const [albums, setAlbums] = useState<any[]>([]);
const [allTags, setAllTags] = useState<any[]>([]);

const fetchTags = async () => {
  const { data } = await myApi.getTags();
  setAllTags(data || []);
};

const fetchAlbums = async () => {
  const { data } = await supabase.from('photo_albums').select('id, title').order('created_at', { ascending: false });
  setAlbums(data || []);
};

useEffect(() => {
  fetchCategories();
  fetchAlbums();
  fetchTags();
}, []);

const [isBatchCategoryOpen, setIsBatchCategoryOpen] = useState(false);
const [batchCategory, setBatchCategory] = useState('all');
const [isBatchTagOpen, setIsBatchTagOpen] = useState(false);
const [isBatchResetTagOpen, setIsBatchResetTagOpen] = useState(false);
const [batchTags, setBatchTags] = useState<string[]>([]);
const [isBatchAlbumOpen, setIsBatchAlbumOpen] = useState(false);
const [selectedAlbumId, setSelectedAlbumId] = useState('');

const handleBatchCategory = async () => {
  if (selectedIds.length === 0 || batchCategory === 'all') return;
  const loadingToast = toast.loading(`正在更新 ${selectedIds.length} 个内容的分类...`);
  try {
    const { error } = await (supabase
      .from('media_items') as any)
      .update({ category_id: batchCategory })
      .in('id', selectedIds);

    if (error) throw error;
    toast.success(`成功更新 ${selectedIds.length} 个内容的分类`, { id: loadingToast });
    fetchMedia();
    setIsBatchCategoryOpen(false);
    setSelectedIds([]);
  } catch (error: any) {
    toast.error(`更新失败: ${error.message}`, { id: loadingToast });
  }
};

const handleBatchTags = async () => {
  if (selectedIds.length === 0 || batchTags.length === 0) return;
  const loadingToast = toast.loading(`正在为 ${selectedIds.length} 个内容添加标签...`);
  try {
    const tagList = Array.from(new Set(batchTags.map(t => t.trim()).filter(Boolean)));
    if (tagList.length === 0) return;

    // 1. 获取或创建所有需要的标签 ID
    const tagIds: string[] = [];
    
    // 先查询现有的标签
    const { data: existingTags } = await (supabase.from('tags') as any)
      .select('id, name')
      .in('name', tagList);
    
    const existingTagNameMap = new Map<string, string>(existingTags?.map((t: any) => [t.name, t.id]) || []);
    
    // 处理缺失的标签
    for (const tagName of tagList) {
      if (existingTagNameMap.has(tagName)) {
        tagIds.push(existingTagNameMap.get(tagName)!);
      } else {
        const { data: newTag, error: insertError } = await (supabase.from('tags') as any)
          .insert({ name: tagName })
          .select('id')
          .single();
        
        if (insertError) {
          console.error(`创建标签 ${tagName} 失败:`, insertError);
          continue;
        }
        if (newTag?.id) {
          tagIds.push(newTag.id);
          existingTagNameMap.set(tagName, newTag.id);
        }
      }
    }

    if (tagIds.length === 0) {
      toast.error('未找到有效的标签，请检查后重试', { id: loadingToast });
      return;
    }

    // 2. 批量插入新标签关联 (使用 upsert 实现追加)
    const insertRows = selectedIds.flatMap(mediaId => 
      tagIds.map(tag_id => ({ media_id: mediaId, tag_id }))
    );

    // 分批插入
    const batchSize = 1000;
    for (let i = 0; i < insertRows.length; i += batchSize) {
      const batch = insertRows.slice(i, i + batchSize);
      const { error: insertError } = await (supabase.from('media_tags') as any).upsert(batch, { onConflict: 'media_id,tag_id' });
      if (insertError) throw insertError;
    }

    toast.success(`成功为 ${selectedIds.length} 个内容添加了新标签`, { id: loadingToast });
    fetchMedia();
    setIsBatchTagOpen(false);
    setSelectedIds([]);
    setBatchTags([]);
  } catch (error: any) {
    console.error('批量更新标签失败:', error);
    toast.error(`更新失败: ${error.message}`, { id: loadingToast });
  }
};

const handleBatchResetTags = async () => {
  if (selectedIds.length === 0) return;
  const loadingToast = toast.loading(`正在重置 ${selectedIds.length} 个内容的标签...`);
  try {
    const tagList = Array.from(new Set(batchTags.map(t => t.trim()).filter(Boolean)));

    // 1. 先删除原有标签关联
    const { error: deleteError } = await (supabase.from('media_tags') as any)
      .delete()
      .in('media_id', selectedIds);
    
    if (deleteError) throw deleteError;

    // 2. 如果提供了新标签，则添加它们
    if (tagList.length > 0) {
      const tagIds: string[] = [];
      const { data: existingTags } = await (supabase.from('tags') as any)
        .select('id, name')
        .in('name', tagList);
      
      const existingTagNameMap = new Map<string, string>(existingTags?.map((t: any) => [t.name, t.id]) || []);
      
      for (const tagName of tagList) {
        if (existingTagNameMap.has(tagName)) {
          tagIds.push(existingTagNameMap.get(tagName)!);
        } else {
          const { data: newTag } = await (supabase.from('tags') as any)
            .insert({ name: tagName })
            .select('id')
            .single();
          if (newTag?.id) {
            tagIds.push(newTag.id);
            existingTagNameMap.set(tagName, newTag.id);
          }
        }
      }

      if (tagIds.length > 0) {
        const insertRows = selectedIds.flatMap(mediaId => 
          tagIds.map(tag_id => ({ media_id: mediaId, tag_id }))
        );
        const batchSize = 1000;
        for (let i = 0; i < insertRows.length; i += batchSize) {
          const batch = insertRows.slice(i, i + batchSize);
          const { error: insertError } = await (supabase.from('media_tags') as any).insert(batch);
          if (insertError) throw insertError;
        }
      }
    }

    toast.success(`成功重置了 ${selectedIds.length} 个内容的标签`, { id: loadingToast });
    fetchMedia();
    setIsBatchResetTagOpen(false);
    setSelectedIds([]);
    setBatchTags([]);
  } catch (error: any) {
    console.error('重置标签失败:', error);
    toast.error(`重置失败: ${error.message}`, { id: loadingToast });
  }
};

const handleConvertToAlbum = async () => {
  if (selectedIds.length === 0 || !selectedAlbumId) return;
  const loadingToast = toast.loading(`正在将 ${selectedIds.length} 个内容加入写真库...`);
  try {
    const { data: selectedItems, error: fetchError } = await (supabase
      .from('media_items') as any)
      .select('url, thumbnail_url, title, type')
      .in('id', selectedIds);

    if (fetchError || !selectedItems) throw fetchError || new Error('获取内容详情失败');

    const { data: maxOrderData } = await (supabase
      .from('album_photos') as any)
      .select('sort_order')
      .eq('album_id', selectedAlbumId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    let currentSortOrder = (maxOrderData?.sort_order || 0) + 1;

    const albumPhotos = (selectedItems as any[]).map(item => ({
      album_id: selectedAlbumId,
      url: item.url,
      thumbnail_url: item.thumbnail_url,
      level: 'normal',
      sort_order: currentSortOrder++
    }));

    const { error: insertError } = await (supabase.from('album_photos') as any).insert(albumPhotos);
    if (insertError) throw insertError;

    toast.success(`成功将 ${selectedIds.length} 个内容加入写真库`, { id: loadingToast });
    setIsBatchAlbumOpen(false);
    setSelectedIds([]);
  } catch (error: any) {
    toast.error(`加入失败: ${error.message}`, { id: loadingToast });
  }
};
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [isBatchReject, setIsBatchReject] = useState(false);
  const [reason, setReason] = useState('');
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [mediaSizes, setMediaSizes] = useState<{ original: string; thumbnail: string }>({ original: '-', thumbnail: '-' });
  const [updating, setUpdating] = useState(false);
  const [isArchivingAll, setIsArchivingAll] = useState(false);

  useEffect(() => {
    setPage(0);
  }, [activeTab, type]);

  useEffect(() => {
    fetchMedia();
    setSelectedIds([]);
    setJumpPage((page + 1).toString());
  }, [activeTab, page, limit, type]);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      let res;
      // 使用通用的 getMediaLibrary 来支持搜索和类型筛选，或者使用现有的但增加参数
      // 为了保持逻辑一致，我们尽量使用支持更多参数的 API
      if (activeTab === 'deleted') {
        res = await api.getDeletedMedia(page, limit);
      } else {
        // 对于 audit 页面，我们通常只看待审核、已发布、已下架
        // 我们可以复用 getMediaLibrary 逻辑
        res = await api.getMediaLibrary(page, limit, search, activeTab, type);
      }
      
      if (res.error) throw res.error;
      setItems(res.data || []);
      setTotal(res.total || 0);
    } catch (error: any) {
      toast.error(`获取内容失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(0);
    fetchMedia();
  };

  const handleJumpPage = (e?: React.FormEvent) => {
    e?.preventDefault();
    const jumpNum = parseInt(jumpPage);
    const totalPages = Math.ceil(total / limit);
    if (isNaN(jumpNum) || jumpNum < 1 || (totalPages > 0 && jumpNum > totalPages)) {
      toast.error('请输入有效的页码');
      return;
    }
    setPage(jumpNum - 1);
  };

const handleApprove = async (id: string) => {
const item = items.find(i => i.id === id);
try {
const { error } = await api.updateMediaStatus(id, 'approved');
if (error) throw error;

// 发送通知给用户
if (item?.user_id) {
api.bufferNotification({ user_id: item.user_id, role_id: null,
title: '作品审核通过',
content: `您的作品《${item.title || '无标题'}》已通过审核并发布。`,
type: 'audit',
link: '/profile?tab=approved',
link_type: 'internal'
});
}

fetchMedia();


toast.success('审核通过');
onAction?.();
} catch (error: any) {
toast.error(`操作失败: ${error.message}`);
}
};

const handleUpdateStatus = async (id: string, status: any, reason?: string) => {
try {
const { error } = await api.updateMediaStatus(id, status, reason);
if (error) throw error;
fetchMedia();

toast.success(status === 'archived' ? '内容已下架' : '内容已上架');
onAction?.();
} catch (error: any) {
toast.error(`操作失败: ${error.message}`);
}
};

const handleBatchApprove = async () => {
if (selectedIds.length === 0) return;
const loadingToast = toast.loading(`正在批量审核 ${selectedIds.length} 条内容...`);
try {
const results = await Promise.all(selectedIds.map(id => api.updateMediaStatus(id, 'approved')));

// 批量发送通知
selectedIds.forEach(id => {
const item = items.find(i => i.id === id);
if (item?.user_id) {
api.bufferNotification({ user_id: item.user_id, role_id: null,
title: '作品审核通过',
content: `您的作品《${item.title || '无标题'}》已通过审核并发布。`,
type: 'audit',
link: '/profile?tab=approved',
link_type: 'internal'
});
}
});

const errors = results.filter(r => r.error);
if (errors.length > 0) {
toast.error(`${errors.length} 条数据操作失败`);
} else {
toast.success(`批量通过成功: ${selectedIds.length} 条内容`);
}
const updatedIds = selectedIds;
fetchMedia();

setSelectedIds([]);
onAction?.();
} catch (error: any) {
toast.error(`批量操作失败: ${error.message}`);
} finally {
toast.dismiss(loadingToast);
}
};

const handleBatchReject = async () => {
if (selectedIds.length === 0 || !reason) return;
const loadingToast = toast.loading(`正在批量拒绝 ${selectedIds.length} 条内容...`);
try {
const results = await Promise.all(selectedIds.map(id => api.updateMediaStatus(id, 'rejected', reason)));

// 批量发送通知
selectedIds.forEach(id => {
const item = items.find(i => i.id === id);
if (item?.user_id) {
api.bufferNotification({ user_id: item.user_id, role_id: null,
title: '作品未通过审核',
content: `很抱歉，您的作品《${item.title || '无标题'}》因 “${reason}” 被拒绝。请修改后重新提交。`,
type: 'audit',
link: '/profile?tab=rejected',
link_type: 'internal'
});
}
});

const errors = results.filter(r => r.error);
if (errors.length > 0) {
toast.error(`${errors.length} 条数据拒绝失败`);
} else {
toast.success(`批量拒绝成功: ${selectedIds.length} 条内容`);
}
const updatedIds = selectedIds;
fetchMedia();
setSelectedIds([]);
setIsBatchReject(false);
setReason('');
onAction?.();
} catch (error: any) {
toast.error(`批量拒绝失败: ${error.message}`);
} finally {
toast.dismiss(loadingToast);
}
};

const handleReject = async () => {
if (isBatchReject) {
return handleBatchReject();
}
if (!rejectingId || !reason) return;
const item = items.find(i => i.id === rejectingId);
try {
const { error } = await api.updateMediaStatus(rejectingId, 'rejected', reason);
if (error) throw error;

// 发送通知给用户
if (item?.user_id) {
api.bufferNotification({ user_id: item.user_id, role_id: null,
title: '作品未通过审核',
content: `很抱歉，您的作品《${item.title || '无标题'}》因 “${reason}” 被拒绝。请修改后重新提交。`,
type: 'audit',
link: '/profile?tab=rejected',
link_type: 'internal'
});
}

fetchMedia();


setRejectingId(null);
setReason('');
toast.success('已拒绝上传');
onAction?.();
} catch (error: any) {
toast.error(`操作失败: ${error.message}`);
}
};

const toggleSelect = (id: string) => {
setSelectedIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
};

const selectAll = () => {
if (selectedIds.length === items.length) {
setSelectedIds([]);
} else {
setSelectedIds(items.map(i => i.id));
}
};

const fetchFileSize = async (url: string) => {
  if (!url) return '-';
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const length = response.headers.get('content-length');
    if (length) {
      const bytes = parseInt(length);
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
    return '未知';
  } catch (e) {
    return '无法获取';
  }
};

const handleUpdate = async () => {
if (!editingItem) return;
setUpdating(true);
try {
const { error } = await api.updateMediaItem(editingItem.id, {
title: editTitle,
url: editUrl,
thumbnail_url: editThumbnailUrl
});
if (error) throw error;
toast.success('更新成功');
setItems(items.map(i => i.id === editingItem.id ? { ...i, title: editTitle, url: editUrl, thumbnail_url: editThumbnailUrl } : i));
setEditingItem(null);
} catch (error: any) {
toast.error(`更新失败: ${error.message}`);
} finally {
setUpdating(false);
}
};

  const handleDelete = async (id: string, hard = false) => {
    if (hard) {
      const confirmed = await confirmAsync('警告：确认要彻底物理删除该内容吗？此操作无法撤销。', { variant: 'destructive' });
    if (!confirmed) return;
    } else {
      const confirmed = await confirmAsync('确认要将此内容移入回收站？', { variant: 'destructive' });
    if (!confirmed) return;
    }
    
    try {
      const { error } = hard ? await api.batchHardDeleteMedia([id]) : await api.deleteMedia(id);
      if (error) throw error;
      fetchMedia();
      
      toast.success(hard ? '已彻底物理删除' : '已移至回收站');
      onAction?.();
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await api.batchRestoreMedia([id]);
      if (error) throw error;
      fetchMedia();
      
      toast.success('已从回收站恢复');
      onAction?.();
    } catch (error: any) {
      toast.error(`恢复失败: ${error.message}`);
    }
  };

  const handleBatchRestore = async () => {
    if (selectedIds.length === 0) return;
    const loadingToast = toast.loading('正在批量恢复内容...');
    try {
      const { error } = await api.batchRestoreMedia(selectedIds);
      if (error) throw error;
      toast.success(`批量恢复成功: ${selectedIds.length} 条内容`);
      setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
      setTotal(prev => prev - selectedIds.length);
      setSelectedIds([]);
      onAction?.();
    } catch (error: any) {
      toast.error(`恢复失败: ${error.message}`);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handleBatchDelete = async (hard = false) => {
    if (selectedIds.length === 0) return;
    if (hard && !window.confirm(`警告：确定要彻底物理删除选中的 ${selectedIds.length} 条内容吗？此操作无法撤销。`)) return;
    
    const loadingToast = toast.loading(hard ? '正在彻底删除...' : '正在移动到回收站...');
    try {
      const { error } = hard ? await api.batchHardDeleteMedia(selectedIds) : await api.batchSoftDeleteMedia(selectedIds);
      if (error) throw error;
      toast.success(hard ? '批量彻底删除成功' : '已成功移至回收站');
      setItems(prev => prev.filter(i => !selectedIds.includes(i.id)));
      setTotal(prev => prev - selectedIds.length);
      setSelectedIds([]);
      onAction?.();
    } catch (error: any) {
      toast.error(`批量删除失败: ${error.message}`);
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handlePurgeRecycleBin = async () => {
    const confirmed = await confirmAsync('警告：确定要清空回收站中所有的内容吗？此操作无法撤销！', { variant: 'destructive' });
    if (!confirmed) return;
    setIsArchivingAll(true);
    const loadingToast = toast.loading('正在清空回收站...');
    try {
      const { error } = await api.purgeAllDeletedMedia();
      if (error) throw error;
      toast.success('回收站已成功清空');
      setItems([]);
      setTotal(0);
      setSelectedIds([]);
      onAction?.();
    } catch (error: any) {
      toast.error(`清空失败: ${error.message}`);
    } finally {
      setIsArchivingAll(false);
      toast.dismiss(loadingToast);
    }
  };

const openEdit = async (item: MediaItem) => {
setEditingItem(item);
setEditTitle(stripExtension(item.title || ''));
setEditUrl(item.url);
setEditThumbnailUrl(item.thumbnail_url || '');
setMediaSizes({ original: '加载中...', thumbnail: '加载中...' });

const [origSize, thumbSize] = await Promise.all([
  fetchFileSize(item.url),
  fetchFileSize(item.thumbnail_url || '')
]);
setMediaSizes({ original: origSize, thumbnail: thumbSize });
};

return (
<div className="space-y-6">
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h2 className="text-2xl font-black">内容审核</h2>
      <Badge variant="secondary" className="mt-1">{total} 条数据</Badge>
    </div>
    
    <div className="flex flex-wrap items-center gap-2">
      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜标题或作者..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 w-[180px] rounded-xl"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[100px] h-9 rounded-xl">
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="image">图片</SelectItem>
            <SelectItem value="video">视频</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" variant="secondary" className="rounded-xl h-9">
          搜索
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          size="icon" 
          onClick={fetchMedia} 
          disabled={loading}
          className="rounded-xl h-9 w-9"
          title="刷新数据"
        >
          <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </form>

      {items.length > 0 && (
        <>
          <Button variant="outline" size="sm" onClick={selectAll} className="rounded-xl h-9">
            {selectedIds.length === items.length ? '取消全选' : '全选'}
          </Button>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
              {activeTab === 'pending' && (
                <>
                  <Button size="sm" onClick={handleBatchApprove} className="bg-green-500 hover:bg-green-600 text-white rounded-xl h-9">
                    <Check className="w-4 h-4 mr-1.5" /> 通过 ({selectedIds.length})
                  </Button>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-500 hover:bg-red-50 rounded-xl h-9" onClick={() => setIsBatchReject(true)}>
                    <X className="w-4 h-4 mr-1.5" /> 拒绝 ({selectedIds.length})
                  </Button>

                  <Dialog open={isBatchCategoryOpen} onOpenChange={setIsBatchCategoryOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
                        disabled={selectedIds.length === 0}
                      >
                        <FolderPlus className="w-4 h-4 mr-1.5" />
                        批量分类
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl">
                      <DialogHeader>
                        <DialogTitle>批量修改分类</DialogTitle>
                        <DialogDescription>将选中的 {selectedIds.length} 个内容移动到指定分类</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>选择目标分类</Label>
                          <Select value={batchCategory} onValueChange={setBatchCategory}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="选择分类" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="all">请选择分类</SelectItem>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBatchCategoryOpen(false)} className="rounded-xl">取消</Button>
                        <Button onClick={handleBatchCategory} disabled={batchCategory === 'all'} className="rounded-xl">确认修改</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isBatchTagOpen} onOpenChange={setIsBatchTagOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        disabled={selectedIds.length === 0}
                      >
                        <Tags className="w-4 h-4 mr-1.5" />
                        批量追加标签
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl">
                      <DialogHeader>
                        <DialogTitle>批量追加标签</DialogTitle>
                        <DialogDescription>为选中的 {selectedIds.length} 个内容添加新标签（不影响原有标签）</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>输入标签</Label>
                          <MultiSelect 
                            options={allTags.map(tag => ({ value: tag.name, label: tag.name }))}
                            value={batchTags}
                            onChange={setBatchTags}
                          />
                          <p className="text-[10px] text-muted-foreground">提示：输入新标签后按回车确认</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBatchTagOpen(false)} className="rounded-xl">取消</Button>
                        <Button onClick={handleBatchTags} disabled={batchTags.length === 0} className="rounded-xl">确认追加</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isBatchResetTagOpen} onOpenChange={setIsBatchResetTagOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50 shadow-sm"
                        disabled={selectedIds.length === 0}
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        批量重置标签
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl">
                      <DialogHeader>
                        <DialogTitle>批量重置标签</DialogTitle>
                        <DialogDescription>重置选中的 {selectedIds.length} 个内容的标签（将覆盖原有标签）</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>输入新标签 (可选)</Label>
                          <MultiSelect 
                            options={allTags.map(tag => ({ value: tag.name, label: tag.name }))}
                            value={batchTags}
                            onChange={setBatchTags}
                          />
                          <p className="text-[10px] text-muted-foreground">提示：原有标签将被清空。如果留空，则该内容将没有标签。</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBatchResetTagOpen(false)} className="rounded-xl">取消</Button>
                        <Button variant="destructive" onClick={handleBatchResetTags} className="rounded-xl">确认重置</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isBatchAlbumOpen} onOpenChange={setIsBatchAlbumOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50"
                        disabled={selectedIds.length === 0}
                      >
                        <Layers className="w-4 h-4 mr-1.5" />
                        加入写真库
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl">
                      <DialogHeader>
                        <DialogTitle>批量加入写真库</DialogTitle>
                        <DialogDescription>将选中的 {selectedIds.length} 个内容添加到指定的写真库</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>选择目标图集</Label>
                          <Select value={selectedAlbumId} onValueChange={setSelectedAlbumId}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="选择图集" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {albums.map(album => (
                                <SelectItem key={album.id} value={album.id}>{album.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBatchAlbumOpen(false)} className="rounded-xl">取消</Button>
                        <Button onClick={handleConvertToAlbum} disabled={!selectedAlbumId} className="rounded-xl">确认转写</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                </>
              )}
              {activeTab === 'deleted' && (
                <>
                  <Button size="sm" onClick={handleBatchRestore} className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl h-9">
                    <RotateCcw className="w-4 h-4 mr-1.5" /> 恢复 ({selectedIds.length})
                  </Button>
                  <Button variant="outline" size="sm" className="border-red-200 text-red-500 hover:bg-red-50 rounded-xl h-9 font-bold" onClick={() => handleBatchDelete(true)}>
                    <Trash2 className="w-4 h-4 mr-1.5" /> 物理删除 ({selectedIds.length})
                  </Button>
                </>
              )}
              {(activeTab === 'approved' || activeTab === 'archived') && (
                <Button variant="outline" size="sm" className="border-red-200 text-red-500 hover:bg-red-50 rounded-xl h-9" onClick={() => handleBatchDelete(false)}>
                  <Trash className="w-4 h-4 mr-1.5" /> 移至回收站 ({selectedIds.length})
                </Button>
              )}
            </div>
          )}
          
          {activeTab === 'deleted' && selectedIds.length === 0 && (
            <Button variant="ghost" size="sm" onClick={handlePurgeRecycleBin} className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl h-9 font-bold">
              <Trash2 className="w-4 h-4 mr-1.5" /> 清空回收站
            </Button>
          )}
        </>
      )}
    </div>
  </div>

  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
    <TabsList className="grid w-full grid-cols-5 rounded-xl bg-muted/50 p-1">
      <TabsTrigger value="pending" className="rounded-lg">待审核</TabsTrigger>
      <TabsTrigger value="approved" className="rounded-lg">已发布</TabsTrigger>
      <TabsTrigger value="rejected" className="rounded-lg">已驳回</TabsTrigger>
      <TabsTrigger value="archived" className="rounded-lg">已下架</TabsTrigger>
      <TabsTrigger value="deleted" className="rounded-lg">回收站</TabsTrigger>
    </TabsList>

<div className="pt-4">
{loading ? (
<div className="flex items-center justify-center py-20">
<Loader2 className="w-8 h-8 animate-spin text-primary" />
</div>
) : items.length === 0 ? (
<div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-muted/50 text-muted-foreground">
<p>暂无内容</p>
</div>
) : (
<Card className="border-none shadow-sm rounded-2xl">
<Table>
<TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <button onClick={selectAll}>
                      {selectedIds.length === items.length && items.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground/30" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="w-16">预览</TableHead>
                  <TableHead>标题 / 标签</TableHead>
                  {activeTab === 'rejected' && <TableHead className="w-40">驳回原因</TableHead>}
                  <TableHead className="w-20 text-center">类型</TableHead>
                  <TableHead className="w-32">上传者</TableHead>
                  <TableHead className="w-40">上传时间</TableHead>
                  <TableHead className="text-right">操作管理</TableHead>
                </TableRow>
</TableHeader>
    <TableBody>
    {items.map((item) => (
      <TableRow key={item.id} id={`media-card-${items.indexOf(item)}`} className={cn(selectedIds.includes(item.id) && "bg-primary/5")}>
         <TableCell>
           <button onClick={() => toggleSelect(item.id)} className="transition-all hover:scale-110 active:scale-90 flex justify-center w-full">
             {selectedIds.includes(item.id) ? (
               <CheckSquare className="w-5 h-5 text-primary" />
             ) : (
               <Square className="w-5 h-5 text-muted-foreground/30" />
             )}
           </button>
         </TableCell>
         <TableCell>
           <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted cursor-pointer relative group" onClick={() => setPreviewIndex(items.findIndex(i => i.id === item.id))}>
             <ProtectedMedia src={item.thumbnail_url || item.url} alt="" className="w-full h-full object-contain transition-transform group-hover:scale-110" ruleKey="审核" type="image" />
             {item.type === 'video' && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                 <CirclePlay className="w-6 h-6 text-white" />
               </div>
             )}
             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
               <Eye className="w-5 h-5 text-white" />
             </div>
           </div>
         </TableCell>
         <TableCell className="font-medium">
           <div className="flex flex-col gap-1">
             <span 
               className={cn("truncate max-w-[200px] select-none", (item.title || '').length > 20 && "cursor-help text-primary")}
               onClick={() => {
                 if ((item.title || '').length > 20) {
                   confirmAsync(item.title || '', {
                     title: '完整标题',
                     confirmText: '确定'
                   });
                 }
               }}
               title={item.title || '无标题'}
             >
               {stripExtension(item.title || '无标题')}
             </span>
             {item.media_tags && item.media_tags.length > 0 && (
               <div className="flex flex-wrap gap-1">
                 {item.media_tags.map(mt => (
                   <span 
                     key={mt.tag_id} 
                     className={cn(
                       "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                       mt.tags?.name?.includes('不入') ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                     )}
                   >
                     #{mt.tags?.name}
                   </span>
                 ))}
               </div>
             )}
           </div>
         </TableCell>
         {activeTab === 'rejected' && (
           <TableCell className="text-xs text-red-600 max-w-[200px]">
             <div 
               className="truncate cursor-pointer hover:underline italic font-medium"
               onClick={(e) => {
                 e.stopPropagation();
                 confirmAsync(item.rejection_reason || item.reason || '未填写具体原因', {
                   title: '驳回理由',
                   confirmText: '确定'
                 });
               }}
             >
               {item.rejection_reason || item.reason || '无理由'}
             </div>
           </TableCell>
         )}
        <TableCell>
          <Badge variant="outline" className="rounded-lg">{item.type === 'image' ? '图片' : '视频'}</Badge>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
              {item.profiles?.username?.charAt(0)}
            </div>
            {item.profiles?.username || '未知'}
          </div>
        </TableCell>
        <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
          {formatBeijingTime(item.created_at)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {(activeTab === 'pending' || activeTab === 'rejected') && (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:bg-green-50 rounded-full" onClick={(e) => { e.stopPropagation(); handleApprove(item.id); }} title="通过审核">
                  <Check className="w-4 h-4" />
                </Button>
                {activeTab === 'pending' && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full" onClick={(e) => { e.stopPropagation(); setRejectingId(item.id); }} title="拒绝上传">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
            {activeTab === 'approved' && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-500 hover:bg-amber-50 rounded-full" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, 'archived', '管理员操作下架'); }} title="下架作品">
                <Archive className="w-4 h-4" />
              </Button>
            )}
            {activeTab === 'archived' && (
              <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-full" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(item.id, 'approved'); }} title="重新上架">
                <CircleArrowUp className="w-4 h-4" />
              </Button>
            )}
            {activeTab === 'deleted' && (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-50 rounded-full" onClick={(e) => { e.stopPropagation(); handleRestore(item.id); }} title="从回收站恢复">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-full" onClick={(e) => { e.stopPropagation(); handleDelete(item.id, true); }} title="物理彻底删除">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
            {activeTab !== 'deleted' && (
              <>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full" onClick={(e) => { e.stopPropagation(); openEdit(item); }} title="编辑">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} title="移至回收站">
                  <Trash className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
</Card>
)}

  {/* 分页 */}
  <div className="p-6 border-t flex flex-col md:flex-row items-center justify-between gap-4">
    <EnhancedPagination
      currentPage={page}
      totalPages={Math.ceil(total / limit)}
      onPageChange={setPage}
      pageSize={limit}
      onPageSizeChange={(s) => { setLimit(s); setPage(0); }}
      totalItems={total}
      className="w-full bg-transparent border-none p-0"
    />
  </div>
</div>
</Tabs>

{/* 编辑弹窗 */}
<Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
<DialogContent className="rounded-2xl">
<DialogHeader>
  <DialogTitle>编辑内容</DialogTitle>
  <DialogDescription>修改该内容的标题或媒体地址</DialogDescription>
</DialogHeader>
<div className="py-4 space-y-4">
<div className="space-y-2">
<Label>标题</Label>
<Input placeholder="输入标题" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
</div>
<div className="space-y-2">
<Label className="flex justify-between items-center">
  <span>原图 URL</span>
  <span className="text-[10px] text-muted-foreground font-mono">大小: {mediaSizes.original}</span>
</Label>
<Input placeholder="输入 URL" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
</div>
<div className="space-y-2">
<Label className="flex justify-between items-center">
  <span>缩略图 URL</span>
  <span className="text-[10px] text-muted-foreground font-mono">大小: {mediaSizes.thumbnail}</span>
</Label>
<div className="flex gap-2">
  <div className="w-10 h-10 rounded-lg border overflow-hidden shrink-0 bg-muted">
    {editThumbnailUrl ? (
      <ProtectedMedia src={editThumbnailUrl} className="w-full h-full object-contain" alt="thumb" ruleKey="审核" type="image" />
    ) : (
      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground" /></div>
    )}
  </div>
  <Input placeholder="输入缩略图 URL" value={editThumbnailUrl} onChange={(e) => setEditThumbnailUrl(e.target.value)} />
</div>
</div>
</div>
<DialogFooter>
<Button variant="ghost" onClick={() => setEditingItem(null)} className="rounded-xl">取消</Button>
<Button onClick={handleUpdate} disabled={updating} className="rounded-xl">
{updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}保存
</Button>
</DialogFooter>
</DialogContent>
</Dialog>

{/* 拒绝弹窗 */}
<Dialog open={!!rejectingId || isBatchReject} onOpenChange={(open) => { if (!open) { setRejectingId(null); setIsBatchReject(false); setReason(''); } }}>
<DialogContent className="rounded-2xl">
<DialogHeader>
  <DialogTitle>{isBatchReject ? `批量拒绝审核 (${selectedIds.length} 条)` : '拒绝审核'}</DialogTitle>
  <DialogDescription>填写拒绝审核的详细理由</DialogDescription>
</DialogHeader>
<div className="py-4 space-y-4">
<div className="space-y-2">
<Label>常用理由</Label>
<div className="flex flex-wrap gap-2">
{['涉及违规内容', '广告营销', '质量过低', '包含个人隐私', '侵权内容'].map(r => (
<Button key={r} variant="outline" size="sm" className="text-xs rounded-lg" onClick={() => setReason(r)}>
{r}
</Button>
))}
</div>
</div>
<div className="space-y-2">
<Label>拒绝理由 <span className="text-red-500">*</span></Label>
<Input placeholder="请输入详细理由" value={reason} onChange={(e) => setReason(e.target.value)} />
</div>
</div>
<DialogFooter>
<Button variant="ghost" onClick={() => { setRejectingId(null); setIsBatchReject(false); }} className="rounded-xl">取消</Button>
<Button variant="destructive" onClick={handleReject} disabled={!reason.trim()} className="rounded-xl">确认拒绝</Button>
</DialogFooter>
</DialogContent>
</Dialog>

{/* 预览 */}
      {previewIndex >= 0 && (
        <MediaPreview 
          items={items} 
          initialIndex={previewIndex} 
          ruleKey="审核"          onIndexChange={(index) => {
            const element = document.getElementById(`media-card-${index}`);
            if (element) {
              element.scrollIntoView({ behavior: 'auto', block: 'center' });
            }
          }}
          onClose={() => setPreviewIndex(-1)} 
        />
      )}
</div>
);
}

// ==================== 用户管理 Section ====================
