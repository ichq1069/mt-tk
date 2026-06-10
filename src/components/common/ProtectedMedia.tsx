import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, Camera, RefreshCw, ShieldCheck, ImageOff, Image as ImageIcon } from 'lucide-react';
import { getProtectedUrl, getImageUrl, getZoneramaProxyUrl, optimizeXiaohongshuUrl, getOptimizedImageUrl, applyImageProcessing } from '@/lib/media';
import { useConfig } from '@/contexts/ConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { debugLogEmitter } from './DebugLogOverlay';


const SlicedImage = ({ 
  urls, 
  alt, 
  className, 
  mode,
  onLoad, 
  onError 
}: { 
  urls: string[], 
  alt?: string, 
  className?: string, 
  mode: 'blob_slice' | 'canvas_slice' | 'canvas',
  onLoad?: (dimensions?: { width: number, height: number }) => void, 
  onError?: () => void 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 提取外部传入的 object-fit 类名
  const objectFitClass = className?.includes('object-cover') ? 'object-cover' : 'object-contain';
  
  useEffect(() => {
    if (urls.length === 0) return;
    let active = true;
    if (urls.length === 1) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = img.naturalWidth;
        const h = img.naturalHeight;
        canvas.width = w;
        canvas.height = h;

        if (mode === 'canvas') {
          // 完整绘制
          ctx.drawImage(img, 0, 0, w, h);
        } else {
          // 在单个 Canvas 内部进行分片绘制，消除 DOM 间隙
          const leftWidth = Math.floor(w / 2);
          const rightWidth = w - leftWidth;
          const topHeight = Math.floor(h / 2);
          const bottomHeight = h - topHeight;

          // 绘制左上
          ctx.drawImage(img, 0, 0, leftWidth, topHeight, 0, 0, leftWidth, topHeight);
          // 绘制右上
          ctx.drawImage(img, leftWidth, 0, rightWidth, topHeight, leftWidth, 0, rightWidth, topHeight);
          // 绘制左下
          ctx.drawImage(img, 0, topHeight, leftWidth, bottomHeight, 0, topHeight, leftWidth, bottomHeight);
          // 绘制右下
          ctx.drawImage(img, leftWidth, topHeight, rightWidth, bottomHeight, leftWidth, topHeight, rightWidth, bottomHeight);
        }
        onLoad?.();
      };
      img.onerror = () => { if (active) onError?.(); };
      img.src = urls[0];
      return () => { active = false; };
    }
    return () => { active = false; };
  }, [urls, mode, onLoad, onError]);

  return (
    <div 
      ref={containerRef}
      className={cn(className, "relative overflow-hidden select-none flex items-center justify-center")}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas 
        ref={canvasRef}
        aria-label={alt}
        role="img"
        className={cn("w-full h-full pointer-events-none", objectFitClass)}
        style={{ display: 'block' }}
      />
    </div>
  );
};

import { Badge } from '@/components/ui/badge';

// 全局静态缓存，用于追踪本会话已成功加载的资源
const globalLoadedSrcs = new Set<string>();

export const isMediaCached = (src: string | null | undefined) => {
  if (!src) return false;
  return globalLoadedSrcs.has(src);
};

interface ProtectedMediaProps {
  src: string | null | undefined;
  type: 'image' | 'video';
  alt?: string;
  className?: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  controls?: boolean;
  useWebp?: boolean; 
  version?: string;
  thumbnailSrc?: string | null;
  thumbnailRuleKey?: string;
  isThumbnail?: boolean;
  forceMode?: 'original' | 'blob' | 'blob_slice' | 'canvas_slice' | 'canvas';
  onLoad?: (dimensions?: { width: number, height: number }) => void;
  onUrlResolved?: (url: string) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  showLoadingTooltip?: boolean;
  priority?: boolean;
  fetchpriority?: 'high' | 'low' | 'auto';
  authToken?: string | null;
  albumId?: string | null;
  adminLabelClassName?: string;
  hideAdminLabel?: boolean;
  ruleKey?: string;
  onClick?: () => void;
}

export const ProtectedMedia = forwardRef<HTMLImageElement | HTMLVideoElement, ProtectedMediaProps>(({ 
  src, type, alt, className, poster, autoPlay, muted, loop, playsInline, controls, useWebp = true, version, thumbnailSrc, thumbnailRuleKey, isThumbnail = false, forceMode, onLoad, onUrlResolved, onProgress, onError: onErrorProp, showLoadingTooltip = true, priority = false, fetchpriority = 'auto', authToken, albumId, adminLabelClassName, hideAdminLabel, ruleKey, onClick
}, ref) => {
  const { config, securityConfig, loading: configLoading } = useConfig();
  const { isAdmin } = useAuth();
  const [protectedUrl, setProtectedUrl] = useState<string | null>(null);

  const onUrlResolvedRef = useRef(onUrlResolved);
  useEffect(() => { onUrlResolvedRef.current = onUrlResolved; }, [onUrlResolved]);

  const lastResolvedUrlRef = useRef<string | null>(null);
  // 存储当前正在使用的标准化 src，供 onError 降级使用
  const normalizedSrcRef = useRef<string | null>(null);

  // 当 URL 解析完成时回调
  useEffect(() => {
    if (protectedUrl && protectedUrl !== lastResolvedUrlRef.current) {
      lastResolvedUrlRef.current = protectedUrl;
      onUrlResolvedRef.current?.(protectedUrl);
    }
  }, [protectedUrl]);
  const [protectedThumbnailUrl, setProtectedThumbnailUrl] = useState<string | null>(null);
  const [transitionUrl, setTransitionUrl] = useState<string | null>(null);
  const [sliceUrls, setSliceUrls] = useState<string[]>([]);
  const [currentMode, setCurrentMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (error && onErrorProp) {
      onErrorProp(error);
    }
  }, [error, onErrorProp]);

  // 同步检查全局缓存，如果已加载过，则初始状态即为已加载
  const [isLoaded, setIsLoaded] = useState(() => src ? globalLoadedSrcs.has(src) : false);
  const [isThumbnailLoaded, setIsThumbnailLoaded] = useState(() => (thumbnailSrc ? globalLoadedSrcs.has(thumbnailSrc) : false) || (src ? globalLoadedSrcs.has(src) : false));
  const [isTransitionLoaded, setIsTransitionLoaded] = useState(() => (src ? globalLoadedSrcs.has(`t_${src}`) : false) || (src ? globalLoadedSrcs.has(src) : false));
  
  const [retryCount, setRetryCount] = useState(0);
  const [loadStartTime, setLoadStartTime] = useState(0);
  const loadStartTimeRef = useRef(0);
  
  // 性能调试数据
  const [perfData, setPerfData] = useState<{
    transition?: number;
    thumbnail?: number;
    original?: number;
  }>({});

  const finalUseWebp = useWebp && config?.enable_blob !== false;

  const [debugInfo, setDebugInfo] = useState<{ isProxied: boolean, isProcessed: boolean }>({ isProxied: false, isProcessed: false });
  
  useEffect(() => {
    let active = true;
    if (!src) return;
    
    // 解析 URL 特性的辅助函数
    const detectFeatures = (url: string) => {
      const isProc = config?.image_processing_url ? url.includes(config.image_processing_url.split('?')[0]) : false;
      const isProx = (config?.image_proxy_url ? url.includes(config.image_proxy_url.split('?')[0]) : false) || url.includes('/image-proxy');
      setDebugInfo({ isProcessed: isProc, isProxied: isProx });
    };

    // 前端托底：对所有可识别平台链接做统一转换，即使数据库中存的是旧格式
    const normalizedSrc = optimizeXiaohongshuUrl(src);
    normalizedSrcRef.current = normalizedSrc;
    
    const startTime = Date.now();
    setLoadStartTime(startTime);
    loadStartTimeRef.current = startTime;
    
    // 重置加载状态，确保每次切换图片都能重新显示缩略图层并等待原图加载
    setIsLoaded(false);
    setIsThumbnailLoaded(false);
    setIsTransitionLoaded(false);
    setTransitionUrl(null);
    setProtectedThumbnailUrl(null);
    setError(null);
    setPerfData({}); // 重置性能数据
    
    // 全局 Zonerama 代理处理
    const zoneramaAuth = authToken || (config as any)?.zonerama_auth; // 优先使用属性传入的 auth，其次全局
    const thumbOptions = isThumbnail ? { 
      width: config?.thumbnail_width || 400, 
      quality: config?.thumbnail_quality || 60 
    } : {};
    
    const finalSrcRaw = getZoneramaProxyUrl(normalizedSrc, zoneramaAuth, albumId, thumbOptions);

    if ((config?.enable_progressive_loading !== false) && !isThumbnail) {
      // 1. 优先生成过渡图（超低分辨率，几乎瞬间加载）
      const tUrl = applyImageProcessing(normalizedSrc, config || null, '过渡');
      setTransitionUrl(tUrl);

      // 2. 处理缩略图
      if (thumbnailSrc) {
        // 如果指定了 thumbnailRuleKey（如 '首瀑'），则生成与瀑布流完全一致的 URL，命中浏览器缓存
        const finalThumbSrc = thumbnailRuleKey 
          ? applyImageProcessing(thumbnailSrc, config || null, thumbnailRuleKey)
          : thumbnailSrc;
        
        setProtectedThumbnailUrl(finalThumbSrc); 
        // 异步尝试转为加密链接，提升安全性
        getProtectedUrl(finalThumbSrc, finalUseWebp, { quality: 30 }).then(url => { if (active) setProtectedThumbnailUrl(url); });
      }
    }
    if (!configLoading) {
      const loadMainContent = () => {
        if (!active) return;
        const optParams: any = { 
          enableBlob: config?.enable_blob !== false, 
          enableCache: config?.enable_image_cache === true, 
          version, 
          priority,
          config: config || null
        };
        if (isThumbnail) {
          optParams.width = config?.thumbnail_width || 300;
          optParams.quality = config?.thumbnail_quality ?? 40;
        }
        const mode = forceMode || securityConfig?.mode || (config?.enable_blob !== false ? 'blob' : 'original');
        // HLS 视频（m3u8）无法通过 Blob 加载，必须使用 original 模式
        const isHLS = src.toLowerCase().includes('.m3u8');
        const effectiveMode = isHLS ? 'original' : mode;
        setCurrentMode(effectiveMode);
        
        if ((effectiveMode === 'blob_slice' || effectiveMode === 'canvas_slice') && type === 'image') {
          const finalSrc = getImageUrl(finalSrcRaw, isThumbnail, config, albumId, ruleKey);
          detectFeatures(finalSrc);
          if (effectiveMode === 'blob_slice') {
            getProtectedUrl(finalSrc, finalUseWebp, optParams).then((url) => { 
              if (active) { 
                setSliceUrls([url]); 
                setProtectedUrl(url); 
              } 
            }).catch(() => { if (active) setProtectedUrl(finalSrcRaw || null); });
          } else {
            setSliceUrls([finalSrc]); 
            setProtectedUrl(finalSrc); 
          }
        } else if (effectiveMode === 'canvas' && type === 'image') {
          const finalSrc = getImageUrl(finalSrcRaw, isThumbnail, config, albumId, ruleKey);
          detectFeatures(finalSrc);
          setSliceUrls([finalSrc]); 
          setProtectedUrl(finalSrc);
        } else if (effectiveMode === 'original') {
          const finalSrc = getImageUrl(finalSrcRaw, isThumbnail, config, albumId, ruleKey);
          detectFeatures(finalSrc);
          setProtectedUrl(finalSrc); 
          setSliceUrls([]);
        } else {
          // blob 模式
          const finalSrc = getImageUrl(finalSrcRaw, isThumbnail, config, albumId, ruleKey);
          detectFeatures(finalSrc);
          setSliceUrls([]);
          getProtectedUrl(finalSrc, finalUseWebp, optParams).then((url) => { if (active) setProtectedUrl(url); }).catch(() => { if (active) setProtectedUrl(finalSrc || null); });
        }
      };

      if (priority || isThumbnail) {
        loadMainContent();
      } else {
        // 非优先级且非缩略图的资源（即大图/详情图），延迟加载以确保首屏/可视区域资源优先
        const delay = (window as any)._is_initial_load !== false ? 800 : 300;
        const timer = setTimeout(loadMainContent, delay);
        (window as any)._is_initial_load = false;
        return () => clearTimeout(timer);
      }
    }
    return () => { active = false; };
  }, [src, isThumbnail, finalUseWebp, type, forceMode, securityConfig, config, configLoading, retryCount, version, ruleKey]);

  const [fakeProgress, setFakeProgress] = useState(0);

  // 进度同步
  useEffect(() => {
    onProgress?.(fakeProgress);
  }, [fakeProgress, onProgress]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (!isLoaded && !isThumbnail && src) {
      setFakeProgress(1);
      timer = setInterval(() => {
        setFakeProgress(prev => {
          if (prev >= 98) return 98;
          // 越往后越慢
          const increment = prev < 50 ? 5 : prev < 80 ? 2 : 1;
          return prev + increment;
        });
      }, 500);
    } else if (isLoaded) {
      setFakeProgress(100);
    } else {
      setFakeProgress(0);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isLoaded, isThumbnail, src]);

  const handleRetry = () => setRetryCount(prev => prev + 1);

  const renderLabel = () => {
    if (!isAdmin || (!isLoaded && type === 'image') || !currentMode || hideAdminLabel) return null;
    
    // 使用解析阶段预存的特性标识
    const { isProcessed, isProxied } = debugInfo;
    
    // 获取加密模式显示名称
    const getModeName = (mode: string | null) => {
      switch (mode) {
        case 'blob_slice': return '分片';
        case 'canvas_slice': return '安全';
        case 'blob': return '加密';
        case 'canvas': return '引擎';
        case 'original': return '直连';
        default: return '受限';
      }
    };

    // 缩略图模式下显示更精简的版本,避免遮挡
    if (isThumbnail) {
      return (
        <div className={cn(
          "absolute top-1 left-1 right-auto bottom-auto z-40 flex flex-col items-start gap-0.5",
          adminLabelClassName
        )}>
          {/* 缩略图加密模式 (独立显示) */}
          <div className="px-1 py-0.5 rounded-sm bg-indigo-600/70 text-white text-[7px] font-black leading-none shadow-md backdrop-blur-[2px] ring-1 ring-white/10">
            {getModeName(currentMode)}
          </div>

          {/* 缩略图模式性能数据 */}
          {(perfData.transition !== undefined || perfData.thumbnail !== undefined || perfData.original !== undefined) && (
            <div className="flex items-center gap-0.5 bg-black/50 backdrop-blur-md px-1 py-0.5 rounded border border-white/10 shadow-md pointer-events-none select-none self-start">
              {perfData.transition !== undefined && (
                <span className="text-[6px] text-blue-400 font-mono font-bold leading-none">{perfData.transition}ms</span>
              )}
              {perfData.thumbnail !== undefined && (
                <span className="text-[6px] text-amber-400 font-mono font-bold leading-none">{perfData.thumbnail}ms</span>
              )}
              {perfData.original !== undefined && (
                <span className="text-[6px] text-green-400 font-mono font-bold leading-none">{perfData.original}ms</span>
              )}
            </div>
          )}
          
          <div className="flex gap-0.5 self-start">
            {isProxied && (
              <div className="px-1 py-0.5 rounded-sm bg-blue-600/70 text-white text-[7px] font-black leading-none shadow-md backdrop-blur-[2px] ring-1 ring-white/10">
                P
              </div>
            )}
            {isProcessed && (
              <div className="px-1 py-0.5 rounded-sm bg-green-600/70 text-white text-[7px] font-black leading-none shadow-md backdrop-blur-[2px] ring-1 ring-white/10 flex items-center gap-0.5">
                <span>C</span>
                {ruleKey && <span className="border-l border-white/20 pl-0.5 text-[6px] opacity-80">{ruleKey}</span>}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={cn(
        "absolute top-3 left-3 right-auto bottom-auto z-40 flex flex-col items-start gap-1.5",
        adminLabelClassName
      )}>
        {/* 加密方式标签 - 第一排 (紫蓝色背景) - 用户新增需求 */}
        <div className="bg-indigo-600/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20 shadow-lg">
          <span className="text-[9px] text-white font-black tracking-widest uppercase">{getModeName(currentMode)}模式</span>
        </div>

        {/* 性能标签 - 第二排 (黑色背景) */}
        {perfData.original !== undefined && (
          <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 shadow-lg">
            <span className="text-[10px] text-green-400 font-mono font-black">{perfData.original}ms</span>
          </div>
        )}

        {/* 规则标签 - 第三排 (绿色背景) */}
        {ruleKey && (
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded-md backdrop-blur-md border border-white/20 bg-emerald-600/80 flex items-center gap-1.5 shadow-lg">
              <div className="w-3.5 h-3.5 rounded-sm bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-[8px] text-white font-black">C</span>
              </div>
              <span className="text-[9px] text-white font-black tracking-widest uppercase whitespace-nowrap">
                {ruleKey === 'none' ? '原图' : ruleKey}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLoadingTooltip = () => {
    if (!showLoadingTooltip || isThumbnail || isLoaded || !src) return null;
    
    // 如果开启了毫秒级优化，不显示"高清资源"提示，改为"优化资源"
    const isMsOptimized = config?.ms_optimization_enabled;
    const titleText = isMsOptimized ? '正在获取优化资源' : '正在获取高清资源';
    const subtitleText = isMsOptimized 
      ? (fakeProgress < 30 ? '毫秒级优化中...' : fakeProgress < 60 ? '正在下载...' : fakeProgress < 90 ? '即将完成...' : '加载完成...')
      : (fakeProgress < 30 ? '初始化链接...' : fakeProgress < 60 ? '正在下载高清图块...' : fakeProgress < 90 ? '正在拼合资源...' : '即将加载完成...');
    
    return (
      <div className="absolute bottom-6 right-6 z-[60] px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-3 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="relative flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="absolute text-[7px] text-white font-bold">{fakeProgress}%</span>
        </div>
        <div className="flex flex-col pr-1">
          <span className="text-[10px] text-white font-black tracking-widest uppercase leading-none">{titleText}</span>
          <span className="text-[8px] text-white/50 font-bold tracking-tight leading-none mt-1 animate-pulse">
            {subtitleText}
          </span>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className={cn(className, "flex flex-col items-center justify-center bg-zinc-900/50 backdrop-blur-md gap-6 p-8 text-center rounded-3xl border border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-500")}>
        <div className="relative group">
          <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
          <div className="relative w-20 h-20 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-center backdrop-blur-sm">
             <ImageOff className="w-10 h-10 text-white/20" />
             <div className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center shadow-lg ring-4 ring-black">
                <AlertCircle className="w-3.5 h-3.5 text-white" />
             </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-base font-black text-white/90 tracking-tight">加载资源失败</h3>
          <p className="text-[11px] text-white/40 font-medium leading-relaxed max-w-[200px] mx-auto">
            系统已尝试多次降级加载，但仍无法获取资源。这可能是源站由于访问频率过高被拦截。
          </p>
          {isAdmin && (
            <div className="mt-4 p-2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-mono text-white/30 break-all text-left">
              Err: {error} <br/>
              Url: {src?.substring(0, 60)}...
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button 
            variant="default" 
            size="sm" 
            className="h-10 text-[12px] font-bold gap-2 px-8 rounded-xl bg-white text-black hover:bg-white/90 transition-all active:scale-95 shadow-xl shadow-white/5" 
            onClick={handleRetry}
          >
            <RefreshCw className="w-4 h-4" />
            重试一次
          </Button>
          
          {isAdmin && src && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-10 text-[10px] font-bold gap-2 px-8 rounded-xl border-white/10 text-white/60 hover:bg-white/5 transition-all" 
              onClick={() => window.open(src, '_blank')}
            >
              <ImageIcon className="w-4 h-4" />
              打开原始链接
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div 
        className={cn("relative w-full h-full overflow-hidden flex items-center justify-center bg-muted/5", !isLoaded && isThumbnail && !className?.includes('aspect-') && "aspect-[3/4]")}
        onContextMenu={(e) => e.preventDefault()}
        onClick={onClick}
      >
        {/* 三级渐进式加载层 - 位于底层，作为过渡背景 */}
        <div 
          className={cn(
            "absolute inset-0 z-0 flex items-center justify-center transition-all duration-700 ease-in-out bg-zinc-950/20",
            isLoaded ? "opacity-0 scale-105" : "opacity-100 scale-100"
          )}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* 第一级：超低分辨率过渡图 (轮廓级) */}
          {transitionUrl && !isThumbnailLoaded && (
            <img 
              src={transitionUrl} 
              alt="transition" 
              referrerPolicy="no-referrer"
              className={cn(
                "absolute inset-0 w-full h-full object-contain pointer-events-none blur-2xl opacity-60 scale-110 transition-opacity duration-300",
                isTransitionLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => {
                if (!perfData.transition) {
                  setIsTransitionLoaded(true);
                  if (src) globalLoadedSrcs.add(`t_${src}`);
                  setPerfData(prev => ({ ...prev, transition: Date.now() - loadStartTimeRef.current }));
                }
              }}
            />
          )}

          {/* 第二级：缩略图层 (通常来自瀑布流缓存) */}
          {protectedThumbnailUrl ? (
            <img 
              src={protectedThumbnailUrl || undefined} 
              alt="thumb" 
              referrerPolicy="no-referrer"
              loading="eager"
              {...({ fetchpriority: "high" } as any)}
              className={cn(
                "w-full h-full object-contain pointer-events-none transition-all duration-700 ease-in-out", 
                !isLoaded ? "blur-[8px] scale-100 opacity-100" : "blur-0 scale-100 opacity-0"
              )} 
              onLoad={() => {
                if (!perfData.thumbnail) {
                  setIsThumbnailLoaded(true);
                  if (thumbnailSrc) globalLoadedSrcs.add(thumbnailSrc);
                  setPerfData(prev => ({ ...prev, thumbnail: Date.now() - loadStartTimeRef.current }));
                }
              }} 
            />
          ) : !transitionUrl && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/5 relative overflow-hidden">
              <Skeleton className="absolute inset-0 bg-muted/10" />
              <ImageIcon className="w-8 h-8 text-muted-foreground/10 animate-pulse relative z-10" />
            </div>
          )}
        </div>

        {/* 原图层 - 位于上层 */}
        {sliceUrls.length > 0 ? (
          <SlicedImage 
            urls={sliceUrls} 
            alt={alt} 
            mode={currentMode as any} 
            className={cn(className, "z-10 relative transition-opacity duration-300 ease-in-out", isLoaded ? "opacity-100" : "opacity-0")} 
            onLoad={() => { 
              if (!perfData.original) {
                const duration = Date.now() - loadStartTimeRef.current;
                console.log(`[ProtectedMedia] Sliced loaded in ${duration}ms`);
                setPerfData(prev => ({ ...prev, original: duration }));
                setIsLoaded(true); 
                if (src) globalLoadedSrcs.add(src);
                onLoad?.(); 
                
                debugLogEmitter.add({
                  url: protectedUrl || src || 'unknown',
                  isThumbnail: false,
                  isOriginal: true,
                  page: window.location.pathname
                });

                // 毫秒级自适应优化逻辑
                if (ruleKey === '毫秒级优化' && duration > 1000) {
                  const currentAdjustment = parseInt(localStorage.getItem('ms_opt_adjustment') || '0');
                  if (currentAdjustment < 60) { // 最大调整限度
                    localStorage.setItem('ms_opt_adjustment', (currentAdjustment + 5).toString());
                    console.log(`[ProtectedMedia] 检测到加载过慢 (${duration}ms)，已增加毫秒级优化调整值至: ${currentAdjustment + 5}`);
                  }
                }
              }
            }} 
            onError={() => { 
              console.error('[ProtectedMedia] Sliced load error');
              const base = optimizeXiaohongshuUrl(src || '');
              // 降级策略
              if (protectedUrl !== base && base) {
                setProtectedUrl(base); 
              } else if (!isThumbnail && thumbnailSrc && protectedUrl !== thumbnailSrc) {
                setProtectedUrl(thumbnailSrc);
              } else {
                setError('资源加载失败');
              }
              setSliceUrls([]); 
            }} 
          />
        ) : (
          <img 
            ref={ref as React.RefObject<HTMLImageElement>}
            src={protectedUrl || undefined} 
            alt={alt} 
            referrerPolicy="no-referrer"
            loading={priority ? "eager" : "lazy"}
            {...({ fetchpriority: fetchpriority !== 'auto' ? fetchpriority : (priority ? "high" : "low") } as any)}
            decoding="async"
            className={cn(className, "z-10 relative object-contain transition-opacity duration-500 ease-out pointer-events-none", isLoaded ? "opacity-100" : "opacity-0")}
            style={{ width: '100%', height: '100%' }}
            onLoad={() => { 
              if (!perfData.original) {
                const duration = Date.now() - loadStartTimeRef.current;
                console.log(`[ProtectedMedia] Original loaded in ${duration}ms:`, protectedUrl?.substring(0, 50));
                setPerfData(prev => ({ ...prev, original: duration }));
                setIsLoaded(true); 
                if (src) globalLoadedSrcs.add(src);

                debugLogEmitter.add({
                  url: protectedUrl || src || 'unknown',
                  isThumbnail: isThumbnail,
                  isOriginal: !isThumbnail,
                  page: window.location.pathname
                });

                // 毫秒级自适应优化逻辑
                if (ruleKey === '毫秒级优化' && duration > 1000) {
                  const currentAdjustment = parseInt(localStorage.getItem('ms_opt_adjustment') || '0');
                  if (currentAdjustment < 60) {
                    localStorage.setItem('ms_opt_adjustment', (currentAdjustment + 5).toString());
                    console.log(`[ProtectedMedia] 检测到加载过慢 (${duration}ms)，已增加毫秒级优化调整值至: ${currentAdjustment + 5}`);
                  }
                }

                // 获取图片实际尺寸并回调
                const imgEl = (ref as React.RefObject<HTMLImageElement>)?.current;
                if (imgEl && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0) {
                  onLoad?.({ width: imgEl.naturalWidth, height: imgEl.naturalHeight }); 
                } else {
                  onLoad?.();
                }
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
            onError={(e) => {
              console.error('[ProtectedMedia] Original load error:', protectedUrl?.substring(0, 50));
              
              // 降级策略流程
              const baseSrc = normalizedSrcRef.current;
              
              // 1. 第一阶段降级：如果当前 URL 是经过代理或处理的，尝试回退到原始 URL
              if (protectedUrl !== baseSrc && baseSrc) {
                console.log('[ProtectedMedia] 降级策略 A: 尝试使用原始 URL');
                setProtectedUrl(baseSrc);
                return;
              }
              
              // 2. 第二阶段降级：如果原始 URL 也失败了，且当前不是缩略图模式，尝试使用缩略图作为兜底
              if (!isThumbnail && thumbnailSrc && protectedUrl !== thumbnailSrc) {
                console.log('[ProtectedMedia] 降级策略 B: 尝试使用缩略图兜底');
                setProtectedUrl(thumbnailSrc);
                return;
              }

              // 3. 最终兜底：如果所有路径都失败，显示错误状态
              setError('资源加载失败');
            }}
          />
        )}
        
        {renderLoadingTooltip()}

        {renderLabel()}
      </div>
    );
  }

  // 同步静音状态
  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current && ref.current instanceof HTMLVideoElement) {
      ref.current.muted = !!muted;
    }
  }, [muted, ref]);

  return (
    <div className={cn("relative group overflow-hidden will-change-transform", className)} onClick={onClick}>
      <video 
        ref={ref as React.RefObject<HTMLVideoElement>} 
        src={protectedUrl || undefined} 
        poster={poster} 
        className="w-full h-full" 
        referrerPolicy="no-referrer"
        {...({ 
          autoPlay: autoPlay, 
          playsInline: playsInline, 
          controlsList: "nodownload" 
        } as any)}
        muted={muted} 
        loop={loop} 
        controls={controls} 
        preload="metadata" 
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            onLoad?.({ width: video.videoWidth, height: video.videoHeight });
          } else {
            onLoad?.();
          }
        }}
        onLoadedData={() => {
          setIsLoaded(true);
          debugLogEmitter.add({
            url: protectedUrl || src || 'unknown',
            isThumbnail: false,
            isOriginal: true,
            page: window.location.pathname
          });
        }}
        onError={() => setProtectedUrl(src || null)} 
      />
      {renderLabel()}
    </div>
  );
});

ProtectedMedia.displayName = 'ProtectedMedia';
