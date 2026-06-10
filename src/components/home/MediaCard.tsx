import React, { useState, useEffect, useRef, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  ThumbsDown, 
  MoreVertical, 
  Flame, 
  TrendingDown, 
  Sparkles, 
  Eye, 
  EyeOff, 
  LogOut, 
  Trash2, 
  Loader2, 
  Video, 
  PlayCircle,
  Edit3
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useKeywordReplacement } from '@/contexts/KeywordReplacementContext';
import { ProtectedMedia, isMediaCached } from '@/components/common/ProtectedMedia';
import { cn, downloadFile, cleanTitle } from '@/lib/utils';
import type { MediaItem } from '@/types';

export const MediaCard = memo(function MediaCard({ item, onClick, isFavorite, onToggleFavorite, onDislike, onTagClick, onAdminAction, isCleared, priority = false, fetchpriority, active = true }: { 
  item: MediaItem; 
  onClick: () => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onDislike: (e: React.MouseEvent) => void;
  onTagClick: (tagId: string, e: React.MouseEvent) => void;
  onAdminAction?: (id: string, action: 'heat_up' | 'heat_down' | 'toggle_recommend' | 'toggle_hide' | 'delete' | 'archive' | 'edit') => void;
  isCleared?: boolean;
  priority?: boolean;
  fetchpriority?: 'high' | 'low' | 'auto';
  active?: boolean;
}) {
  const { profile } = useAuth();
  const { replaceUser } = useKeywordReplacement();
  const [isPortrait, setIsPortrait] = useState(false);
  const [dynamicAspectRatio, setDynamicAspectRatio] = useState<string | number>(() => {
    if (item.metadata?.width && item.metadata?.height) {
      return `${item.metadata.width} / ${item.metadata.height}`;
    }
    return item.type === 'video' ? '16/9' : '3/4';
  });

  // 竖屏检测与宽高比探测逻辑
  useEffect(() => {
    // 如果组件处于非激活状态，延迟探测逻辑以节省资源
    if (!active) return;

    // 强制检查是否有全局缓存的比例
    const cachedRatio = (window as any)._media_ratios?.[item.id];
    if (cachedRatio) {
      setDynamicAspectRatio(cachedRatio);
      const [w, h] = cachedRatio.split('/').map(Number);
      if (h > w) setIsPortrait(true);
      return;
    }

    // 优先使用 metadata
    if (item.metadata?.width && item.metadata?.height) {
      const ratio = `${item.metadata.width} / ${item.metadata.height}`;
      setDynamicAspectRatio(ratio);
      if (item.metadata.height > item.metadata.width) {
        setIsPortrait(true);
      }
      return;
    }

    // 探测逻辑
    const detectDimensions = (url: string) => {
      if (!url) return;
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        if (width > 0 && height > 0) {
          setDynamicAspectRatio(`${width} / ${height}`);
          if (height > width) {
            setIsPortrait(true);
          }
        }
      };
    };

    if (item.type === 'video' && item.thumbnail_url) {
      detectDimensions(item.thumbnail_url);
    } else if (item.type === 'image') {
      // 优先使用缩略图探测，速度快且省流量
      if (item.thumbnail_url) {
        detectDimensions(item.thumbnail_url);
      } else if (item.url) {
        detectDimensions(item.url);
      }
    }
  }, [item.id, item.type, item.url, item.thumbnail_url, item.metadata, active]);

  return (
    <Card 
      className="overflow-hidden group border border-border/40 shadow-sm break-inside-avoid cursor-pointer hover:shadow-md transition-all active:scale-[0.98] rounded-xl bg-transparent flex flex-col relative will-change-transform"
      onClick={onClick}
    >
      <div 
        className="relative w-full overflow-hidden bg-muted/20 cursor-pointer min-h-[160px]"
        style={{ 
          aspectRatio: dynamicAspectRatio,
          height: !active ? 'auto' : undefined
        }}
      >
        {!active ? (
          <div className="w-full h-full bg-muted/10 animate-pulse flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-muted-foreground/20 animate-spin" />
          </div>
        ) : (
          item.type === "image" ? (
            <div className="relative w-full h-full overflow-hidden">
              <ProtectedMedia 
                src={item.url} 
                type="image"
                alt={item.title || "media"} 
                isThumbnail={true}
                ruleKey="首瀑"
                version={item.updated_at || item.created_at}
                className="w-full h-full object-cover bg-muted/10 block transition-transform group-hover:scale-105 duration-500" 
                priority={priority}
                fetchpriority={fetchpriority}
                onLoad={(dims) => {
                  if (dims && dims.width > 0 && dims.height > 0) {
                    const ratio = `${dims.width} / ${dims.height}`;
                    setDynamicAspectRatio(ratio);
                    if (dims.height > dims.width) setIsPortrait(true);
                    
                    // 缓存到内存，防止重绘时丢失
                    if (!(window as any)._media_ratios) (window as any)._media_ratios = {};
                    (window as any)._media_ratios[item.id] = ratio;

                    // 触发微调，通知 Virtuoso 可能的高度变化
                    window.dispatchEvent(new Event('resize'));
                  }
                }}
              />
            </div>
          ) : (
            <div className="relative w-full h-full overflow-hidden flex items-center justify-center transition-all duration-300">
              {item.thumbnail_url ? (
                <ProtectedMedia 
                  src={item.thumbnail_url} 
                  type="image"
                  alt={item.title || "thumbnail"} 
                  isThumbnail={true}
                  ruleKey="首瀑"
                  version={item.updated_at || item.created_at}
                  className="w-full h-full object-cover bg-muted/10 block transition-transform group-hover:scale-105 duration-500" 
                  priority={priority}
                  fetchpriority={fetchpriority}
                  onLoad={(dims) => {
                    if (dims && dims.width > 0 && dims.height > 0) {
                      const ratio = `${dims.width} / ${dims.height}`;
                      setDynamicAspectRatio(ratio);
                      if (dims.height > dims.width) setIsPortrait(true);
                      
                      // 缓存到内存
                      if (!(window as any)._media_ratios) (window as any)._media_ratios = {};
                      (window as any)._media_ratios[item.id] = ratio;

                      window.dispatchEvent(new Event('resize'));
                    }
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                   <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary/40 group-hover:scale-110 transition-transform">
                      <Video className="w-6 h-6" />
                   </div>
                   <span className="text-sm font-bold text-muted-foreground/60">视频</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                <PlayCircle className="text-white w-10 h-10 drop-shadow-lg opacity-80 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          )
        )}
        
        {/* 热度统计 (右上角) - 参考图1 & 图3 */}
        <div className="absolute top-2 right-2 z-10 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1.5 border border-white/10 shadow-lg pointer-events-none transition-all duration-300 group-hover:bg-black/60">
          <Flame className="w-3 h-3 text-orange-500 fill-current" />
          <span className="text-[10px] text-white font-black tabular-nums">{Math.round((item.heat_score || 0) * 1000)}</span>
        </div>

        
        {/* 信息遮罩层 (底部) */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none transition-opacity duration-300 z-10">
          <h3 className="text-white text-[12px] font-bold line-clamp-1 drop-shadow-md mb-0.5 tracking-tight">
            {replaceUser(cleanTitle(item.title)) !== '未命名' ? replaceUser(cleanTitle(item.title)) : (item.type === 'video' ? '视频作品' : '图片作品')}
          </h3>
          <p className="text-white/70 text-[10px] font-medium tabular-nums drop-shadow-md">
            {new Date(item.created_at).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }).replace(/\//g, '-')}
          </p>
          {item.media_tags && item.media_tags.filter(mt => mt.tags && (profile?.role === 'admin' || !mt.tags.name.includes('不入'))).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1 min-h-4">
              {item.media_tags.filter(mt => mt.tags && (profile?.role === 'admin' || !mt.tags.name.includes('不入'))).slice(0, 3).map(mt => (
                <span 
                  key={mt.tag_id} 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onTagClick(mt.tag_id, e);
                  }}
                  className={cn(
                    "text-[8px] font-black uppercase tracking-tighter px-1 rounded shadow-sm cursor-pointer hover:bg-primary/20 transition-colors pointer-events-auto",
                    mt.tags?.name.includes('不入') ? "bg-amber-500/20 text-amber-600" : "bg-primary/10 text-primary"
                  )}
                >
                  #{mt.tags?.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 操作按钮组 (底部右侧) */}
        <div className="absolute right-2 bottom-4 flex flex-col gap-2 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <Button
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(e);
            }}
            className={cn(
              "w-8 h-8 rounded-full shadow-lg transition-all",
              isFavorite 
                ? "bg-red-500 hover:bg-red-600 text-white scale-110" 
                : "bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
            )}
          >
            <Heart className={cn("w-4 h-4", isFavorite && "fill-current")} />
          </Button>
          
          <Button
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDislike(e);
            }}
            className="w-8 h-8 rounded-full shadow-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
          >
            <ThumbsDown className="w-4 h-4" />
          </Button>

          {/* 更多功能 (管理员专用) */}
          {profile?.role === 'admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                <Button
                  size="icon"
                  className="w-8 h-8 rounded-full shadow-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm active:scale-95 transition-all"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 rounded-xl bg-slate-900/95 backdrop-blur-xl border-white/10 text-white p-1 z-[60]">
                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdminAction?.(item.id, 'heat_up'); }} className="text-[10px] gap-2 py-1.5 focus:bg-white/10 cursor-pointer">
                    <Flame className="w-3.5 h-3.5 text-orange-500" /> 升热度
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdminAction?.(item.id, 'heat_down'); }} className="text-[10px] gap-2 py-1.5 focus:bg-white/10 cursor-pointer">
                    <TrendingDown className="w-3.5 h-3.5 text-blue-500" /> 降热度
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdminAction?.(item.id, 'edit'); }} className="text-[10px] gap-2 py-1.5 focus:bg-white/10 cursor-pointer">
                    <Edit3 className="w-3.5 h-3.5 text-sky-400" /> 编辑信息
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdminAction?.(item.id, 'toggle_recommend'); }} className="text-[10px] gap-2 py-1.5 focus:bg-white/10 cursor-pointer">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500" /> {item.is_recommended ? '取消推荐' : '设为推荐'}
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdminAction?.(item.id, 'toggle_hide'); }} className="text-[10px] gap-2 py-1.5 focus:bg-white/10 cursor-pointer">
                    {item.is_hidden ? <Eye className="w-3.5 h-3.5 text-green-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />} {item.is_hidden ? '显示' : '取消显示'}
                 </DropdownMenuItem>
                 <DropdownMenuSeparator className="bg-white/5" />
                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdminAction?.(item.id, 'archive'); }} className="text-[10px] gap-2 py-1.5 focus:bg-white/10 text-yellow-400 cursor-pointer">
                    <LogOut className="w-3.5 h-3.5" /> 下架
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAdminAction?.(item.id, 'delete'); }} className="text-[10px] gap-2 py-1.5 focus:bg-white/10 text-red-500 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> 删除
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {item.status === "pending" && (
          <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-2">
              <div className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-yellow-500 animate-spin" />
                <span className="text-xs font-bold text-yellow-500">正在审核中</span>
              </div>
            </div>
          </div>
        )}

        {/* 热度值展示 (右上角) - 仅管理员可见 */}
        {profile?.role === 'admin' && (
          <div className={cn(
            "absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-sm transition-all duration-300",
            isCleared && "opacity-0"
          )}>
            <Flame className="w-3 h-3 text-orange-500 fill-orange-500/20" />
            <span className="text-white font-black text-[9px] tabular-nums">
              {Math.round((item.heat_score || 0) * 1000).toLocaleString()}
            </span>
          </div>
        )}

      </div>
    </Card>
  );
});

export const LazyMediaCard = memo(function LazyMediaCard({ globalIndex, item, ...props }: any) {
  // 核心优化：如果资源已缓存，初始状态即为活跃，彻底消除回到顶部时的闪烁
  const [isInView, setIsInView] = useState(() => {
    if (globalIndex < 8) return true;
    return isMediaCached(item.url) || isMediaCached(item.thumbnail_url);
  });
  const [isPriority, setIsPriority] = useState(globalIndex < 4);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 智能调度：优先加载可视区域及其上下 10 张
    // 1. 核心可视区域监听 (rootMargin 较小，用于触发 active)
    // 2. 优先级监听 (rootMargin 更小，用于触发 priority)
    
    // @ts-ignore
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isFast = conn && conn.effectiveType === '4g' && !conn.saveData;
    const isLowEnd = typeof navigator !== 'undefined' && 
      ((navigator as any).deviceMemory < 4 || navigator.hardwareConcurrency < 4);

    // active 范围：控制组件是否开始尝试加载图片
    const activeMargin = isLowEnd ? '300px 0px' : (isFast ? '800px 0px' : '500px 0px'); 
    
    // priority 范围：非常接近可视区域（约上下 5-10 张的距离）
    const priorityMargin = '150px 0px';

    const activeObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInView(true);
        } else {
          // 滑出视野及时释放内容内存
          if (globalIndex >= 4) {
            setIsInView(false);
          }
        }
      },
      { rootMargin: activeMargin } 
    );

    const priorityObserver = new IntersectionObserver(
      (entries) => {
        setIsPriority(entries[0].isIntersecting);
      },
      { rootMargin: priorityMargin }
    );

    if (ref.current) {
      activeObserver.observe(ref.current);
      priorityObserver.observe(ref.current);
    }
    
    return () => {
      activeObserver.disconnect();
      priorityObserver.disconnect();
    };
  }, [globalIndex]);

  return (
    <div ref={ref} className="w-full min-h-[100px] transition-all duration-500 will-change-transform">
      <MediaCard 
        {...props} 
        item={item}
        active={isInView}
        priority={isPriority || globalIndex < 4} 
        fetchpriority={(isPriority || globalIndex < 4) ? 'high' : 'auto'}
      />
    </div>
  );
});
