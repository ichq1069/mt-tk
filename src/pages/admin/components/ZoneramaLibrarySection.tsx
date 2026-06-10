import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';
import { Loader2, Download, Image as ImageIcon, Trash2, RefreshCw, ChevronLeft, ChevronRight, Shield, Search, Copy, FileText, Settings2, Eraser } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { extractZoneramaAlbumId, extractZoneramaPhotoId, getZoneramaOriginalUrl, getZoneramaProxyUrl } from '@/lib/media';


// 等级配置
const LEVEL_CONFIG = {
  pending: { label: '待定', color: 'bg-gray-500 text-white' },
  normal: { label: '普通', color: 'bg-green-600 text-white' },
  vip: { label: 'VIP', color: 'bg-yellow-600 text-white' },
  svip: { label: 'SVIP', color: 'bg-blue-600 text-white' },
  restricted: { label: '受限', color: 'bg-red-600 text-white' },
} as const;

// Zonerama 库组件 - 管理从 Zonerama 导入的图片

interface ZoneramaPhoto {
  id: string;
  album_id: string;
  photo_id: string;
  url: string;
  title: string | null;
  level: 'pending' | 'normal' | 'vip' | 'svip' | 'restricted';
  status: 'pending' | 'transferred_to_wallpaper' | 'transferred_to_album' | 'recycled' | 'blacklisted';
  transferred_to: string | null;
  transferred_at: string | null;
  created_at: string;
}

interface Album {
  id: string;
  title: string;
}

interface AlbumConfig {
  id: string;
  album_id: string;
  album_name: string | null;
  description: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
  photo_count: number;
  created_at: string;
  updated_at: string;
}

interface BatchInsertResult {
  inserted_count: number;
  skipped_count: number;
}

interface TransferResult {
  success_count: number;
  error_count: number;
}

export function ZoneramaLibrarySection() {
  // 状态管理
  const [albumId, setAlbumId] = useState('');
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<ZoneramaPhoto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<'wallpaper' | 'album'>('wallpaper');
  const [targetAlbumId, setTargetAlbumId] = useState('');
  const [transferring, setTransferring] = useState(false);
  
  // 翻页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24); // 每页显示数量，可自定义

  // 相册管理状态
  const [albumConfigs, setAlbumConfigs] = useState<AlbumConfig[]>([]);
  const [newAlbumId, setNewAlbumId] = useState('');
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [savingAlbum, setSavingAlbum] = useState(false);
  const [syncingAlbumId, setSyncingAlbumId] = useState<string | null>(null);

  // 新写真图集状态
  const [createNewAlbumDialogOpen, setCreateNewAlbumDialogOpen] = useState(false);
  const [newPhotoAlbumTitle, setNewPhotoAlbumTitle] = useState('');
  const [newPhotoAlbumDesc, setNewPhotoAlbumDesc] = useState('');
  const [creatingNewAlbum, setCreatingNewAlbum] = useState(false);

  // 图片状态筛选
  const [photoStatusFilter, setPhotoStatusFilter] = useState<'pending' | 'transferred' | 'recycled' | 'blacklisted'>('pending');

  // 批量更新链接
  const [updatingLinks, setUpdatingLinks] = useState(false);

  // 审计状态
  const [auditStats, setAuditStats] = useState({
    mediaItemsTotal: 0,
    mediaItemsNonCompliant: 0,
    albumPhotosTotal: 0,
    albumPhotosNonCompliant: 0,
  });
  const [auditing, setAuditing] = useState(false);
  const [fixing, setFixing] = useState(false);

  // 日志记录状态
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  
  // 手动替换状态
  const [manualReplaceOpen, setManualReplaceOpen] = useState(false);
  const [findPattern, setFindPattern] = useState('');
  const [replacePattern, setReplacePattern] = useState('');
  const [replaceTable, setReplaceTable] = useState<'all' | 'media_items' | 'album_photos'>('all');
  const [manualReplacing, setManualReplacing] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${time}] ${msg}`]);
    console.debug(`[Zonerama Audit] ${msg}`);
  };

  const copyLogs = () => {
    if (logs.length === 0) {
      toast.error('没有可复制的日志');
      return;
    }
    const text = logs.join('\n');
    navigator.clipboard.writeText(text);
    toast.success('日志已复制到剪贴板');
  };

  const handleManualReplace = async () => {
    if (!findPattern.trim()) {
      toast.error('请输入查找模式');
      return;
    }
    
    setManualReplacing(true);
    const loadingToast = toast.loading('正在执行手动替换...');
    addLog(`开始执行手动替换: 查找 [${findPattern}] -> 替换 [${replacePattern}]，范围 [${replaceTable}]`);
    
    try {
      let totalUpdated = 0;
      const tables = replaceTable === 'all' ? (['media_items', 'album_photos'] as const) : ([replaceTable] as const);
      
      // 处理通配符
      const isWildcard = findPattern.includes('*');
      const regex = isWildcard ? new RegExp('^' + findPattern.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$') : null;

      for (const table of tables) {
        addLog(`正在扫描表: ${table}...`);
        // 获取所有可能有问题的链接（简单起见获取所有包含 zonerama 的）
        const { data, error } = await supabase.from(table).select('id, url').ilike('url', '%zonerama.com%') as { data: any[] | null, error: any };
        
        if (error) {
          addLog(`获取表 ${table} 数据失败: ${error.message}`);
          continue;
        }

        if (!data || data.length === 0) {
          addLog(`表 ${table} 未发现符合条件的记录`);
          continue;
        }

        const updates = data.map((item: any) => {
          let matched = false;
          let newUrl = item.url;

          if (isWildcard && regex) {
            if (regex.test(item.url)) {
              matched = true;
              // 简单的正则替换，如果 replacePattern 包含 $1 等可能需要更复杂处理，这里暂支持整体或固定替换
              // 如果用户输入 *abc* -> *xyz* 这种，逻辑会比较复杂
              // 简化逻辑：匹配则替换整个
              newUrl = replacePattern; 
            }
          } else {
            if (item.url.includes(findPattern)) {
              matched = true;
              newUrl = item.url.split(findPattern).join(replacePattern);
            }
          }

          if (matched && newUrl !== item.url) {
            return { id: item.id, url: newUrl, updated_at: new Date().toISOString() };
          }
          return null;
        }).filter(Boolean);

        if (updates.length > 0) {
          addLog(`在表 ${table} 中发现 ${updates.length} 条匹配项，开始更新...`);
          let success = 0;
          for (const up of updates) {
            if (!up) continue;
            const { error: upError } = await (supabase.from(table) as any).update({ url: up.url, updated_at: up.updated_at }).eq('id', up.id);
            if (!upError) success++;
            else addLog(`更新 ID ${up.id} 失败: ${upError.message}`);
          }
          addLog(`表 ${table} 更新完成: 成功 ${success} / 总计 ${updates.length}`);
          totalUpdated += success;
        } else {
          addLog(`表 ${table} 未发现匹配项`);
        }
      }

      toast.success(`手动替换完成，共更新 ${totalUpdated} 条记录`, { id: loadingToast });
      addLog(`手动替换任务结束，共更新 ${totalUpdated} 条记录`);
      runAudit();
      setManualReplaceOpen(false);
    } catch (error: any) {
      addLog(`手动替换过程出错: ${error.message}`);
      toast.error('替换失败: ' + error.message, { id: loadingToast });
    } finally {
      setManualReplacing(false);
    }
  };

  const runAudit = async () => {
    setAuditing(true);
    addLog('开始全库 Zonerama 数据审计扫描...');
    try {
      const [{ data: mediaItems }, { data: albumPhotos }] = await Promise.all([
        supabase.from('media_items').select('url, zonerama_photo_id').or('url.ilike.%zonerama.com%,zonerama_photo_id.not.is.null') as any,
        supabase.from('album_photos').select('url, zonerama_photo_id').or('url.ilike.%zonerama.com%,zonerama_photo_id.not.is.null') as any
      ]);

      const checkNonCompliant = (items: any[]) => items?.filter(item => {
        const hasProxy = item.url && (item.url.includes('?url=') || item.url.includes('?id='));
        const missingId = !item.zonerama_photo_id && item.url && item.url.includes('zonerama.com');
        return hasProxy || missingId;
      }).length || 0;

      const mediaItemsNonCompliant = checkNonCompliant(mediaItems || []);
      const albumPhotosNonCompliant = checkNonCompliant(albumPhotos || []);

      setAuditStats({
        mediaItemsTotal: mediaItems?.length || 0,
        mediaItemsNonCompliant,
        albumPhotosTotal: albumPhotos?.length || 0,
        albumPhotosNonCompliant,
      });
      
      addLog(`审计完成。media_items: 发现 ${mediaItems?.length || 0} 条，不合规 ${mediaItemsNonCompliant} 条。`);
      addLog(`审计完成。album_photos: 发现 ${albumPhotos?.length || 0} 条，不合规 ${albumPhotosNonCompliant} 条。`);
      
      toast.success('审计完成');
    } catch (error: any) {
      addLog(`审计失败: ${error.message}`);
      toast.error('审计失败: ' + error.message);
    } finally {
      setAuditing(false);
    }
  };

  const handleFixCompliantData = async () => {
    if (fixing) return;
    setFixing(true);
    const loadingToast = toast.loading('正在修复全库 Zonerama 链接格式并清理重复项...');
    addLog('开始全库自动修复与重复项清理任务...');
    try {
      let totalFixed = 0;
      let totalDeleted = 0;
      let totalErrors = 0;
      
      const tables = ['media_items', 'album_photos'] as const;
      
      for (const table of tables) {
        addLog(`正在扫描 ${table} 表...`);
        const { data: items } = await supabase.from(table)
          .select('id, url, zonerama_photo_id, created_at')
          .or('url.ilike.%zonerama.com%,zonerama_photo_id.not.is.null') as { data: any[] | null };
        
        if (items && items.length > 0) {
          // 按照提取的 photoId 进行分组
          const groups: Record<string, any[]> = {};
          items.forEach(item => {
            const photoId = item.zonerama_photo_id || extractZoneramaPhotoId(item.url);
            if (photoId) {
              if (!groups[photoId]) groups[photoId] = [];
              groups[photoId].push({ ...item, targetPhotoId: photoId });
            }
          });

          const photoIds = Object.keys(groups);
          let tableFixed = 0;
          let tableDeleted = 0;

          for (const photoId of photoIds) {
            const group = groups[photoId];
            if (group.length === 0) continue;

            // 按创建时间排序，保留最早的
            group.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
            
            const oldest = group[0];
            const duplicates = group.slice(1);

            // 1. 处理重复项：保留最早的，删除其他的
            if (duplicates.length > 0) {
              addLog(`发现 PhotoID ${photoId} 有 ${group.length} 条记录，保留最早的 (${oldest.id})，删除其余 ${duplicates.length} 条`);
              const deleteIds = duplicates.map(d => d.id);
              const { error: delError } = await supabase.from(table).delete().in('id', deleteIds);
              if (delError) {
                addLog(`删除 ${table} 重复项失败: ${delError.message}`);
                totalErrors += duplicates.length;
              } else {
                tableDeleted += duplicates.length;
                totalDeleted += duplicates.length;
              }
            }

            // 2. 修复保留的那条记录
            const originalUrl = getZoneramaOriginalUrl(photoId);
            const needsUpdate = oldest.url !== originalUrl || oldest.zonerama_photo_id !== photoId;
            
            if (needsUpdate) {
              const { error: upError } = await (supabase.from(table) as any)
                .update({ 
                  url: originalUrl, 
                  zonerama_photo_id: photoId,
                  updated_at: new Date().toISOString()
                })
                .eq('id', oldest.id);
              
              if (upError) {
                addLog(`修复 ${table} ID ${oldest.id} 失败: ${upError.message}`);
                totalErrors++;
              } else {
                tableFixed++;
                totalFixed++;
              }
            }
          }

          if (tableFixed > 0 || tableDeleted > 0) {
            addLog(`${table} 处理完成: 修复 ${tableFixed} 条，删除重复 ${tableDeleted} 条`);
          } else {
            addLog(`${table} 表无需处理`);
          }
        } else {
          addLog(`${table} 表未发现 Zonerama 数据`);
        }
      }

      if (totalErrors > 0) {
        addLog(`任务结束: 成功修复 ${totalFixed} 条，删除重复 ${totalDeleted} 条，失败 ${totalErrors} 条`);
        toast.warning(`任务完成，但有错误。修复: ${totalFixed}, 删除: ${totalDeleted}, 错误: ${totalErrors}`, { id: loadingToast });
      } else {
        addLog(`任务成功完成: 修复 ${totalFixed} 条，删除重复 ${totalDeleted} 条`);
        toast.success(`任务成功完成: 修复 ${totalFixed}, 删除: ${totalDeleted}`, { id: loadingToast });
      }
      
      await runAudit();
    } catch (error: any) {
      addLog(`任务意外中断: ${error.message}`);
      toast.error('任务失败: ' + error.message, { id: loadingToast });
    } finally {
      setFixing(false);
    }
  };

  const handleBatchUpdateLinks = async () => {
    if (selectedPhotos.length === 0) {
      toast.error('请先选择图片');
      return;
    }

    setUpdatingLinks(true);
    try {
      // 1. 获取选中图片详情
      const { data: selectedItems }: { data: any[] | null } = await supabase
        .from('zonerama_library')
        .select('*')
        .in('id', selectedPhotos);
      
      if (!selectedItems || selectedItems.length === 0) throw new Error('未找到选中图片数据');

      // 2. 准备更新数据
      const updates = selectedItems.map((item: any) => {
        const photoId = item.photo_id || extractZoneramaPhotoId(item.url);
        // 统一入库原始 URL，不再在库里存代理后的链接
        const newUrl = getZoneramaOriginalUrl(photoId);
        return {
          id: item.id,
          url: newUrl,
          photo_id: photoId,
          updated_at: new Date().toISOString()
        };
      });

      // 3. 执行批量更新
      const { error } = await supabase.from('zonerama_library').upsert(updates as any);
      if (error) throw error;

      toast.success(`成功更新 ${updates.length} 条链接`);
      loadPhotos();
    } catch (error: any) {
      console.error('批量更新链接失败:', error);
      toast.error('批量更新失败: ' + error.message);
    } finally {
      setUpdatingLinks(false);
    }
  };

  // 加载图片列表（根据状态筛选）
  const loadPhotos = async () => {
    try {
      let query = supabase.from('zonerama_library').select('*', { count: 'exact' });

      // 根据状态筛选
      if (photoStatusFilter === 'pending') {
        query = query.eq('status', 'pending');
      } else if (photoStatusFilter === 'transferred') {
        query = query.in('status', ['transferred_to_wallpaper', 'transferred_to_album']);
      } else if (photoStatusFilter === 'recycled') {
        query = query.eq('status', 'recycled');
      } else if (photoStatusFilter === 'blacklisted') {
        query = query.eq('status', 'blacklisted');
      }

      // 获取总数
      const { count, error: countError } = await query;
      if (countError) throw countError;
      setTotalCount(count || 0);

      // 获取当前页数据
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let dataQuery = supabase.from('zonerama_library').select('*');
      
      // 根据状态筛选
      if (photoStatusFilter === 'pending') {
        dataQuery = dataQuery.eq('status', 'pending');
      } else if (photoStatusFilter === 'transferred') {
        dataQuery = dataQuery.in('status', ['transferred_to_wallpaper', 'transferred_to_album']);
      } else if (photoStatusFilter === 'recycled') {
        dataQuery = dataQuery.eq('status', 'recycled');
      } else if (photoStatusFilter === 'blacklisted') {
        dataQuery = dataQuery.eq('status', 'blacklisted');
      }

      const { data, error } = await dataQuery
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      console.error('加载图片列表失败:', error);
      toast.error('加载图片列表失败: ' + error.message);
    }
  };

  // 加载写真图集列表
  const loadAlbums = async () => {
    try {
      const { data, error } = await supabase
        .from('photo_albums')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlbums(data || []);
      console.debug('[Zonerama 库] 加载写真图集列表成功，数量:', data?.length || 0);
    } catch (error: any) {
      console.error('加载图集列表失败:', error);
      toast.error('加载图集列表失败: ' + error.message);
    }
  };

  // 加载相册配置列表
  const loadAlbumConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('zonerama_album_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlbumConfigs(data || []);
      console.debug('[Zonerama 库] 加载相册配置成功，数量:', data?.length || 0);
    } catch (error: any) {
      console.error('加载相册配置失败:', error);
      toast.error('加载相册配置失败: ' + error.message);
    }
  };

  // 保存相册配置
  const handleSaveAlbumConfig = async () => {
    if (!newAlbumId.trim()) {
      toast.error('请输入相册 ID');
      return;
    }

    setSavingAlbum(true);
    try {
      const { error } = await (supabase.from('zonerama_album_configs') as any).upsert({
        album_id: newAlbumId.trim(),
        album_name: newAlbumName.trim() || null,
        description: newAlbumDesc.trim() || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'album_id',
      });

      if (error) throw error;

      toast.success('保存成功');
      setNewAlbumId('');
      setNewAlbumName('');
      setNewAlbumDesc('');
      loadAlbumConfigs();
    } catch (error: any) {
      console.error('保存相册配置失败:', error);
      toast.error('保存失败: ' + error.message);
    } finally {
      setSavingAlbum(false);
    }
  };

  // 删除相册配置
  const handleDeleteAlbumConfig = async (id: string) => {
    if (!confirm('确定要删除这个相册配置吗？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('zonerama_album_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('删除成功');
      loadAlbumConfigs();
    } catch (error: any) {
      console.error('删除相册配置失败:', error);
      toast.error('删除失败: ' + error.message);
    }
  };

  // 切换相册启用状态
  const handleToggleAlbumConfig = async (id: string, isActive: boolean) => {
    try {
      const { error } = await (supabase.from('zonerama_album_configs') as any).update({ 
        is_active: !isActive, 
        updated_at: new Date().toISOString() 
      }).eq('id', id);

      if (error) throw error;

      toast.success(isActive ? '已禁用' : '已启用');
      loadAlbumConfigs();
    } catch (error: any) {
      console.error('切换相册状态失败:', error);
      toast.error('操作失败: ' + error.message);
    }
  };

  // 选择相册配置
  const handleSelectAlbumConfig = (config: AlbumConfig) => {
    setAlbumId(config.album_id);
    toast.success(`已选择相册：${config.album_name || config.album_id}`);
  };

  // 同步相册（使用与获取图片相同的逻辑）
  const handleSyncAlbum = async (config: AlbumConfig) => {
    setSyncingAlbumId(config.id);
    try {
      console.debug('[Zonerama 库] 开始同步相册:', config.album_id);
      
      // 1. 从数据库读取配置
      const { data: configData, error: configError } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'zonerama_upload_config')
        .single<{ value: any }>();

      if (configError) {
        throw new Error('读取配置失败: ' + configError.message);
      }

      const albumPhotoApi = configData?.value?.album_photo_api || '';
      const photoApi = configData?.value?.photo_api || '';

      if (!albumPhotoApi) {
        throw new Error('图集内图片列表接口未配置');
      }

      console.debug('[Zonerama 库] 配置读取成功');

      // 2. 调用 Zonerama API
      const apiUrl = `${albumPhotoApi}${config.album_id}`;
      console.debug('[Zonerama 库] 调用接口:', apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`接口调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.debug('[Zonerama 库] 接口返回数据:', data);

      // 3. 提取图片列表
      if (!data.photos || !Array.isArray(data.photos)) {
        throw new Error('接口返回数据格式错误，缺少 photos 数组');
      }

      const photoList = data.photos.map((photo: any) => {
        const photoId = String(photo.id || extractZoneramaPhotoId(photo.url) || '');
        const url = getZoneramaOriginalUrl(photoId); // 统一入库原始 URL
        return {
          photo_id: photoId,
          url: url,
          title: data.title || config.album_id,
        };
      });

      console.debug('[Zonerama 库] 提取到图片数量:', photoList.length);

      if (photoList.length === 0) {
        toast.info('该相册暂无图片');
        setSyncingAlbumId(null);
        return;
      }

      // 4. 批量插入数据库（会自动跳过黑名单，恢复回收站图片）
      const { data: insertData, error: insertError } = await (supabase as any).rpc(
        'batch_insert_zonerama_photos',
        {
          p_album_id: config.album_id,
          p_photos: photoList,
        }
      );

      if (insertError) throw insertError;

      // RPC 返回的是数组格式 [{ inserted_count, skipped_count }]
      const result = Array.isArray(insertData) ? insertData[0] : insertData;
      console.debug('[Zonerama 库] 插入结果:', result);

      const insertedCount = result?.inserted_count || 0;
      const skippedCount = result?.skipped_count || 0;

      // 5. 更新相册配置
      await (supabase.from('zonerama_album_configs') as any).update({
        last_fetched_at: new Date().toISOString(),
        photo_count: insertedCount,
        updated_at: new Date().toISOString(),
      }).eq('id', config.id);

      toast.success(
        `同步成功！新增 ${insertedCount} 张图片，跳过 ${skippedCount} 张（已存在或黑名单）`
      );

      // 刷新相册配置列表
      loadAlbumConfigs();
      
      // 如果当前正在查看该相册，刷新图片列表
      if (albumId === config.album_id) {
        loadPhotos();
      }
    } catch (error: any) {
      console.error('[Zonerama 库] 同步失败:', error);
      toast.error('同步失败: ' + error.message);
    } finally {
      setSyncingAlbumId(null);
    }
  };

  useEffect(() => {
    setCurrentPage(1); // 切换状态时重置页码
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoStatusFilter]); // 依赖 photoStatusFilter，状态变化时重新加载

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]); // 依赖 currentPage，页码变化时重新加载

  useEffect(() => {
    loadAlbums();
    loadAlbumConfigs();
  }, []);

  // 获取 Zonerama 图片
  const handleFetchPhotos = async () => {
    if (!albumId.trim()) {
      toast.error('请输入相册 ID');
      return;
    }

    setLoading(true);
    console.debug('[Zonerama 库] 开始获取相册图片，相册 ID:', albumId);

    try {
      // 1. 从数据库读取配置
      const { data: configData, error: configError } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'zonerama_upload_config')
        .single<{ value: any }>();

      if (configError) {
        throw new Error('读取配置失败: ' + configError.message);
      }

      const albumPhotoApi = configData?.value?.album_photo_api || '';
      const photoApi = configData?.value?.photo_api || '';

      if (!albumPhotoApi) {
        throw new Error('图集内图片列表接口未配置');
      }

      console.debug('[Zonerama 库] 配置读取成功');
      console.debug('[Zonerama 库] 图集内图片列表接口:', albumPhotoApi);
      console.debug('[Zonerama 库] 图片代理接口:', photoApi);

      // 2. 调用 Zonerama API
      const apiUrl = `${albumPhotoApi}${albumId}`;
      console.debug('[Zonerama 库] 调用接口:', apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`接口调用失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.debug('[Zonerama 库] 接口返回数据:', data);

      // 3. 提取图片列表
      if (!data.photos || !Array.isArray(data.photos)) {
        throw new Error('接口返回数据格式错误，缺少 photos 数组');
      }

      const photoList = data.photos.map((photo: any) => {
        const photoId = String(photo.id || extractZoneramaPhotoId(photo.url) || '');
        const url = getZoneramaOriginalUrl(photoId); // 统一入库原始 URL
        return {
          photo_id: photoId,
          url: url,
          title: data.title || albumId,
        };
      });

      console.debug('[Zonerama 库] 提取到图片数量:', photoList.length);

      if (photoList.length === 0) {
        toast.warning('该相册没有图片');
        return;
      }

      // 4. 批量插入数据库
      // @ts-ignore - Supabase RPC 类型定义问题
      const { data: result, error: insertError } = await supabase.rpc('batch_insert_zonerama_photos', {
        p_album_id: albumId,
        p_photos: photoList,
      });

      if (insertError) {
        throw insertError;
      }

      const typedResult = result as unknown as BatchInsertResult[];
      const insertedCount = typedResult?.[0]?.inserted_count || 0;
      const skippedCount = typedResult?.[0]?.skipped_count || 0;

      console.debug('[Zonerama 库] 插入成功:', insertedCount, '跳过:', skippedCount);

      toast.success(
        `获取成功！新增 ${insertedCount} 张图片${skippedCount > 0 ? `，跳过 ${skippedCount} 张重复图片` : ''}`
      );

      // 刷新列表
      loadPhotos();
      setAlbumId('');
      setCurrentPage(1); // 重置到第一页
    } catch (error: any) {
      console.error('[Zonerama 库] 获取失败:', error);
      toast.error('获取失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 选择/取消选择图片
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedPhotos.length === photos.length) {
      setSelectedPhotos([]);
    } else {
      setSelectedPhotos(photos.map((p) => p.id));
    }
  };

  // 更新图片等级
  const handleLevelChange = async (photoId: string, level: 'pending' | 'normal' | 'vip' | 'svip' | 'restricted') => {
    try {
      const { error } = await (supabase
        .from('zonerama_library') as any)
        .update({ level })
        .eq('id', photoId);

      if (error) throw error;

      // 更新本地状态
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, level } : p))
      );

      toast.success('等级已更新');
    } catch (error: any) {
      console.error('[Zonerama 库] 更新等级失败:', error);
      toast.error('更新等级失败: ' + error.message);
    }
  };

  // 打开转移对话框
  const openTransferDialog = (target: 'wallpaper' | 'album') => {
    if (selectedPhotos.length === 0) {
      toast.error('请先选择要转移的图片');
      return;
    }
    setTransferTarget(target);
    setTransferDialogOpen(true);
  };

  // 打开创建新写真图集对话框
  const openCreateNewAlbumDialog = () => {
    if (selectedPhotos.length === 0) {
      toast.error('请先选择要转移的图片');
      return;
    }
    setCreateNewAlbumDialogOpen(true);
  };

  // 创建新写真图集并转移
  const handleCreateNewAlbumAndTransfer = async () => {
    if (!newPhotoAlbumTitle.trim()) {
      toast.error('请输入图集标题');
      return;
    }

    setCreatingNewAlbum(true);
    console.debug('[Zonerama 库] 创建新写真图集并转移，图片数量:', selectedPhotos.length);

    try {
      // 1. 创建新写真图集
      const { data: newAlbum, error: createError } = await (supabase
        .from('photo_albums') as any)
        .insert({
          title: newPhotoAlbumTitle.trim(),
          description: newPhotoAlbumDesc.trim() || null,
          cover_url: null,
          photo_count: 0,
        })
        .select()
        .single();

      if (createError) throw createError;

      console.debug('[Zonerama 库] 新写真图集创建成功:', newAlbum.id);

      // 2. 转移图片到新图集
      const { data: result, error: transferError } = await (supabase as any).rpc(
        'transfer_zonerama_to_album',
        {
          p_photo_ids: selectedPhotos,
          p_target_album_id: newAlbum.id,
        }
      );

      if (transferError) throw transferError;

      console.debug('[Zonerama 库] 转移成功:', result);

      toast.success(`成功创建图集并转移 ${selectedPhotos.length} 张图片`);

      // 重置状态
      setSelectedPhotos([]);
      setCreateNewAlbumDialogOpen(false);
      setNewPhotoAlbumTitle('');
      setNewPhotoAlbumDesc('');
      loadPhotos();
      loadAlbums(); // 刷新图集列表
    } catch (error: any) {
      console.error('[Zonerama 库] 创建图集并转移失败:', error);
      toast.error('操作失败: ' + error.message);
    } finally {
      setCreatingNewAlbum(false);
    }
  };

  // 执行转移
  const handleTransfer = async () => {
    if (transferTarget === 'album' && !targetAlbumId) {
      toast.error('请选择目标图集');
      return;
    }

    setTransferring(true);
    console.debug('[Zonerama 库] 开始转移，目标:', transferTarget, '图片数量:', selectedPhotos.length);

    try {
      let result;
      if (transferTarget === 'wallpaper') {
        // @ts-ignore - Supabase RPC 类型定义问题
        const { data, error } = await supabase.rpc('transfer_zonerama_to_wallpaper', {
          p_photo_ids: selectedPhotos,
        });
        if (error) throw error;
        result = data;
      } else {
        // @ts-ignore - Supabase RPC 类型定义问题
        const { data, error } = await supabase.rpc('transfer_zonerama_to_album', {
          p_photo_ids: selectedPhotos,
          p_target_album_id: targetAlbumId,
        });
        if (error) throw error;
        result = data;
      }

      const typedResult = result as unknown as TransferResult[];
      const successCount = typedResult?.[0]?.success_count || 0;
      const errorCount = typedResult?.[0]?.error_count || 0;

      console.debug('[Zonerama 库] 转移完成，成功:', successCount, '失败:', errorCount);

      if (successCount > 0) {
        toast.success(
          `转移成功！成功 ${successCount} 张${errorCount > 0 ? `，失败 ${errorCount} 张` : ''}`
        );
        setSelectedPhotos([]);
        setTransferDialogOpen(false);
        setTargetAlbumId('');
        loadPhotos();
      } else {
        toast.error('转移失败');
      }
    } catch (error: any) {
      console.error('[Zonerama 库] 转移失败:', error);
      toast.error('转移失败: ' + error.message);
    } finally {
      setTransferring(false);
    }
  };

  // 删除图片
  // 移到回收站
  const handleMoveToRecycleBin = async () => {
    if (selectedPhotos.length === 0) {
      toast.error('请先选择要移到回收站的图片');
      return;
    }

    if (!confirm(`确定要将选中的 ${selectedPhotos.length} 张图片移到回收站吗？`)) {
      return;
    }

    try {
      const { error } = await (supabase
        .from('zonerama_library') as any)
        .update({ status: 'recycled', updated_at: new Date().toISOString() })
        .in('id', selectedPhotos);

      if (error) throw error;

      toast.success(`已将 ${selectedPhotos.length} 张图片移到回收站`);
      setSelectedPhotos([]);
      loadPhotos();
    } catch (error: any) {
      console.error('[Zonerama 库] 移到回收站失败:', error);
      toast.error('移到回收站失败: ' + error.message);
    }
  };

  // 加入黑名单
  const handleAddToBlacklist = async () => {
    if (selectedPhotos.length === 0) {
      toast.error('请先选择要加入黑名单的图片');
      return;
    }

    if (!confirm(`确定要将选中的 ${selectedPhotos.length} 张图片加入黑名单吗？加入后同步时将自动跳过这些图片。`)) {
      return;
    }

    try {
      const { error } = await (supabase
        .from('zonerama_library') as any)
        .update({ status: 'blacklisted', updated_at: new Date().toISOString() })
        .in('id', selectedPhotos);

      if (error) throw error;

      toast.success(`已将 ${selectedPhotos.length} 张图片加入黑名单`);
      setSelectedPhotos([]);
      loadPhotos();
    } catch (error: any) {
      console.error('[Zonerama 库] 加入黑名单失败:', error);
      toast.error('加入黑名单失败: ' + error.message);
    }
  };

  // 恢复图片（从回收站或黑名单恢复到待处理）
  const handleRestore = async () => {
    if (selectedPhotos.length === 0) {
      toast.error('请先选择要恢复的图片');
      return;
    }

    try {
      const { error } = await (supabase
        .from('zonerama_library') as any)
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .in('id', selectedPhotos);

      if (error) throw error;

      toast.success(`已恢复 ${selectedPhotos.length} 张图片`);
      setSelectedPhotos([]);
      loadPhotos();
    } catch (error: any) {
      console.error('[Zonerama 库] 恢复失败:', error);
      toast.error('恢复失败: ' + error.message);
    }
  };

  // 永久删除（仅在回收站和黑名单中可用）
  const handleDelete = async () => {
    if (selectedPhotos.length === 0) {
      toast.error('请先选择要删除的图片');
      return;
    }

    if (!confirm(`确定要永久删除选中的 ${selectedPhotos.length} 张图片吗？此操作不可恢复！`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('zonerama_library')
        .delete()
        .in('id', selectedPhotos);

      if (error) throw error;

      toast.success(`删除成功！已删除 ${selectedPhotos.length} 张图片`);
      setSelectedPhotos([]);
      loadPhotos();
    } catch (error: any) {
      console.error('[Zonerama 库] 删除失败:', error);
      toast.error('删除失败: ' + error.message);
    }
  };

  // 批量转权限级别
  const handleBatchChangeLevel = async (newLevel: 'pending' | 'normal' | 'vip' | 'svip' | 'restricted') => {
    if (selectedPhotos.length === 0) {
      toast.error('请先选择要修改的图片');
      return;
    }

    if (!confirm(`确定要将选中的 ${selectedPhotos.length} 张图片的权限级别改为「${LEVEL_CONFIG[newLevel].label}」吗？`)) {
      return;
    }

    try {
      const { error } = await (supabase
        .from('zonerama_library') as any)
        .update({ level: newLevel })
        .in('id', selectedPhotos);

      if (error) throw error;

      toast.success(`修改成功！已将 ${selectedPhotos.length} 张图片的权限级别改为「${LEVEL_CONFIG[newLevel].label}」`);
      setSelectedPhotos([]);
      loadPhotos();
    } catch (error: any) {
      console.error('[Zonerama 库] 修改权限级别失败:', error);
      toast.error('修改权限级别失败: ' + error.message);
    }
  };

  // 整个图集批量转权限级别
  const handleBatchChangeLevelForAlbum = async (newLevel: 'pending' | 'normal' | 'vip' | 'svip' | 'restricted') => {
    if (!albumId) {
      toast.error('请先选择相册');
      return;
    }

    if (!confirm(`确定要将当前相册的所有图片的权限级别改为「${LEVEL_CONFIG[newLevel].label}」吗？`)) {
      return;
    }

    try {
      const { error } = await (supabase
        .from('zonerama_library') as any)
        .update({ level: newLevel })
        .eq('album_id', albumId)
        .in('status', ['pending', 'transferred_to_wallpaper', 'transferred_to_album']); // 只修改未删除的图片

      if (error) throw error;

      toast.success(`修改成功！已将当前相册的所有图片的权限级别改为「${LEVEL_CONFIG[newLevel].label}」`);
      setSelectedPhotos([]);
      loadPhotos();
    } catch (error: any) {
      console.error('[Zonerama 库] 修改权限级别失败:', error);
      toast.error('修改权限级别失败: ' + error.message);
    }
  };

  // 计算总页数
  const totalPages = Math.ceil(totalCount / pageSize);

  // 翻页函数
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    setSelectedPhotos([]); // 切换页面时清空选择
  };

  return (
    <Tabs defaultValue="library" className="space-y-6">
      <TabsList>
        <TabsTrigger value="library">Zonerama 库</TabsTrigger>
        <TabsTrigger value="albums">相册管理</TabsTrigger>
        <TabsTrigger value="audit">数据审计 & 清理</TabsTrigger>
      </TabsList>

      {/* Zonerama 库 Tab */}
      <TabsContent value="library" className="space-y-6">
        {/* 获取图片 */}
        <Card>
          <CardHeader>
            <CardTitle>获取 Zonerama 图片</CardTitle>
            <CardDescription>输入相册 ID，自动获取图片并存入库中</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="album-id">相册 ID</Label>
                <Input
                  id="album-id"
                  placeholder="请输入 Zonerama 相册 ID"
                  value={albumId}
                  onChange={(e) => setAlbumId(extractZoneramaAlbumId(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleFetchPhotos();
                    }
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleFetchPhotos} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      获取中...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      获取图片
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 图片列表 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {photoStatusFilter === 'pending' && `待处理图片 (${totalCount})`}
                  {photoStatusFilter === 'transferred' && `已转移图片 (${totalCount})`}
                  {photoStatusFilter === 'recycled' && `回收站 (${totalCount})`}
                  {photoStatusFilter === 'blacklisted' && `黑名单 (${totalCount})`}
                </CardTitle>
                <CardDescription>
                  {photoStatusFilter === 'pending' && '选择图片后可转移到壁纸库或写真库'}
                  {photoStatusFilter === 'transferred' && '已转移到壁纸库或写真库的图片'}
                  {photoStatusFilter === 'recycled' && '从写真库/壁纸库移除的图片，可恢复或永久删除'}
                  {photoStatusFilter === 'blacklisted' && '黑名单中的图片，同步时将自动跳过'}
                </CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* 状态切换按钮 */}
                <div className="flex gap-1 border rounded-lg p-1">
                  <Button
                    variant={photoStatusFilter === 'pending' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPhotoStatusFilter('pending')}
                  >
                    待处理
                  </Button>
                  <Button
                    variant={photoStatusFilter === 'transferred' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPhotoStatusFilter('transferred')}
                  >
                    已转移
                  </Button>
                  <Button
                    variant={photoStatusFilter === 'recycled' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPhotoStatusFilter('recycled')}
                  >
                    回收站
                  </Button>
                  <Button
                    variant={photoStatusFilter === 'blacklisted' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setPhotoStatusFilter('blacklisted')}
                  >
                    黑名单
                  </Button>
                </div>

                {/* 操作按钮 */}
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {selectedPhotos.length === photos.length ? '取消全选' : '全选'}
                </Button>
                <Button variant="outline" size="sm" onClick={loadPhotos}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  刷新
                </Button>

                {/* 待处理状态的操作 */}
                {photoStatusFilter === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTransferDialog('wallpaper')}
                      disabled={selectedPhotos.length === 0}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      转到壁纸库
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openTransferDialog('album')}
                      disabled={selectedPhotos.length === 0}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      转到写真库
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openCreateNewAlbumDialog}
                      disabled={selectedPhotos.length === 0}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      转为新图集
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMoveToRecycleBin}
                      disabled={selectedPhotos.length === 0}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      移到回收站
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddToBlacklist}
                      disabled={selectedPhotos.length === 0}
                    >
                      加入黑名单
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchUpdateLinks}
                      disabled={selectedPhotos.length === 0 || updatingLinks}
                    >
                      {updatingLinks ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          更新中...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          批量更新链接
                        </>
                      )}
                    </Button>
                    
                    {/* 批量转权限级别 */}
                    <Select onValueChange={(value) => handleBatchChangeLevel(value as any)}>
                      <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="批量转权限级别" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">待定</SelectItem>
                        <SelectItem value="normal">普通</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="svip">SVIP</SelectItem>
                        <SelectItem value="restricted">受限</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* 整个图集批量转权限级别 */}
                    {albumId && (
                      <Select onValueChange={(value) => handleBatchChangeLevelForAlbum(value as any)}>
                        <SelectTrigger className="w-[200px] h-9">
                          <SelectValue placeholder="整个图集转权限级别" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">待定</SelectItem>
                          <SelectItem value="normal">普通</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                          <SelectItem value="svip">SVIP</SelectItem>
                          <SelectItem value="restricted">受限</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}

                {/* 回收站和黑名单的操作 */}
                {(photoStatusFilter === 'recycled' || photoStatusFilter === 'blacklisted') && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRestore}
                      disabled={selectedPhotos.length === 0}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      恢复
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={selectedPhotos.length === 0}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      永久删除
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {photos.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {photoStatusFilter === 'pending' && '暂无待处理图片'}
                {photoStatusFilter === 'transferred' && '暂无已转移图片'}
                {photoStatusFilter === 'recycled' && '回收站为空'}
                {photoStatusFilter === 'blacklisted' && '黑名单为空'}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative group cursor-pointer"
                    onClick={() => togglePhotoSelection(photo.id)}
                  >
                    <div
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                        selectedPhotos.includes(photo.id)
                          ? 'border-primary'
                          : 'border-transparent'
                      }`}
                    >
                      <img
                        src={getZoneramaProxyUrl(photo.url)}
                        alt={photo.title || ''}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={selectedPhotos.includes(photo.id)}
                          onCheckedChange={() => togglePhotoSelection(photo.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {/* 等级显示 */}
                      <div className="absolute top-2 right-2">
                        <Badge className={LEVEL_CONFIG[photo.level].color}>
                          {LEVEL_CONFIG[photo.level].label}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <div className="text-xs text-muted-foreground truncate">
                        {photo.title || photo.photo_id}
                      </div>
                      {/* 相册信息 */}
                      <div className="text-xs text-muted-foreground/70 truncate">
                        相册: {photo.album_id}
                      </div>
                      {/* 等级选择器 */}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        {(['pending', 'normal', 'vip', 'svip', 'restricted'] as const).map((level) => (
                          <button
                            key={level}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLevelChange(photo.id, level);
                            }}
                            className={`px-2 py-0.5 text-xs rounded transition-all ${
                              photo.level === level
                                ? LEVEL_CONFIG[level].color
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {LEVEL_CONFIG[level].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 翻页控件 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground ml-2">
                    共 {totalCount} 张图片，第 {currentPage} / {totalPages} 页
                  </span>
                  
                  {/* 每页数量选择器 */}
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1); // 重置到第一页
                    }}
                  >
                    <SelectTrigger className="w-[120px] h-9 ml-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 张/页</SelectItem>
                      <SelectItem value="24">24 张/页</SelectItem>
                      <SelectItem value="48">48 张/页</SelectItem>
                      <SelectItem value="96">96 张/页</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 转移对话框 */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              转移到{transferTarget === 'wallpaper' ? '壁纸库' : '写真库'}
            </DialogTitle>
            <DialogDescription>
              将选中的 {selectedPhotos.length} 张图片转移到
              {transferTarget === 'wallpaper' ? '壁纸库' : '写真库'}
            </DialogDescription>
          </DialogHeader>
          {transferTarget === 'album' && (
            <div className="space-y-2">
              <Label>选择目标图集</Label>
              <Select value={targetAlbumId} onValueChange={setTargetAlbumId}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择图集" />
                </SelectTrigger>
                <SelectContent>
                  {albums.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      暂无写真图集，请先创建
                    </div>
                  ) : (
                    albums.map((album) => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleTransfer} disabled={transferring}>
              {transferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  转移中...
                </>
              ) : (
                '确认转移'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 创建新写真图集对话框 */}
      <Dialog open={createNewAlbumDialogOpen} onOpenChange={setCreateNewAlbumDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新写真图集</DialogTitle>
            <DialogDescription>
              将选中的 {selectedPhotos.length} 张图片转移到新创建的写真图集
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-album-title">图集标题 *</Label>
              <Input
                id="new-album-title"
                placeholder="请输入图集标题"
                value={newPhotoAlbumTitle}
                onChange={(e) => setNewPhotoAlbumTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-album-desc">图集描述</Label>
              <Input
                id="new-album-desc"
                placeholder="请输入图集描述（可选）"
                value={newPhotoAlbumDesc}
                onChange={(e) => setNewPhotoAlbumDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateNewAlbumDialogOpen(false);
                setNewPhotoAlbumTitle('');
                setNewPhotoAlbumDesc('');
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateNewAlbumAndTransfer}
              disabled={creatingNewAlbum || !newPhotoAlbumTitle.trim()}
            >
              {creatingNewAlbum ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                '创建并转移'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </TabsContent>

      {/* 相册管理 Tab */}
      <TabsContent value="albums" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>相册管理</CardTitle>
            <CardDescription>保存常用的相册 ID，支持快速选择和同步</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 添加新相册 */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">添加新相册</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="new-album-id">相册 ID *</Label>
                  <Input
                    id="new-album-id"
                    placeholder="相册 ID"
                    value={newAlbumId}
                    onChange={(e) => setNewAlbumId(extractZoneramaAlbumId(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="new-album-name">相册名称</Label>
                  <Input
                    id="new-album-name"
                    placeholder="相册名称（可选）"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-album-desc">描述</Label>
                  <Input
                    id="new-album-desc"
                    placeholder="描述（可选）"
                    value={newAlbumDesc}
                    onChange={(e) => setNewAlbumDesc(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveAlbumConfig}
                disabled={savingAlbum || !newAlbumId.trim()}
                size="sm"
              >
                {savingAlbum ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存相册'
                )}
              </Button>
            </div>

            {/* 相册列表 */}
            {albumConfigs.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">已保存的相册 ({albumConfigs.length})</h4>
                <div className="grid grid-cols-1 gap-2">
                  {albumConfigs.map((config) => (
                    <div
                      key={config.id}
                      className={`border rounded-lg p-3 flex items-center justify-between ${
                        !config.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {config.album_name || config.album_id}
                          </span>
                          {!config.is_active && (
                            <span className="text-xs text-muted-foreground">(已禁用)</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {config.album_id}
                          {config.description && ` · ${config.description}`}
                          {config.photo_count > 0 && ` · ${config.photo_count} 张图片`}
                          {config.last_fetched_at && (
                            <span>
                              {' · 最后同步: '}
                              {new Date(config.last_fetched_at).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSyncAlbum(config)}
                          disabled={!config.is_active || syncingAlbumId === config.id}
                        >
                          {syncingAlbumId === config.id ? (
                            <>
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              同步中
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-1 h-3 w-3" />
                              同步
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectAlbumConfig(config)}
                          disabled={!config.is_active}
                        >
                          选择
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAlbumConfig(config.id, config.is_active)}
                        >
                          {config.is_active ? '禁用' : '启用'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteAlbumConfig(config.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                暂无保存的相册，请先添加
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 数据审计 Tab */}
      <TabsContent value="audit" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Zonerama 数据审计与自动清理
            </CardTitle>
            <CardDescription>
              扫描全站数据库中的 Zonerama 图片，识别并自动修复不合规的链接格式（如：带有代理前缀的入库链接、缺失 PhotoID 等）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">壁纸/媒体库 (media_items)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">发现 Zonerama 图片:</span>
                    <span className="font-bold">{auditStats.mediaItemsTotal}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">不合规项:</span>
                    <Badge variant={auditStats.mediaItemsNonCompliant > 0 ? "destructive" : "secondary"}>
                      {auditStats.mediaItemsNonCompliant}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">写真图集 (album_photos)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">发现 Zonerama 图片:</span>
                    <span className="font-bold">{auditStats.albumPhotosTotal}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">不合规项:</span>
                    <Badge variant={auditStats.albumPhotosNonCompliant > 0 ? "destructive" : "secondary"}>
                      {auditStats.albumPhotosNonCompliant}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-4">
              <Button onClick={runAudit} disabled={auditing} variant="outline" className="flex-1">
                {auditing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                立即扫描全库
              </Button>
              <Button 
                onClick={handleFixCompliantData} 
                disabled={fixing || (auditStats.mediaItemsNonCompliant === 0 && auditStats.albumPhotosNonCompliant === 0)} 
                className="flex-1"
                variant="secondary"
              >
                {fixing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                自动修复并清理
              </Button>
              <Button 
                onClick={() => setManualReplaceOpen(true)} 
                variant="outline"
                className="flex-1"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                手动规则替换
              </Button>
            </div>

            {/* 操作日志面板 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="w-4 h-4 text-primary" />
                  操作日志
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={copyLogs} disabled={logs.length === 0} className="h-8">
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    复制日志
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setLogs([])} disabled={logs.length === 0} className="h-8 text-destructive hover:text-destructive">
                    <Eraser className="w-3.5 h-3.5 mr-1" />
                    清空
                  </Button>
                </div>
              </div>
              <div className="bg-black/5 rounded-lg border p-3 h-48 overflow-y-auto font-mono text-[10px] space-y-1">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground opacity-50">暂无操作记录</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="border-b border-black/5 pb-1 last:border-0">{log}</div>
                  ))
                )}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p className="font-bold mb-1">规定要求说明：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>数据库中应仅存储原始 Zonerama 链接，不应包含代理接口前缀。</li>
                <li>每一条 Zonerama 数据都必须关联对应的 PhotoID 以确保唯一性识别。</li>
                <li>修复操作会自动提取 PhotoID 并重构原始链接，确保前端显示时能正确应用最新的代理配置。</li>
                <li>如果自动修复无法识别特定格式，请使用“手动规则替换”功能，支持使用 <code className="bg-muted px-1 rounded text-primary">*</code> 作为通配符。</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* 手动替换对话框 */}
      <Dialog open={manualReplaceOpen} onOpenChange={setManualReplaceOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>手动规则替换</DialogTitle>
            <DialogDescription>
              定义查找模式（支持 * 通配符）和替换后的内容，对全站 Zonerama 链接进行批量替换。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>目标表范围</Label>
              <Select value={replaceTable} onValueChange={(v: any) => setReplaceTable(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全库 (media_items & album_photos)</SelectItem>
                  <SelectItem value="media_items">媒体库 (media_items)</SelectItem>
                  <SelectItem value="album_photos">写真图集 (album_photos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="find-pattern">查找模式</Label>
              <Input 
                id="find-pattern" 
                placeholder="例如: *zonerama.com*?url=*" 
                value={findPattern}
                onChange={(e) => setFindPattern(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">提示：使用 * 代表匹配任意字符。如果不包含 *，则执行字符串包含匹配替换。</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="replace-pattern">替换为</Label>
              <Input 
                id="replace-pattern" 
                placeholder="替换后的内容" 
                value={replacePattern}
                onChange={(e) => setReplacePattern(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualReplaceOpen(false)}>取消</Button>
            <Button onClick={handleManualReplace} disabled={manualReplacing || !findPattern.trim()}>
              {manualReplacing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  执行中...
                </>
              ) : (
                '立即执行替换'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
