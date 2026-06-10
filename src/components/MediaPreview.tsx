import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { Edit2, Trash2, Search, X, Check, ShieldAlert, Flame, TrendingDown, Sparkles, LogOut, Eye, EyeOff, MoreVertical, Download, PlayCircle, Volume2, VolumeX, RotateCcw, ThumbsDown, Scan, Heart, Loader2, Zap, Settings, ChevronDown, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, downloadFile } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { MediaItem, StorageConfig, ItemStatus } from '@/types';
import useEmblaCarousel from 'embla-carousel-react';
import { usePreload } from '@/hooks/use-preload';
import { api } from '@/db/api';
import { rbacApi } from '@/db/rbac';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { VideoPlayer } from '@/components/ui/video-player';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { RelatedContent } from '@/components/RelatedContent';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MediaPreviewProps {
  items: MediaItem[];
  initialIndex: number;
  onClose: (dislikedIds?: string[]) => void;
  onIndexChange?: (index: number) => void;
  onLoadMore?: () => void;
  onTagClick?: (tagId: string, e: React.MouseEvent) => void;
  hideActions?: boolean;
  hasTabBar?: boolean;
  scene?: 'waterfall_feed' | 'douyin' | 'portrait' | 'daily' | 'general';
  ruleKey?: string;
}

interface PreviewItemProps {
  item: MediaItem;
  isActive: boolean;
  isMuted: boolean;
  onMutedChange: (muted: boolean) => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClose: () => void;
  isMagnifierMode: boolean;
  magnifierType: 'lens' | 'navigator';
  magnifyLevel: number;
  zoomMode: 'magnifier' | 'pinch';
  onMagnifierModeChange: (mode: boolean) => void;
  onZoomModeChange: (mode: 'magnifier' | 'pinch') => void;
  showWatermark?: boolean;
  watermarkText?: string;
  watermarkConfig?: StorageConfig | null;
  isCleanMode?: boolean; 
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onVideoEnded?: () => void;
  isAutoPlay?: boolean;
  autoPlayProgress?: number;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isNear: boolean;
  ruleKey?: string;
}

const PreviewItem = React.memo(({ 
  item, 
  isActive, 
  isMuted, 
  onMutedChange, 
  onToggleFavorite,
  onClose,
  isMagnifierMode,
  magnifierType,
  magnifyLevel,
  zoomMode,
  onMagnifierModeChange,
  onZoomModeChange,
  showWatermark,
  watermarkText,
  watermarkConfig,
  isCleanMode = false,
  onProgress,
  onError,
  onVideoEnded,
  isAutoPlay,
  autoPlayProgress = 0,
  isMenuOpen,
  setIsMenuOpen,
  isNear,
  ruleKey = '大图'
}: PreviewItemProps) => {
  // 放大镜相关状态
  const [magnifier, setMagnifier] = useState<{ 
    active: boolean; 
    x: number; 
    y: number; 
    px: number; 
    py: number; 
    show: boolean; 
    transform: string;
    imgW: number;
    imgH: number;
    imgOffsetLeft: number;
    imgOffsetTop: number;
    longPressTimer?: NodeJS.Timeout | null;
  }>({ 
    active: false, 
    x: 0, 
    y: 0, 
    px: 0.5, 
    py: 0.5, 
    show: false, 
    transform: 'translate(-50%, -50%)',
    imgW: 0,
    imgH: 0,
    imgOffsetLeft: 0,
    imgOffsetTop: 0,
    longPressTimer: null
  });

  // 双手缩放状态
  const [pinch, setPinch] = useState({
    scaling: false,
    scale: 1,
    initialDistance: 0,
    lastScale: 1,
    centerX: 0,
    centerY: 0,
    translateX: 0,
    translateY: 0,
    lastTranslateX: 0,
    lastTranslateY: 0,
    startClientX: 0,
    startClientY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0
  });

  const magnifierTimer = useRef<NodeJS.Timeout | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const handleProgress = useCallback((p: number) => {
    if (isActive) {
      onProgress?.(p);
    }
  }, [isActive, onProgress]);


  // 模式发生变化时重置
  useEffect(() => {
    if (!isMagnifierMode) {
      setMagnifier(prev => ({ ...prev, active: false, show: false, transform: 'translate(-50%, -120%)' }));
      // 重置双指缩放状态
      setPinch({
        scaling: false,
        scale: 1,
        initialDistance: 0,
        lastScale: 1,
        centerX: 0,
        centerY: 0,
        translateX: 0,
        translateY: 0,
        lastTranslateX: 0,
        lastTranslateY: 0,
        startClientX: 0,
        startClientY: 0,
        dragging: false,
        dragStartX: 0,
        dragStartY: 0
      });
    }
  }, [isMagnifierMode]);

  // 监听缩放或移动，如果菜单开启则关闭它
  useEffect(() => {
    if ((magnifier.active || pinch.scaling || pinch.dragging) && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [magnifier.active, pinch.scaling, pinch.dragging, isMenuOpen]);

  // 阻止图片内容区域的点击冒泡到外层容器，防止误触关闭预览
  // 若菜单处于打开状态则顺便关闭它（modal={false} 模式下的手动外部点击检测）
  const handleContentClick = (e: React.MouseEvent) => {
    if (isMenuOpen) setIsMenuOpen(false);
    e.stopPropagation();
  };

  const WatermarkOverlay = () => {
    if (!showWatermark || !watermarkText || !watermarkConfig) return null;

    const position = watermarkConfig.watermark_position || 'bottom-right';
    const isTile = position === 'tile';

    if (isTile) {
      return (
        <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden select-none flex items-center justify-center" style={{ opacity: watermarkConfig.watermark_opacity || 0.5 }}>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-x-12 gap-y-16 rotate-[-25deg] w-[200%] h-[200%]">
            {Array.from({ length: 60 }).map((_, i) => (
              <span key={i} className="text-white/30 text-[10px] md:text-xs font-black whitespace-nowrap drop-shadow-sm uppercase">
                {watermarkText}
              </span>
            ))}
          </div>
        </div>
      );
    }

    const posClasses = {
      'top-left': 'top-6 left-6',
      'top-right': 'top-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'bottom-right': 'bottom-6 right-6',
      'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
    };

    return (
      <div className={cn(
        "absolute z-40 pointer-events-none select-none drop-shadow-md",
        posClasses[position as keyof typeof posClasses] || posClasses['bottom-right']
      )} style={{ opacity: watermarkConfig.watermark_opacity || 0.5 }}>
        <span className="text-white text-[10px] font-black bg-black/20 px-2 py-0.5 rounded backdrop-blur-[2px] border border-white/5 uppercase tracking-widest">
          {watermarkText}
        </span>
      </div>
    );
  };

  return (
    <div className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center relative bg-black">
      {!isNear ? (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-white/10 animate-spin" />
        </div>
      ) : (
        <div 
          className={cn(
            "w-full h-full flex items-center justify-center relative bg-black select-none touch-none",
            isMagnifierMode ? "cursor-crosshair" : "cursor-default"
          )}
        onClick={(e) => {
          // 仅当点击的是黑色背景区域（而非内容本身）时才关闭预览或菜单
          // 图片内容区域的点击已通过 handleContentClick 阻止冒泡
          if (e.target === e.currentTarget) {
            e.preventDefault();
            e.stopPropagation();
            if (isMenuOpen) {
              setIsMenuOpen(false);
            } else if (!isMagnifierMode) {
              onClose();
            }
          }
        }}
        onPointerDown={(e) => {
          if (isMenuOpen) return;
          if (item.type !== 'image') return;

          const imgElement = e.currentTarget.querySelector('img') || e.currentTarget.querySelector('canvas');
          if (!imgElement) return;

          const containerRect = e.currentTarget.getBoundingClientRect();
          const img = imgElement as any;
          const nw = img.naturalWidth || img.width || 0;
          const nh = img.naturalHeight || img.height || 0;

          if (nw === 0 || nh === 0) return;

          const cw = containerRect.width;
          const ch = containerRect.height;
          const imgRatio = nw / nh;
          const containerRatio = cw / ch;

          let actualWidth, actualHeight, offsetX, offsetY;
          if (imgRatio > containerRatio) {
            actualWidth = cw;
            actualHeight = cw / imgRatio;
            offsetX = 0;
            offsetY = (ch - actualHeight) / 2;
          } else {
            actualHeight = ch;
            actualWidth = ch * imgRatio;
            offsetY = 0;
            offsetX = (cw - actualWidth) / 2;
          }

          const relativeX = e.clientX - containerRect.left - offsetX;
          const relativeY = e.clientY - containerRect.top - offsetY;
          const px = relativeX / actualWidth;
          const py = relativeY / actualHeight;

          const coords = {
            x: e.clientX - containerRect.left, 
            y: e.clientY - containerRect.top, 
            px, 
            py, 
            imgW: actualWidth,
            imgH: actualHeight,
            imgOffsetLeft: offsetX,
            imgOffsetTop: offsetY,
          };

          if (isMagnifierMode && zoomMode === 'magnifier') {
            e.preventDefault();
            e.stopPropagation(); // 阻止冒泡到 Embla
            setMagnifier(prev => ({ 
              ...prev,
              active: true, 
              ...coords,
              show: true, 
              transform: 'translate(-50%, -50%)',
              longPressTimer: null
            }));
          } else if (!isMagnifierMode) {
            // 长按自动进入放大镜模式
            // 注意：这里不立即 stopPropagation，否则会导致无法正常点击切屏
            const timer = setTimeout(() => {
              onMagnifierModeChange(true);
              onZoomModeChange('magnifier');
              setMagnifier(prev => ({ 
                ...prev,
                active: true, 
                ...coords,
                show: true, 
                transform: 'translate(-50%, -50%)',
                longPressTimer: null
              }));
              // 震动反馈
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(50); } catch (e) {}
              }
            }, 500);
            setMagnifier(prev => ({ ...prev, longPressTimer: timer }));
          }
        }}
        onPointerMove={(e) => {
          if (!magnifier.active || zoomMode !== 'magnifier') return;
          e.preventDefault();
          e.stopPropagation(); // 移动放大镜时阻止 Embla 切图

          const imgElement = e.currentTarget.querySelector('img') || e.currentTarget.querySelector('canvas');
          if (!imgElement) return;

          const containerRect = e.currentTarget.getBoundingClientRect();
          const img = imgElement as any;
          const nw = img.naturalWidth || img.width || 0;
          const nh = img.naturalHeight || img.height || 0;

          if (nw === 0 || nh === 0) return;

          const cw = containerRect.width;
          const ch = containerRect.height;
          const imgRatio = nw / nh;
          const containerRatio = cw / ch;

          let actualWidth, actualHeight, offsetX, offsetY;
          if (imgRatio > containerRatio) {
            actualWidth = cw;
            actualHeight = cw / imgRatio;
            offsetX = 0;
            offsetY = (ch - actualHeight) / 2;
          } else {
            actualHeight = ch;
            actualWidth = ch * imgRatio;
            offsetY = 0;
            offsetX = (cw - actualWidth) / 2;
          }

          const relativeX = e.clientX - containerRect.left - offsetX;
          const relativeY = e.clientY - containerRect.top - offsetY;
          const px = relativeX / actualWidth;
          const py = relativeY / actualHeight;

          const RADIUS = 112;
          const maxX = containerRect.width - RADIUS;
          const maxY = containerRect.height - RADIUS;
          const minX = RADIUS;
          const minY = RADIUS;

          const finalX = Math.max(minX, Math.min(maxX, e.clientX - containerRect.left));
          const finalY = Math.max(minY, Math.min(maxY, e.clientY - containerRect.top));

          setMagnifier(prev => ({
            ...prev,
            x: finalX,
            y: finalY,
            px,
            py,
            imgW: actualWidth,
            imgH: actualHeight,
          }));
        }}
        onPointerUp={(e) => {
          if (magnifier.active) e.stopPropagation();
          if (magnifier.longPressTimer) {
            clearTimeout(magnifier.longPressTimer);
          }
          setMagnifier(prev => ({ ...prev, active: false, show: false, longPressTimer: null }));
        }}
        onPointerLeave={(e) => {
          if (magnifier.active) e.stopPropagation();
          if (magnifier.longPressTimer) {
            clearTimeout(magnifier.longPressTimer);
          }
          setMagnifier(prev => ({ ...prev, active: false, show: false, longPressTimer: null }));
        }}
        onPointerCancel={(e) => {
          if (magnifier.active) e.stopPropagation();
          if (magnifier.longPressTimer) {
            clearTimeout(magnifier.longPressTimer);
          }
          setMagnifier(prev => ({ ...prev, active: false, show: false, longPressTimer: null }));
        }}
        onTouchStart={(e) => {
          // 双指缩放：自动进入细节模式（如果还没进入）
          if (e.touches.length === 2) {
            e.stopPropagation(); // 阻止事件传导给 Embla，避免切图
            if (!isMagnifierMode) {
              onMagnifierModeChange(true);
              onZoomModeChange('pinch');
            }
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const centerX = (t1.clientX + t2.clientX) / 2;
            const centerY = (t1.clientY + t2.clientY) / 2;
            setPinch(prev => ({
              ...prev,
              scaling: true,
              initialDistance: dist,
              centerX,
              centerY,
              startClientX: centerX,
              startClientY: centerY,
              dragging: false
            }));
          }
          // 单指拖动：仅在细节模式且已缩放时启用
          else if (e.touches.length === 1 && isMagnifierMode && zoomMode === 'pinch' && pinch.scale > 1) {
            e.stopPropagation(); // 阻止事件传导给 Embla
            const touch = e.touches[0];
            setPinch(prev => ({
              ...prev,
              dragging: true,
              dragStartX: touch.clientX,
              dragStartY: touch.clientY
            }));
          }
        }}
        onTouchMove={(e) => {
          // 双指缩放
          if (e.touches.length === 2 && pinch.scaling) {
            e.preventDefault();
            e.stopPropagation();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const centerX = (t1.clientX + t2.clientX) / 2;
            const centerY = (t1.clientY + t2.clientY) / 2;

            const newScale = Math.max(1, Math.min(6, (dist / pinch.initialDistance) * pinch.lastScale));
            const deltaX = centerX - pinch.startClientX;
            const deltaY = centerY - pinch.startClientY;

            setPinch(prev => ({
              ...prev,
              scale: newScale,
              translateX: prev.lastTranslateX + deltaX,
              translateY: prev.lastTranslateY + deltaY
            }));
          }
          // 单指拖动
          else if (e.touches.length === 1 && pinch.dragging && pinch.scale > 1) {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            const deltaX = touch.clientX - pinch.dragStartX;
            const deltaY = touch.clientY - pinch.dragStartY;

            setPinch(prev => ({
              ...prev,
              translateX: prev.lastTranslateX + deltaX,
              translateY: prev.lastTranslateY + deltaY
            }));
          }
        }}
        onTouchEnd={(e) => {
          // 双指缩放结束
          if (pinch.scaling && e.touches.length < 2) {
            setPinch(prev => ({
              ...prev,
              scaling: false,
              lastScale: prev.scale,
              lastTranslateX: prev.translateX,
              lastTranslateY: prev.translateY
            }));
          }
          // 单指拖动结束
          if (pinch.dragging && e.touches.length === 0) {
            setPinch(prev => ({
              ...prev,
              dragging: false,
              lastTranslateX: prev.translateX,
              lastTranslateY: prev.translateY
            }));
          }
        }}
      >
        <div 
          className="w-full h-full flex items-center justify-center pointer-events-auto relative"
          onDoubleClick={onToggleFavorite}
          onClick={handleContentClick}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            transform: `scale(${pinch.scale}) translate(${pinch.translateX / pinch.scale}px, ${pinch.translateY / pinch.scale}px)`,
            transformOrigin: 'center center',
            transition: (pinch.scaling || pinch.dragging) ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <WatermarkOverlay />
          {item.type === 'image' ? (
            <ProtectedMedia 
              src={item.url} 
              thumbnailSrc={item.thumbnail_url || item.url}
              type="image"
              alt={item.title || '预览内容'} 
              className="max-w-full max-h-full object-contain"
              onUrlResolved={setResolvedUrl}
              onProgress={handleProgress}
              onError={onError}
              showLoadingTooltip={false} // 在 MediaPreview 中手动显示
              adminLabelClassName="top-20 left-4"
              priority={isActive}
              fetchpriority={isActive ? 'high' : 'low'}
              ruleKey={ruleKey}
              thumbnailRuleKey="首瀑"
              forceMode={ruleKey === 'none' ? 'original' : undefined}
            />
          ) : (
            // 判断是否为 Zonerama 视频链接
            (item.url.includes('us.zonerama.com/VideoPlayer/') ? (<div className="relative w-full h-full">
              {/* 缩略图背景 */}
              {item.thumbnail_url && (
                <img
                  src={item.thumbnail_url}
                  alt={item.title || ''}
                  className="absolute inset-0 w-full h-full object-contain blur-sm opacity-50"
                />
              )}
              <iframe
                src={`${item.url}${isActive ? `?autoplay=1&muted=${isMuted ? 1 : 0}` : ''}`}
                className="relative w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer"
                style={{ border: 'none', pointerEvents: 'none' }}
              />
              {/* 透明覆盖层，用于捕获滚轮和触摸事件，但不阻止点击 */}
              <div 
                className="absolute inset-0 z-10"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => {
                  // 点击时允许事件穿透到 iframe
                  const target = e.currentTarget;
                  target.style.pointerEvents = 'none';
                  setTimeout(() => {
                    // 检查元素是否还存在
                    if (target && target.style) {
                      target.style.pointerEvents = 'auto';
                    }
                  }, 100);
                }}
              />
            </div>) : (<VideoPlayer
              src={item.url}
              poster={item.thumbnail_url || undefined}
              autoPlay={isActive}
              muted={isMuted}
              onMutedChange={onMutedChange}
              onEnded={onVideoEnded}
              loop={!isAutoPlay}
              className="w-full h-full"
            />))
          )}

          {/* 放大镜效果 (MediaPreview 版) - 只在单指放大镜模式下显示 */}
                      <div className="absolute inset-0 pointer-events-none z-50">
                        {isMagnifierMode && zoomMode === 'magnifier' && magnifier.show && (() => {
                          const level = magnifyLevel;
                          const imgW = magnifier.imgW;
                          const imgH = magnifier.imgH;

                          // 模式 1: 圆形放大镜 (改为固定居中屏幕)
                          return (
                            <motion.div 
                              initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                              animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
                              className="fixed left-1/2 top-1/2 w-64 h-64 rounded-full border-4 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden bg-black z-[100]"
                              style={{ 
                                boxShadow: '0 0 40px hsl(var(--primary) / 0.4)',
                              }}
                            >
                              <div 
                                className="w-full h-full relative"
                                style={{
                                  backgroundImage: `url(${resolvedUrl}), url(${item.thumbnail_url || item.url})`,
                                  backgroundPosition: `${-(magnifier.px * imgW * level) + 128}px ${-(magnifier.py * imgH * level) + 128}px`,
                                  backgroundSize: `${imgW * level}px auto`,
                                  backgroundRepeat: 'no-repeat',
                                  backgroundColor: 'black'
                                }}
                              >
                                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                                  <div className="w-10 h-[2px] bg-primary" />
                                  <div className="h-10 w-[2px] bg-primary" />
                                  <div className="w-3 h-3 rounded-full border-2 border-primary" />
                                </div>
                              </div>
                            </motion.div>
                          );
                        })()}
                      </div>
        </div>
      </div>
      )}
    </div>
  );
});

export function MediaPreview({ 
  items, 
  initialIndex, 
  onClose, 
  onIndexChange, 
  onLoadMore,
  onTagClick,
  hideActions = false, 
  hasTabBar = false,
  scene = 'general',
  ruleKey
}: MediaPreviewProps) {
  const { user, profile } = useAuth();

  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('video_muted') !== 'false'; // 默认静音
  });

  const [isAutoPlay, setIsAutoPlay] = useState(() => {
    return localStorage.getItem('media_auto_play') === 'true';
  });

  const [autoPlayInterval, setAutoPlayInterval] = useState(() => {
    return Number(localStorage.getItem('media_auto_play_interval')) || 5000;
  });

  useEffect(() => {
    localStorage.setItem('media_auto_play', String(isAutoPlay));
  }, [isAutoPlay]);

  useEffect(() => {
    localStorage.setItem('media_auto_play_interval', String(autoPlayInterval));
  }, [autoPlayInterval]);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // 追踪滚动方向，用于动态调整预加载缓冲区
  const prevIndexRef = useRef(currentIndex);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (currentIndex > prevIndexRef.current) setScrollDirection('down');
    else if (currentIndex < prevIndexRef.current) setScrollDirection('up');
    prevIndexRef.current = currentIndex;
  }, [currentIndex]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [lastDislikedId, setLastDislikedId] = useState<string | null>(null);
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());

  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [showGuide, setShowGuide] = useState(() => {
    // 只在第一次打开预览时显示引导
    const hasSeenGuide = localStorage.getItem('has_seen_dislike_guide');
    return !hasSeenGuide;
  });

  // 在组件挂载时，如果显示引导，4秒后自动隐藏并标记已看过
  useEffect(() => {
    if (showGuide) {
      const timer = setTimeout(() => {
        setShowGuide(false);
        localStorage.setItem('has_seen_dislike_guide', 'true');
      }, 4000); // 4秒后自动隐藏

      return () => clearTimeout(timer);
    }
  }, [showGuide]);

  const viewTimer = useRef<NodeJS.Timeout | null>(null);

  // 举报相关
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [itemRuleKeys, setItemRuleKeys] = useState<Map<string, string>>(new Map());

  // 根据场景初始化默认规则
  const lastSceneRef = useRef(scene);
  useEffect(() => {
    if (items.length > 0) {
      setItemRuleKeys(prev => {
        const isSceneChanged = lastSceneRef.current !== scene;
        lastSceneRef.current = scene;
        
        const next = isSceneChanged ? new Map() : new Map(prev);
        let changed = isSceneChanged;
        
        items.forEach(item => {
          if (!next.has(item.id)) {
            // 场景映射：瀑布流点开 -> 大图预览，写真图集 -> 写真列表，每日图集 -> 每日列表
            const defaultKey = 
              scene === 'waterfall_feed' ? '大图' :
              scene === 'douyin' ? 'douyin' :
              scene === 'portrait' ? '写book' :
              scene === 'daily' ? '每日' : '大图';
            next.set(item.id, defaultKey);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [items, scene]);

  // 清屏模式
  const [isCleanMode, setIsCleanMode] = useState(false);

  // 相关推荐面板
  const [isRelatedOpen, setIsRelatedOpen] = useState(false);

  // 下载相关
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0); // 新增进度状态
  const [loadError, setLoadError] = useState<string | null>(null);

  // 切换内容时重置
  useEffect(() => {
    setLoadProgress(0);
    setLoadError(null);
  }, [currentIndex]);

  // 配置与权限
  const [config, setConfig] = useState<StorageConfig | null>(null);
  const [canRemoveWatermark, setCanRemoveWatermark] = useState(false);

  // 锁定背景滚动（组件挂载时执行，卸载时恢复）
  useEffect(() => {
    // 记录原始样式
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const originalTouchAction = document.body.style.touchAction;

    // 获取滚动条宽度，防止页面抖动
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    // 锁定背景滚动，并禁用 touch 事件（防止 iOS 惯性滚动穿透预览层）
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      // 恢复背景滚动 - 强制清空行内样式，让 CSS 重新接管
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await api.getStorageConfig();
      if (data) setConfig(data);

      if (user) {
        const { permissions } = await rbacApi.getCurrentUserPermissions(user.id);
        setCanRemoveWatermark(profile?.role === 'admin' || permissions.includes('remove_watermark'));
      }
    };
    init();
  }, [user, profile]);


  const showWatermark = useMemo(() => {
    return config?.watermark_enabled && !canRemoveWatermark;
  }, [config, canRemoveWatermark]);

  // 过滤掉不喜欢的内容
  const displayItems = useMemo(() => {
    return items.filter(item => !dislikedIds.has(item.id));
  }, [items, dislikedIds]);

   // 用于触摸滑动检测
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // 放大镜模式
  const [magnifyLevel, setMagnifyLevel] = useState(() => {
    const saved = localStorage.getItem('magnify_level');
    return saved ? parseInt(saved) : 3;
  });
  const [isMagnifierMode, setIsMagnifierMode] = useState(false);
  const [magnifierType, setMagnifierType] = useState<'lens' | 'navigator'>('lens');

  // 放大模式选择：'magnifier' 单指放大镜 | 'pinch' 双指缩放
  const [zoomMode, setZoomMode] = useState<'magnifier' | 'pinch'>(() => {
    const saved = localStorage.getItem('zoom_mode');
    return (saved === 'pinch' || saved === 'magnifier') ? saved : 'magnifier';
  });

  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    startIndex: Math.max(0, initialIndex),
    loop: false,
    axis: 'y', 
    align: 'center',
    skipSnaps: false,
    duration: 15,
    dragThreshold: 15, // 提高触发门槛，防止点击或长按时的轻微晃动导致切图
    containScroll: 'trimSnaps',
    watchDrag: !isMagnifierMode // 使用 watchDrag 控制拖拽
  });

  // 预加载逻辑：当前项的前后各 3 项，确保滑动流畅且无黑屏
  const preloadUrls = useMemo(() => {
    const urls: string[] = [];
    const RANGE = 3; // 增加预加载范围
    for (let i = currentIndex - 1; i <= currentIndex + RANGE; i++) {
      if (i >= 0 && i < displayItems.length) {
        const item = displayItems[i];
        if (item.url) urls.push(item.url);
        // 预加载高清原图
      }
    }
    return Array.from(new Set(urls));
  }, [currentIndex, displayItems]);

  usePreload(preloadUrls);

  useEffect(() => {
    localStorage.setItem('magnify_level', magnifyLevel.toString());
  }, [magnifyLevel]);

  useEffect(() => {
    localStorage.setItem('zoom_mode', zoomMode);
  }, [zoomMode]);

  // 监听模式变化，禁用/启用 Embla 拖拽
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit({ watchDrag: !isMagnifierMode });
    }
  }, [emblaApi, isMagnifierMode]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    // 只有在真正切换内容时才更新状态并关闭菜单，避免闪现问题
    if (index !== currentIndex) {
      setCurrentIndex(index);
      if (onIndexChange) onIndexChange(index);
      setIsMenuOpen(false);

      // 自动加载更多：当剩余 10 条数据时触发
      if (onLoadMore && displayItems.length - index <= 10) {
        onLoadMore();
      }
    }
  }, [emblaApi, onIndexChange, onLoadMore, displayItems.length, setIsMenuOpen, currentIndex]);

  const handleClose = useCallback(() => {
    onClose(Array.from(dislikedIds));
  }, [onClose, dislikedIds]);

  const cleanTitle = (title: string) => {
    if (!title) return '';
    return title.replace(/\.(jpg|jpeg|png|gif|mp4|mov|avi|wmv)$/i, '');
  };

  // 监听索引变化，重置进度
  useEffect(() => {
    setLoadProgress(0);
  }, [currentIndex]);

  // 自动播放定时器 (图片模式)
  useEffect(() => {
    // 增加细节模式判断：如果是放大镜模式或处于缩放模式，不进行翻页
    if (!isAutoPlay || !emblaApi || isMagnifierMode) {
      setAutoPlayProgress(0);
      return;
    }

    const currentItem = displayItems[currentIndex];
    if (!currentItem) return;

    // 如果有加载错误，且开启了自动播放，则延迟 1.5 秒后尝试切换
    if (loadError) {
      const errorTimer = setTimeout(() => {
        if (emblaApi.canScrollNext()) {
          emblaApi.scrollNext();
        } else {
          // 如果是最后一页，回到第一页循环播放
          emblaApi.scrollTo(0);
        }
      }, 1500);
      return () => clearTimeout(errorTimer);
    }

    // 如果是视频且不是 zonerama，由 onVideoEnded 处理，这里跳过
    const isZonerama = currentItem?.url.includes('us.zonerama.com/VideoPlayer/');
    const isImage = currentItem?.type === 'image' || !currentItem?.type;

    if (currentItem?.type === 'video' && !isZonerama) {
      setAutoPlayProgress(0);
      return;
    }

    // 重要：等待原图加载完成（loadProgress === 100）才开始计时
    // 如果是图片且原图还没加载完，则静止进度并等待
    if (isImage && loadProgress < 100) {
      setAutoPlayProgress(0);
      return;
    }

    // 图片已加载完成（或 zonerama 视频），开始正式播放倒计时
    const interval = autoPlayInterval + (isImage ? 500 : 0);
    const startTime = Date.now();

    let animationFrame: number;
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / interval) * 100, 100);
      setAutoPlayProgress(progress);

      if (progress < 100) {
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);

    const timer = setTimeout(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      } else {
        // 如果是最后一页，回到第一页循环播放
        emblaApi.scrollTo(0);
      }
    }, interval);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrame);
    };
  }, [isAutoPlay, currentIndex, autoPlayInterval, emblaApi, displayItems, isMagnifierMode, loadProgress, loadError]);

  const handleVideoEnded = useCallback(() => {
    if (!isAutoPlay || !emblaApi) return;
    if (emblaApi.canScrollNext()) {
      emblaApi.scrollNext();
    } else {
      setIsAutoPlay(false);
    }
  }, [isAutoPlay, emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    // 组件卸载或 onSelect 变更时必须取消注册，否则会多次触发导致菜单闪现、状态错乱
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi) {
      const selectedIndex = emblaApi.selectedScrollSnap();
      if (selectedIndex !== initialIndex) {
        emblaApi.scrollTo(initialIndex, true);
        setCurrentIndex(initialIndex);
      }
    }
  }, [emblaApi, initialIndex]);

  // 添加滚轮事件监听，支持鼠标滚轮切换
  useEffect(() => {
    if (!emblaApi) return;

    const handleWheel = (e: WheelEvent) => {
      // 防止默认滚动行为
      e.preventDefault();

      // 根据滚轮方向切换
      if (e.deltaY > 0) {
        // 向下滚动，切换到下一个
        if (emblaApi.canScrollNext()) {
          emblaApi.scrollNext();
        }
      } else if (e.deltaY < 0) {
        // 向上滚动，切换到上一个
        if (emblaApi.canScrollPrev()) {
          emblaApi.scrollPrev();
        }
      }
    };

    // 添加事件监听器，使用 passive: false 允许 preventDefault
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [emblaApi]);

  // 添加键盘事件监听，支持上下箭头键切换
  useEffect(() => {
    if (!emblaApi) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (emblaApi.canScrollNext()) {
          emblaApi.scrollNext();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (emblaApi.canScrollPrev()) {
          emblaApi.scrollPrev();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [emblaApi, handleClose]);

  // 检查当前项是否已收藏
  useEffect(() => {
    const checkFav = async () => {
      const currentItem = displayItems[currentIndex];
      if (user && currentItem) {
        const { isFavorite } = await api.checkIsFavorite(user.id, currentItem.id);
        setIsFavorite(isFavorite);
      }
    };
    checkFav();
  }, [user, currentIndex, displayItems]);

  // 管理员功能
  const handleAdminAction = async (action: string) => {
    const currentItem = displayItems[currentIndex];
    if (!currentItem || !user) return;

    try {
      if (action === 'edit') {
        window.dispatchEvent(new CustomEvent('openEditMedia', { detail: { item: currentItem } }));
        return;
      }
      
      let message = '操作成功';
      if (action === 'heat_up') {
        const { data: config } = await api.getRecommendationSettings();
        const amount = config?.weights?.manual_boost_weight || 10;
        await api.adjustMediaHeat(currentItem.id, amount);
        message = '已增加作品热度';
      } else if (action === 'heat_down') {
        const { data: config } = await api.getRecommendationSettings();
        const amount = (config?.weights?.manual_boost_weight || 10) * -1;
        await api.adjustMediaHeat(currentItem.id, amount);
        message = '已降低作品热度';
      } else if (action === 'toggle_recommend') {
        await api.updateMediaAdminStatus(currentItem.id, { is_recommended: !currentItem.is_recommended });
        message = currentItem.is_recommended ? '已取消推荐' : '已设为推荐';
      } else if (action === 'toggle_hide') {
        await api.updateMediaAdminStatus(currentItem.id, { is_hidden: !currentItem.is_hidden });
        message = currentItem.is_hidden ? '作品已设为可见' : '作品已设为隐藏';
      } else if (action === 'delete') {
        const confirmed = await confirmAsync('确定要彻底删除这个作品吗？此操作不可撤销。');
        if (!confirmed) return;
        await api.deleteMedia(currentItem.id);
        message = '作品已删除';
        handleClose();
      } else if (action === 'archive') {
        await api.updateMediaAdminStatus(currentItem.id, { status: 'archived' });
        message = '作品已下架';
      } else {
        const { error } = await api.adminAction(currentItem.id, action);
        if (error) throw error;
      }
      
      toast.success(message);
    } catch (e: any) {
      toast.error('操作失败: ' + e.message);
    }
  };

  const handleReport = async () => {
    if (!user) {
      toast.error('请先登录后操作');
      return;
    }
    const currentItem = displayItems[currentIndex];
    if (!currentItem || !reportReason.trim()) return;

    setReporting(true);
    try {
      const { error } = await api.createReport({
        media_id: currentItem.id,
        reporter_id: user.id,
        reason: reportReason
      });
      if (error) throw error;
      toast.success('举报已提交，我们会尽快核查处理');
      setIsReportOpen(false);
      setReportReason('');
    } catch (e: any) {
      toast.error('提交失败: ' + e.message);
    } finally {
      setReporting(false);
    }
  };

  const processedWatermarkText = useMemo(() => {
    if (!config?.watermark_text) return '';
    let text = config.watermark_text;

    const username = profile?.username || user?.email?.split('@')[0] || '用户';
    const digitalId = String(profile?.digital_id || '');
    const siteTitle = config.site_title || '秒哒视觉赏析';

    // 替换用户信息 (支持 {name} 和 {{user.name}} 两种格式)
    text = text.replace(/\{(username|name)\}/gi, username)
               .replace(/\{\{user\.name\}\}/gi, username)
               .replace(/\{digital_id\}/gi, digitalId)
               .replace(/\{nickname\}/gi, username) // Fallback to username
               .replace(/\{(site_title|site\.title)\}/gi, siteTitle)
               .replace(/\{\{site\.title\}\}/gi, siteTitle);

    // 替换日期
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    text = text.replace(/\{(date|date\.yyyy-mm-dd)\}/gi, dateStr)
               .replace(/\{\{date\.yyyy-mm-dd\}\}/gi, dateStr);

    return text;
  }, [config, user, profile]);

  const WatermarkOverlay = () => {
    if (!showWatermark || !processedWatermarkText || !config) return null;

    const position = config.watermark_position || 'bottom-right';
    const isTile = position === 'tile';

    if (isTile) {
      return (
        <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden select-none flex items-center justify-center" style={{ opacity: config.watermark_opacity || 0.5 }}>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-x-12 gap-y-16 rotate-[-25deg] w-[200%] h-[200%]">
            {Array.from({ length: 60 }).map((_, i) => (
              <span key={i} className="text-white/30 text-[10px] md:text-xs font-black whitespace-nowrap drop-shadow-sm uppercase">
                {processedWatermarkText}
              </span>
            ))}
          </div>
        </div>
      );
    }

    const posClasses = {
      'top-left': 'top-6 left-6',
      'top-right': 'top-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'bottom-right': 'bottom-6 right-6',
      'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
    };

    return (
      <div className={cn(
        "absolute z-40 pointer-events-none select-none drop-shadow-md",
        posClasses[position as keyof typeof posClasses] || posClasses['bottom-right']
      )} style={{ opacity: config.watermark_opacity || 0.5 }}>
        <span className="text-white text-[10px] font-black bg-black/20 px-2 py-0.5 rounded backdrop-blur-[2px] border border-white/5 uppercase tracking-widest">
          {processedWatermarkText}
        </span>
      </div>
    );
  };

  // 浏览量统计逻辑 - 参考写真图集详情页方式，立即上报
  useEffect(() => {
    if (currentIndex < 0) return;
    const currentItem = displayItems[currentIndex];
    if (!currentItem) return;

    // 如果已经统计过，则不再统计
    if (viewedIds.has(currentItem.id)) return;

    // 立即上报浏览量（参考写真图集详情页方式）
    const reportView = async () => {
      try {
        await api.incrementMediaView(currentItem.id, user?.id);
        if (user) await api.trackInteraction(currentItem.id, 'view', 1);
        setViewedIds(prev => new Set(prev).add(currentItem.id));
        console.log(`[Analytics] 浏览量上报成功: ${currentItem.id}`);
      } catch (e) {
        console.error('浏览量上报失败:', e);
      }
    };

    reportView();
  }, [currentIndex, displayItems, user]);

  // 检查当前项是否已下载
  useEffect(() => {
    const checkStatus = async () => {
      const currentItem = displayItems[currentIndex];
      if (user && currentItem) {
        const downloaded = await api.checkDownloadStatus(user.id, currentItem.id, 'wallpaper');
        setHasDownloaded(downloaded);
      } else {
        setHasDownloaded(false);
      }
    };
    checkStatus();
  }, [user, currentIndex, displayItems]);

  const triggerFileDownload = useCallback(async () => {
    const currentItem = displayItems[currentIndex];
    if (!currentItem) return;

    try {
      const extension = currentItem.url.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `wallpaper_${currentItem.id}.${extension}`;
      await downloadFile(currentItem.url, filename);
    } catch (e) {
      console.error('Download failed:', e);
      toast.error('下载失败，请尝试长按图片保存');
    }
  }, [currentIndex, displayItems]);

  const confirmDownload = async () => {
    const currentItem = displayItems[currentIndex];
    if (!user || !currentItem) return;

    setDownloading(true);
    try {
      const price = config?.wallpaper_price || 0;
      const { data, error } = await api.handleMediaDownload(user.id, currentItem.id, null, 'wallpaper', price);

      if (error) {
        const errorMsg = typeof (error as any)?.context?.text === 'function' 
          ? await (error as any).context.text() 
          : error.message;
        throw new Error(errorMsg);
      }

      if (data.success) {
        setHasDownloaded(true);
        setIsDownloadOpen(false);
        toast.success(data.recharged ? `扣除 ${price} 积分，开始下载` : '开始下载');
        await triggerFileDownload();
      } else {
        toast.error(data.message || '积分扣除失败');
      }
    } catch (err: any) {
      toast.error('下载失败: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadClick = () => {
    if (!user) {
      toast.error('请先登录后下载');
      return;
    }

    // 检查是否开启下载
    if (!config?.enable_download) {
      toast.error('下载功能暂未开启');
      return;
    }

    // 检查权限角色
    const roles = ['user', 'member', 'vip', 'svip', 'admin'];
    const userRoleIndex = roles.indexOf(profile?.role || 'user');
    const minRoleIndex = roles.indexOf(config?.min_download_role || 'user');

    if (userRoleIndex < minRoleIndex) {
      toast.error(`您的权限不足，下载此资源需要 [${config?.min_download_role}] 权限`);
      return;
    }

    if (hasDownloaded) {
      triggerFileDownload();
    } else {
      setIsDownloadOpen(true);
    }
  };

  const handleSaveToPhone = useCallback(async () => {
    const currentItem = displayItems[currentIndex];
    if (!currentItem) return;

    if (navigator.share && currentItem.type === 'image') {
      try {
        const response = await fetch(currentItem.url);
        const blob = await response.blob();
        const file = new File([blob], `image_${currentItem.id}.jpg`, { type: 'image/jpeg' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: '保存图片',
            text: '赏析图片',
          });
          return;
        }
      } catch (e) {
        console.error('Share failed:', e);
      }
    }
    
    // Fallback to existing download
    handleDownloadClick();
  }, [currentIndex, displayItems, handleDownloadClick]);




  const handleToggleFavorite = useCallback(async (e: React.MouseEvent) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }
    const currentItem = displayItems[currentIndex];
    if (!currentItem) return;

    try {
      const { error } = await api.toggleFavorite(user.id, currentItem.id);
      if (error) throw error;

      const newStatus = !isFavorite;
      setIsFavorite(newStatus);
      if (newStatus) {
        api.trackInteraction(currentItem.id, 'favorite', 5).catch(console.error);
      }

      toast.success(newStatus ? '已加入收藏' : '已取消收藏');
    } catch (error: any) {
      toast.error(`操作失败: ${error.message}`);
    }
  }, [user, currentIndex, displayItems, isFavorite]);

  const handleDislike = useCallback(async () => {
    const currentItem = displayItems[currentIndex];
    if (!user || !currentItem) return;

    try {
      const { error } = await api.toggleDislike(user.id, currentItem.id);
      if (error) throw error;

      setLastDislikedId(currentItem.id);
      setDislikedIds(prev => new Set(prev).add(currentItem.id));

      // 标记引导已看过
      if (showGuide) {
        setShowGuide(false);
        localStorage.setItem('has_seen_dislike_guide', 'true');
      }

      // 如果是最后一条且点了不喜欢，自动关闭
      if (displayItems.length <= 1) {
        toast.success('已标记不喜欢', { duration: 1000 });
        setTimeout(handleClose, 800);
      } else {
        toast.success('已移除此内容', { duration: 1000 });
      }
    } catch (error: any) {
      toast.error(`操作失败: ${error.message}`);
    }
  }, [user, displayItems, currentIndex, emblaApi, handleClose, showGuide]);

  const handleUndoDislike = async () => {
    if (!user || !lastDislikedId || !emblaApi) return;

    try {
      const { error } = await api.toggleDislike(user.id, lastDislikedId);
      if (error) throw error;

      // 撤回状态
      setDislikedIds(prev => {
        const next = new Set(prev);
        next.delete(lastDislikedId!);
        return next;
      });

      // 切回上一条
      if (emblaApi.canScrollPrev()) {
        emblaApi.scrollPrev();
      }

      setLastDislikedId(null);
      toast.success('已撤销不喜欢操作，内容已恢复');
    } catch (error: any) {
      toast.error(`撤销失败: ${error.message}`);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    // 细节模式或多指触控下，不记录起始点，从而不触发滑动不喜欢
    if (isMagnifierMode || e.touches.length > 1) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    // 细节模式、没有记录起始点、或是多指触控结束，都不触发滑动不喜欢
    if (isMagnifierMode || touchStartX.current === null || e.changedTouches.length > 1) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;

    const deltaX = endX - touchStartX.current;
    const deltaY = endY - (touchStartY.current || 0);

    // 水平滑动距离小于 -80px 且水平位移大于垂直位移 (向左滑)
    if (deltaX < -80 && Math.abs(deltaX) > Math.abs(deltaY)) {
      handleDislike();
    }

    // 重置
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // 管理 Body 滚动锁定（已在上方 useEffect 中统一处理，此处移除重复逻辑）

  return (
    <div className={cn(
      "fixed inset-0 flex flex-col bg-black transition-all duration-300 ease-out animate-in fade-in zoom-in-95 media-preview-container",
      isCleanMode ? "z-[11001]" : "z-[1000]"
    )}>
      {/* 底部全屏自动播放进度条 */}
      {isAutoPlay && (
        <div className={cn(
          "absolute left-0 right-0 h-1.5 bg-white/5 z-[110] pointer-events-none overflow-hidden",
          hasTabBar ? "bottom-20" : "bottom-0"
        )}>
          <motion.div 
            className="h-full bg-primary shadow-[0_0_15px_rgba(59,130,246,0.6)]"
            initial={{ width: 0 }}
            animate={{ width: `${autoPlayProgress}%` }}
            transition={{ type: "tween", ease: "linear", duration: 0.1 }}
          />
        </div>
      )}
      {/* 清屏模式下的点击层 - 点击屏幕任意位置退出清屏 */}
      {isCleanMode && (
        <div 
          className="absolute inset-0 z-[60] cursor-pointer"
          onClick={() => { 
            setIsCleanMode(false); 
          }}
        />
      )}
      {/* 顶部仅显示关闭按钮 - 与抖音模式一致，隐藏关闭按钮 */}
      {!isCleanMode && false && (
        <div className={cn(
          "absolute top-0 left-0 right-0 flex items-center justify-end p-4 z-50 transition-all duration-500",
          "opacity-100 translate-y-0"
        )}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClose} 
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full bg-black/20 backdrop-blur-sm"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      )}
      {/* 右侧：自动播放状态 - 已移动到下方按钮组中 */}
      {/* 内容区域 - Embla Carousel (垂直滑动) */}
      <div 
        className={cn(
          "flex-1 relative overflow-hidden transition-all duration-300",
          // 移除固定内边距，使内容区域填满可用空间。Header/Footer 采用悬浮覆盖模式。
          // 修复：图片显示不完整的问题通常是因为容器高度被 padding 挤压导致 object-contain 无法撑满
        )} 
        ref={emblaRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex flex-col h-full">
          {displayItems.map((item, index) => {
            // 动态缓冲区：根据滚动方向提前加载更多内容，同时及时回收背后的内存
            const isNear = scrollDirection === 'down'
              ? (index >= currentIndex - 1 && index <= currentIndex + 3)
              : (scrollDirection === 'up'
                ? (index >= currentIndex - 3 && index <= currentIndex + 1)
                : Math.abs(index - currentIndex) <= 2);
            return (
              <PreviewItem
                key={`${item.id}-${index}`}
                item={item}
                isActive={currentIndex === index}
                isMuted={isMuted}
                onMutedChange={setIsMuted}
                onToggleFavorite={handleToggleFavorite}
                onClose={handleClose}
                isMagnifierMode={isMagnifierMode}
                magnifierType={magnifierType}
                magnifyLevel={magnifyLevel}
                zoomMode={zoomMode}
                onMagnifierModeChange={setIsMagnifierMode}
                onZoomModeChange={setZoomMode}
                showWatermark={showWatermark}
                watermarkText={processedWatermarkText}
                watermarkConfig={config}
                isCleanMode={isCleanMode}
                onProgress={setLoadProgress}
                onError={setLoadError}
                onVideoEnded={handleVideoEnded}
                isAutoPlay={isAutoPlay}
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
                autoPlayProgress={autoPlayProgress}
                isNear={isNear}
                ruleKey={ruleKey || itemRuleKeys.get(item.id) || (
                  scene === 'douyin' ? '抖音' : 
                  scene === 'waterfall_feed' ? '大图' :
                  scene === 'portrait' ? '写book' :
                  scene === 'daily' ? '每日' : '大图'
                )}
              />
            );
          })}
        </div>

      {/* 操作按钮组 - 浮动在右侧可视区域垂直居中 */}
      {!hideActions && (
        <div className={cn(
          "absolute right-2 xs:right-4 flex flex-col items-center gap-2 xs:gap-3.5 z-50 transition-all duration-500 ease-in-out w-12 xs:w-14", 
          "top-1/2 -translate-y-1/2", 
          "max-h-[85vh] overflow-y-auto no-scrollbar py-4 xs:py-6", 
          (isCleanMode || isMagnifierMode) && "opacity-0 pointer-events-none translate-x-10"
        )}>
          {/* 查看原图按钮 */}
          {displayItems[currentIndex]?.type === 'image' && itemRuleKeys.get(displayItems[currentIndex].id) !== 'none' && (
            <div className="flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-300">
              <Button
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  const id = displayItems[currentIndex].id;
                  setItemRuleKeys(prev => new Map(prev).set(id, 'none'));
                }}
                className="w-10 h-10 xs:w-12 xs:h-12 rounded-full shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 backdrop-blur-sm border-2 border-white/20"
              >
                <Scan className="w-5 h-5 xs:w-6 xs:h-6" />
              </Button>

            </div>
          )}

          {/* 状态指示器/标签 */}
          <div className="flex flex-col items-center gap-0.5 mb-0.5">
            {displayItems[currentIndex]?.type === 'video' ? (
              <div className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-[10px] font-black border border-primary/30 flex items-center gap-1">
                <PlayCircle className="w-3 h-3" /> VIDEO
              </div>
            ) : (
              <div className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[10px] font-black border border-blue-500/30 flex items-center gap-1">
                <Scan className="w-3 h-3" /> IMAGE
              </div>
            )}
          </div>
          {/* 撤销不喜欢按钮 - 移动到最上方，减少误操作 */}
          {lastDislikedId && (
            <div className={cn(
              "flex flex-col items-center gap-0.5 animate-in slide-in-from-right-4 duration-300 w-full"
            )}>
              <Button
                size="icon"
                onClick={(e) => { e.stopPropagation(); handleUndoDislike(); }}
                disabled={isMagnifierMode}
                className="w-10 h-10 xs:w-12 xs:h-12 rounded-full shadow-xl bg-white text-black hover:bg-white/90 transition-all duration-300 disabled:opacity-30"
              >
                <RotateCcw className="w-4 h-4 xs:w-5 xs:h-5" />
              </Button>
              <span className="text-[9px] text-white/80 font-bold whitespace-nowrap">撤销</span>
            </div>
          )}

          {/* 收藏按钮 */}
          <div className={cn(
            "flex flex-col items-center gap-0.5 transition-all duration-300 w-full"
          )}>
            <Button
              size="icon"
              disabled={isMagnifierMode}
              className={cn(
                "w-10 h-10 xs:w-11 xs:h-11 rounded-full shadow-xl transition-all duration-300 disabled:opacity-30",
                isFavorite 
                  ? "bg-red-500 hover:bg-red-600 text-white scale-105" 
                  : "bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
              )}
              onClick={handleToggleFavorite}
            >
              <Heart className={cn("w-4 h-4 xs:w-5 xs:h-5", isFavorite && "fill-current")} />
            </Button>
            <span className="text-[9px] text-white/80 font-bold whitespace-nowrap">{isFavorite ? '已收藏' : '收藏'}</span>
          </div>


          {/* 保存/下载按钮 */}
          <div className={cn(
            "flex flex-col items-center gap-0.5 transition-all duration-300 w-full"
          )}>
            <Button
              size="icon"
              disabled={isMagnifierMode}
              className={cn(
                "w-11 h-11 xs:w-12 xs:h-12 rounded-full shadow-xl transition-all duration-300 disabled:opacity-30",
                "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              )}
              onClick={(e) => { 
                e.stopPropagation(); 
                handleSaveToPhone();
              }}
            >
              <Download className="w-5 h-5 xs:w-6 xs:h-6" />
            </Button>
            <span className="text-[9px] xs:text-[10px] text-white/90 font-black drop-shadow-md whitespace-nowrap">保存手机</span>
          </div>

          {/* 不喜欢按钮 */}
          <div className={cn(
            "flex flex-col items-center gap-0.5 transition-all duration-300 w-full"
          )}>
            <Button
              size="icon"
              disabled={isMagnifierMode}
              className="w-10 h-10 xs:w-11 xs:h-11 rounded-full shadow-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all duration-300 disabled:opacity-30"
              onClick={(e) => { e.stopPropagation(); handleDislike(); }}
            >
              <ThumbsDown className="w-4 h-4 xs:w-5 xs:h-5" />
            </Button>
            <span className="text-[9px] text-white/80 font-bold whitespace-nowrap">不喜欢</span>
          </div>

          {/* 退出细节模式按钮及设置 */}
          {isMagnifierMode && (
            <div className={cn(
              "flex flex-col items-center gap-3 animate-in slide-in-from-right-4 duration-300"
            )}>
              <div className="flex flex-col gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl mb-1">
                {/* 缩放模式切换 */}
                <div className="flex flex-col gap-1">
                  {[
                    { id: 'magnifier', icon: Search },
                    { id: 'pinch', icon: Zap }
                  ].map((m) => (
                    <Button
                      key={m.id}
                      variant={zoomMode === m.id ? "default" : "ghost"}
                      size="icon"
                      className={cn(
                        "w-8 h-8 rounded-xl transition-all",
                        zoomMode === m.id ? "bg-primary text-white" : "text-white/40 hover:text-white"
                      )}
                      onClick={(e) => { e.stopPropagation(); setZoomMode(m.id as any); }}
                    >
                      <m.icon className="w-4 h-4" />
                    </Button>
                  ))}
                </div>

                <div className="w-full h-px bg-white/10 my-1" />

                {/* 倍率切换 - 仅在放大镜模式下显示 */}
                {zoomMode === 'magnifier' && (
                  <div className="flex flex-col gap-2">
                    {[3, 6].map((lvl) => (
                      <Button
                        key={lvl}
                        variant={magnifyLevel === lvl ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "rounded-xl h-8 w-8 text-[10px] font-bold p-0 transition-all",
                          magnifyLevel === lvl ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" : "text-white/40 hover:text-white"
                        )}
                        onClick={(e) => { e.stopPropagation(); setMagnifyLevel(lvl); }}
                      >
                        {lvl}x
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-0.5">
                <Button
                  size="icon"
                  className="w-11 h-11 rounded-full shadow-xl bg-primary text-white scale-110 shadow-lg shadow-primary/30"
                  onClick={(e) => { e.stopPropagation(); setIsMagnifierMode(false); }}
                >
                  <X className="w-5 h-5" />
                </Button>
                <span className="text-[9px] text-primary font-bold">退出细节</span>
              </div>
            </div>
          )}

          {/* 清屏按钮 */}
          <div className="flex flex-col items-center gap-0.5">
            <Button
              size="icon"
              className={cn(
                "w-11 h-11 rounded-full shadow-xl transition-all duration-300",
                isCleanMode 
                  ? "bg-primary text-white scale-105" 
                  : "bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm"
              )}
              onClick={(e) => { e.stopPropagation(); setIsCleanMode(!isCleanMode); }}
            >
              {isCleanMode ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </Button>
            <span className="text-[9px] text-white/80 font-bold">{isCleanMode ? '恢复' : '清屏'}</span>
          </div>

          {/* 静音按钮 - 仅在视频模式显示，且始终可见(除非全屏) */}
          {displayItems[currentIndex]?.type === 'video' && (
            <div className="flex flex-col items-center gap-0.5">
              <Button
                size="icon"
                className="w-11 h-11 rounded-full shadow-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all duration-300"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  localStorage.setItem('video_muted', String(nextMuted));
                }}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
              <span className="text-[9px] text-white/80 font-bold">{isMuted ? '静音' : '声音'}</span>
            </div>
          )}


          {/* 更多功能按钮 (移除了 {user &&} 限制) */}
          <div className={cn(
            "flex flex-col items-center gap-0.5 transition-all duration-300"
          )}>
            <DropdownMenu modal={false} open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "w-11 h-11 rounded-full shadow-xl backdrop-blur-sm border transition-all duration-300",
                    profile?.role === 'admin' 
                      ? "bg-primary/20 hover:bg-primary/40 text-primary border-primary/30" 
                      : "bg-black/40 hover:bg-black/60 text-white border-white/10"
                  )}
                >
                  {profile?.role === 'admin' ? <Settings className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-slate-900/95 backdrop-blur-xl border-white/10 p-2 text-white z-[120]">
                 {/* 自动播放设置 */}
                 <div className="px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">自动播放</span>
                    </div>
                    <Switch
                      checked={isAutoPlay}
                      onCheckedChange={(checked) => {
                        setIsAutoPlay(checked);
                      }}
                    />
                  </div>
                  {isAutoPlay && (
                    <div className="flex gap-1.5 p-1 bg-white/5 rounded-lg">
                      {[3000, 5000, 7000].map((t) => (
                        <Button
                          key={t}
                          variant={autoPlayInterval === t ? "default" : "ghost"}
                          size="sm"
                          className="flex-1 h-7 text-[10px] font-bold rounded-md"
                          onClick={() => {
                            setAutoPlayInterval(t);
                            localStorage.setItem('media_auto_play_interval', String(t));
                          }}
                        >
                          {t/1000}s
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <DropdownMenuSeparator className="bg-white/10" />

                {/* 细节放大 (如果是图片) */}
                {displayItems[currentIndex]?.type === 'image' && (
                  <DropdownMenuItem 
                    className="gap-3 py-2.5 px-3 rounded-xl focus:bg-white/10 cursor-pointer transition-colors"
                    onSelect={(e) => e.preventDefault()}
                    onClick={() => setIsMagnifierMode(!isMagnifierMode)}
                  >
                    <div className="flex items-center justify-between w-full pointer-events-none">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">细节放大</span>
                      </div>
                      <Switch checked={isMagnifierMode} />
                    </div>
                  </DropdownMenuItem>
                )}

                {/* 静音控制 */}
                <DropdownMenuItem 
                  className="gap-3 py-2.5 px-3 rounded-xl focus:bg-white/10 cursor-pointer transition-colors"
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => setIsMuted(!isMuted)}
                >
                  <div className="flex items-center justify-between w-full pointer-events-none">
                    <div className="flex items-center gap-2">
                      {isMuted ? <VolumeX className="w-4 h-4 text-primary" /> : <Volume2 className="w-4 h-4 text-primary" />}
                      <span className="text-sm font-medium">静音模式</span>
                    </div>
                    <Switch checked={isMuted} />
                  </div>
                </DropdownMenuItem>

                {/* 综合处理模式 */}
                {displayItems[currentIndex]?.type === 'image' && (
                  <div className="space-y-1 py-1 mt-1 border-t border-white/5">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      综合处理模式
                    </div>
                    <div className="grid grid-cols-2 gap-1 px-2">
                      <Button
                        variant={itemRuleKeys.get(displayItems[currentIndex].id) === '大图' ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "rounded-lg h-8 text-[10px] font-bold text-white",
                          itemRuleKeys.get(displayItems[currentIndex].id) === '大图' ? "bg-primary" : "hover:bg-white/10"
                        )}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const id = displayItems[currentIndex].id;
                          setItemRuleKeys(prev => new Map(prev).set(id, '大图'));
                        }}
                      >
                        大图预览
                      </Button>
                      <Button
                        variant={itemRuleKeys.get(displayItems[currentIndex].id) === 'douyin' ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "rounded-lg h-8 text-[10px] font-bold text-white",
                          itemRuleKeys.get(displayItems[currentIndex].id) === 'douyin' ? "bg-primary" : "hover:bg-white/10"
                        )}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const id = displayItems[currentIndex].id;
                          setItemRuleKeys(prev => new Map(prev).set(id, 'douyin'));
                        }}
                      >
                        抖音模式
                      </Button>
                      <Button
                        variant={!itemRuleKeys.get(displayItems[currentIndex].id) || itemRuleKeys.get(displayItems[currentIndex].id) === '大图' ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "rounded-lg h-8 text-[10px] font-bold text-white",
                          (!itemRuleKeys.get(displayItems[currentIndex].id) || itemRuleKeys.get(displayItems[currentIndex].id) === '大图') ? "bg-primary" : "hover:bg-white/10"
                        )}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const id = displayItems[currentIndex].id;
                          setItemRuleKeys(prev => new Map(prev).set(id, '大图'));
                        }}
                      >
                        标准模式
                      </Button>
                      <Button
                        variant={itemRuleKeys.get(displayItems[currentIndex].id) === 'none' ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "rounded-lg h-8 text-[10px] font-bold text-white",
                          itemRuleKeys.get(displayItems[currentIndex].id) === 'none' ? "bg-primary" : "hover:bg-white/10"
                        )}
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          const id = displayItems[currentIndex].id;
                          setItemRuleKeys(prev => new Map(prev).set(id, 'none'));
                        }}
                      >
                        原图直连
                      </Button>
                    </div>
                  </div>
                )}

                <DropdownMenuSeparator className="bg-white/10" />

                {/* 举报 (仅限已登录用户) */}
                {user && (
                  <DropdownMenuItem 
                    onClick={() => { setIsReportOpen(true); }} 
                    className="gap-3 py-2.5 px-3 rounded-xl focus:bg-white/10 text-red-400 cursor-pointer transition-colors"
                  >
                    <ShieldAlert className="w-4 h-4" /> 
                    <span className="text-sm font-medium">举报违规内容</span>
                  </DropdownMenuItem>
                )}

                {/* 管理员功能 */}
                {profile?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator className="bg-white/10 my-1" />
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      管理员操作
                    </div>
                    <DropdownMenuItem 
                      onClick={() => { handleAdminAction('edit'); }} 
                      className="gap-3 py-2 px-3 rounded-xl focus:bg-primary/10 text-primary cursor-pointer text-xs transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> 编辑作品信息
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => { handleAdminAction('heat_up'); }} 
                      className="gap-3 py-2 px-3 rounded-xl focus:bg-orange-400/10 text-orange-400 cursor-pointer text-xs transition-colors"
                    >
                      <Flame className="w-3.5 h-3.5" /> 提升作品热度
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => { handleAdminAction('heat_down'); }} 
                      className="gap-3 py-2 px-3 rounded-xl focus:bg-blue-400/10 text-blue-400 cursor-pointer text-xs transition-colors"
                    >
                      <TrendingDown className="w-3.5 h-3.5" /> 降低作品热度
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => { handleAdminAction('toggle_recommend'); }} 
                      className="gap-3 py-2 px-3 rounded-xl focus:bg-yellow-400/10 text-yellow-400 cursor-pointer text-xs transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> {displayItems[currentIndex]?.is_recommended ? '取消推荐' : '设为推荐'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => { handleAdminAction('toggle_hide'); }} 
                      className="gap-3 py-2 px-3 rounded-xl focus:bg-slate-400/10 text-slate-400 cursor-pointer text-xs transition-colors"
                    >
                      {displayItems[currentIndex]?.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} {displayItems[currentIndex]?.is_hidden ? '显示作品' : '取消显示'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10 my-1" />
                    <DropdownMenuItem 
                      onClick={() => { handleAdminAction('archive'); }} 
                      className="gap-3 py-2 px-3 rounded-xl focus:bg-yellow-400/10 text-yellow-400 cursor-pointer text-xs transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> 下架作品
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => { handleAdminAction('delete'); }} 
                      className="gap-3 py-2 px-3 rounded-xl focus:bg-red-500/10 text-red-500 cursor-pointer text-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 删除作品
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className={cn(
              "text-[9px] font-black whitespace-nowrap",
              profile?.role === 'admin' ? "text-primary" : "text-white/80"
            )}>
              {profile?.role === 'admin' ? '管理' : '更多'}
            </span>
          </div>

          {/* 下一个 */}
          {emblaApi?.canScrollNext() && (
            <div className="flex flex-col items-center gap-0.5 w-full">
              <Button
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  emblaApi.scrollNext();
                }}
                className="w-11 h-11 xs:w-12 xs:h-12 rounded-full shadow-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border border-white/10"
              >
                <ChevronDown className="w-5 h-5 xs:w-6 xs:h-6" />
              </Button>
              <span className="text-[9px] text-white/80 font-bold whitespace-nowrap">下一个</span>
            </div>
          )}

          {/* 自动播放中指示器 */}
          {isAutoPlay && (
            <div className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 w-full"
            )}>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); setIsAutoPlay(false); }}
                className="w-11 h-11 xs:w-12 xs:h-12 rounded-full shadow-xl bg-primary/20 hover:bg-primary/30 text-primary backdrop-blur-md border border-primary/30 animate-pulse"
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
              </Button>
              <span className="text-[9px] text-primary font-bold whitespace-nowrap">播放中</span>
            </div>
          )}
        </div>
      )}

          {/* 高清资源获取进度提示 - 独立于按钮组，防止布局跳动 */}
          {loadProgress > 0 && loadProgress < 100 && !loadError && (
            <div className={cn(
              "absolute right-2 bottom-2 z-50 flex flex-col items-center gap-1 transition-all duration-300 animate-in fade-in zoom-in",
              (isCleanMode || isMagnifierMode) && "opacity-0 pointer-events-none"
            )}>
              <div className="relative flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="absolute text-[6px] text-white font-black">{loadProgress}%</span>
              </div>
              <div className="flex flex-col items-center text-center">
                <span className="text-[7px] text-white font-bold whitespace-nowrap">获取高清中</span>
                <span className="text-[6px] text-white/40 font-bold animate-pulse">
                  {loadProgress < 30 ? '初始化...' : loadProgress < 60 ? '下载中...' : '拼合中...'}
                </span>
              </div>
            </div>
          )}

      {/* 标题 - 左下角，与抖音模式对齐 - 已恢复显示以支持标签筛选 */}
      {!isCleanMode && (
        <div className={cn(
          "absolute left-4 z-50 flex flex-col gap-1 max-w-[80%] transition-all duration-500",
          hasTabBar ? "bottom-24" : "bottom-6",
          isCleanMode ? "opacity-0 translate-y-8 pointer-events-none" : "opacity-100 translate-y-0"
        )}>
        {displayItems[currentIndex]?.title && (
          <h3 className="text-white font-black text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] px-1 line-clamp-2 leading-tight tracking-tight pointer-events-none mb-0.5">
            {cleanTitle(displayItems[currentIndex].title || '')}
          </h3>
        )}

        {displayItems[currentIndex]?.description && displayItems[currentIndex]?.description !== displayItems[currentIndex]?.title && (
          <p className="text-white/90 text-sm drop-shadow-md px-1 mt-0.5 line-clamp-3 leading-relaxed whitespace-pre-wrap pointer-events-none">
            {displayItems[currentIndex].description || ''}
          </p>
        )}

        {/* 发布时间 - YYYY-MM-DD HH:mm */}
        {displayItems[currentIndex]?.created_at && (
          <div className="text-white/80 text-[11px] font-bold drop-shadow-md px-1 mt-0.5 pointer-events-none">
            {new Date(displayItems[currentIndex].created_at).toLocaleString('zh-CN', {
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
        {displayItems[currentIndex]?.media_tags && displayItems[currentIndex].media_tags!.filter(mt => mt.tags && (profile?.role === 'admin' || !mt.tags.name.includes('不入'))).length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1 mt-1">
            {displayItems[currentIndex].media_tags?.filter(mt => mt.tags && (profile?.role === 'admin' || !mt.tags.name.includes('不入'))).map((mt, i) => (
              <span 
                key={`${mt.tag_id}-${i}`} 
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onTagClick) {
                    onTagClick(mt.tag_id, e);
                    handleClose(); // 点击标签后关闭预览并返回首页筛选
                  }
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
      </div>
      {/* 举报对话框 */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="rounded-3xl max-w-sm bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">举报违规内容</DialogTitle>
            <DialogDescription className="text-white/60">
              请描述该内容违反了哪些规定，我们将尽快核实并处理。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-white/80">举报原因</Label>
              <Textarea 
                placeholder="例如：色情低俗、政治敏感、版权侵权等..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="bg-white/5 border-white/10 rounded-2xl min-h-[120px] focus-visible:ring-red-500"
              />
            </div>
          </div>
          <DialogFooter className="flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsReportOpen(false)} className="flex-1 rounded-2xl hover:bg-white/10 text-white">取消</Button>
            <Button 
              onClick={handleReport} 
              disabled={reporting || !reportReason.trim()}
              className="flex-1 rounded-2xl bg-red-600 hover:bg-red-700 font-bold"
            >
              {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : '提交举报'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 左滑不喜欢引导提示 */}
      {showGuide && !isCleanMode && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[60] flex flex-col items-center gap-2 animate-[fade-out_4s_ease-out_forwards]">
          <div className="flex items-center gap-4 bg-black/60 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white/10 shadow-2xl">
             <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-bounce-horizontal">
               <ArrowLeft className="w-6 h-6 text-white" />
             </div>
             <div className="flex flex-col">
               <span className="text-white font-black text-sm">左滑不喜欢</span>
               <span className="text-white/40 text-[10px] uppercase font-bold tracking-tighter">Swipe left to skip</span>
             </div>
          </div>
        </div>
      )}
      {/* 底部功能栏 - 与抖音模式一致，隐藏分页指示器 */}
      {!isCleanMode && false && (
        <div className={cn(
          "absolute left-0 right-0 flex items-center justify-center gap-4 px-6 z-50 transition-all duration-500",
          hasTabBar ? "bottom-[calc(1.5rem+5rem)]" : "bottom-6",
          "opacity-100 translate-y-0"
        )}>
          <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white/60 text-[10px] font-bold tracking-widest pointer-events-none border border-white/5">
            {currentIndex + 1} <span className="text-white/20 px-1">/</span> {displayItems.length}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-out {
          0% { opacity: 0; transform: translate(-50%, -40%); }
          10% { opacity: 1; transform: translate(-50%, -50%); }
          80% { opacity: 1; transform: translate(-50%, -50%); }
          100% { opacity: 0; transform: translate(-50%, -60%); }
        }
        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
        }
        .animate-bounce-horizontal {
          animation: bounce-horizontal 1s infinite ease-in-out;
        }
      `}} />
      {/* 下载确认弹窗 */}
      <Dialog open={isDownloadOpen} onOpenChange={setIsDownloadOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Scan className="w-5 h-5 text-primary" />
              下载确认
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              您当前正在下载单张壁纸，该操作将消耗您的账户积分。
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center justify-center gap-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex flex-col items-center">
              <span className="text-zinc-400 text-sm">本次下载需消耗</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-primary">{config?.wallpaper_price || 0}</span>
                <span className="text-sm font-medium text-primary/80">积分</span>
              </div>
            </div>

            <div className="h-[1px] w-full bg-white/5" />

            <div className="flex flex-col items-center">
              <span className="text-zinc-400 text-sm">您的当前余额</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-white">{profile?.points || 0}</span>
                <span className="text-xs font-medium text-zinc-500">积分</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button 
              variant="ghost" 
              className="flex-1 border-white/10 hover:bg-white/5 hover:text-white"
              onClick={() => setIsDownloadOpen(false)}
            >
              取消
            </Button>
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold"
              onClick={confirmDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                '立即下载'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* 相关推荐面板 */}
      <Sheet open={isRelatedOpen} onOpenChange={setIsRelatedOpen}>
        <SheetContent side="bottom" className="h-[40vh] bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white rounded-t-[2.5rem] p-0 overflow-hidden">
          <SheetHeader className="p-4 pb-2 border-b border-white/5">
            <SheetTitle className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              发现更多相似作品
            </SheetTitle>
          </SheetHeader>
          <div className="py-6">
            <RelatedContent 
              mediaId={displayItems[currentIndex]?.id} 
              onItemClick={(item) => {
                const index = displayItems.findIndex(i => i.id === item.id);
                if (index !== -1) {
                  emblaApi?.scrollTo(index);
                } else {
                  // 如果不在当前列表中，可能需要跳转或添加
                  toast.info('查看该作品');
                  // 可以在这里处理跨列表跳转逻辑
                }
                setIsRelatedOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
export default MediaPreview;
