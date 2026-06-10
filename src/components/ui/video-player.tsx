import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Video, Loader2, ShieldCheck, AlertCircle, RefreshCw, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfig } from '@/contexts/ConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { getProtectedUrl } from '@/lib/media';
import ArtPlayer from './ArtPlayer';
import XGPlayer from './XGPlayer';
import { Button } from '@/components/ui/button';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  className?: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
  showControls?: boolean; // 新增：是否显示控制条
  showDuration?: boolean; // 新增：是否显示时长
  onLongPressSpeedChange?: (speed: number) => void; // 新增：长按倍速回调
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>; // 新增：外部视频引用
  onMutedChange?: (muted: boolean) => void; // 新增：静音状态改变回调
  onVolumeChange?: (volume: number) => void; // 新增：音量改变回调
  onEnded?: () => void; // 新增：播放结束回调
  onProgress?: (progress: number) => void; // 新增：进度回调
  mediaId?: string; // 新增：媒体ID
}

export function VideoPlayer({
  src,
  poster,
  autoPlay = true,
  muted = true,
  loop = true,
  className,
  onPlayStateChange,
  showControls: showControlsProp = true,
  showDuration = false,
  onLongPressSpeedChange,
  videoRef: externalVideoRef,
  onMutedChange,
  onVolumeChange,
  onEnded,
  onProgress,
  mediaId
}: VideoPlayerProps) {
  const { config } = useConfig();
  const { isAdmin } = useAuth();
  const playerType = config?.player_type || 'h5';
  const playerSettings = config?.player_settings || {};
  
  const [protectedUrl, setProtectedUrl] = useState<string | null>(null);
  const [protectedPosterUrl, setProtectedPosterUrl] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setError(null);
    let active = true;
    if (src) {
      const lowerSrc = src.toLowerCase();
      const isHLS = lowerSrc.includes('.m3u8');
      const enableBlob = !isHLS && (config?.enable_blob !== false);
      
      setCurrentMode(enableBlob ? 'blob' : 'original');
      
      getProtectedUrl(src, false, {
        enableBlob: enableBlob,
        enableCache: config?.enable_image_cache ?? false,
        config: config || null
      }).then(url => {
        if (active) setProtectedUrl(url);
      }).catch(err => {
        console.error('[VideoPlayer] Protected URL resolution failed:', err);
        if (active) setProtectedUrl(src);
      });
    }
    
    if (poster) {
      getProtectedUrl(poster, true, {
        enableBlob: config?.enable_blob ?? true,
        enableCache: config?.enable_image_cache ?? false,
        width: 800, // 缩略图可以小一点
        quality: 60,
        config: config || null
      }).then(url => {
        if (active) setProtectedPosterUrl(url);
      });
    }

    return () => { active = false; };
  }, [src, poster, config?.enable_blob, config?.enable_image_cache, retryCount]);

  // H5 播放器逻辑
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('video_muted');
    return saved !== null ? saved === 'true' : muted;
  });
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('video_volume');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLongPressing, setIsLongPressing] = useState(false);
  // 允许外部受控静音状态
  useEffect(() => {
    setIsMuted(muted);
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 更新进度
  const handleTimeUpdate = () => {
    if (!videoRef.current || isDragging) return;
    const video = videoRef.current;
    const currentTime = video.currentTime;
    const duration = video.duration;
    setCurrentTime(currentTime);
    const p = (currentTime / duration) * 100;
    setProgress(p);
    onProgress?.(p);
  };

  // 加载元数据
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    // 初始化音量和静音状态
    const savedMuted = localStorage.getItem('video_muted');
    const savedVolume = localStorage.getItem('video_volume');
    if (savedMuted !== null) {
      videoRef.current.muted = savedMuted === 'true';
      setIsMuted(savedMuted === 'true');
    }
    if (savedVolume !== null) {
      videoRef.current.volume = parseFloat(savedVolume);
    }
  };

  // 播放/暂停切换
  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      onPlayStateChange?.(false);
      setControlsVisible(true); // 暂停时显示控制条
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      onPlayStateChange?.(true);
      resetHideControlsTimer(); // 播放时启动自动隐藏
    }
  };

  // 静音切换
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    localStorage.setItem('video_muted', String(newMuted));
    onMutedChange?.(newMuted);
  };

  // 全屏切换
  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 进度条点击
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * videoRef.current.duration;
    
    videoRef.current.currentTime = newTime;
    setProgress(percentage * 100);
    setCurrentTime(newTime);
  };

  // 进度条拖拽
  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    handleProgressClick(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !videoRef.current || !progressBarRef.current) return;
      
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = percentage * videoRef.current.duration;
      
      videoRef.current.currentTime = newTime;
      setProgress(percentage * 100);
      setCurrentTime(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 触摸事件处理
  const handleProgressTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);
    const touch = e.touches[0];
    if (!videoRef.current || !progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const percentage = touchX / rect.width;
    const newTime = percentage * videoRef.current.duration;
    
    videoRef.current.currentTime = newTime;
    setProgress(percentage * 100);
    setCurrentTime(newTime);
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || !videoRef.current || !progressBarRef.current) return;
      
      const touch = e.touches[0];
      const rect = progressBarRef.current.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, touchX / rect.width));
      const newTime = percentage * videoRef.current.duration;
      
      videoRef.current.currentTime = newTime;
      setProgress(percentage * 100);
      setCurrentTime(newTime);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // 控制条自动隐藏
  const resetHideControlsTimer = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    // 只有在播放状态下才自动隐藏控制条
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  const renderLabel = () => {
    if (!isAdmin || !currentMode) return null;
    return (
      <div className="absolute top-16 left-4 z-[60] px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 flex items-center gap-1.5 shadow-lg pointer-events-none select-none">
        <ShieldCheck className="w-3 h-3 text-primary animate-pulse" />
        <span className="text-[10px] text-white/90 font-bold tracking-wider uppercase">
          {currentMode === 'blob' ? '💧 BLOB URL' : '🔓 ORIGINAL'}
        </span>
      </div>
    );
  };

  useEffect(() => {
    // 播放状态改变时重置定时器
    if (isPlaying) {
      resetHideControlsTimer();
    } else {
      // 暂停时保持控制条显示
      setControlsVisible(true);
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    }
    return () => {
      if (hideControlsTimer.current) {
        clearTimeout(hideControlsTimer.current);
      }
    };
  }, [isPlaying]);

  // 鼠标移动显示控制条
  const handleMouseMove = () => {
    resetHideControlsTimer();
  };

  // 视频结束
  const handleEnded = () => {
    setIsPlaying(false);
    onPlayStateChange?.(false);
    setControlsVisible(true);
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
    }
    onEnded?.();
  };

  // 监听键盘事件（音量键和空格键）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      
      // 空格键：播放/暂停
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      
      // 上下箭头或音量键：调整音量并取消静音
      if (e.code === 'ArrowUp' || e.code === 'VolumeUp') {
        e.preventDefault();
        const newVolume = Math.min(1, videoRef.current.volume + 0.1);
        videoRef.current.volume = newVolume;
        localStorage.setItem('video_volume', String(newVolume));
        onVolumeChange?.(newVolume);
        if (isMuted) {
          videoRef.current.muted = false;
          setIsMuted(false);
          localStorage.setItem('video_muted', 'false');
          onMutedChange?.(false);
        }
        resetHideControlsTimer();
      }
      
      if (e.code === 'ArrowDown' || e.code === 'VolumeDown') {
        e.preventDefault();
        const newVolume = Math.max(0, videoRef.current.volume - 0.1);
        videoRef.current.volume = newVolume;
        localStorage.setItem('video_volume', String(newVolume));
        onVolumeChange?.(newVolume);
        if (isMuted) {
          videoRef.current.muted = false;
          setIsMuted(false);
          localStorage.setItem('video_muted', 'false');
          onMutedChange?.(false);
        }
        resetHideControlsTimer();
      }
      
      // M键：静音切换
      if (e.code === 'KeyM') {
        e.preventDefault();
        const newMuted = !isMuted;
        videoRef.current.muted = newMuted;
        setIsMuted(newMuted);
        localStorage.setItem('video_muted', String(newMuted));
        onMutedChange?.(newMuted);
        resetHideControlsTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMuted, isPlaying]);

  // 长按倍速播放
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!videoRef.current) return;
    
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      videoRef.current!.playbackRate = 2;
      setPlaybackSpeed(2);
      onLongPressSpeedChange?.(2);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    if (isLongPressing && videoRef.current) {
      videoRef.current.playbackRate = 1;
      setPlaybackSpeed(1);
      setIsLongPressing(false);
      onLongPressSpeedChange?.(1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!videoRef.current) return;
    
    longPressTimer.current = setTimeout(() => {
      setIsLongPressing(true);
      videoRef.current!.playbackRate = 2;
      setPlaybackSpeed(2);
      onLongPressSpeedChange?.(2);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    if (isLongPressing && videoRef.current) {
      videoRef.current.playbackRate = 1;
      setPlaybackSpeed(1);
      setIsLongPressing(false);
      onLongPressSpeedChange?.(1);
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  // Handle autoPlay changes (important for scroll-to-play)
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(e => console.log('Autoplay failed:', e));
      setIsPlaying(true);
    } else if (!autoPlay && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [autoPlay]);

  // 彻底销毁视频实例逻辑，根治播放错乱
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch (e) {
          console.warn('Video cleanup failed', e);
        }
      }
    };
  }, []);


  if (error) {
    return (
      <div className={cn("relative w-full h-full bg-zinc-900 flex flex-col items-center justify-center p-8 text-center gap-6", className)}>
        <div className="relative group">
          <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full opacity-50 transition-opacity" />
          <div className="relative w-20 h-20 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-center backdrop-blur-sm">
             <VideoOff className="w-10 h-10 text-white/20" />
             <div className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center shadow-lg ring-4 ring-black">
                <AlertCircle className="w-3.5 h-3.5 text-white" />
             </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-black text-white/90 tracking-tight">视频加载失败</h3>
          <p className="text-[11px] text-white/40 font-medium leading-relaxed max-w-[200px] mx-auto">
            无法连接到视频源。这可能是由于原始链接失效或网络限制。系统已尝试基础降级加载。
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-[200px]">
          <Button 
            variant="default" 
            size="sm" 
            className="h-10 text-[12px] font-bold gap-2 rounded-xl bg-white text-black hover:bg-white/90 transition-all active:scale-95 shadow-xl shadow-white/5" 
            onClick={() => setRetryCount(prev => prev + 1)}
          >
            <RefreshCw className="w-4 h-4" />
            重试加载
          </Button>
          
          {isAdmin && src && (
             <Button 
              variant="outline" 
              size="sm" 
              className="h-10 text-[10px] font-bold gap-2 rounded-xl border-white/10 text-white/60 hover:bg-white/5 transition-all" 
              onClick={() => window.open(src, '_blank')}
            >
              <Video className="w-4 h-4" />
              打开直连
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!protectedUrl) {
    return (
      <div className={cn("relative w-full h-full bg-black flex items-center justify-center overflow-hidden", className)}>
        {poster ? (
          <img src={poster} alt="poster" className="w-full h-full object-contain opacity-40 blur-sm scale-110" />
        ) : (
          <div className="flex flex-col items-center gap-4">
             <div className="relative">
               <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
               <Video className="w-12 h-12 text-muted-foreground/30 relative z-10 animate-pulse" />
               <Loader2 className="absolute -bottom-1 -right-1 w-5 h-5 text-primary animate-spin z-20" />
             </div>
             <div className="px-3 py-1 bg-white/5 rounded-full backdrop-blur-md border border-white/5">
                <span className="text-[10px] text-white/40 font-black tracking-widest uppercase">Video Loading</span>
             </div>
          </div>
        )}
      </div>
    );
  }

  if (playerType === 'artplayer') {
    const artOptions = {
      ...(playerSettings.artplayer || {}),
      url: protectedUrl || src,
      autoplay: autoPlay,
      muted: isMuted,
      loop: loop,
      moreVideoAttr: {
        referrerPolicy: 'no-referrer',
        ...(playerSettings.artplayer?.moreVideoAttr || {})
      },
      ...(poster ? { poster } : {}),
    };

    return (
      <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
        {renderLabel()}
        <ArtPlayer 
          option={artOptions} 
          className="w-full h-full" 
          getInstance={(art) => {
            if (onPlayStateChange) {
              art.on('play', () => onPlayStateChange(true));
              art.on('pause', () => onPlayStateChange(false));
            }
            art.on('video:ended', () => onEnded?.());
          }}
        />
      </div>
    );
  }

  if (playerType === 'xgplayer') {
    const xgConfig = {
      ...(playerSettings.xgplayer || {}),
      url: protectedUrl || src,
      autoplay: autoPlay,
      muted: isMuted,
      loop: loop,
      width: '100%',
      height: '100%',
      videoAttributes: {
        referrerPolicy: 'no-referrer',
        ...(playerSettings.xgplayer?.videoAttributes || {})
      },
      ...(poster ? { poster } : {}),
    };

    return (
      <div className={cn("relative w-full h-full bg-black overflow-hidden", className)}>
        {renderLabel()}
        <XGPlayer 
          config={xgConfig} 
          className="w-full h-full" 
          getInstance={(player) => {
            if (onPlayStateChange) {
              player.on('play', () => onPlayStateChange(true));
              player.on('pause', () => onPlayStateChange(false));
            }
            player.on('ended', () => onEnded?.());
          }}
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full h-full bg-black group will-change-transform", className)}
      onClick={togglePlay}
      onMouseMove={handleMouseMove}
      onTouchStart={resetHideControlsTimer}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStartCapture={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {renderLabel()}
      {/* 视频元素 */}
      <video
        ref={(el) => {
          videoRef.current = el;
          if (externalVideoRef && typeof externalVideoRef === 'object') {
            externalVideoRef.current = el;
          }
          // 通知父组件视频元素已创建
          if (el && onPlayStateChange) {
            onPlayStateChange(isPlaying);
          }
        }}
        src={protectedUrl || src}
        data-media-id={mediaId}
        poster={protectedPosterUrl || poster}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        referrerPolicy="no-referrer"
        playsInline
        {...({ referrerPolicy: "no-referrer" } as any)}
        preload="auto"
        className="w-full h-full object-contain m-auto block"
        width="100%"
        height="100%"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={(e) => {
          console.error('[VideoPlayer] Load error:', protectedUrl?.substring(0, 50));
          // 降级策略
          if (protectedUrl !== src && src) {
            console.log('[VideoPlayer] Falling back to original src');
            setProtectedUrl(src);
            return;
          }
          setError('视频资源加载失败');
        }}
        onPlay={() => {
          setIsPlaying(true);
          onPlayStateChange?.(true);
        }}
        onPause={() => {
          setIsPlaying(false);
          onPlayStateChange?.(false);
        }}
      />

      {/* 中央播放/暂停按钮 - 仅在暂停时显示 */}
      <div 
        className={cn(
          "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300",
          !isPlaying ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="w-20 h-20 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in zoom-in-50 duration-200 shadow-2xl">
          <Play className="w-10 h-10 text-white ml-1" />
        </div>
      </div>

      {/* 长按倍速提示 */}
      {isLongPressing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-bold animate-in fade-in slide-in-from-top-2 z-50">
          2x 倍速播放中
        </div>
      )}

      {/* 时长显示 - 仅在 showDuration 为 true 时显示 */}
      {showDuration && duration > 0 && (
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-bold z-40">
          {formatTime(duration)}
        </div>
      )}

      {/* 控制条容器 - 仅在 showControlsProp 为 true 时渲染 */}
      {showControlsProp && (
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 transition-all duration-300",
            controlsVisible || !isPlaying || isDragging ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          )}
        >
        {/* 渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
        
        {/* 控制按钮组 */}
        <div className="relative px-4 pb-2 pt-8 flex items-center gap-3 z-10">
          {/* 播放/暂停按钮 */}
          <button
            onClick={togglePlay}
            className="text-white hover:scale-110 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>

          {/* 时间显示 */}
          <span className="text-white text-xs font-medium min-w-[80px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* 弹簧占位 */}
          <div className="flex-1" />

          {/* 音量按钮 */}
          <button
            onClick={toggleMute}
            className="text-white hover:scale-110 transition-transform"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>

          {/* 全屏按钮 */}
          <button
            onClick={toggleFullscreen}
            className="text-white hover:scale-110 transition-transform"
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 进度条 - 紧贴底部 */}
        <div 
          ref={progressBarRef}
          className="relative h-1 bg-white/20 cursor-pointer group/progress"
          onClick={handleProgressClick}
          onMouseDown={handleProgressMouseDown}
          onTouchStart={handleProgressTouchStart}
        >
          {/* 已播放进度 */}
          <div 
            className="absolute left-0 top-0 h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
          
          {/* 进度点 */}
          <div 
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all",
              "group-hover/progress:scale-125",
              isDragging && "scale-150"
            )}
            style={{ left: `${progress}%`, transform: `translate(-50%, -50%)` }}
          />
        </div>
      </div>
      )}
    </div>
  );
}
