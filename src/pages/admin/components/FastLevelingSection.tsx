import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/db/supabase';
import { api } from '@/db/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Image as ImageIcon, Loader2, CircleCheckBig, CircleAlert, 
  Trash2, Shield, Zap, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { getZoneramaProxyUrl } from '@/lib/media';
import type { PhotoAlbum, AlbumPhoto } from '@/types';

const LEVEL_LABELS = {
  pending: '待分级',
  normal: '普通级 (pt)',
  vip: 'VIP专属 (vip)',
  svip: 'SVIP专属 (svip)',
  restricted: '限制级 (vvip)'
};

const LEVEL_COLORS = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  vip: 'bg-blue-100 text-blue-700 border-blue-200',
  svip: 'bg-amber-100 text-amber-700 border-amber-200',
  restricted: 'bg-red-100 text-red-700 border-red-200'
};

interface FastLevelingSectionProps {
  selectedAlbumId?: string | null;
  setSelectedAlbumId?: (id: string | null) => void;
  onUpdate?: () => void;
}

export function FastLevelingSection({ 
  selectedAlbumId: propSelectedAlbumId, 
  setSelectedAlbumId: propSetSelectedAlbumId, 
  onUpdate 
}: FastLevelingSectionProps = {}) {
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [localSelectedAlbumId, setLocalSelectedAlbumId] = useState<string | null>(propSelectedAlbumId || null);
  const [albumPhotos, setAlbumPhotos] = useState<AlbumPhoto[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoLoadAttempted, setAutoLoadAttempted] = useState(false);

  // 使用外部传入的 selectedAlbumId，如果没有则使用本地状态
  const selectedAlbumId = propSelectedAlbumId !== undefined ? propSelectedAlbumId : localSelectedAlbumId;
  const setSelectedAlbumId = propSetSelectedAlbumId || setLocalSelectedAlbumId;

  useEffect(() => {
    fetchAlbums();
    fetchCustomFields();
  }, []);

  const fetchCustomFields = async () => {
    const { data } = await api.getAlbumCustomFields();
    if (data) setCustomFields(data);
  };

  const getAlbumZonePhotoAuth = (album: any) => {
    if (!album?.custom_field_values || !customFields.length) return null;
    const values = album.custom_field_values as any;
    
    if (values.zonephoto) return values.zonephoto;
    
    const field = customFields.find(f => f.name.toLowerCase() === 'zonephoto');
    if (field && values[field.id]) return values[field.id];
    
    return null;
  };

  const currentAlbum = albums.find(a => a.id === selectedAlbumId);
  const authToken = currentAlbum ? getAlbumZonePhotoAuth(currentAlbum) : null;
  const albumId = selectedAlbumId;

  const getPhotoUrl = (url: string) => {
    return getZoneramaProxyUrl(url, authToken, albumId);
  };

  useEffect(() => {
    if (selectedAlbumId) {
      fetchAlbumPhotos(selectedAlbumId);
      setAutoLoadAttempted(false);
    } else {
      setAlbumPhotos([]);
    }
  }, [selectedAlbumId]);

  // 自动加载下一个有待分级图片的图集
  useEffect(() => {
    if (selectedAlbumId && albumPhotos.length === 0 && !isRefreshing && !autoLoadAttempted) {
      const timer = setTimeout(async () => {
        const found = await loadNextAlbumWithPending();
        if (!found) {
          setAutoLoadAttempted(true);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [albumPhotos.length, selectedAlbumId, isRefreshing, autoLoadAttempted]);

  const fetchAlbums = async () => {
    setLoading(true);
    const { data } = await api.getAllPhotoAlbumsAdmin();
    if (data) setAlbums(data);
    setLoading(false);
  };

  const fetchAlbumPhotos = async (albumId: string) => {
    setIsRefreshing(true);
    // 增加获取数量，以便在极速分级时能看到更多待分级图片，默认改为获取 1000 张或更多
    const { data, total } = await api.getAlbumPhotos(albumId, 0, 100, 'pending');
    if (data) {
      // 仅展示待分级的（level 为 pending）
      setAlbumPhotos(data);
      setTotalPending(total || 0);
    }
    setIsRefreshing(false);
  };

  const loadNextAlbumWithPending = async (): Promise<boolean> => {
    try {
      // 查询所有有待分级图片的图集（排除当前图集）
      const { data } = await (supabase
        .from('album_photos')
        .select('album_id')
        .eq('level', 'pending')
        .neq('album_id', selectedAlbumId || '')
        .limit(1) as any);
      
      if (data && data.length > 0) {
        const nextAlbumId = data[0].album_id;
        const nextAlbum = albums.find(a => a.id === nextAlbumId);
        setSelectedAlbumId(nextAlbumId);
        toast.success(`已自动切换到下一个图集：${nextAlbum?.title || '未命名图集'}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('查找下一个图集失败:', error);
      return false;
    }
  };

  const handleBatchSetLevel = async (photoIds: string[], level: string) => {
    const { error } = await (supabase.from('album_photos') as any).update({ level }).in('id', photoIds);
    
    if (error) {
      toast.error('操作失败: ' + error.message);
      console.error('极速分级更新失败:', error);
      return;
    }
    
    // 记录日志
    const { data: userData } = await supabase.auth.getUser();
    const logs = photoIds.map(pid => ({
      photo_id: pid,
      operator_id: userData.user?.id,
      old_level: 'pending',
      new_level: level
    }));
    const { error: logError } = await supabase.from('album_photo_level_logs').insert(logs as any);
    
    if (logError) {
      console.error('日志记录失败:', logError);
    }
    
    toast.success(`已将 ${photoIds.length} 张图片设为${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}`);
    
    // 从本地状态移除
    setAlbumPhotos(prev => prev.filter(p => !photoIds.includes(p.id)));
    setTotalPending(prev => Math.max(0, prev - photoIds.length));
    
    // 通知父组件刷新
    if (onUpdate) {
      onUpdate();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            极速分级工作台
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            独立分级模块，快速标记内容权限等级。
          </p>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-3xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black">图集选择</CardTitle>
              <CardDescription>选择需要进行分级整理的图集</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>目标图集</Label>
              <Select 
                value={selectedAlbumId || ''}
                onValueChange={(v) => {
                  setSelectedAlbumId(v);
                  fetchAlbumPhotos(v);
                }}
              >
                <SelectTrigger className="rounded-2xl h-12">
                  <SelectValue placeholder="选择要分级的图集" />
                </SelectTrigger>
                <SelectContent>
                  {albums.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title} ({a.photo_count} 张)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            {selectedAlbumId ? (
              isRefreshing ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground font-medium">正在加载待整理图片...</p>
                </div>
              ) : (
                <AlbumPhotoLevelEditor 
                  photos={albumPhotos}
                  totalPending={totalPending}
                  onBatchSetLevel={handleBatchSetLevel}
                  onRefresh={() => fetchAlbumPhotos(selectedAlbumId)}
                  setAlbumPhotos={setAlbumPhotos}
                  setTotalPending={setTotalPending}
                  getPhotoUrl={getPhotoUrl}
                  authToken={getAlbumZonePhotoAuth(albums.find(a => a.id === selectedAlbumId))}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300">
                  <Shield className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-400">请先选择图集</h3>
                  <p className="text-sm text-muted-foreground">选择一个图集后即可开始极速分级流程</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm rounded-3xl bg-amber-50/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
              <CircleAlert className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-800">分级与权限关系说明</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-sm">
                  <Badge className={cn("rounded-md text-[10px] mb-2", LEVEL_COLORS.normal)}>普通级 (pt)</Badge>
                  <p className="text-xs text-slate-600 leading-relaxed">所有人可见。</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-sm">
                  <Badge className={cn("rounded-md text-[10px] mb-2", LEVEL_COLORS.vip)}>VIP 专属</Badge>
                  <p className="text-xs text-slate-600 leading-relaxed">仅限 VIP 及以上可见。</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-sm">
                  <Badge className={cn("rounded-md text-[10px] mb-2", LEVEL_COLORS.svip)}>SVIP 专属</Badge>
                  <p className="text-xs text-slate-600 leading-relaxed">仅限 SVIP 及以上可见。</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-sm">
                  <Badge className={cn("rounded-md text-[10px] mb-2", LEVEL_COLORS.restricted)}>限制级 (vvip)</Badge>
                  <p className="text-xs text-slate-600 leading-relaxed">仅限 VVIP 权限组可见。</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlbumPhotoLevelEditor({ 
  photos, 
  totalPending,
  onBatchSetLevel, 
  onRefresh,
  setAlbumPhotos,
  setTotalPending,
  getPhotoUrl,
  authToken
}: { 
  photos: AlbumPhoto[]; 
  totalPending: number;
  onBatchSetLevel: (ids: string[], level: string) => Promise<void>;
  onRefresh: () => void;
  setAlbumPhotos: React.Dispatch<React.SetStateAction<AlbumPhoto[]>>;
  setTotalPending: React.Dispatch<React.SetStateAction<number>>;
  getPhotoUrl: (url: string) => string;
  authToken?: string | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // 当照片列表减少时，修正索引
  useEffect(() => {
    if (currentIndex >= photos.length && photos.length > 0) {
      setCurrentIndex(photos.length - 1);
    }
  }, [photos.length]);

  const currentPhoto = photos[currentIndex];
  const [isProcessing, setIsProcessing] = useState(false);

  if (photos.length === 0 || !currentPhoto) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center">
          <CircleCheckBig className="w-12 h-12 text-emerald-500" />
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl font-black">当前图集已全部整理完成</h3>
          <p className="text-muted-foreground text-sm font-medium">所有的图片均已完成分级，您可以选择其他图集继续。</p>
        </div>
        <Button variant="outline" className="rounded-2xl px-10 h-11 font-bold border-2" onClick={onRefresh}>
          重新检查
        </Button>
      </div>
    );
  }

  const handleSetLevel = async (level: string) => {
    if (!currentPhoto || isProcessing) return;
    setIsProcessing(true);
    try {
      await onBatchSetLevel([currentPhoto.id], level);
      // 无需手动修改索引，父组件会更新 photos 列表并重新渲染
    } catch (err: any) {
      toast.error('操作失败: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async () => {
    if (!currentPhoto || isProcessing) return;
    setIsProcessing(true);
    const photoId = currentPhoto.id;
    try {
      const { error } = await supabase.from('album_photos').delete().eq('id', photoId);
      if (error) throw error;
      toast.success('已移除图片');
      // 立即从本地列表移除
      setAlbumPhotos(prev => prev.filter(p => p.id !== photoId));
      setTotalPending(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      toast.error('移除失败: ' + err.message);
    } finally {
      setIsProcessing(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-8 px-4 rounded-xl text-[11px] font-black gap-2 text-indigo-600 dark:text-indigo-400">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            待分级队列
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono font-black bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 px-3.5 py-1.5 rounded-full shadow-lg scale-90">
            {currentIndex + 1} / {Math.max(photos.length, totalPending)}
          </span>
        </div>
      </div>

      <div className="relative group max-w-lg mx-auto">
        <div className="aspect-[4/5] bg-slate-50 dark:bg-slate-900 rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border-[12px] border-white dark:border-slate-800 relative ring-1 ring-slate-200/50">
          <ProtectedMedia 
            src={getPhotoUrl(currentPhoto.url)} 
            authToken={authToken}
            type="image"
            alt="预览" 
            className="w-full h-full object-contain"
            ruleKey="审核"
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-md flex items-center justify-center z-10">
              <Loader2 className="w-14 h-14 animate-spin text-primary" />
            </div>
          )}
          
          <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-20">
            <Badge className="bg-black/60 backdrop-blur-xl border-none text-[10px] py-1.5 px-4 rounded-full text-white font-black tracking-wider uppercase shadow-lg">
              ID: {currentPhoto.id.slice(0, 8)}
            </Badge>
            <div className="flex gap-2">
               <Button 
                size="icon" 
                variant="ghost" 
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(prev => prev - 1)}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl text-white hover:bg-white/40 disabled:opacity-30"
               >
                 <ChevronLeft className="w-5 h-5" />
               </Button>
               <Button 
                size="icon" 
                variant="ghost" 
                disabled={currentIndex === photos.length - 1}
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl text-white hover:bg-white/40 disabled:opacity-30"
               >
                 <ChevronRight className="w-5 h-5" />
               </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8 pt-8 border-t border-border/40">
        <div className="flex items-center gap-8 justify-center opacity-40">
          <div className="h-[2px] w-16 bg-gradient-to-r from-transparent to-slate-400"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">整理至资源等级</span>
          <div className="h-[2px] w-16 bg-gradient-to-l from-transparent to-slate-400"></div>
        </div>

        <div className="grid grid-cols-5 gap-3 px-1 pb-12">
          <button 
            disabled={isProcessing}
            onClick={() => setDeleteConfirmOpen(true)}
            className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-border/60 hover:bg-red-50 hover:border-red-100 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-red-100 group-hover:text-red-500 transition-all shadow-md">
              <Trash2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-500 group-hover:text-red-600 tracking-tight">无法分级</span>
          </button>

          <button 
            disabled={isProcessing}
            onClick={() => handleSetLevel('normal')}
            className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-border/60 hover:bg-emerald-50 hover:border-emerald-100 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-500 transition-all shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-500 group-hover:text-emerald-600 tracking-tight">普通级 (pt)</span>
          </button>

          <button 
            disabled={isProcessing}
            onClick={() => handleSetLevel('vip')}
            className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-border/60 hover:bg-blue-50 hover:border-blue-100 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-all shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-500 group-hover:text-blue-600 tracking-tight">VIP专属 (vip)</span>
          </button>

          <button 
            disabled={isProcessing}
            onClick={() => handleSetLevel('svip')}
            className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-border/60 hover:bg-amber-50 hover:border-amber-100 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-amber-100 group-hover:text-amber-500 transition-all shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-500 group-hover:text-amber-600 tracking-tight">SVIP专属 (svip)</span>
          </button>

          <button 
            disabled={isProcessing}
            onClick={() => handleSetLevel('restricted')}
            className="flex flex-col items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-border/60 hover:bg-red-50 hover:border-red-100 transition-all group active:scale-95"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-red-100 group-hover:text-red-500 transition-all shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-500 group-hover:text-red-600 tracking-tight">限制级 (vvip)</span>
          </button>
        </div>
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black flex items-center gap-3 text-red-600">
              <CircleAlert className="w-6 h-6" />
              确认移除图片
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-base">
              确定要从图集中移除这张图片吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="rounded-2xl font-bold border-slate-200">考虑一下</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="rounded-2xl font-black bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 text-white">
              确定移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
