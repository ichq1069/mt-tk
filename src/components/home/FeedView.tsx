import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  ShieldCheck, 
  RotateCcw, 
  RefreshCw,
  Heart, 
  Download, 
  ThumbsDown, 
  Eye, 
  EyeOff, 
  Settings,
  MoreVertical, 
  PlayCircle, 
  Search, 
  ShieldAlert, 
  Flame, 
  TrendingDown, 
  Sparkles, 
  Trash2, 
  ChevronDown,
  Scan,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useConfig } from '@/contexts/ConfigContext';
import { useKeywordReplacement } from '@/contexts/KeywordReplacementContext';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { VideoPlayer } from '@/components/ui/video-player';
import { api } from '@/db/api';
import { storage, STORAGE_KEYS } from '@/lib/storage';
import { cn, downloadFile, cleanTitle } from '@/lib/utils';
import { toast } from 'sonner';
import type { MediaItem } from '@/types';

interface FeedViewProps {
  items: MediaItem[];
  loading: boolean;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isMuted: boolean;
  onMutedChange: (muted: boolean) => void;
  isAutoPlay: boolean;
  onAutoPlayChange: (autoPlay: boolean) => void;
  autoPlayInterval: number;
  onAutoPlayIntervalChange: (interval: number) => void;
  favorites: Set<string>;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onDislike: (id: string, e: React.MouseEvent) => void;
  onTagClick: (tagId: string, e: React.MouseEvent) => void;
  onAdminAction?: (id: string, action: 'heat_up' | 'heat_down' | 'toggle_recommend' | 'toggle_hide' | 'delete' | 'archive' | 'edit') => void;
  emblaRef: any;
  emblaApi: any;
  isCleared: boolean;
  setIsCleared: (cleared: boolean) => void;
  onBack?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  scene?: 'waterfall_feed' | 'douyin' | 'portrait' | 'daily' | 'general';
  viewMode?: string;
  onRefresh?: () => void;
}

export const FeedView = memo(function FeedView({ 
  items, 
  loading, 
  currentIndex, 
  onIndexChange,
  isMuted,
  onMutedChange,
  isAutoPlay,
  onAutoPlayChange,
  autoPlayInterval,
  onAutoPlayIntervalChange,
  favorites,
  onToggleFavorite,
  onDislike,
  onTagClick,
  onAdminAction,
  emblaRef,
  emblaApi,
  isCleared,
  setIsCleared,
  onBack,
  onLoadMore,
  hasMore,
  loadingMore,
  scene = 'general',
  viewMode,
  onRefresh
}: FeedViewProps) {
  const { config, securityConfig } = useConfig();
  const { replaceUser } = useKeywordReplacement();
  const { user, profile, isAdmin, openLoginDialog } = useAuth();
  const navigate = useNavigate();
  const [lastDislikedId, setLastDislikedId] = useState<string | null>(null);
  const [openMoreMenuId, setOpenMoreMenuId] = useState<string | null>(null);
  const [itemProgress, setItemProgress] = useState<Map<string, number>>(new Map());
  
  // 使用初始化函数确保首帧就能根据当前场景拿到正确的规则映射
  const [itemRuleKeys, setItemRuleKeys] = useState<Map<string, string>>(() => {
    const next = new Map<string, string>();
    items.forEach(item => {
      const defaultKey = 
        scene === 'waterfall_feed' ? '大图' :
        scene === 'douyin' ? '抖音' :
        scene === 'portrait' ? '写book' :
        scene === 'daily' ? '每日' : '大图';
      next.set(item.id, defaultKey);
    });
    return next;
  });

  // 当 items 或 scene 变化时，补充缺失的规则或在场景切换时强制重置
  const lastSceneRef = useRef(scene);
  useEffect(() => {
    const isSceneChanged = lastSceneRef.current !== scene;
    lastSceneRef.current = scene;

    setItemRuleKeys(prev => {
      const next = isSceneChanged ? new Map() : new Map(prev);
      let changed = isSceneChanged;
      
      items.forEach(item => {
        if (!next.has(item.id)) {
          const defaultKey = 
            scene === 'waterfall_feed' ? '大图' :
            scene === 'douyin' ? '抖音' :
            scene === 'portrait' ? '写book' :
            scene === 'daily' ? '每日' : '大图';
          next.set(item.id, defaultKey);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [items, scene]);
  
  const handleProgress = useCallback((id: string, progress: number) => {
    setItemProgress(prev => {
      if (prev.get(id) === progress) return prev;
      const next = new Map(prev);
      next.set(id, progress);
      return next;
    });
  }, []);
  const prevIndexRef = useRef(currentIndex);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (currentIndex > prevIndexRef.current) setScrollDirection('down');
    else if (currentIndex < prevIndexRef.current) setScrollDirection('up');
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);

  const [globalMuted, setGlobalMuted] = useState(() => {
    return storage.get(STORAGE_KEYS.VIDEO_MUTED, true);
  });
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [resolvedUrls, setResolvedUrls] = useState<Map<string, string>>(new Map());
  const handleUrlResolved = useCallback((id: string, url: string) => {
    setResolvedUrls(prev => {
      if (prev.get(id) === url) return prev;
      const next = new Map(prev);
      next.set(id, url);
      return next;
    });
  }, []);


  // 缩放相关状态
  const [zoom, setZoom] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: '50%', y: '50%' });
  const [lastTap, setLastTap] = useState(0);

  // 放大镜相关状态
  const [isMagnifierMode, setIsMagnifierMode] = useState(false);
  const [magnifier, setMagnifier] = useState<{ active: boolean; x: number; y: number; px: number; py: number; show: boolean }>({ active: false, x: 0, y: 0, px: 50, py: 50, show: false });
  const magnifierTimer = useRef<NodeJS.Timeout | null>(null);

  // 监听缩放或移动，如果菜单开启则关闭它
  useEffect(() => {
    if ((magnifier.active || zoom > 1) && openMoreMenuId) {
      setOpenMoreMenuId(null);
    }
  }, [magnifier.active, zoom, openMoreMenuId]);

  // 监听模式变化，禁用/启用 Embla 拖拽
  useEffect(() => {
    if (emblaApi) {
      // 当处于放大镜模式或已缩放时，禁用 Embla 拖拽
      emblaApi.reInit({ watchDrag: !isMagnifierMode && zoom === 1 });
    }
  }, [emblaApi, isMagnifierMode, zoom]);

  // 监听 Embla 滚动变化
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const newIndex = emblaApi.selectedScrollSnap();
      onIndexChange(newIndex);

      // 重置缩放和放大镜
      setZoom(1);
      setMagnifier(prev => ({ ...prev, active: false, show: false }));
      if (magnifierTimer.current) {
        clearTimeout(magnifierTimer.current);
      }
      videoRefs.current.forEach((video) => {
        if (video && !video.paused) {
          video.pause();
        }
      });

      // 播放当前视频
      const currentItem = items[newIndex];
      if (currentItem && currentItem.type === 'video') {
        const currentVideo = videoRefs.current.get(currentItem.id);
        if (currentVideo) {
          currentVideo.play().catch(err => {
            console.log('视频自动播放失败:', err);
          });
        }
      }

      // 自动加载更多逻辑
      if (hasMore && !loadingMore && onLoadMore && newIndex >= items.length - 3) {
        onLoadMore();
      }
    };

    emblaApi.on('select', onSelect);

    // 初始化时播放第一个视频
    if (currentIndex === 0 && items.length > 0 && items[0].type === 'video') {
      setTimeout(() => {
        const firstVideo = videoRefs.current.get(items[0].id);
        if (firstVideo) {
          firstVideo.play().catch(err => {
            console.log('首个视频自动播放失败:', err);
          });
        }
      }, 300);
    }

    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onIndexChange, items, currentIndex, hasMore, loadingMore, onLoadMore]);

  // 自动播放定时器 (针对图片)
  useEffect(() => {
    if (!isAutoPlay || !emblaApi) return;
    
    const currentItem = items[currentIndex];
    // 视频由 VideoPlayer 的 onEnded 处理
    if (currentItem?.type === 'video') return;

    const timer = setTimeout(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        onAutoPlayChange(false);
      }
    }, autoPlayInterval);

    return () => clearTimeout(timer);
  }, [isAutoPlay, currentIndex, autoPlayInterval, emblaApi, items, onAutoPlayChange]);

  const handleVideoEnded = useCallback(() => {
    if (!isAutoPlay || !emblaApi) return;
    if (emblaApi.canScrollNext()) {
      emblaApi.scrollNext();
    } else {
      onAutoPlayChange(false);
    }
  }, [isAutoPlay, emblaApi, onAutoPlayChange]);

  // 同步全局静音状态
  useEffect(() => {
    onMutedChange(globalMuted);
    storage.set(STORAGE_KEYS.VIDEO_MUTED, globalMuted);
    // 更新所有视频的静音状态
    videoRefs.current.forEach((video) => {
      if (video) {
        video.muted = globalMuted;
      }
    });
  }, [globalMuted, onMutedChange]);

  const handleUndoDislike = async () => {
    if (!lastDislikedId || !user) return;
    try {
      await api.toggleDislike(user.id, lastDislikedId);
      setLastDislikedId(null);
      toast.success('已撤销');
    } catch (error: any) {
      toast.error(`撤销失败: ${error.message}`);
    }
  };

  const handleReport = async (mediaId: string) => {
    if (!user) {
      openLoginDialog();
      return;
    }

    try {
      await api.createReport({
        reporter_id: user.id,
        media_id: mediaId,
        reason: '用户举报'
      });
      toast.success('举报成功，我们会尽快处理');
    } catch (error: any) {
      toast.error(`举报失败: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 3.5rem - 5rem)' }}>
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground" style={{ height: 'calc(100vh - 3.5rem - 5rem)' }}>
        <p className="text-lg">暂无审核通过的内容</p>
        <p className="text-sm">快去上传你的第一个作品吧！</p>
      </div>
    );
  }

  const currentItem = items[currentIndex];
  const isFavorite = currentItem ? favorites.has(currentItem.id) : false;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex flex-col h-full">
          {items.map((item, index) => {
            const isFavorite = favorites.has(item.id);
            // 动态缓冲区：根据滚动方向提前加载更多内容，同时及时回收背后的内存
            // 向下滚动时提前渲染后面 3 个，保留前面 1 个；向上滚动反之
            const isVisible = scrollDirection === 'down'
              ? (index >= currentIndex - 1 && index <= currentIndex + 3)
              : (scrollDirection === 'up'
                ? (index >= currentIndex - 3 && index <= currentIndex + 1)
                : Math.abs(index - currentIndex) <= 2);

            return (
              <div 
                key={item.id} 
                className="flex-[0_0_100%] min-w-0 h-full relative bg-black"
              >
                {(item as any).isAd ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950">
                    <div className="w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col bg-slate-900 animate-in fade-in zoom-in duration-500">
                      <div className="relative flex-1 bg-slate-800 overflow-hidden">
                        <ProtectedMedia
                          src={(item as any).image_url}
                          type="image"
                          alt={(item as any).title || ''}
                          className="w-full h-full object-cover"
                          ruleKey={(item as any).image_rule || '抖音'}
                        />
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-black/60 backdrop-blur-md border-none text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg text-white">赞助商广告</Badge>
                        </div>
                      </div>
                       <div className="p-6 space-y-4">
                          <div className="space-y-1">
                            <h3 className="text-xl font-black text-white">{(item as any).title}</h3>
                            <p className="text-sm text-white/60 line-clamp-2 leading-relaxed">{(item as any).description || (item as any).content}</p>
                          </div>
                          <Button 
                            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-black shadow-lg shadow-primary/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = (item as any).cta_url || (item as any).link;
                              if (url) {
                                window.open(url, '_blank');
                              }
                            }}
                          >
                            {(item as any).cta_text || '了解更多'}
                          </Button>
                       </div>
                    </div>
                  </div>
                ) : !isVisible ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white/10 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* 清屏模式下的点击层 */}
                    {isCleared && (
                      <div 
                        className="absolute inset-0 z-[60] cursor-pointer"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setIsCleared(false); 
                        }}
                      />
                    )}
                    {/* 内容区域 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {item.type === 'video' ? (
                          <div className="w-full h-full relative z-0 pointer-events-auto">
                            <VideoPlayer
                              src={item.url}
                              poster={item.thumbnail_url || undefined}
                              muted={isMuted}
                              autoPlay={currentIndex === index}
                              loop
                              className="w-full h-full object-contain"
                              onEnded={handleVideoEnded}
                              onProgress={(p: number) => handleProgress(item.id, p)}
                            />
                          </div>
                        ) : (
                          <div 
                            className="w-full h-full relative z-0 flex items-center justify-center pointer-events-auto overflow-hidden"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              // 双击点赞功能预留
                            }}
                          >
                            <div 
                              className="w-full h-full transition-transform duration-300"
                              style={{ 
                                transform: `scale(${zoom})`,
                                transformOrigin: zoomOrigin.x + ' ' + zoomOrigin.y
                              }}
                            >
                              <ProtectedMedia
                                src={item.url}
                                thumbnailSrc={item.thumbnail_url || item.url}
                                thumbnailRuleKey="首瀑"
                                type="image"
                                alt={item.title || ''}
                                className="w-full h-full object-contain"
                                ruleKey={itemRuleKeys.get(item.id) || '大图'}
                                onUrlResolved={(url) => handleUrlResolved(item.id, url)}
                                adminLabelClassName="top-16" // 向下偏移，避开顶部导航
                                priority={currentIndex === index}
                                fetchpriority={currentIndex === index ? 'high' : 'low'}
                              />
                            </div>
                          </div>
                        )}
                    </div>
                    {!isCleared && !isMagnifierMode && zoom === 1 && !(item as any).isAd && (
                      <div className="absolute bottom-4 left-4 right-16 z-50 flex flex-col gap-1 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* 用户信息 */}
                        {item.profiles && (
                          <div className="flex items-center gap-2 mb-1 pointer-events-auto cursor-pointer w-fit" onClick={(e) => { e.stopPropagation(); navigate(`/user/${item.user_id}`); }}>
                            <img 
                              src={item.profiles?.avatar_url || '/default-avatar.png'} 
                              className="w-8 h-8 rounded-full border border-white/20 shadow-sm object-cover"
                              alt=""
                            />
                            <span className="text-white text-sm font-black drop-shadow-md">
                              @{item.profiles?.username || '神秘用户'}
                            </span>
                          </div>
                        )}

                        {/* 标题 */}
                        {item.title && (
                          <h3 className="text-white text-base font-black drop-shadow-md px-1 truncate pointer-events-none mb-0.5">
                            {item.title}
                          </h3>
                        )}
                        
                        {/* 描述 - 只有在内容与标题不同时才显示 */}
                        {item.description && item.description !== item.title && (
                          <p className="text-white/90 text-sm drop-shadow-md px-1 mt-0.5 line-clamp-3 leading-relaxed whitespace-pre-wrap pointer-events-none">
                            {item.description}
                          </p>
                        )}

                        {/* 发布时间 - YYYY-MM-DD HH:mm */}
                        {item.created_at && (
                          <div className="text-white/80 text-[11px] font-bold drop-shadow-md px-1 mt-0.5 pointer-events-none">
                            {new Date(item.created_at).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            }).replace(/\//g, '-')}
                          </div>
                        )}

                        {/* 标签展示 */}
                        {item.media_tags && item.media_tags.filter(mt => mt.tags && (profile?.role === 'admin' || !mt.tags.name.includes('不入'))).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 px-1 mt-1">
                            {item.media_tags.filter(mt => mt.tags && (profile?.role === 'admin' || !mt.tags.name.includes('不入'))).map(mt => (
                              <span 
                                key={mt.tag_id} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  onTagClick(mt.tag_id, e);
                                }}
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded shadow-sm bg-black/40 backdrop-blur-md border border-white/5 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/10 transition-colors pointer-events-auto",
                                  mt.tags?.name.includes('不入') ? "text-amber-500 border-amber-500/20" : "text-primary"
                                )}
                              >
                                #{mt.tags?.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* 右侧操作按钮 */}
                    <div className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2.5 z-50 transition-all duration-300 w-12",
                      (isCleared || (item as any).isAd) && "opacity-0 pointer-events-none translate-x-8"
                    )}>
                      {/* 查看原图按钮 */}
                      {item.type === 'image' && itemRuleKeys.get(item.id) !== 'none' && (
                        <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-300">
                          <Button
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemRuleKeys(prev => {
                                const next = new Map(prev);
                                next.set(item.id, 'none');
                                return next;
                              });
                            }}
                            className="w-12 h-12 rounded-full shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 backdrop-blur-sm border-2 border-white/20"
                          >
                            <Scan className="w-6 h-6" />
                          </Button>

                        </div>
                      )}

                      {/* 移除冗余的原图加载中指示器，改为在原图按钮处显示状态或依赖底部的全局进度条 */}

                      {/* 撤销不喜欢 */}
                      {lastDislikedId && (
                        <div className="flex flex-col items-center gap-0.5 animate-in slide-in-from-right-4">
                          <Button
                            size="icon"
                            onClick={handleUndoDislike}
                            className="w-11 h-11 rounded-full shadow-2xl bg-white text-black hover:bg-white/90"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </Button>
                          <span className="text-[9px] text-white/80 font-bold">撤销</span>
                        </div>
                      )}

                      {/* 刷新按钮 - 仅在随机模式显示 */}
                      {viewMode === 'random' && (
                        <div className="flex flex-col items-center gap-0.5 animate-in slide-in-from-right-4">
                          <Button
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRefresh?.();
                            }}
                            className="w-11 h-11 rounded-full shadow-2xl bg-primary text-primary-foreground hover:bg-primary/90 border border-white/20"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </Button>
                          <span className="text-[9px] text-white/80 font-bold">刷新</span>
                        </div>
                      )}

                      {/* 收藏 */}
                      <div className="flex flex-col items-center gap-0.5">
                        <Button
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              openLoginDialog();
                              return;
                            }
                            onToggleFavorite(item.id, e);
                          }}
                          className={cn(
                            "w-11 h-11 rounded-full shadow-xl transition-all",
                            isFavorite 
                              ? "bg-red-500 hover:bg-red-600 text-white scale-105" 
                              : "bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
                          )}
                        >
                          <Heart className={cn("w-5 h-5", isFavorite && "fill-current")} />
                        </Button>
                        <span className="text-[9px] text-white/80 font-bold">
                          {isFavorite ? '已收藏' : '收藏'}
                        </span>
                      </div>

                      {/* 下载按钮 */}
                      <div className="flex flex-col items-center gap-0.5">
                        <Button
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(item.url, cleanTitle(item.title) + (item.type === 'video' ? '.mp4' : '.jpg'));
                          }}
                          className="w-11 h-11 rounded-full shadow-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
                        >
                          <Download className="w-5 h-5" />
                        </Button>
                        <span className="text-[9px] text-white/80 font-bold">下载</span>
                      </div>

                      {/* 不喜欢 */}
                      <div className="flex flex-col items-center gap-0.5">
                        <Button
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!user) {
                              openLoginDialog();
                              return;
                            }
                            setLastDislikedId(item.id);
                            onDislike(item.id, e);
                            // 自动滚动到下一个
                            if (emblaApi && emblaApi.canScrollNext()) {
                              emblaApi.scrollNext();
                            }
                          }}
                          className="w-11 h-11 rounded-full shadow-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
                        >
                          <ThumbsDown className="w-5 h-5" />
                        </Button>
                        <span className="text-[9px] text-white/80 font-bold">不喜欢</span>
                      </div>

                      {/* 清屏按钮 */}
                      <div className="flex flex-col items-center gap-0.5">
                        <Button
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCleared(!isCleared);
                          }}
                          className={cn(
                            "w-11 h-11 rounded-full shadow-xl transition-all",
                            isCleared 
                              ? "bg-primary text-white scale-105" 
                              : "bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
                          )}
                        >
                          {isCleared ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                        </Button>
                        <span className="text-[9px] text-white/80 font-bold">{isCleared ? '恢复' : '清屏'}</span>
                      </div>

                      {/* 更多菜单 */}
                      <div className="flex flex-col items-center gap-0.5">
                        <Popover 
                          modal={false}
                          open={openMoreMenuId === item.id} 
                          onOpenChange={(open) => setOpenMoreMenuId(open ? item.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              size="icon"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "w-11 h-11 rounded-full shadow-xl backdrop-blur-sm transition-all",
                                profile?.role === 'admin' 
                                  ? "bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30" 
                                  : "bg-black/40 hover:bg-black/60 text-white"
                              )}
                            >
                              {profile?.role === 'admin' ? <Settings className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-56 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border-white/10 p-3 z-[70]" 
                            align="end"
                            side="left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="space-y-2">
                              {/* 自动播放控制 */}
                              <div className="space-y-2">
                                <div 
                                  className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-white/5 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Label htmlFor="auto-play" className="text-white text-sm font-medium cursor-pointer flex items-center gap-2">
                                    <PlayCircle className="w-4 h-4" />
                                    自动播放
                                  </Label>
                                  <Switch
                                    id="auto-play"
                                    checked={isAutoPlay}
                                    onCheckedChange={(checked) => {
                                      onAutoPlayChange(checked);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                
                                {/* 自动播放间隔选择 */}
                                {isAutoPlay && (
                                  <div className="px-2 space-y-1">
                                    <div className="text-[10px] text-white/50 font-medium mb-1">切换间隔</div>
                                    <div className="flex gap-1">
                                      {[2000, 3000, 5000].map((t) => (
                                        <Button
                                          key={t}
                                          variant={autoPlayInterval === t ? "default" : "ghost"}
                                          size="sm"
                                          className="flex-1 rounded-lg h-7 text-[10px] font-bold"
                                          onClick={(e) => { e.stopPropagation(); onAutoPlayIntervalChange(t); }}
                                        >
                                          {t/1000}s
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 综合处理模式 */}
                              {item.type === 'image' && (
                                <div className="space-y-1 pt-2 border-t border-white/5">
                                  <div className="text-[10px] text-white/50 font-medium px-2 mb-1">综合处理模式</div>
                                  <div className="grid grid-cols-2 gap-1 px-1">
                                    <Button
                                      variant={itemRuleKeys.get(item.id) === '大图' ? "default" : "ghost"}
                                      size="sm"
                                      className="rounded-lg h-8 text-[10px] font-bold"
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setItemRuleKeys(prev => new Map(prev).set(item.id, '大图'));
                                      }}
                                    >
                                      大图预览
                                    </Button>
                                    <Button
                                      variant={itemRuleKeys.get(item.id) === 'douyin' ? "default" : "ghost"}
                                      size="sm"
                                      className="rounded-lg h-8 text-[10px] font-bold"
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setItemRuleKeys(prev => new Map(prev).set(item.id, 'douyin'));
                                      }}
                                    >
                                      抖音模式
                                    </Button>
                                    <Button
                                      variant={!itemRuleKeys.get(item.id) || itemRuleKeys.get(item.id) === '大图' ? "default" : "ghost"}
                                      size="sm"
                                      className="rounded-lg h-8 text-[10px] font-bold"
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setItemRuleKeys(prev => new Map(prev).set(item.id, '大图'));
                                      }}
                                    >
                                      标准模式
                                    </Button>
                                    <Button
                                      variant={itemRuleKeys.get(item.id) === 'none' ? "default" : "ghost"}
                                      size="sm"
                                      className="rounded-lg h-8 text-[10px] font-bold"
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setItemRuleKeys(prev => new Map(prev).set(item.id, 'none'));
                                      }}
                                    >
                                      原图直连
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* 细节放大 */}
                              {item.type === 'image' && (
                                <div 
                                  className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-white/5 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMagnifierMode(!isMagnifierMode);
                                    setOpenMoreMenuId(null);
                                  }}
                                >
                                  <Label className="text-white text-sm font-medium cursor-pointer flex items-center gap-2">
                                    <Search className="w-4 h-4" />
                                    细节放大
                                  </Label>
                                  <div className={cn(
                                    "w-8 h-4 rounded-full transition-colors",
                                    isMagnifierMode ? "bg-primary" : "bg-white/20"
                                  )}>
                                    <div className={cn(
                                      "w-3 h-3 rounded-full bg-white transition-transform mt-0.5",
                                      isMagnifierMode ? "translate-x-4.5" : "translate-x-0.5"
                                    )} />
                                  </div>
                                </div>
                              )}

                              <div className="h-px bg-white/10" />

                              {/* 全局静音设置 */}
                              <div 
                                className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-white/5 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Label htmlFor="global-mute" className="text-white text-sm font-medium cursor-pointer">
                                  全局静音
                                </Label>
                                <Switch
                                  id="global-mute"
                                  checked={globalMuted}
                                  onCheckedChange={(checked) => {
                                    setGlobalMuted(checked);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>

                              <div className="h-px bg-white/10" />

                              {/* 举报 */}
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-white hover:bg-white/5 rounded-xl h-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMoreMenuId(null);
                                  handleReport(item.id);
                                }}
                              >
                                <ShieldAlert className="w-4 h-4 mr-2" />
                                举报违规内容
                              </Button>

                              {/* 管理员功能 */}
                              {profile?.role === 'admin' && (
                                <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
                                  <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                    管理员操作
                                  </div>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start text-orange-400 hover:bg-orange-400/10 rounded-xl h-9 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAdminAction?.(item.id, 'heat_up');
                                      setOpenMoreMenuId(null);
                                    }}
                                  >
                                    <Flame className="w-3.5 h-3.5 mr-2" />
                                    提升作品热度
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start text-blue-400 hover:bg-blue-400/10 rounded-xl h-9 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAdminAction?.(item.id, 'heat_down');
                                      setOpenMoreMenuId(null);
                                    }}
                                  >
                                    <TrendingDown className="w-3.5 h-3.5 mr-2" />
                                    降低作品热度
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start text-sky-400 hover:bg-sky-400/10 rounded-xl h-9 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAdminAction?.(item.id, 'edit');
                                      setOpenMoreMenuId(null);
                                    }}
                                  >
                                    <Edit3 className="w-3.5 h-3.5 mr-2" />
                                    编辑作品信息
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start text-yellow-400 hover:bg-yellow-400/10 rounded-xl h-9 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAdminAction?.(item.id, 'toggle_recommend');
                                      setOpenMoreMenuId(null);
                                    }}
                                  >
                                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                                    {item.is_recommended ? '取消推荐' : '设为推荐'}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start text-slate-400 hover:bg-white/5 rounded-xl h-9 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAdminAction?.(item.id, 'toggle_hide');
                                    }}
                                  >
                                    {item.is_hidden ? <Eye className="w-3.5 h-3.5 mr-2" /> : <EyeOff className="w-3.5 h-3.5 mr-2" />}
                                    {item.is_hidden ? '取消隐藏' : '隐藏作品'}
                                  </Button>
                                   <Button
                                    variant="ghost"
                                    className="w-full justify-start text-red-500 hover:bg-red-500/10 rounded-xl h-9 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAdminAction?.(item.id, 'delete');
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    删除此作品
                                  </Button>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <span className={cn(
                          "text-[9px] font-bold",
                          profile?.role === 'admin' ? "text-primary" : "text-white/80"
                        )}>
                          {profile?.role === 'admin' ? '管理' : '更多'}
                        </span>
                      </div>

                      {/* 下一个 */}
                      {emblaApi?.canScrollNext() && (
                        <div className="flex flex-col items-center gap-0.5">
                          <Button
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              emblaApi.scrollNext();
                            }}
                            className="w-11 h-11 rounded-full shadow-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border border-white/10"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </Button>
                          <span className="text-[9px] text-white/80 font-bold">下一个</span>
                        </div>
                      )}

                      {/* 自动播放中指示器 */}
                      {isAutoPlay && (
                        <div className={cn(
                          "flex flex-col items-center gap-1 transition-all duration-300"
                        )}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAutoPlayChange(false);
                            }}
                            className="w-11 h-11 rounded-full shadow-xl bg-primary/20 hover:bg-primary/30 text-primary backdrop-blur-md border border-primary/30 animate-pulse"
                          >
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          </Button>
                          <span className="text-[9px] text-primary font-bold">播放中</span>
                        </div>
                      )}
                    </div>
                    {/* 热度值展示 (右下角) - 仅管理员可见 */}
                    {profile?.role === 'admin' && (
                      <div className={cn(
                        "absolute right-2 bottom-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg transition-all duration-300",
                        isCleared && "opacity-0 pointer-events-none scale-95"
                      )}>
                        <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                        <span className="text-white font-black text-xs tabular-nums drop-shadow-sm tracking-tight">
                          {Math.round((item.heat_score || 0) * 1000).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-white/50 font-medium ml-0.5">热度</span>
                      </div>
                    )}
                  </>
          )}
              </div>
            );
    })
  }
        </div>
      </div>
    </div>
  );
});
export default FeedView;
