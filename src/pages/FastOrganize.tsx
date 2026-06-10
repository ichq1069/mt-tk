import React, { useState, useEffect, useCallback } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { rbacApi } from '@/db/rbac';
import type { MediaItem, ContentCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, Trash2, Undo2, Loader2, Info, CheckCircle2, Video, ImageIcon, 
  HelpCircle, Grid, Square as SquareIcon, CheckCircle, XCircle, Eye, 
  MoreHorizontal, AlertCircle, EyeOff, Zap, Shield, Folder
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatBeijingTime } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';

export default function FastOrganize() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as any) || 'categorize';
  
  const [items, setItems] = useState<MediaItem[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastAction, setLastAction] = useState<{ id: string, actionType: string | null } | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState<'uncategorized' | 'pending'>('uncategorized');
  const [pendingItems, setPendingItems] = useState<MediaItem[]>([]);
  const [viewLayout, setViewLayout] = useState<'single' | 'grid'>('single');
  const [organizeMode, setOrganizeMode] = useState<'categorize' | 'audit' | 'dedupe' | 'staging' | 'daily_gallery'>(initialMode);
  const [dedupeGroups, setDedupeGroups] = useState<any[]>([]);
  const [processedDedupeCount, setProcessedDedupeCount] = useState(0);
  const [currentDedupeItems, setCurrentDedupeItems] = useState<any[]>([]);
  const [dedupeLoading, setDedupeLoading] = useState(false);
  const [dedupeConfig, setDedupeConfig] = useState({ similarity_threshold: 5 });

  const [selectedDedupeIds, setSelectedDedupeIds] = useState<string[]>([]);
  const [isFadingIn, setIsFadingIn] = useState(false);

  const stripExtension = (title: string | null | undefined) => {
    if (!title) return '';
    return title.replace(/\.(jpg|jpeg|png|gif|mp4|mov|avi|wmv)$/i, '');
  };

  // 权限检查
  useEffect(() => {
    const checkPerm = async () => {
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }
      if (profile?.role === 'admin') {
        setHasPermission(true);
      } else {
        const { permissions } = await rbacApi.getCurrentUserPermissions(user.id);
        setHasPermission(permissions?.includes('content_classification') || false);
      }
      setLoading(false);
    };
    checkPerm();
  }, [user, profile]);

  const fetchData = useCallback(async () => {
    if (!hasPermission || !user) return;
    try {
      if (organizeMode === 'audit') {
        const { data } = await api.getPendingAlbumPhotosFast(0, 100);
        setItems((data || []).map((p: any) => ({
           ...p,
           title: (p as any).photo_albums?.title || '未命名图集',
           type: 'image',
           source_table: 'album_photos'
        })) as any);
        setPendingItems([]);
      } else if (organizeMode === 'staging') {
        const { data } = await api.getMediaStaging(0, 100, 'pending');
        setItems((data || []).map((p: any) => ({
           ...p,
           source_table: 'media_staging'
        })) as any);
        setPendingItems([]);
      } else if (organizeMode === 'daily_gallery') {
        const { data } = await api.getDailyGalleryAvailableImages(100, 0, '', 'unused');
        setItems((data || []).map((p: any) => ({
           ...p,
           source_table: 'daily_gallery'
        })) as any);
        setPendingItems([]);
      } else {
        const [catsRes, itemsRes, pendingRes] = await Promise.all([
          api.getContentCategories(),
          api.getUncategorizedMediaFast(user.id, 0, 100, filterType),
          api.getPendingMediaFast(user.id, 0, 100, filterType)
        ]);
        setCategories(catsRes.data || []);
        setItems(itemsRes.data || []);
        setPendingItems(pendingRes.data || []);
      }
      setCurrentIndex(0);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }, [hasPermission, filterType, user, organizeMode]);

  const fetchDedupeData = useCallback(async () => {
    if (!hasPermission || !user) return;
    setDedupeLoading(true);
    setProcessedDedupeCount(0);
    try {
      // 先加载配置
      const { data: config } = await api.getSystemConfig('dedupe_config');
      if (config) setDedupeConfig(config.value);
      const threshold = config?.value?.similarity_threshold || 5;

      const { data: groups, error } = await api.getVisuallyDuplicateMedia(threshold);
      if (error) throw error;
      setDedupeGroups(groups || []);
      setCurrentIndex(0);
      if (groups && groups.length > 0) {
        await fetchDedupeGroupItems(groups[0], threshold);
      }
    } catch (error) {
      console.error('Fetch dedupe error:', error);
    } finally {
      setDedupeLoading(false);
    }
  }, [hasPermission, user]);

  const fetchDedupeGroupItems = async (group: any, threshold?: number) => {
    setDedupeLoading(true);
    setSelectedDedupeIds([]); // 重置勾选
    try {
      const { data, error } = await api.getVisuallyDuplicateByHash(group.content_hash, threshold || dedupeConfig.similarity_threshold);
      if (error) throw error;
      setCurrentDedupeItems(data || []);
    } catch (e: any) {
      toast.error('加载详情失败: ' + e.message);
    } finally {
      setDedupeLoading(false);
    }
  };

  const handleKeepOnlyOne = async () => {
    if (currentDedupeItems.length <= 1) return;
    
    const [toKeep, ...toDelete] = currentDedupeItems;
    const deleteIds = toDelete.map(i => i.id);
    
    if (confirm(`确定仅保留第1个素材，并永久删除其余 ${deleteIds.length} 个副本吗？`)) {
      setDedupeLoading(true);
      try {
        await Promise.all(deleteIds.map(id => api.hardDeleteMedia(id)));
        // 标记保留的那一个为已忽略查重，避免后续重复扫描
        await api.setDedupeIgnored([toKeep.id], true);
        toast.success(`已清理 ${deleteIds.length} 个副本`);
        
        setProcessedDedupeCount(prev => prev + 1);
        // 下一组
        const nextIdx = currentIndex + 1;
        if (nextIdx < dedupeGroups.length) {
          setCurrentIndex(nextIdx);
          fetchDedupeGroupItems(dedupeGroups[nextIdx]);
        } else {
          setDedupeGroups([]);
        }
      } catch (e: any) {
        toast.error('操作失败: ' + e.message);
      } finally {
        setDedupeLoading(false);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDedupeIds.length === 0) {
      toast.error('请先勾选要删除的素材');
      return;
    }

    if (confirm(`确定永久删除所选的 ${selectedDedupeIds.length} 个副本吗？`)) {
      setDedupeLoading(true);
      try {
        await Promise.all(selectedDedupeIds.map(id => api.hardDeleteMedia(id)));
        toast.success(`已删除 ${selectedDedupeIds.length} 个素材`);
        
        const remaining = currentDedupeItems.filter(i => !selectedDedupeIds.includes(i.id));
        if (remaining.length <= 1) {
           // 如果只剩下一个，标记为已查重/保留
           if (remaining.length === 1) {
             await api.setDedupeIgnored([remaining[0].id], true);
           }
           // 组处理完毕，下一组
           const nextIdx = currentIndex + 1;
           if (nextIdx < dedupeGroups.length) {
             setCurrentIndex(nextIdx);
             fetchDedupeGroupItems(dedupeGroups[nextIdx]);
           } else {
             setDedupeGroups([]);
           }
        } else {
           setCurrentDedupeItems(remaining);
           setSelectedDedupeIds([]);
        }
      } catch (e: any) {
        toast.error('操作失败: ' + e.message);
      } finally {
        setDedupeLoading(false);
      }
    }
  };

  useEffect(() => {
    if (hasPermission && user) {
      if (organizeMode === 'dedupe') {
        fetchDedupeData();
      } else {
        fetchData();
      }
    }
  }, [hasPermission, user, organizeMode, fetchData, fetchDedupeData]);

  const handleClassify = async (categoryId: string | null) => {
    if (isTransitioning || !user) return;
    
    let currentItem;
    const currentList = activeTab === 'uncategorized' ? items : pendingItems;
    if (currentList.length === 0) return;
    currentItem = currentList[currentIndex];
    
    // 记录最后一次操作用于撤销
    setLastAction({ id: currentItem.id, actionType: categoryId });
    
    // 1. 立即开始淡出动画
    setIsTransitioning(true);
    
    // 2. 计算下一个索引
    const nextIndex = currentIndex >= currentList.length - 1 && currentIndex > 0 
      ? currentIndex - 1 
      : currentIndex;
    
    // 3. 等待淡出动画完成（300ms）
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 4. 立即更新列表和索引，显示下一张
    if (activeTab === 'uncategorized') {
      setItems(prev => prev.filter((item) => item.id !== currentItem.id));
      if (nextIndex !== currentIndex) {
        setCurrentIndex(nextIndex);
      }
    } else {
      setPendingItems(prev => prev.filter((item) => item.id !== currentItem.id));
      if (nextIndex !== currentIndex) {
        setCurrentIndex(nextIndex);
      }
    }
    
    // 5. 重置过渡状态，开始淡入动画
    setIsTransitioning(false);
    setIsFadingIn(true);
    
    // 6. 淡入动画完成后重置状态
    setTimeout(() => {
      setIsFadingIn(false);
    }, 150);
    
    // 7. 后台异步处理 API 调用和状态更新
    (async () => {
      try {
        if (categoryId === 'pending') {
          // 移入待定区：调用 API 持久化
          await api.addToPendingMedia(user.id, currentItem.id);
          setPendingItems(prev => [currentItem, ...prev]);
          toast.success('已加入您的待定区');
        } else if (categoryId !== null) {
          // 整理：同时移除待定状态（如果有）并设置分类
          if ((currentItem as any).source_table === 'media_staging') {
            await api.approveAndCategorizeStaging(currentItem.id, categoryId);
          } else {
            await api.updateMediaCategory(currentItem.id, categoryId, user.id);
          }
          await api.removeFromPendingMedia(user.id, currentItem.id);
          
          // 也要从本地 pendingItems 中移除
          if (activeTab === 'uncategorized') {
             setPendingItems(prev => prev.filter(p => p.id !== currentItem.id));
          }
        }
        
        // 预加载
        if (activeTab === 'uncategorized' && items.length < 5) {
          const res = await api.getUncategorizedMediaFast(user.id, 0, 50, filterType);
          if (res.data && res.data.length > 0) {
            setItems((prev: any[]) => {
              const existingIds = new Set(prev.map(i => i.id));
              const newItems = res.data.filter((i: any) => !existingIds.has(i.id));
              return [...prev, ...newItems];
            });
          }
        }
      } catch (error: any) {
        // API 失败时，需要回滚操作
        toast.error('操作失败: ' + error.message);
        // 将项目重新添加回列表
        if (activeTab === 'uncategorized') {
          setItems(prev => {
            const newList = [...prev];
            newList.splice(currentIndex, 0, currentItem);
            return newList;
          });
        } else {
          setPendingItems(prev => {
            const newList = [...prev];
            newList.splice(currentIndex, 0, currentItem);
            return newList;
          });
        }
      }
    })();
  };

  const handleUndo = async () => {
    if (!lastAction || !user) return;
    try {
      if (lastAction.actionType === 'pending') {
        await api.removeFromPendingMedia(user.id, lastAction.id);
      } else if (lastAction.actionType === 'audit_rejected' && organizeMode === 'daily_gallery') {
        await api.batchExcludeFromDailyGallery([lastAction.id], false);
      } else if (lastAction.actionType === 'audit_rejected' && organizeMode === 'staging') {
        await api.updateStagingItem(lastAction.id, { status: 'pending' });
      } else if (lastAction.actionType?.startsWith('audit_')) {
        if (organizeMode === 'audit') {
          await api.updateAlbumPhotoLevel(lastAction.id, 'pending');
        } else {
          await api.updateMediaStatus(lastAction.id, 'pending');
        }
      } else {
        await api.updateMediaCategory(lastAction.id, null, user.id);
      }
      fetchData();
      setLastAction(null);
      toast.success('已撤销上一次操作');
    } catch (error: any) {
      toast.error('撤销失败');
    }
  };

  const handleAudit = async (level: string) => {
    if (isTransitioning || !user) return;
    const currentList = activeTab === 'uncategorized' ? items : pendingItems;
    if (currentList.length === 0) return;
    const currentItem = currentList[currentIndex];

    // 记录最后一次操作用于撤销
    setLastAction({ id: currentItem.id, actionType: 'audit_' + level });
    
    // 1. 立即开始淡出动画
    setIsTransitioning(true);
    
    // 2. 计算下一个索引
    const nextIndex = currentIndex >= currentList.length - 1 && currentIndex > 0 
      ? currentIndex - 1 
      : currentIndex;
    
    // 3. 等待淡出动画完成（300ms）
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 4. 立即更新列表和索引，显示下一张
    if (activeTab === 'uncategorized') {
      setItems(prev => prev.filter(i => i.id !== currentItem.id));
      if (nextIndex !== currentIndex) setCurrentIndex(nextIndex);
    } else {
      setPendingItems(prev => prev.filter(i => i.id !== currentItem.id));
      if (nextIndex !== currentIndex) setCurrentIndex(nextIndex);
    }
    
    // 5. 重置过渡状态，开始淡入动画
    setIsTransitioning(false);
    setIsFadingIn(true);
    
    // 6. 淡入动画完成后重置状态
    setTimeout(() => {
      setIsFadingIn(false);
    }, 150);
    
    // 7. 后台异步处理 API 调用
    (async () => {
      try {
        if ((currentItem as any).source_table === 'album_photos') {
          await api.updateAlbumPhotoLevel(currentItem.id, level, user.id);
        } else if ((currentItem as any).source_table === 'media_staging') {
          if (level === 'approved') {
            await api.approveStagingItems([currentItem.id]);
          } else if (level === 'rejected') {
            await api.updateStagingItem(currentItem.id, { status: 'rejected' });
          }
        } else if ((currentItem as any).source_table === 'daily_gallery') {
          if (level === 'rejected') {
            await api.batchExcludeFromDailyGallery([currentItem.id], true);
          } else if (level === 'approved') {
            await api.updateMediaDailyGalleryStatus([currentItem.id], 'pending');
          }
        } else {
          if (level === 'approved' || level === 'rejected') {
            await api.updateMediaStatus(currentItem.id, level as any);
          }
        }
        
        if (activeTab === 'pending') {
          await api.removeFromPendingMedia(user.id, currentItem.id);
        }
      } catch (e: any) {
        // API 失败时，需要回滚操作
        toast.error('审核操作失败: ' + e.message);
        // 将项目重新添加回列表
        if (activeTab === 'uncategorized') {
          setItems(prev => {
            const newList = [...prev];
            newList.splice(currentIndex, 0, currentItem);
            return newList;
          });
        } else {
          setPendingItems(prev => {
            const newList = [...prev];
            newList.splice(currentIndex, 0, currentItem);
            return newList;
          });
        }
      }
    })();
  };

  const handleIgnore = async () => {
    if (!unclassifiableCategory) {
      toast.error('未找到"无法分类"配置，请先创建该分类');
      return;
    }
    await handleClassify(unclassifiableCategory.id);
    toast.info('内容已归入无法分类区并忽略');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
      <p className="text-sm opacity-60">权限验证中...</p>
    </div>
  );

  if (!hasPermission) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <Info className="w-10 h-10 text-slate-300" />
      </div>
      <h3 className="text-xl font-black mb-2">权限受限</h3>
      <p className="text-sm text-muted-foreground mb-8">您当前的账号没有访问"极速整理"页面的权限，请联系管理员分配。</p>
      <Button onClick={() => navigate('/')} className="rounded-full px-8">返回首页</Button>
    </div>
  );

  const currentItem = activeTab === 'uncategorized' ? items[currentIndex] : pendingItems[currentIndex];
  const displayCount = activeTab === 'uncategorized' ? items.length : pendingItems.length;

  const unclassifiableCategory = categories.find(c => c.name === '无法分类');
  const normalCategories = categories.filter(c => c.name !== '无法分类');

  return (
    <div className="flex flex-col h-screen bg-[#F7F7F7] overflow-hidden">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md sticky top-0 z-50 shrink-0">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-black/5 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold tracking-tight">极速整理</h1>
        <button 
          onClick={() => setShowTutorial(true)}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          <HelpCircle className="w-4 h-4" />
          教程
        </button>
      </div>

      {/* 子菜单 */}
      <div className="flex flex-col border-b border-black/5 bg-white/40">
        <div className="flex items-center justify-between px-6 py-2 shrink-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => { setActiveTab('uncategorized'); setCurrentIndex(0); }}
              className={cn(
                "text-sm font-bold relative pb-1 transition-all",
                activeTab === 'uncategorized' ? "text-slate-800 border-b-2 border-primary" : "text-slate-400"
              )}
            >
              待整理
            </button>
            <button 
              onClick={() => { setActiveTab('pending'); setCurrentIndex(0); }}
              className={cn(
                "text-sm font-bold relative pb-1 transition-all",
                activeTab === 'pending' ? "text-slate-800 border-b-2 border-primary" : "text-slate-400"
              )}
            >
              待定区
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 布局切换 */}
            {activeTab === 'pending' && (
              <div className="flex items-center bg-muted/30 p-1 rounded-full border border-black/5 mr-2">
                <Button 
                  variant={viewLayout === 'single' ? 'default' : 'ghost'} 
                  size="icon" 
                  className="w-7 h-7 rounded-full"
                  onClick={() => setViewLayout('single')}
                >
                  <SquareIcon className="w-3.5 h-3.5" />
                </Button>
                <Button 
                  variant={viewLayout === 'grid' ? 'default' : 'ghost'} 
                  size="icon" 
                  className="w-7 h-7 rounded-full"
                  onClick={() => setViewLayout('grid')}
                >
                  <Grid className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            
            <div className="flex items-center gap-0.5 bg-muted/30 p-1 rounded-full border border-black/5">
              <Button 
                variant={filterType === 'all' ? 'default' : 'ghost'} 
                size="sm" 
                className={cn(
                  "h-7 px-2 rounded-full text-[10px] font-bold transition-all",
                  filterType === 'all' ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500"
                )}
                onClick={() => setFilterType('all')}
              >
                全部
              </Button>
              <Button 
                variant={filterType === 'image' ? 'default' : 'ghost'} 
                size="sm" 
                className={cn(
                  "h-7 px-2 rounded-full text-[10px] font-bold transition-all gap-1",
                  filterType === 'image' ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500"
                )}
                onClick={() => setFilterType('image')}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                图片
              </Button>
              <Button 
                variant={filterType === 'video' ? 'default' : 'ghost'} 
                size="sm" 
                className={cn(
                  "h-7 px-2 rounded-full text-[10px] font-bold transition-all gap-1",
                  filterType === 'video' ? "bg-primary text-primary-foreground shadow-sm" : "text-slate-500"
                )}
                onClick={() => setFilterType('video')}
              >
                <Video className="w-3.5 h-3.5" />
                视频
              </Button>
            </div>
          </div>
        </div>
        
        {/* 模式切换 */}
        <div className="flex items-center gap-2 px-6 py-1.5 border-t border-black/5 overflow-x-auto no-scrollbar flex-nowrap">
          <Button 
            variant={organizeMode === 'categorize' ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-full h-7 px-3 text-[10px] font-bold shrink-0 whitespace-nowrap"
            onClick={() => setOrganizeMode('categorize')}
          >
            壁纸分类
          </Button>
          {hasPermission && (
            <>
              <Button 
                variant={organizeMode === 'audit' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-full h-7 px-3 text-[10px] font-bold shrink-0 whitespace-nowrap"
                onClick={() => setOrganizeMode('audit')}
              >
                图集划分
              </Button>
              <Button 
                variant={organizeMode === 'dedupe' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-full h-7 px-3 text-[10px] font-bold shrink-0 whitespace-nowrap"
                onClick={() => setOrganizeMode('dedupe')}
              >
                查重清理
              </Button>
              <Button 
                variant={organizeMode === 'staging' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-full h-7 px-3 text-[10px] font-bold shrink-0 whitespace-nowrap"
                onClick={() => setOrganizeMode('staging')}
              >
                草稿清理
              </Button>
              <Button 
                variant={organizeMode === 'daily_gallery' ? 'secondary' : 'ghost'}
                size="sm"
                className="rounded-full h-7 px-3 text-[10px] font-bold shrink-0 whitespace-nowrap"
                onClick={() => setOrganizeMode('daily_gallery')}
              >
                每日图集清理
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 主展示区 */}
      <div className="flex-1 relative flex items-center justify-center p-4 min-h-0">
        {organizeMode === 'dedupe' ? (
          dedupeLoading ? (
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
              <p className="text-sm text-slate-400">正在寻找重复素材...</p>
            </div>
          ) : dedupeGroups.length === 0 ? (
            <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h3 className="text-lg font-black text-slate-800">全部清理完成</h3>
              <p className="text-xs text-slate-400 mt-2">暂无视觉重复内容，您的图库很整洁</p>
              {processedDedupeCount > 0 && (
                <p className="text-sm font-bold text-primary mt-2">本次会话共处理了 {processedDedupeCount} 组重复素材</p>
              )}
              <p className="text-[10px] text-slate-300 mt-1">已保留的素材不会再次参与查重</p>
              <Button variant="outline" className="mt-8 rounded-full px-8" onClick={() => fetchDedupeData()}>重新检查</Button>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-6 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-2">
                <Badge variant="outline" className="rounded-full bg-orange-50 text-orange-600 border-orange-200 mb-2">
                  视觉指纹: {dedupeGroups[currentIndex]?.content_hash?.substring(0, 16)}...
                </Badge>
                <h2 className="text-xl font-black text-slate-800">发现 {currentDedupeItems.length} 个相似素材</h2>
                <p className="text-xs text-slate-400 mt-1">第 {currentIndex + 1} / {dedupeGroups.length} 组重复项</p>
              </div>

              <div className={cn(
                "grid gap-6 w-full max-h-[60vh] overflow-y-auto px-4 py-2 no-scrollbar",
                currentDedupeItems.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}>
                {currentDedupeItems.map((item, idx) => (
                  <div key={item.id} className="group relative flex flex-col gap-3">
                    {/* 复选框支持多选删除 */}
                    <div className="absolute top-4 left-4 z-20">
                      <input 
                        type="checkbox" 
                        checked={selectedDedupeIds.includes(item.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          if (checked) {
                            setSelectedDedupeIds(prev => [...prev, item.id]);
                          } else {
                            setSelectedDedupeIds(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary shadow-sm cursor-pointer"
                      />
                    </div>

                    <div className={cn(
                      "aspect-[3/4] rounded-3xl overflow-hidden bg-white shadow-xl border-4 transition-all duration-300 relative",
                      idx === 0 ? "border-blue-500 shadow-blue-100" : "border-white hover:border-orange-500/50"
                    )}>
                      <ProtectedMedia src={item.url} className="w-full h-full object-contain" alt="duplicate" ruleKey="审核" type="image" />
                      {idx === 0 && (
                        <div className="absolute top-3 left-3 z-10">
                          <Badge className="bg-blue-500 text-white border-none text-[10px] font-black rounded-full shadow-lg">最早上传</Badge>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                        <p className="text-white text-[10px] font-bold line-clamp-1 opacity-90">{item.profiles?.username || '未知用户'}</p>
                        <p className="text-white/60 text-[8px]">{formatBeijingTime(item.created_at)}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="flex-1 rounded-2xl h-9 text-[10px] font-black shadow-lg shadow-red-500/20"
                        onClick={() => {
                          if (confirm('确定永久删除此副本吗？')) {
                            api.hardDeleteMedia(item.id).then(() => {
                              toast.success('已删除');
                              setSelectedDedupeIds(prev => prev.filter(id => id !== item.id)); // 更新勾选状态
                              const updated = currentDedupeItems.filter(i => i.id !== item.id);
                              if (updated.length <= 1) {
                                // 组处理完毕，下一组
                                const nextIdx = currentIndex + 1;
                                if (nextIdx < dedupeGroups.length) {
                                  setCurrentIndex(nextIdx);
                                  fetchDedupeGroupItems(dedupeGroups[nextIdx]);
                                } else {
                                  setDedupeGroups([]);
                                }
                              } else {
                                setCurrentDedupeItems(updated);
                              }
                            });
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        删除此项
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-2xl h-9 px-3 bg-white hover:bg-slate-100 text-slate-600 shadow-lg"
                        onClick={() => {
                          api.incrementDedupeVersion(item.id).then(() => {
                            toast.success('已标记为独立素材');
                            const updated = currentDedupeItems.filter(i => i.id !== item.id);
                            if (updated.length <= 1) {
                              const nextIdx = currentIndex + 1;
                              if (nextIdx < dedupeGroups.length) {
                                setCurrentIndex(nextIdx);
                                fetchDedupeGroupItems(dedupeGroups[nextIdx]);
                              } else {
                                setDedupeGroups([]);
                              }
                            } else {
                              setCurrentDedupeItems(updated);
                            }
                          });
                        }}
                        title="设为独立素材，后续不再与当前组匹配"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                  <Button variant="ghost" onClick={() => navigate(-1)} className="rounded-full px-6 font-bold text-slate-400">退出清理</Button>
                  <Button 
                    variant="outline"
                    className="rounded-full px-6 h-12 border-orange-200 text-orange-600 font-bold bg-orange-50 hover:bg-orange-100"
                    onClick={async () => {
                       // 标记为非重复 (全部保留)
                       if (currentDedupeItems.length > 0) {
                         // 为组内各项目分配唯一指纹版本，彻底隔离查重对比并全部保留
                         await api.batchIncrementDedupeVersion(currentDedupeItems.map(item => item.id));
                         toast.success('已全部标记为独立素材并保留');
                         setProcessedDedupeCount(prev => prev + 1);
                         const nextIdx = currentIndex + 1;
                         if (nextIdx < dedupeGroups.length) {
                           setCurrentIndex(nextIdx);
                           fetchDedupeGroupItems(dedupeGroups[nextIdx]);
                         } else {
                           setDedupeGroups([]);
                         }
                       }
                    }}
                  >
                    全部保留
                  </Button>
                  
                  <Button 
                    className="rounded-full px-8 h-12 bg-primary text-primary-foreground font-black shadow-2xl shadow-primary/30"
                    onClick={async () => {
                       // 用户要求跳过的内容不再参与查重对比
                       // 将此组所有成员的 dedupe_version 增加，使它们互相不再属于同一对比组
                       if (currentDedupeItems.length > 0) {
                         const ids = currentDedupeItems.map(i => i.id);
                         await api.batchIncrementDedupeVersion(ids);
                       }
                       setProcessedDedupeCount(prev => prev + 1);
                       
                       const nextIdx = currentIndex + 1;
                       if (nextIdx < dedupeGroups.length) {
                         setCurrentIndex(nextIdx);
                         fetchDedupeGroupItems(dedupeGroups[nextIdx]);
                       } else {
                         toast.success('已处理完所有组');
                         setDedupeGroups([]);
                       }
                    }}
                  >
                    跳过此组
                  </Button>
                  
                  <Button 
                    className="rounded-full px-8 h-12 bg-orange-500 hover:bg-orange-600 text-white font-black shadow-2xl shadow-orange-500/20"
                    onClick={handleKeepOnlyOne}
                    title="保留第1个文件，并删除组内其余所有文件"
                  >
                    仅保留
                  </Button>
                  
                  <Button 
                    variant="destructive"
                    className="rounded-full px-8 h-12 font-black shadow-2xl shadow-red-500/20"
                    disabled={selectedDedupeIds.length === 0}
                    onClick={handleDeleteSelected}
                  >
                    删除选中 ({selectedDedupeIds.length})
                  </Button>
              </div>
            </div>
          )
        ) : displayCount === 0 ? (
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
             <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
             </div>
             <h3 className="text-lg font-black text-slate-800">
               {activeTab === 'uncategorized' ? '全部整理完成' : '待定区为空'}
             </h3>
             <p className="text-xs text-slate-400 mt-2">暂无内容，休息一下吧</p>
             <Button variant="outline" className="mt-8 rounded-full px-8" onClick={() => { fetchData(); setCurrentIndex(0); }}>重新检查</Button>
          </div>
        ) : activeTab === 'pending' && viewLayout === 'grid' ? (
          <ScrollArea className="w-full h-full max-w-4xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 pb-20">
              {pendingItems.map((item, idx) => (
                <div 
                  key={item.id} 
                  className={cn(
                    "group relative aspect-[3/4] bg-white rounded-3xl overflow-hidden shadow-md border-2 transition-all cursor-pointer",
                    currentIndex === idx ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : "border-transparent"
                  )}
                  onClick={() => setCurrentIndex(idx)}
                >
                  {item.type === 'video' ? (
                    <video referrerPolicy="no-referrer" 
                      src={item.url} 
                      className="w-full h-full object-contain" 
                      muted 
                      playsInline 
                      {...({ referrerPolicy: "no-referrer" } as any)}
                    />
                  ) : (
                    <ProtectedMedia src={item.url} alt="organize" className="w-full h-full object-contain" ruleKey="审核" type="image" />
                  )}
                  
                  {item.type === 'video' && (
                    <div className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-sm rounded-full">
                      <Video className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }} 
                      className="p-2 bg-white rounded-full text-slate-800"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className={cn(
            "w-full h-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white transform",
            isTransitioning 
              ? "opacity-0 scale-90 -translate-y-4 transition-all duration-300" 
              : isFadingIn
                ? "opacity-100 scale-100 translate-y-0 transition-all duration-150"
                : "opacity-100 scale-100 translate-y-0"
          )}>
            {/* 资源显示 */}
            <div className="w-full h-full relative group">
               {currentItem.type === 'video' ? (
                 <video referrerPolicy="no-referrer" 
                   src={currentItem.url} 
                   className="w-full h-full object-contain" 
                   autoPlay 
                   muted 
                   loop 
                   playsInline 
                   {...({ referrerPolicy: "no-referrer" } as any)}
                 />
               ) : (
                 <ProtectedMedia src={currentItem.url} alt="organize" className="w-full h-full object-contain select-none pointer-events-none" ruleKey="审核" type="image" />
               )}
               
                {/* 标题悬浮指示器 */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                   <p className="text-white text-xs font-bold line-clamp-1 opacity-90 drop-shadow-md">
                     {stripExtension(currentItem.title)}
                   </p>
                   {organizeMode === 'staging' && (currentItem as any).content_categories && (
                     <Badge variant="secondary" className="mt-1 bg-primary/20 text-white border-none text-[8px] h-4">
                       预设分类: {(currentItem as any).content_categories.name}
                     </Badge>
                   )}
                   {organizeMode === 'daily_gallery' && (
                     <Badge variant="secondary" className="mt-1 bg-amber-500/20 text-white border-none text-[8px] h-4">
                       每日图集候选
                     </Badge>
                   )}
                </div>
               
               {/* 悬浮操作 */}
               <div className="absolute top-4 left-6 right-6 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleUndo}
                      disabled={!lastAction}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md transition-all active:scale-95",
                        lastAction ? "bg-white/90 text-slate-800 shadow-lg" : "bg-white/40 text-white/50 cursor-not-allowed"
                      )}
                    >
                      <Undo2 className="w-4 h-4" />
                      <span className="text-xs font-bold">撤回</span>
                    </button>
                    
                    {activeTab === 'pending' && (
                      <button 
                        onClick={handleIgnore}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-white backdrop-blur-md rounded-full transition-all active:scale-95 shadow-lg"
                        title="忽略该内容"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-bold">忽略</span>
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={() => handleClassify('pending')}
                    disabled={activeTab === 'pending'}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-md text-white rounded-full transition-all active:scale-95 shadow-lg",
                      activeTab === 'pending' ? "bg-slate-400/40 cursor-not-allowed" : "bg-amber-500/80 hover:bg-amber-500"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-bold">待定({displayCount})</span>
                  </button>
               </div>
               
               {/* 类型指示器 */}
               {currentItem.type === 'video' && (
                 <div className="absolute bottom-6 right-6 bg-black/40 backdrop-blur-sm p-2 rounded-full">
                   <Video className="w-6 h-6 text-white" />
                 </div>
               )}
            </div>
          </div>
        )}
      </div>

      {/* 底部整理区 - 在查重模式下或没有素材时隐藏 */}
      {organizeMode !== 'dedupe' && (activeTab === 'uncategorized' ? items.length > 0 : pendingItems.length > 0) && (
        <div className="bg-white rounded-t-[2.5rem] shadow-[0_-8px_30px_rgb(0,0,0,0.05)] pt-8 pb-10 px-6 shrink-0 z-50">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-0.5 bg-slate-100 rounded-full" />
            <p className="text-sm font-black text-slate-800 tracking-wide uppercase">
              {organizeMode === 'categorize' ? '壁纸分类整理' : 
               organizeMode === 'staging' ? '草稿清理' :
               organizeMode === 'daily_gallery' ? '每日图集清理' : 
               '图集划分'}
            </p>
            <div className="w-8 h-0.5 bg-slate-100 rounded-full" />
          </div>
          
          {organizeMode === 'categorize' ? (
            <ScrollArea className="w-full h-[180px]">
              <div className="grid grid-cols-4 gap-4 pb-4">
                 {/* 无法分类/不入区 */}
                 <button 
                   className="flex flex-col items-center gap-2 group"
                   onClick={() => handleIgnore()}
                 >
                    <div className="w-14 h-14 rounded-2xl overflow-hidden relative shadow-sm border border-slate-100 group-active:scale-90 transition-transform bg-slate-50">
                       <div className="absolute inset-0 flex items-center justify-center">
                          <Trash2 className="w-6 h-6 text-rose-400" />
                       </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 truncate max-w-[64px]">
                      无法分类
                    </span>
                 </button>
  
                 {normalCategories.map((cat) => (
                   <button 
                     key={cat.id} 
                     className="flex flex-col items-center gap-2 group"
                     onClick={() => handleClassify(cat.id)}
                   >
                      <div className="w-14 h-14 rounded-2xl overflow-hidden relative shadow-sm border border-slate-100 group-active:scale-90 transition-transform">
                         <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                            <FolderIcon className="w-6 h-6 text-primary/40" />
                         </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 truncate max-w-[64px]">{cat.name}</span>
                   </button>
                 ))}
              </div>
            </ScrollArea>
          ) : (organizeMode === 'daily_gallery' || organizeMode === 'staging') ? (
            <div className="flex items-center justify-center gap-12 py-8">
               <button 
                 className="flex flex-col items-center gap-2 group"
                 onClick={() => handleAudit('rejected')}
               >
                 <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center group-active:scale-90 transition-transform shadow-sm border border-rose-100">
                   <XCircle className="w-8 h-8 text-rose-500" />
                 </div>
                 <span className="text-xs font-bold text-rose-600">排除此项</span>
               </button>
               <button 
                 className="flex flex-col items-center gap-2 group"
                 onClick={() => handleAudit('approved')}
               >
                 <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center group-active:scale-90 transition-transform shadow-sm border border-emerald-100">
                   <CheckCircle className="w-8 h-8 text-emerald-500" />
                 </div>
                 <span className="text-xs font-bold text-emerald-600">通过/保留</span>
               </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6 py-4 overflow-x-auto no-scrollbar">
              <button 
                className="flex flex-col items-center gap-2 group shrink-0"
                onClick={() => handleAudit('normal')}
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center group-active:scale-90 transition-transform shadow-sm border border-emerald-100">
                  <Shield className="w-7 h-7 text-emerald-500" />
                </div>
                <span className="text-[10px] font-bold text-emerald-600">PT</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 group shrink-0"
                onClick={() => handleAudit('vip')}
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center group-active:scale-90 transition-transform shadow-sm border border-blue-100">
                  <Zap className="w-7 h-7 text-blue-500" />
                </div>
                <span className="text-[10px] font-bold text-blue-600">VIP</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 group shrink-0"
                onClick={() => handleAudit('svip')}
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center group-active:scale-90 transition-transform shadow-sm border border-amber-100">
                  <Zap className="w-7 h-7 text-amber-500" />
                </div>
                <span className="text-[10px] font-bold text-amber-600">SVIP</span>
              </button>
              <button 
                className="flex flex-col items-center gap-2 group shrink-0"
                onClick={() => handleAudit('restricted')}
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center group-active:scale-90 transition-transform shadow-sm border border-rose-100">
                  <EyeOff className="w-7 h-7 text-rose-500" />
                </div>
                <span className="text-[10px] font-bold text-rose-600">VVIP</span>
              </button>
              <div className="w-px h-10 bg-slate-100 mx-2" />
              <button 
                className="flex flex-col items-center gap-2 group shrink-0"
                onClick={() => handleAudit('rejected')}
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center group-active:scale-90 transition-transform shadow-sm border border-slate-200">
                  <XCircle className="w-7 h-7 text-slate-400" />
                </div>
                <span className="text-[10px] font-bold text-slate-500">驳回</span>
              </button>
            </div>
          )}
  
          {/* 顶部指示条 */}
          <div className="w-12 h-1 bg-slate-100 rounded-full mx-auto mt-4" />
        </div>
      )}

      {/* 教程弹窗 */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>极速整理教程</DialogTitle>
            <DialogDescription>快速了解如何使用极速整理功能</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">1</div>
              <div>
                <h4 className="font-bold text-sm mb-1">筛选内容类型</h4>
                <p className="text-xs text-muted-foreground">使用顶部筛选按钮选择"全部"、"图片"或"视频"</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">2</div>
              <div>
                <h4 className="font-bold text-sm mb-1">整理至资源类型</h4>
                <p className="text-xs text-muted-foreground">点击底部的分类按钮，内容将自动归类到对应资源类型并消失，下一个内容自动出现</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">3</div>
              <div>
                <h4 className="font-bold text-sm mb-1">待定区功能</h4>
                <p className="text-xs text-muted-foreground">点击右上角"待定"按钮，当前内容将暂时移出本次视图，不会修改分类状态</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">4</div>
              <div>
                <h4 className="font-bold text-sm mb-1">撤销分类</h4>
                <p className="text-xs text-muted-foreground">点击左上角"撤销"按钮可以取消上一次成功的分类动作</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowTutorial(false)} className="w-full rounded-xl">知道了</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  );
}
