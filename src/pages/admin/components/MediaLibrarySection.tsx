
import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { MediaItem, Profile, StorageConfig, AppNotification, UserFieldConfig, Report, ReportStatus, PermissionGroup, Ad, RedemptionCode, ContentCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { 
  LayoutDashboard, FileCheck, Users as UsersIcon, Settings, Heart, ThumbsDown, Loader2, X, Edit2, Trash, 
  Archive, CircleArrowUp, CheckSquare, Square, CirclePlay, Video, Search, Edit3, Ban, UserCheck, 
  Mail, Calendar, Cloud, Save, LogOut, Share, Download, Database as DatabaseIcon, Monitor, 
  Image as ImageIcon, Filter, RefreshCcw, ListFilter, CircleCheckBig, Circle, MousePointer2, Trash2, 
  FolderPlus, Tags, Layers, FolderOpen, RotateCcw,
  ArrowUp, ArrowDown, BarChart3, PieChart as PieChartIcon, TrendingUp, Activity, Users2, ShieldAlert, 
  Trophy, Crown, Flame, FileCode2, Server, Globe, Database, Key, Shield, Rocket, Terminal, 
  ExternalLink, Settings2, Info, TriangleAlert, Play, Bell, Eye, CalendarCheck, Tag as TagIcon
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { EnhancedPagination } from '@/components/common/EnhancedPagination';
import MultiSelect from '@/components/ui/multi-select';
import { getZoneramaOriginalUrl, optimizeXiaohongshuUrl } from '@/lib/media';


import * as XLSX from 'xlsx';

// 辅助函数：移除文件后缀名
const stripExtension = (name: string | null | undefined) => {
  if (!name) return '';
  return name.replace(/\.[^/.]+$/, "");
};

// 辅助函数：从 Zonerama URL 生成缩略图
const generateZoneramaThumbnail = (url: string, maxSize: number = 800): string | null => {
  // 处理图片 URL
  if (url.includes('zonerama.com/photos/')) {
    const match = url.match(/\/photos\/(\d+)_(\d+)x(\d+)_0\.jpg/);
    if (!match) return null;
    
    const [, id, width, height] = match;
    const origWidth = parseInt(width);
    const origHeight = parseInt(height);
    
    // 计算缩略图尺寸（保持宽高比，最大边不超过 maxSize）
    let thumbWidth = origWidth;
    let thumbHeight = origHeight;
    
    if (origWidth > maxSize || origHeight > maxSize) {
      if (origWidth > origHeight) {
        thumbWidth = maxSize;
        thumbHeight = Math.round((origHeight / origWidth) * maxSize);
      } else {
        thumbHeight = maxSize;
        thumbWidth = Math.round((origWidth / origHeight) * maxSize);
      }
    }
    
    return getZoneramaOriginalUrl(id, thumbWidth, thumbHeight);
  }
  
  // 处理视频 URL：https://us.zonerama.com/VideoPlayer/607625557
  if (url.includes('zonerama.com/VideoPlayer/')) {
    const match = url.match(/\/VideoPlayer\/(\d+)/);
    if (!match) return null;
    
    const videoId = match[1];
    // 视频缩略图固定使用 2000x2000
    return getZoneramaOriginalUrl(videoId);
  }
  
  return null;
};

export function MediaLibrarySection({ defaultStatus = 'all' }: { defaultStatus?: string }) {
const [items, setItems] = useState<MediaItem[]>([]);
const [loading, setLoading] = useState(true);
  const { logAction } = useAdminLogger('library');
const [page, setPage] = useState(0);
const [total, setTotal] = useState(0);
const [limit, setLimit] = useState(24);
const [jumpPage, setJumpPage] = useState('');

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

useEffect(() => {
  setJumpPage((page + 1).toString());
}, [page]);

const [search, setSearch] = useState('');
const [type, setType] = useState('all');
const [status, setStatus] = useState(defaultStatus);
const [categoryFilter, setCategoryFilter] = useState('all');
const [tagFilter, setTagFilter] = useState('all');
const [importDialogOpen, setImportDialogOpen] = useState(false);
const [importUrls, setImportUrls] = useState('');
const [importCategory, setImportCategory] = useState('all');
const [importTags, setImportTags] = useState('');
    const [allTags, setAllTags] = useState<any[]>([]);

const [categories, setCategories] = useState<ContentCategory[]>([]);

const fetchCategories = async () => {
  const { data } = await api.getContentCategories();
  setCategories(data || []);
};

const fetchTags = async () => {
  const { data } = await api.getTags();
  setAllTags(data || []);
};

useEffect(() => {
  fetchCategories();
  fetchTags();
}, []);

const [albums, setAlbums] = useState<any[]>([]);
const fetchAlbums = async () => {
  const { data } = await supabase.from('photo_albums').select('id, title').order('created_at', { ascending: false });
  setAlbums(data || []);
};

useEffect(() => {
  fetchAlbums();
}, []);

const [isBatchCategoryOpen, setIsBatchCategoryOpen] = useState(false);
const [batchCategory, setBatchCategory] = useState('all');
const [isBatchTagOpen, setIsBatchTagOpen] = useState(false);
const [isBatchResetTagOpen, setIsBatchResetTagOpen] = useState(false);
const [batchTags, setBatchTags] = useState<string[]>([]);
const [isBatchAlbumOpen, setIsBatchAlbumOpen] = useState(false);
const [selectedAlbumId, setSelectedAlbumId] = useState('');

const handleBatchCategory = async () => {
  if (selectedIds.size === 0 || batchCategory === 'all') return;
  const ids = Array.from(selectedIds);
  const loadingToast = toast.loading(`正在更新 ${selectedIds.size} 个内容的分类...`);
  try {
    const { error } = await (supabase
      .from(status === 'staging' ? 'media_staging' : 'media_items') as any)
      .update({ category_id: batchCategory })
      .in('id', ids);

    if (error) throw error;
    toast.success(`成功更新 ${selectedIds.size} 个内容的分类`, { id: loadingToast });
    if (status === 'staging') {
      fetchStaging();
    } else {
      fetchMedia();
    }
    setIsBatchCategoryOpen(false);
    setSelectedIds(new Set());
  } catch (error: any) {
    toast.error(`更新失败: ${error.message}`, { id: loadingToast });
  }
};

const handleBatchTags = async () => {
  if (selectedIds.size === 0 || batchTags.length === 0) return;
  const ids = Array.from(selectedIds);
  const loadingToast = toast.loading(`正在为 ${selectedIds.size} 个内容添加标签...`);
  try {
    const tagList = Array.from(new Set(batchTags.map(t => t.trim()).filter(Boolean)));
    if (tagList.length === 0) return;

    if (status === 'staging') {
      // Staging table stores tag_names as array (改为追加模式)
      const { data: itemsToUpdate } = await (supabase.from('media_staging') as any).select('id, tag_names').in('id', ids);
      if (itemsToUpdate) {
        for (const item of itemsToUpdate) {
          const oldTags = Array.isArray(item.tag_names) ? item.tag_names : [];
          const newTags = Array.from(new Set([...oldTags, ...tagList]));
          await (supabase.from('media_staging') as any).update({ tag_names: newTags }).eq('id', item.id);
        }
      }
    } else {
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

      // 2. 批量插入新标签关联 (使用 upsert 避免冲突并实现追加)
      const insertRows = ids.flatMap(mediaId => 
        tagIds.map(tag_id => ({ media_id: mediaId, tag_id }))
      );

      // 分批插入
      const batchSize = 1000;
      for (let i = 0; i < insertRows.length; i += batchSize) {
        const batch = insertRows.slice(i, i + batchSize);
        const { error: insertError } = await (supabase.from('media_tags') as any).upsert(batch, { onConflict: 'media_id,tag_id' });
        if (insertError) throw insertError;
      }
    }

    toast.success(`成功为 ${selectedIds.size} 个内容添加了新标签`, { id: loadingToast });
    if (status === 'staging') {
      fetchStaging();
    } else {
      fetchMedia();
    }
    setIsBatchTagOpen(false);
    setSelectedIds(new Set());
    setBatchTags([]);
  } catch (error: any) {
    console.error('批量更新标签失败:', error);
    toast.error(`更新失败: ${error.message}`, { id: loadingToast });
  }
};

const handleBatchResetTags = async () => {
  if (selectedIds.size === 0) return;
  const ids = Array.from(selectedIds);
  const loadingToast = toast.loading(`正在重置 ${selectedIds.size} 个内容的标签...`);
  try {
    const tagList = Array.from(new Set(batchTags.map(t => t.trim()).filter(Boolean)));

    if (status === 'staging') {
      // Staging table stores tag_names as array (直接重置为新列表)
      const { error } = await (supabase.from('media_staging') as any)
        .update({ tag_names: tagList })
        .in('id', ids);
      if (error) throw error;
    } else {
      // 1. 先删除原有标签关联
      const { error: deleteError } = await (supabase.from('media_tags') as any)
        .delete()
        .in('media_id', ids);
      
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
          const insertRows = ids.flatMap(mediaId => 
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
    }

    toast.success(`成功重置了 ${selectedIds.size} 个内容的标签`, { id: loadingToast });
    if (status === 'staging') {
      fetchStaging();
    } else {
      fetchMedia();
    }
    setIsBatchResetTagOpen(false);
    setSelectedIds(new Set());
    setBatchTags([]);
  } catch (error: any) {
    console.error('重置标签失败:', error);
    toast.error(`重置失败: ${error.message}`, { id: loadingToast });
  }
};

const handleConvertToAlbum = async () => {
  if (selectedIds.size === 0 || !selectedAlbumId) return;
  const ids = Array.from(selectedIds);
  const loadingToast = toast.loading(`正在将 ${selectedIds.size} 个内容加入写真库...`);
  try {
    // Fetch info of selected items
    const { data: selectedItems, error: fetchError } = await supabase
      .from(status === 'staging' ? 'media_staging' : 'media_items')
      .select('url, thumbnail_url, title, type')
      .in('id', ids);

    if (fetchError || !selectedItems) throw fetchError || new Error('获取内容详情失败');

    // Get max sort order for current album
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

    // 删除原库内容，遵循互斥规则
    await supabase.from(status === 'staging' ? 'media_staging' : 'media_items').delete().in('id', ids);

    toast.success(`成功将 ${selectedIds.size} 个内容加入写真库`, { id: loadingToast });
    setIsBatchAlbumOpen(false);
    setSelectedIds(new Set());
    setItems(items.filter(i => !ids.includes(i.id)));
    setTotal(prev => prev - ids.length);
  } catch (error: any) {
    toast.error(`加入失败: ${error.message}`, { id: loadingToast });
  }
};

useEffect(() => {
  setStatus(defaultStatus);
  setPage(0);
}, [defaultStatus]);

// 选择相关状态
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [isSelecting, setIsSelecting] = useState(false);
const [isDragging, setIsDragging] = useState(false);

// 编辑相关状态
const [editingItem, setEditingItem] = useState<MediaItem | null>(null);

useEffect(() => {
  if (status === 'staging') {
    fetchStaging();
  } else {
    fetchMedia();
  }
}, [page, type, status, categoryFilter, tagFilter]);

const fetchStaging = async () => {
  setLoading(true);
  try {
    const { data, error, total: count } = await api.getMediaStaging(page, limit, 'pending');
    if (error) throw error;
    
    const totalCount = count || 0;
    const results = (data || []).map((d: any) => ({
      ...d,
      status: 'pending',
      profiles: { username: '导入中' }
    })) as any;

    if (results.length === 0 && totalCount > 0 && page > 0) {
      setPage(Math.max(0, Math.ceil(totalCount / limit) - 1));
      return;
    }

    setItems(results);
    setTotal(totalCount);
  } catch (error: any) {
    toast.error(`获取中间库失败: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

const fetchMedia = async () => {
  setLoading(true);
  try {
    const { data, total: count, error } = await api.getMediaLibrary(page, limit, search, status, type, categoryFilter, tagFilter);
    if (error) throw error;
    
    const totalCount = count || 0;
    const results = data || [];

    if (results.length === 0 && totalCount > 0 && page > 0) {
      setPage(Math.max(0, Math.ceil(totalCount / limit) - 1));
      return;
    }

    setItems(results);
    setTotal(totalCount);
  } catch (error: any) {
    toast.error(`获取内容失败: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

const refreshData = () => {
  if (status === 'staging') fetchStaging();
  else fetchMedia();
};

const handleImport = async () => {
  const itemsToImport: any[] = [];
  const tagList = importTags.split(/[，, ]+/).map(t => t.trim()).filter(Boolean);

  // 1. 处理链接导入
  if (importUrls.trim()) {
    const urls = importUrls.split('\n').map(u => u.trim()).filter(Boolean);
    urls.forEach(url => {
      itemsToImport.push({
        url,
        title: stripExtension(url.split('/').pop()),
        category_id: importCategory === 'all' ? null : importCategory,
        tag_names: tagList,
        status: 'pending',
        type: url.match(/\.(mp4|webm|ogg|mov)$/i) ? 'video' : 'image',
        import_source: 'batch_import'
      });
    });
  }

  // 2. 如果没有任何要导入的内容且没有文件（文件导入在 handleFileChange 处理）
  if (itemsToImport.length === 0) {
    toast.error('请提供有效的链接或上传 XLS 文件');
    return;
  }

  try {
    const { error } = await api.importToStaging(itemsToImport);
    if (error) throw error;
    toast.success(`成功导入 ${itemsToImport.length} 个资源到导入库`);
    setImportDialogOpen(false);
    setImportUrls('');
    if (status === 'staging') fetchStaging();
    else setStatus('staging');
  } catch (error: any) {
    toast.error(`导入失败: ${error.message}`);
  }
};

const handleXlsImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      if (data.length === 0) {
        toast.error('表格数据为空');
        return;
      }

      // 预期的表头: url, title, tags, category, id
      const loadingToast = toast.loading(`正在解析数据...`);
      
      // 优化：提前获取所有分类，减少数据库查询次数
      const { data: allCats } = await api.getContentCategories();
      const catMap = new Map<string, string>(allCats?.map((c: any) => [c.name, c.id]) || []);

      const itemsToImport: any[] = [];
      
      for (const row of data) {
        const url = row.url || row.链接 || row.地址;
        if (!url) continue;
        
        const rowTags = row.tags || row.标签 || '';
        const combinedTags = [
          ...importTags.split(/[，, ]+/).map(t => t.trim()).filter(Boolean),
          ...(typeof rowTags === 'string' ? rowTags.split(/[，, ]+/).map(t => t.trim()).filter(Boolean) : [])
        ];

        let finalCategoryId: string | null = importCategory === 'all' ? null : importCategory;
        const rowCategoryName = row.category || row.分类;
        
        if (rowCategoryName && (!finalCategoryId || finalCategoryId === 'all')) {
          if (catMap.has(rowCategoryName)) {
            finalCategoryId = catMap.get(rowCategoryName) || null;
          } else {
            // 如果分类不存在，则即时创建并更新 Map
            const { data: newCat } = await (supabase.from('content_categories') as any).insert({ name: rowCategoryName }).select('id').single();
            if (newCat) {
              finalCategoryId = newCat.id;
              catMap.set(rowCategoryName, newCat.id);
            }
          }
        }

        const item: any = {
          url,
          title: row.title || row.标题 || stripExtension(url.split('/').pop()),
          category_id: finalCategoryId,
          tag_names: Array.from(new Set(combinedTags)),
          status: 'pending',
          type: url.match(/\.(mp4|webm|ogg|mov)$/i) ? 'video' : 'image',
          import_source: 'batch_import'
        };

        const explicitId = row.id || row.ID;
        if (explicitId && typeof explicitId === 'string' && explicitId.trim()) {
          item.id = explicitId.trim();
        }

        itemsToImport.push(item);
      }

      if (itemsToImport.length === 0) {
        toast.error('未能识别有效数据，请检查表头（url, title, tags）', { id: loadingToast });
        return;
      }

      // 批量分段入库，每段 200 条，极大提高性能并确保稳定性
      const batchSize = 200;
      let totalSuccess = 0;
      for (let i = 0; i < itemsToImport.length; i += batchSize) {
        const batch = itemsToImport.slice(i, i + batchSize);
        const { error } = await api.importToStaging(batch);
        if (error) throw error;
        totalSuccess += batch.length;
        toast.loading(`正在极速入库中... (${totalSuccess}/${itemsToImport.length})`, { id: loadingToast });
      }

      toast.success(`成功导入 ${totalSuccess} 个资源`, { id: loadingToast });
      setImportDialogOpen(false);
      fetchCategories(); 
      if (status === 'staging') fetchStaging();
      else setStatus('staging');
    } catch (err: any) {
      toast.error(`解析失败: ${err.message}`);
    }
  };
  reader.readAsBinaryString(file);
};

const handleMoveToStaging = async () => {
  if (selectedIds.size === 0) return;
  const ids = Array.from(selectedIds);
  const loadingToast = toast.loading(`正在将 ${selectedIds.size} 个内容退回中间库...`);
  try {
    const { error } = await api.moveToStaging(ids);
    if (error) throw error;
    
    toast.success(`成功将 ${selectedIds.size} 个内容退回中间库`, { id: loadingToast });
    setSelectedIds(new Set());
    setItems(items.filter(i => !ids.includes(i.id)));
    setTotal(prev => prev - ids.length);
  } catch (error: any) {
    toast.error(`退回失败: ${error.message}`, { id: loadingToast });
  }
};

const handleApproveStaging = async (ids?: string[]) => {
  const targetIds = ids || Array.from(selectedIds);
  if (targetIds.length === 0) return;

  const loadingToast = toast.loading(`正在将 ${targetIds.length} 个内容移入壁纸库...`);
  try {
    const { error } = await api.approveStagingItems(targetIds);
    if (error) throw error;
    toast.success(`成功移入 ${targetIds.length} 个内容`, { id: loadingToast });
    setItems(items.filter(i => !targetIds.includes(i.id)));
    setTotal(prev => prev - targetIds.length);
    setSelectedIds(new Set());
  } catch (error: any) {
    toast.error(`操作失败: ${error.message}`, { id: loadingToast });
  }
};

const handleExportJSON = () => {
  if (items.length === 0) return;
  const dataToExport = items.map(item => ({
    id: item.id,
    title: item.title,
    url: item.url,
    thumbnail_url: item.thumbnail_url,
    type: item.type,
    category: categories.find(c => c.id === item.category_id)?.name || '未分类',
    tags: item.media_tags?.map((mt: any) => mt.tags?.name).join(', ') || ''
  }));
  const dataStr = JSON.stringify(dataToExport, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const exportFileDefaultName = `media_export_${new Date().toISOString().split('T')[0]}.json`;
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  toast.success('导出成功');
};

const [previewIndex, setPreviewIndex] = useState(-1);
const [editTitle, setEditTitle] = useState('');
const [editDescription, setEditDescription] = useState('');
const [editUrl, setEditUrl] = useState('');
const [thumbnailUrl, setThumbnailUrl] = useState('');
const [editCategory, setEditCategory] = useState<string>('all');
const [editTags, setEditTags] = useState<string[]>([]);
const [videoFrames, setVideoFrames] = useState<string[]>([]);
const [extractingFrames, setExtractingFrames] = useState(false);
const [updating, setUpdating] = useState(false);
const [mediaSizes, setMediaSizes] = useState<{ original: string; thumbnail: string }>({ original: '-', thumbnail: '-' });



const handleSearch = (e: React.FormEvent) => {
e.preventDefault();
setPage(0);
fetchMedia();
};

const handleUpdateStatus = async (id: string, newStatus: any) => {
try {
const item = items.find(i => i.id === id);
const { error } = await api.updateMediaStatus(id, newStatus);
if (error) throw error;

// 发送通知
if (item?.user_id) {
let title = '';
let content = '';
let link = '/profile';
if (newStatus === 'approved') {
title = '作品审核通过';
content = `您的作品《${item.title || '无标题'}》已通过审核并发布。`;
link = '/profile?tab=approved';
} else if (newStatus === 'rejected') {
title = '作品审核未通过';
content = `您的作品《${item.title || '无标题'}》未通过审核，请检查详情。`;
link = '/profile?tab=rejected';
} else if (newStatus === 'archived') {
title = '作品已下架';
content = `您的作品《${item.title || '无标题'}》已被管理员下架。`;
link = '/profile?tab=archived';
}

if (title) {
api.bufferNotification({ user_id: item.user_id, role_id: null,
title, content, type: 'audit', link, link_type: 'internal'
});
}
}

setItems(items.map(i => i.id === id ? { ...i, status: newStatus } : i));
toast.success('状态更新成功');
} catch (error: any) {
toast.error(`操作失败: ${error.message}`);
}
};

const handleDelete = async (id: string) => {
  const item = items.find(i => i.id === id);
  const isStaging = status === 'staging';
  const isDeleted = !!item?.deleted_at || status === 'deleted';
  
  if (isStaging) {
    const confirmed = await confirmAsync('确定要删除此待入库内容吗？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteStagingItems([id]);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      setTotal(prev => prev - 1);
      toast.success('内容已从中间库删除');
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  } else if (isDeleted) {
    const confirmed = await confirmAsync('确定要彻底永久删除此内容吗？此操作不可撤销！', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.hardDeleteMedia(id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      setTotal(prev => prev - 1);
      toast.success('内容已彻底永久删除');
    } catch (error: any) {
      toast.error(`彻底删除失败: ${error.message}`);
    }
  } else {
    const confirmed = await confirmAsync('确定要将此内容移至回收站吗？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteMedia(id);
      if (error) throw error;
      setItems(items.filter(i => i.id !== id));
      setTotal(prev => prev - 1);
      toast.success('内容已移至回收站');
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  }
};

const handleRestore = async (id: string) => {
  try {
    const { error } = await api.restoreMedia(id);
    if (error) throw error;
    setItems(items.filter(i => i.id !== id));
    setTotal(prev => prev - 1);
    toast.success('内容已恢复');
  } catch (error: any) {
    toast.error(`恢复失败: ${error.message}`);
  }
};

// 选择相关函数
const toggleSelect = (id: string) => {
setSelectedIds(prev => {
const next = new Set(prev);
if (next.has(id)) {
next.delete(id);
} else {
next.add(id);
}
return next;
});
};

const toggleSelectAll = () => {
if (selectedIds.size === items.length) {
setSelectedIds(new Set());
} else {
setSelectedIds(new Set(items.map(i => i.id)));
}
};

  const [dragMode, setDragMode] = useState<'select' | 'deselect' | null>(null);

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    // 检查点击目标是否是按钮或按钮内的元素
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return; // 如果点击的是按钮，不触发选择逻辑
    }
    
    setIsDragging(true);
    setIsSelecting(true);
    const currentlySelected = selectedIds.has(id);
    setDragMode(currentlySelected ? 'deselect' : 'select');
    toggleSelect(id);
  };

  const handleMouseEnter = (id: string) => {
    if (isDragging && dragMode) {
      const currentlySelected = selectedIds.has(id);
      if (dragMode === 'select' && !currentlySelected) {
        toggleSelect(id);
      } else if (dragMode === 'deselect' && currentlySelected) {
        toggleSelect(id);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragMode(null);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

// 批量操作
const handleBatchUpdateStatus = async (newStatus: any) => {
if (selectedIds.size === 0) return;
const loadingToast = toast.loading(`正在批量更新 ${selectedIds.size} 个内容...`);
try {
const results = await Promise.all(
Array.from(selectedIds).map(id => api.updateMediaStatus(id, newStatus))
);

// 发送批量通知
selectedIds.forEach(id => {
const item = items.find(i => i.id === id);
if (item?.user_id) {
let title = '';
let content = '';
let link = '/profile';
if (newStatus === 'approved') {
title = '作品审核通过';
content = `您的作品《${item.title || '无标题'}》已通过审核并发布。`;
link = '/profile?tab=approved';
} else if (newStatus === 'rejected') {
title = '作品审核未通过';
content = `您的作品《${item.title || '无标题'}》未通过审核，请检查详情。`;
link = '/profile?tab=rejected';
} else if (newStatus === 'archived') {
title = '作品已下架';
content = `您的作品《${item.title || '无标题'}》已被管理员下架。`;
link = '/profile?tab=archived';
}
if (title) {
api.bufferNotification({ user_id: item.user_id, role_id: null,
title, content, type: 'audit', link, link_type: 'internal'
});
}
}
});

const errors = results.filter(r => r.error);
if (errors.length > 0) {
toast.error(`部分操作失败: ${errors.length} 个`);
} else {
toast.success(`成功更新 ${selectedIds.size} 个内容`);
setItems(items.map(i => selectedIds.has(i.id) ? { ...i, status: newStatus } : i));
setSelectedIds(new Set());
}
} catch (error: any) {
toast.error(`批量操作失败: ${error.message}`);
} finally {
toast.dismiss(loadingToast);
}
};

  const handleClearArchived = async () => {
    const confirmed = await confirmAsync(`确定要清空整个回收站吗？此操作将永久删除所有已下架的内容且不可撤销！`, { variant: 'destructive' });
    if (!confirmed) return;

    const loadingToast = toast.loading('正在清空回收站...');
    try {
      const { error } = await supabase.from('media_items').delete().eq('status', 'archived');
      if (error) throw error;
      
      toast.success('回收站已清空', { id: loadingToast });
      fetchMedia();
      setSelectedIds(new Set());
    } catch (error: any) {
      toast.error(`清空失败: ${error.message}`, { id: loadingToast });
    }
  };

const handleBatchDelete = async () => {
if (selectedIds.size === 0) return;
const selectedItems = items.filter(i => selectedIds.has(i.id));
const isStaging = status === 'staging';
const isHardDelete = status === 'deleted' || selectedItems.some(i => i.deleted_at);

if (isStaging) {
  const confirmed = await confirmAsync(`确定要删除选中的 ${selectedIds.size} 个待入库内容吗？`, { variant: 'destructive' });
    if (!confirmed) return;
} else if (isHardDelete) {
  const confirmed = await confirmAsync(`确定要永久删除选中的 ${selectedIds.size} 个内容吗？此操作不可撤销！`, { variant: 'destructive' });
    if (!confirmed) return;
} else {
  const confirmed = await confirmAsync(`确定要将选中的 ${selectedIds.size} 个内容${status === 'archived' ? '彻底删除' : '移至回收站'}吗？`, { variant: 'destructive' });
    if (!confirmed) return;
}

const loadingToast = toast.loading(`正在处理 ${selectedIds.size} 个内容...`);
try {
  if (isStaging) {
    const { error } = await api.deleteStagingItems(Array.from(selectedIds));
    if (error) throw error;
    toast.success(`成功从中间库删除 ${selectedIds.size} 个内容`);
    setItems(items.filter(i => !selectedIds.has(i.id)));
    setTotal(prev => prev - selectedIds.size);
    setSelectedIds(new Set());
  } else {
    const results = await Promise.all(
    Array.from(selectedIds).map(async id => {
      const item = selectedItems.find(i => i.id === id);
      if (status === 'deleted' || item?.deleted_at || status === 'archived') {
        return await api.hardDeleteMedia(id);
      } else {
        return await api.deleteMedia(id);
      }
    })
    );
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
    toast.error(`部分操作失败: ${errors.length} 个`);
    } else {
    toast.success(`成功处理 ${selectedIds.size} 个内容`);
    setItems(items.filter(i => !selectedIds.has(i.id)));
    setTotal(prev => prev - selectedIds.size);
    setSelectedIds(new Set());
    }
  }
} catch (error: any) {
toast.error(`批量操作失败: ${error.message}`);
} finally {
toast.dismiss(loadingToast);
}
};

const handleDownloadTemplate = () => {
  const data = [
    { url: 'https://example.com/image1.jpg', title: '图片1', tags: '标签1, 标签2' },
    { url: 'https://example.com/video1.mp4', title: '视频1', tags: '标签3' }
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, "media_import_template.xlsx");
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

// 编辑相关函数
const openEditDialog = async (item: MediaItem) => {
setEditingItem(item);
setEditTitle(stripExtension(item.title || ''));
setEditDescription(item.description || '');
// 打开编辑弹窗时自动优化链接（托底处理历史数据）
const optimizedItemUrl = optimizeXiaohongshuUrl(item.url || '');
setEditUrl(optimizedItemUrl);

// 自动补充 Zonerama 缩略图
let autoThumbnail = item.thumbnail_url || '';
if (!autoThumbnail) {
  const generated = generateZoneramaThumbnail(item.url);
  if (generated) {
    autoThumbnail = generated;
    console.log('自动生成缩略图:', autoThumbnail);
  }
}

setThumbnailUrl(autoThumbnail);
setEditCategory(item.category_id || 'all');

if (status === 'staging') {
  setEditTags((item as any).tag_names || []);
} else {
  setEditTags(item.media_tags?.map((mt: any) => mt.tags?.name).filter(Boolean) || []);
}

setVideoFrames([]);
setMediaSizes({ original: '加载中...', thumbnail: '加载中...' });

const [origSize, thumbSize] = await Promise.all([
  fetchFileSize(item.url),
  fetchFileSize(autoThumbnail)
]);
setMediaSizes({ original: origSize, thumbnail: thumbSize });
};

const handleSaveEdit = async () => {
if (!editingItem) return;
setUpdating(true);
try {
  // 优化小红书链接，转换为 CDN 可访问格式
  const optimizedUrl = optimizeXiaohongshuUrl(editUrl);
  if (optimizedUrl !== editUrl) {
    console.log('小红书链接已优化:', editUrl, '->', optimizedUrl);
  }
  
  const updates: any = {
    title: editTitle,
    description: editDescription,
    url: optimizedUrl,
    thumbnail_url: thumbnailUrl,
    category_id: editCategory === 'all' ? null : editCategory
  };

  if (status === 'staging') {
    updates.tag_names = editTags.map(t => t.trim()).filter(Boolean);
    const { error } = await api.updateStagingItem(editingItem.id, updates);
    if (error) throw error;
    setItems(items.map(i => i.id === editingItem.id ? { ...i, ...updates } : i));
  } else {
    const { error } = await api.updateMediaItem(editingItem.id, updates);
    if (error) throw error;
    
    // 更新标签
    const tagNames = editTags.map(t => t.trim()).filter(Boolean);
    // 先删除旧标签
    await supabase.from('media_tags').delete().eq('media_id', editingItem.id);
    // 关联新标签
    for (const tagName of tagNames) {
      const { data: tag } = await (supabase.from('tags') as any).select('id').eq('name', tagName).maybeSingle();
      let tagId = tag?.id;
      if (!tagId) {
        const { data: newTag } = await (supabase.from('tags') as any).insert({ name: tagName }).select('id').single();
        tagId = newTag?.id;
      }
      if (tagId) {
        await (supabase.from('media_tags') as any).insert({ media_id: editingItem.id, tag_id: tagId });
      }
    }
    
    // 重新获取该项以同步状态
    const { data: refreshedItem } = await api.getMediaItem(editingItem.id);
    if (refreshedItem) {
      setItems(items.map(i => i.id === editingItem.id ? refreshedItem as any : i));
    }
  }

  setEditingItem(null);
  toast.success('内容已更新');
} catch (error: any) {
  toast.error(`更新失败: ${error.message}`);
} finally {
  setUpdating(false);
}
};

const captureFrame = (videoUrl: string, timestamp: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.currentTime = timestamp;
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg'));
      } else {
        reject('Failed to get context');
      }
    };
    video.onerror = () => reject('Video load error');
  });
};

const handleExtractFrames = async () => {
  if (!editUrl) return;
  setExtractingFrames(true);
  try {
    // 简单尝试在 1秒 和 3秒 处抓取
    const frame1 = await captureFrame(editUrl, 1);
    const frame2 = await captureFrame(editUrl, 3);
    setVideoFrames([frame1, frame2]);
  } catch (e: any) {
    console.error(e);
    // 如果无法抓取 (比如跨域限制)，可以提供一个模拟实现
    setVideoFrames([
      `${editUrl}?t=1`,
      `${editUrl}?t=3`
    ]);
  } finally {
    setExtractingFrames(false);
  }
};

  return (
<div className="space-y-6">
<div className="flex items-center justify-between">
<div>
<h2 className="text-2xl font-black flex items-center gap-2">
  {status === 'staging' ? (
    <><DatabaseIcon className="w-8 h-8 text-orange-500" /> 中间库</>
  ) : status === 'deleted' ? (
    <><Trash2 className="w-8 h-8 text-red-500" /> 回收站</>
  ) : (
    <><ImageIcon className="w-8 h-8 text-primary" /> 壁纸库</>
  )}
</h2>
<p className="text-sm text-muted-foreground mt-1">
  {status === 'deleted' ? "在此管理已删除的资源，可以恢复或永久彻底删除" : "管理全站公开展示的图片与视频内容"}
</p>
</div>
<div className="flex items-center gap-3">
<Badge variant="outline" className="px-3 py-1 rounded-lg">
  {status === 'deleted' ? `已删除: ${total}` : `总计: ${total}`}
</Badge>

        {defaultStatus === "all" && (
          <Button 
            variant={status === "deleted" ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              setStatus(status === "deleted" ? "all" : "deleted");
              setPage(0);
              setSelectedIds(new Set());
            }} 
            className={cn("rounded-xl transition-all", status === "deleted" && "bg-red-500 hover:bg-red-600 border-none text-white shadow-lg shadow-red-200")}
          >
            <Trash2 className={cn("w-4 h-4 mr-2", status === "deleted" && "animate-pulse")} />
            {status === "deleted" ? "返回库" : "回收站"}
          </Button>
        )}
        
        {status === "deleted" && total > 0 && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={async () => {
              const confirmed = await confirmAsync(
                `确定要清空回收站吗？这将永久删除所有 ${total} 个已删除的内容，此操作不可撤销！`, 
                {
                  title: '清空回收站',
                  confirmText: '确认清空',
                  cancelText: '取消',
                  variant: 'destructive'
                }
              );
              if (!confirmed) return;
              
              const loadingToast = toast.loading(`正在清空回收站，共 ${total} 个内容...`);
              try {
                // 获取所有回收站内容的ID
                const { data: allDeletedItems, error: fetchError } = await api.getMediaLibrary(
                  0, 
                  total, 
                  '', 
                  'deleted', 
                  'all', 
                  'all', 
                  'all'
                );
                
                if (fetchError) throw fetchError;
                
                const allIds = (allDeletedItems || []).map((item: any) => item.id);
                
                if (allIds.length === 0) {
                  toast.info('回收站已经是空的', { id: loadingToast });
                  return;
                }
                
                // 批量硬删除
                const results = await Promise.all(
                  allIds.map((id: string) => api.hardDeleteMedia(id))
                );
                
                const errors = results.filter((r: any) => r.error);
                if (errors.length > 0) {
                  toast.error(`部分删除失败: ${errors.length} 个`, { id: loadingToast });
                } else {
                  toast.success(`成功清空回收站，已永久删除 ${allIds.length} 个内容`, { id: loadingToast });
                }
                
                // 刷新列表
                fetchMedia();
                setSelectedIds(new Set());
              } catch (error: any) {
                toast.error(`清空回收站失败: ${error.message}`, { id: loadingToast });
              }
            }} 
            className="rounded-xl font-bold gap-2 shadow-lg shadow-red-200"
          >
            <Trash2 className="w-4 h-4" />
            清空回收站
          </Button>
        )}

        {status === "staging" && (
          <>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="rounded-xl">
              <Cloud className="w-4 h-4 mr-2" />
              批量导入
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON} className="rounded-xl">
              <Download className="w-4 h-4 mr-2" />
              导出当前
            </Button>
          </>
        )}

<Button 
variant={selectedIds.size > 0 ? "default" : "outline"} 
size="sm" 
onClick={() => {
  if (selectedIds.size > 0) {
    setSelectedIds(new Set());
  } else {
    setIsSelecting(!isSelecting);
  }
  setIsDragging(false);
}} 
className="rounded-xl"
>
<MousePointer2 className="w-4 h-4 mr-2" />
{selectedIds.size > 0 ? "取消选择" : "批量操作"}
</Button>
<Button variant="outline" size="sm" onClick={fetchMedia} className="rounded-xl">
<RefreshCcw className="w-4 h-4 mr-2" />
刷新数据
</Button>
</div>
</div>

{selectedIds.size >= 1 && (
<Card className="p-4 border-none shadow-sm rounded-2xl flex items-center justify-between bg-primary/5 border border-primary/10 animate-in slide-in-from-top-4 duration-300">
<div className="flex items-center gap-4">
<div className="flex items-center gap-2">
<Button 
variant="ghost" 
size="sm" 
onClick={toggleSelectAll}
className="rounded-xl hover:bg-primary/10"
>
{selectedIds.size === items.length ? (
<><CheckSquare className="w-4 h-4 mr-2 text-primary" />全选已开</>
) : (
<><Square className="w-4 h-4 mr-2" />全选</>
)}
</Button>
</div>
<Badge className="bg-primary">{selectedIds.size} 项被选中</Badge>
{isSelecting && <span className="text-xs text-muted-foreground ml-2 hidden md:inline">提示：启用选择后，可点击并滑动进行连选</span>}
</div>
<div className="flex items-center gap-2 flex-wrap">
{status === 'staging' ? (
  <>
    <Button 
      variant="outline" 
      size="sm" 
      className="rounded-xl text-green-600 border-green-200 hover:bg-green-50 shadow-sm"
      onClick={() => handleApproveStaging()}
      disabled={selectedIds.size === 0}
    >
      <CircleCheckBig className="w-4 h-4 mr-2" />
      审核通过并入壁纸库
    </Button>
    <Button 
      variant="outline" 
      size="sm" 
      className="rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50 shadow-sm"
      onClick={() => setIsBatchAlbumOpen(true)}
      disabled={selectedIds.size === 0}
    >
      <Layers className="w-4 h-4 mr-2" />
      加入写真库
    </Button>
  </>
) : (
  <div className="flex gap-2">
    <Button 
      variant="outline" 
      size="sm" 
      className="rounded-xl text-green-600 border-green-200 hover:bg-green-50 shadow-sm"
      onClick={() => handleBatchUpdateStatus('approved')}
      disabled={selectedIds.size === 0}
    >
      <ArrowUp className="w-4 h-4 mr-2" />
      批量上架
    </Button>
    <Button 
      variant="outline" 
      size="sm" 
      className="rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50 shadow-sm"
      onClick={handleMoveToStaging}
      disabled={selectedIds.size === 0}
    >
      <RefreshCcw className="w-4 h-4 mr-2" />
      退回中间库
    </Button>
    <Button 
      variant="outline" 
      size="sm" 
      className="rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50 shadow-sm"
      onClick={() => setIsBatchAlbumOpen(true)}
      disabled={selectedIds.size === 0}
    >
      <Layers className="w-4 h-4 mr-2" />
      加入写真库
    </Button>
  </div>
)}
<Button 
variant="outline" 
size="sm" 
className="rounded-xl text-amber-600 border-amber-200 hover:bg-amber-50 shadow-sm"
onClick={() => handleBatchUpdateStatus('archived')}
disabled={selectedIds.size === 0}
>
<ArrowDown className="w-4 h-4 mr-2" />
批量下架
</Button>
<Button 
variant="outline" 
size="sm" 
className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 shadow-sm"
onClick={handleBatchDelete}
disabled={selectedIds.size === 0}
>
<Trash2 className="w-4 h-4 mr-2" />
{status === 'archived' ? "批量彻底删除" : "批量删除"}
</Button>

{status === 'archived' && (
  <Button 
    variant="destructive" 
    size="sm" 
    className="rounded-xl shadow-sm"
    onClick={handleClearArchived}
  >
    <Trash className="w-4 h-4 mr-2" />
    清空回收站
  </Button>
)}

<Dialog open={isBatchCategoryOpen} onOpenChange={setIsBatchCategoryOpen}>
  <DialogTrigger asChild>
    <Button 
      variant="outline" 
      size="sm" 
      className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
      disabled={selectedIds.size === 0}
    >
      <FolderPlus className="w-4 h-4 mr-2" />
      批量分类
    </Button>
  </DialogTrigger>
  <DialogContent className="rounded-3xl">
    <DialogHeader>
      <DialogTitle>批量修改分类</DialogTitle>
      <DialogDescription>将选中的 {selectedIds.size} 个内容移动到指定分类</DialogDescription>
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
      className="rounded-xl text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-sm"
      disabled={selectedIds.size === 0}
    >
      <Tags className="w-4 h-4 mr-2" />
      批量添加标签
    </Button>
  </DialogTrigger>
  <DialogContent className="rounded-3xl">
    <DialogHeader>
      <DialogTitle>批量添加标签</DialogTitle>
      <DialogDescription>为选中的 {selectedIds.size} 个内容追加新标签（不影响原有标签）</DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>输入标签</Label>
        <MultiSelect 
          options={allTags.map(tag => ({ value: tag.name, label: tag.name }))}
          value={batchTags}
          onChange={setBatchTags}
        />
        <p className="text-[10px] text-muted-foreground">提示：输入新标签后按回车确认，支持搜索</p>
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
      disabled={selectedIds.size === 0}
    >
      <RotateCcw className="w-4 h-4 mr-2" />
      批量重置标签
    </Button>
  </DialogTrigger>
  <DialogContent className="rounded-3xl">
    <DialogHeader>
      <DialogTitle>批量重置标签</DialogTitle>
      <DialogDescription>重置选中的 {selectedIds.size} 个内容的标签（将覆盖原有标签）</DialogDescription>
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
  <DialogContent className="rounded-3xl">
    <DialogHeader>
      <DialogTitle>批量加入写真库</DialogTitle>
      <DialogDescription>将选中的 {selectedIds.size} 个内容添加到指定的写真库</DialogDescription>
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
</div>
</Card>
)}

{/* 筛选与搜索 */}
<Card className="border-none shadow-sm rounded-2xl p-4 bg-white">
<form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
<div className="relative flex-1 min-w-[300px]">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
<Input 
placeholder="搜索标题..." 
className="pl-9 rounded-xl border-slate-200"
value={search}
onChange={(e) => setSearch(e.target.value)}
/>
</div>

<div className="flex items-center gap-2">
<ImageIcon className="w-4 h-4 text-muted-foreground" />
<Select value={type} onValueChange={(v) => { setType(v); setPage(0); }}>
<SelectTrigger className="w-[120px] rounded-xl border-slate-200">
<SelectValue placeholder="类型" />
</SelectTrigger>
<SelectContent className="rounded-xl">
<SelectItem value="all">全部类型</SelectItem>
<SelectItem value="image">图片</SelectItem>
<SelectItem value="video">视频</SelectItem>
</SelectContent>
</Select>
</div>

<div className="flex items-center gap-2">
<ListFilter className="w-4 h-4 text-muted-foreground" />
<Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
<SelectTrigger className="w-[120px] rounded-xl border-slate-200">
<SelectValue placeholder="状态" />
</SelectTrigger>
<SelectContent className="rounded-xl">
<SelectItem value="all">全部状态</SelectItem>
<SelectItem value="pending">待审核</SelectItem>
<SelectItem value="approved">已上架</SelectItem>
<SelectItem value="archived">已下架</SelectItem>
<SelectItem value="rejected">未通过</SelectItem>
<SelectItem value="deleted">已删除 (回收站)</SelectItem>
</SelectContent>
</Select>
</div>

        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] rounded-xl border-slate-200">
              <SelectValue placeholder="分类" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border-slate-100">
              <SelectItem value="all">全部分类</SelectItem>
              <SelectItem value="none">无分类</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <TagIcon className="w-4 h-4 text-muted-foreground" />
          <Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] rounded-xl border-slate-200">
              <SelectValue placeholder="标签" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl border-slate-100">
              <SelectItem value="all">全部标签</SelectItem>
              <SelectItem value="none">无标签</SelectItem>
              {allTags.map(tag => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name} {(tag.name.includes('不入') || tag.is_visible === false) && '🔒'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

<Button type="submit" className="rounded-xl px-6">搜索</Button>
</form>
</Card>

{/* 网格显示 */}
<div onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
{loading && items.length === 0 ? (
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
{[...Array(12)].map((_, i) => (
<div key={i} className="aspect-square bg-slate-100 animate-pulse rounded-2xl" />
))}
</div>
) : items.length === 0 ? (
<Card className="border-none shadow-sm rounded-2xl p-20 text-center flex flex-col items-center">
<div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
<ImageIcon className="w-10 h-10" />
</div>
<h3 className="text-lg font-bold text-slate-600">暂无相关内容</h3>
<p className="text-slate-400 text-sm mt-1">您可以尝试更换搜索词或筛选条件</p>
</Card>
) : (
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 select-none">
    {items.map((item, index) => (
      <Card 
        key={item.id} 
        id={`media-card-${index}`}
        className={cn(
"group relative aspect-square overflow-hidden border-none shadow-sm rounded-3xl bg-slate-100 transition-all duration-300",
selectedIds.has(item.id) && "ring-4 ring-primary ring-offset-4 ring-offset-background scale-[0.98]"
)}
onMouseDown={(e) => handleMouseDown(item.id, e)}
onMouseEnter={() => handleMouseEnter(item.id)}
>
        {/* 选择标记/选择框 */}
        <div 
          className={cn(
            "absolute top-4 left-4 z-30 transition-all duration-300 cursor-pointer",
            selectedIds.size === 0 && "opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
          )}
          onClick={(e) => {
            e.stopPropagation();
            toggleSelect(item.id);
          }}
        >
          {selectedIds.has(item.id) ? (
            <CircleCheckBig className="w-7 h-7 text-primary fill-white drop-shadow-xl" />
          ) : (
            <Circle className="w-7 h-7 text-white drop-shadow-xl opacity-80 hover:opacity-100" />
          )}
        </div>
        
        <img 
        src={(item.thumbnail_url || item.url) ?? ""}
        alt={item.title || ""}
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain transition-transform group-hover:scale-110 cursor-pointer"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewIndex(index);
                }}
        />

        
        {/* 标签常驻显示 */}

{/* 悬浮操作栏 */}
<div className={cn(
"absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between",
selectedIds.size >= 2 && "hidden" // 在选择模式下隐藏常规操作
)}>
<div className="flex justify-between items-start">
<Badge className={`rounded-lg ${
item.deleted_at ? 'bg-red-600' :
item.status === 'approved' ? 'bg-green-500' : 
item.status === 'pending' ? 'bg-amber-500' : 
'bg-slate-500'
}`}>
{item.deleted_at ? '已删除' :
item.status === 'approved' ? '已发布' : 
item.status === 'pending' ? '待审核' : 
item.status === 'archived' ? '已下架' : '未通过'}
</Badge>
{item.type === 'video' && <Video className="w-5 h-5 text-white fill-white" />}
</div>

<div className="space-y-2">
<p className="text-white text-xs font-bold truncate">{stripExtension(item.title || '无标题')}</p>
<p className="text-white/70 text-[10px] truncate">@{item.profiles?.username || '未知用户'}</p>
<div className="grid grid-cols-2 gap-2 pt-2">
{item.deleted_at ? (
  <>
    <Button 
    size="sm" 
    variant="secondary" 
    className="h-7 text-[10px] rounded-lg bg-green-500 hover:bg-green-600 text-white border-none"
    onClick={(e) => {
      e.stopPropagation();
      handleRestore(item.id);
    }}
    >
    恢复内容
    </Button>
    <Button 
    size="sm" 
    variant="destructive" 
    className="h-7 text-[10px] rounded-lg"
    onClick={(e) => {
      e.stopPropagation();
      handleDelete(item.id);
    }}
    >
    彻底删除
    </Button>
  </>
) : (
  <>
    <Button 
    size="sm" 
    variant="secondary" 
    className="h-7 text-[10px] rounded-lg"
    onClick={(e) => {
      e.stopPropagation();
      openEditDialog(item);
    }}
    >
    编辑内容
    </Button>
    <Button 
    size="sm" 
    variant="destructive" 
    className="h-7 text-[10px] rounded-lg"
    onClick={(e) => {
      e.stopPropagation();
      handleDelete(item.id);
    }}
    >
    删除内容
    </Button>
  </>
)}
</div>
</div>
</div>
</Card>
))}
</div>
)}
</div>

  {/* 分页控制 */}
  {total > 0 && (
    <EnhancedPagination
      currentPage={page}
      totalPages={Math.ceil(total / limit)}
      onPageChange={setPage}
      pageSize={limit}
      onPageSizeChange={(s) => { setLimit(s); setPage(0); }}
      totalItems={total}
      className="mt-6"
    />
  )}

{/* 预览组件 */}
{previewIndex >= 0 && (
  <MediaPreview 
    items={items} 
    initialIndex={previewIndex} 
    onIndexChange={(index) => {
      const element = document.getElementById(`media-card-${index}`);
      if (element) {
        element.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }}
    onClose={() => setPreviewIndex(-1)} 
  />
)}

{/* 编辑弹窗 */}
<Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
<DialogContent className="rounded-2xl w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden p-0">
  <div className="p-6 pb-0">
    <DialogHeader>
      <DialogTitle>编辑媒体内容</DialogTitle>
      <DialogDescription>修改媒体的标题、描述、标签等基本信息</DialogDescription>
    </DialogHeader>
  </div>
  <ScrollArea className="flex-1 px-6">
    <div className="space-y-4 py-4">
<div className="space-y-2">
<Label htmlFor="edit-title">标题</Label>
<Input 
id="edit-title"
placeholder="输入内容标题..." 
value={editTitle} 
onChange={(e) => setEditTitle(e.target.value)}
className="rounded-xl"
/>
</div>
<div className="space-y-2">
<Label htmlFor="edit-description">描述词/说明</Label>
<Textarea 
id="edit-description"
placeholder="输入内容详细描述词或说明..." 
value={editDescription} 
onChange={(e) => setEditDescription(e.target.value)}
className="rounded-xl"
rows={3}
/>
</div>
<div className="space-y-2">
<Label htmlFor="edit-url" className="flex justify-between items-center">
  <span>媒体 URL</span>
  <span className="text-[10px] text-muted-foreground font-mono italic">大小: {mediaSizes.original}</span>
</Label>
<Textarea 
id="edit-url"
placeholder="输入媒体文件的完整 URL..." 
value={editUrl} 
onChange={(e) => {
  const newUrl = e.target.value;
  // 如果用户输入的是小红书 ci 域名链接，自动优化为 CDN 格式
  const optimizedUrl = optimizeXiaohongshuUrl(newUrl);
  if (optimizedUrl !== newUrl) {
    setEditUrl(optimizedUrl);
    toast.success('小红书链接已自动优化为 CDN 格式');
  } else {
    setEditUrl(newUrl);
  }
  
  // 自动补充 Zonerama 缩略图
  const autoThumbnail = generateZoneramaThumbnail(newUrl);
  if (autoThumbnail) {
    setThumbnailUrl(autoThumbnail);
    console.log('URL 变化，自动更新缩略图:', autoThumbnail);
  }
}}
rows={3}
className="rounded-xl font-mono text-xs"
/>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="edit-category">分类</Label>
    <Select value={editCategory} onValueChange={setEditCategory}>
      <SelectTrigger id="edit-category" className="rounded-xl">
        <SelectValue placeholder="选择分类" />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        <SelectItem value="all">未分类</SelectItem>
        {categories.map(cat => (
          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  <div className="space-y-2">
    <Label htmlFor="edit-tags">标签 (搜索并选择或直接输入回车)</Label>
    <MultiSelect 
      options={allTags.map(tag => ({ value: tag.name, label: tag.name }))}
      value={editTags}
      onChange={setEditTags}
    />
  </div>
</div>

{editingItem && (
<div className="space-y-4">
<div className="space-y-2">
  <Label htmlFor="thumbnail-url" className="flex justify-between items-center">
    <span>缩略图 URL</span>
    <span className="text-[10px] text-muted-foreground font-mono italic">大小: {mediaSizes.thumbnail}</span>
  </Label>
  <div className="flex gap-2">
    <div className="w-12 h-12 rounded-lg border overflow-hidden shrink-0 bg-muted flex items-center justify-center">
      {thumbnailUrl ? (
        <ProtectedMedia 
          src={thumbnailUrl} 
          type="image" 
          className="w-full h-full object-contain" 
          alt="thumb" 
          ruleKey="后"
        />
      ) : (
        <ImageIcon className="w-5 h-5 text-muted-foreground opacity-20" />
      )}
    </div>
    <Input 
      id="thumbnail-url"
      placeholder="输入缩略图 URL" 
      value={thumbnailUrl} 
      onChange={(e) => setThumbnailUrl(e.target.value)}
      className="rounded-xl flex-1 h-12"
    />
  </div>
</div>
{editingItem.type === 'video' && (
<div className="space-y-3">
<div className="flex items-center justify-between">
<Label className="text-xs font-bold text-slate-500">视频缩略图设置</Label>
<Button 
variant="outline" 
size="sm" 
className="h-7 text-[10px] rounded-lg" 
onClick={handleExtractFrames}
disabled={extractingFrames}
>
{extractingFrames ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CirclePlay className="w-3 h-3 mr-1" />}
生成备选帧
</Button>
</div>
<div className="grid grid-cols-2 gap-3">
{videoFrames.length > 0 ? videoFrames.map((f, i) => (
<div 
key={i} 
className={cn(
"relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:border-primary",
thumbnailUrl === f ? "border-primary ring-2 ring-primary ring-offset-2" : "border-slate-100"
)}
onClick={() => setThumbnailUrl(f)}
>
<img src={f} alt={`帧备选 ${i + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
{thumbnailUrl === f && (
<div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
<CircleCheckBig className="w-8 h-8 text-primary fill-white" />
</div>
)}
</div>
)) : (
<div className="col-span-2 p-6 border-2 border-dashed border-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400">
<ImageIcon className="w-8 h-8 mb-2 opacity-20" />
<p className="text-[10px]">点击上方按钮从视频中提取缩略图</p>
</div>
)}
</div>
<div className="space-y-2">
<Label htmlFor="thumbnail-url" className="text-xs">缩略图 URL (可手动修改)</Label>
<Input 
id="thumbnail-url"
placeholder="视频缩略图地址..." 
value={thumbnailUrl} 
onChange={(e) => setThumbnailUrl(e.target.value)}
className="rounded-xl h-9 text-xs"
/>
</div>
</div>
)}

<div className="p-4 bg-slate-50 rounded-xl">
<p className="text-xs text-muted-foreground mb-2">资源预览</p>
<div className="aspect-video bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center relative">
{editingItem.type === 'image' ? (
<img src={editUrl} alt="预览" referrerPolicy="no-referrer" className="max-w-full max-h-full object-contain" />
) : (
<video referrerPolicy="no-referrer" 
  src={editUrl} 
  className="max-w-full max-h-full object-contain" 
  controls 
  {...({ referrerPolicy: "no-referrer" } as any)}
/>
)}
</div>
</div>
</div>
)}
</div>
</ScrollArea>
<div className="p-6 pt-0">
<DialogFooter className="mt-4">
<Button variant="ghost" onClick={() => setEditingItem(null)} className="rounded-xl">取消</Button>
<Button onClick={handleSaveEdit} disabled={updating} className="rounded-xl">
{updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
保存修改
</Button>
</DialogFooter>
</div>
</DialogContent>
    </Dialog>
    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
      <DialogContent className="rounded-2xl max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            批量导入资源
          </DialogTitle>
          <DialogDescription>
            支持导入图片或视频链接，资源将进入“中间库”暂存，通过审核后才会在前端展示。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold flex items-center justify-between">
              <span>资源链接 (每行一个)</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">或者通过文件导入:</span>
                <Button variant="outline" size="sm" className="h-6 text-[10px] rounded-md px-2 relative overflow-hidden" asChild>
                  <label className="cursor-pointer">
                    <input type="file" accept=".xls,.xlsx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleXlsImport} />
                    <FileCode2 className="w-3 h-3 mr-1" />
                    选择 XLS 文件
                  </label>
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] rounded-md px-2 text-primary" onClick={handleDownloadTemplate}>
                  <Download className="w-3 h-3 mr-1" />
                  下载 XLS 模板
                </Button>
              </div>
            </Label>
            <Textarea 
              placeholder="https://example.com/image1.jpg\nhttps://example.com/video1.mp4" 
              className="min-h-[200px] rounded-xl font-mono text-[10px] leading-relaxed border-slate-200"
              value={importUrls}
              onChange={(e) => setImportUrls(e.target.value)}
            />
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-muted-foreground">提示：文件支持表头 url, title, tags</p>
              <Badge variant="secondary" className="text-[10px]">{importUrls.split("\n").filter(u => u.trim()).length} 条链接</Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold">默认分类</Label>
              <Select value={importCategory} onValueChange={setImportCategory}>
                <SelectTrigger className="rounded-xl border-slate-200 h-9">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                  <SelectItem value="all">未分类</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">默认标签</Label>
              <Input 
                placeholder="多个用空格隔开" 
                className="h-9 rounded-xl border-slate-200 text-xs"
                value={importTags}
                onChange={(e) => setImportTags(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="bg-slate-50/50 -mx-6 -mb-6 p-4 border-t border-slate-100 mt-2">
          <Button variant="ghost" onClick={() => setImportDialogOpen(false)} className="rounded-xl h-10 px-6">取消</Button>
          <Button onClick={handleImport} className="rounded-xl px-10 h-10 font-bold shadow-lg shadow-primary/20">
            确认导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
</div>
);
}
