import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Play, Pause, ArrowLeft, Loader2, Music, Lock, Shield, Smartphone, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useMusic } from '@/contexts/MusicContext';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { WallpaperPreview } from '@/pages/daily-gallery/components/WallpaperPreview';
import { useAuth } from '@/contexts/AuthContext';
import { cn, downloadFile } from '@/lib/utils';
import type { MediaItem } from '@/types';

import { encodeOpenId, decodeOpenId } from '@/lib/crypto';

export default function RefreshImage() {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showWallpaperPreview, setShowWallpaperPreview] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(Date.now());
  const [config, setConfig] = useState<any>(null);
  const [usageExceeded, setUsageExceeded] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userUsage, setUserUsage] = useState<{ count: number; limit: number } | null>(null);
  
  const AUTO_PLAY_INTERVAL = 5000;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { isMusicPlaying, setIsMusicPlaying } = useMusic();

  // 获取 URL 中的 openid
  const searchParams = new URLSearchParams(location.search);
  const rawOpenId = searchParams.get('openid') || searchParams.get('mp_openid');
  const openid = rawOpenId ? decodeOpenId(rawOpenId) : null;

  // 增加自动音乐功能
  useEffect(() => {
    if (!isMusicPlaying) {
      setIsMusicPlaying(true);
    }
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await api.getRandomBeautyConfigs();
      if (data) {
        setConfig(data);
      } else {
        // 提供一个基本默认配置，防止一直处于加载状态
        setConfig({
          allow_guest_access: true,
          openid_required: false,
          group_limits: { admin: 0, svip: 0, vip: 50, pt: 8 },
          default_limit: 8
        });
      }
    } catch (e) {
      console.error('Failed to fetch config:', e);
      // 报错也要停止加载状态
      setConfig({
        allow_guest_access: true,
        openid_required: false,
        group_limits: { admin: 0, svip: 0, vip: 50, pt: 8 },
        default_limit: 8
      });
    }
  };

  const fetchRandomImage = useCallback(async () => {
    if (!config) return;

    // 每次获取新图片前检查限额
    const usageId = openid || (profile?.id ? `user:${profile.id}` : 'guest_visitor');
    try {
      const { data: usage } = await api.getRandomBeautyUsage(usageId);
      const currentCount = usage?.count || 0;
      
      // 尝试匹配配额设置，优先级别：group_id > role > pt (默认)
      let limit = config.default_limit ?? 8;
      const possibleKeys = [profile?.group_id, profile?.role, 'pt'].filter(Boolean);
      
      let matchedKey = 'default';
      for (const key of possibleKeys) {
        if (config.group_limits && config.group_limits[key as string] !== undefined) {
          limit = config.group_limits[key as string];
          matchedKey = key as string;
          break;
        }
      }

      // 强制转为数字，处理可能的字符串存储
      limit = Number(limit);
      if (isNaN(limit)) limit = 8;

      // 更新显示，确保在超限前也显示状态
      setUserUsage({ count: currentCount, limit });

      // 如果额度大于 0 且已达到上限，则拦截
      // 额度为 0 表示无限额度
      if (limit > 0 && currentCount >= limit) {
        setUsageExceeded(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setLastFetchTime(Date.now());
      
      const { data } = await api.getRandomMedia(user?.id, 1, 'image');
      if (data && data.length > 0) {
        setItem(data[0]);
        setRotation(prev => prev + 360);
        
        // 成功获取后增加使用计数
        await api.incrementRandomBeautyUsage(usageId);
        const newCount = currentCount + 1;
        setUserUsage({ count: newCount, limit });
        
        // 增加额度检查：如果增加后达到或超过限额（且不是无限额度），则立即标记超限
        if (Number(limit) > 0 && newCount >= Number(limit)) {
          // 这里可以稍微延迟一下或者在下次点击时处理，
          // 但为了用户体验，我们保持当前图片显示，只在逻辑上准备好。
          // 实际 fetchRandomImage 会在下次调用时因为 currentCount >= limit 而返回。
        }
      } else {
        // 如果没有获取到新图片，也需要显示当前额度
        setUserUsage({ count: currentCount, limit });
      }
    } catch (error) {
      console.error('Failed to check usage or fetch random image:', error);
    } finally {
      setLoading(false);
    }
  }, [user, config, openid, profile]);

  const checkAccessAndFetch = useCallback(async () => {
    if (!config) return;

    // 1. 检查是否必须携带 openid
    const canAccessWithoutOpenid = config.allow_guest_access ?? true;
    
    if (!canAccessWithoutOpenid && config.openid_required && !openid) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    // 1.1 如果用户已登录，且 URL 带有 openid，校验是否匹配
    if (profile && openid && profile.wechat_openid && profile.wechat_openid !== openid && profile.mp_openid !== openid) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    // 初次加载数据
    if (openid) {
      const isValid = await api.verifyOpenId(openid);
      if (!isValid) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
    }

    fetchRandomImage();
  }, [config, openid, profile, fetchRandomImage]);

  useEffect(() => {
    if (config) {
      checkAccessAndFetch();
    }
  }, [config, checkAccessAndFetch]);

  // 自动播放逻辑
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const tick = 100; // 每100ms更新一次进度

    if (isAutoPlay) {
      timer = setInterval(() => {
        const elapsed = Date.now() - lastFetchTime;
        const newProgress = Math.min((elapsed / AUTO_PLAY_INTERVAL) * 100, 100);
        setProgress(newProgress);

        if (elapsed >= AUTO_PLAY_INTERVAL) {
          fetchRandomImage();
        }
      }, tick);
    } else {
      setProgress(0);
    }
    return () => {
      clearInterval(timer);
    };
  }, [isAutoPlay, fetchRandomImage, lastFetchTime]);

  // 监听全局刷新事件 (由 Navigation 发出)
  useEffect(() => {
    const handleGlobalRefresh = () => {
      fetchRandomImage();
    };
    window.addEventListener('refresh-random-image', handleGlobalRefresh);
    return () => window.removeEventListener('refresh-random-image', handleGlobalRefresh);
  }, [fetchRandomImage]);

  return (
    <div className="fixed inset-0 bg-black z-[1001] flex flex-col pb-24">
      {/* 顶部导航 */}
      <div className="h-14 flex items-center px-4 justify-between bg-black/40 backdrop-blur-md border-b border-white/10">
        <Button variant="ghost" size="icon" className="text-white" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-white font-black">随机美图</h1>
        <div className="flex items-center gap-2">
          {userUsage && (
            <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
              <Shield className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">
                {profile?.username ? `${profile.username} · ` : ''}今日剩余: {userUsage.limit === 0 ? '无限' : Math.max(0, userUsage.limit - userUsage.count)}
              </span>
            </div>
          )}
          <div className="w-10" />
        </div>
      </div>
      {/* 图片展示区 */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {accessDenied ? (
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <Lock className="w-16 h-16 text-red-500/50 mb-2" />
            <h3 className="text-xl font-black text-white">访问受限</h3>
            <p className="text-white/40 text-sm">该页面需要通过公众号授权链接访问，请关注公众号并回复相关关键词获取入口。</p>
            <Button variant="outline" className="mt-4 rounded-xl border-white/20" onClick={() => navigate('/')}>返回首页</Button>
          </div>
        ) : usageExceeded ? (
          <div className="flex flex-col items-center gap-4 text-center px-6">
            <Shield className="w-16 h-16 text-amber-500/50 mb-2" />
            <h3 className="text-xl font-black text-white">今日配额已满</h3>
            <p className="text-white/40 text-sm">
              {config?.quota_full_message || '今日随机图片已推送完成，请明天再来欣赏，或提升会员等级获取更多配额。'}
            </p>
            <Button 
              variant="outline" 
              className="mt-4 rounded-xl border-white/20" 
              onClick={() => {
                const target = config?.after_quota_redirect_url || '/';
                if (target.startsWith('http')) {
                  window.location.href = target;
                } else {
                  navigate(target);
                }
              }}
            >
              {config?.after_quota_button_text || '返回首页'}
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {item ? (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full h-full max-w-lg flex items-center justify-center"
            >
              <ProtectedMedia 
                src={item.url} 
                type="image" 
                className="w-full h-full object-contain rounded-3xl shadow-2xl" 
                ruleKey="大图"
                version={item.updated_at || item.created_at}
              />
            </motion.div>
          ) : (
            loading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">随机加载中...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <Shield className="w-12 h-12 text-white/20" />
                <p className="text-white/40 text-sm font-bold">暂时没有更多图片了</p>
                <Button variant="outline" size="sm" className="mt-2 rounded-xl border-white/10 text-white/60" onClick={fetchRandomImage}>
                  重试一下
                </Button>
              </div>
            )
          )}
        </AnimatePresence>
        )}
      </div>
      {/* 底部控制区 - 改为右侧悬浮 */}
      <AnimatePresence>
        {!showWallpaperPreview && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-32 right-6 z-[1002] flex flex-col items-center gap-5"
          >
            {/* 壁纸预览按钮 */}
            {item && !accessDenied && !usageExceeded && (
              <div className="flex flex-col gap-5">
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    size="icon"
                    className="w-14 h-14 rounded-full bg-blue-600/90 text-white hover:bg-blue-500 shadow-xl transition-transform active:scale-90 border-2 border-white/20"
                    onClick={() => {
                      const extension = item.url.split('.').pop()?.split('?')[0] || 'jpg';
                      downloadFile(item.url, `random_${item.id}.${extension}`);
                      toast.success('下载任务已提交');
                    }}
                    title="下载原图"
                  >
                    <Download className="w-6 h-6" />
                  </Button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Button
                    size="icon"
                    className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md shadow-xl transition-transform active:scale-90 border-2 border-white/20"
                    onClick={() => setShowWallpaperPreview(true)}
                    title="壁纸预览"
                  >
                    <Smartphone className="w-6 h-6" />
                  </Button>
                </motion.div>
              </div>
            )}
            <div className="relative flex items-center justify-center">
              {/* 环形进度条背景 */}
              <svg 
                viewBox="0 0 64 64"
                className={cn("absolute w-16 h-16 pointer-events-none overflow-visible transition-opacity duration-300", isAutoPlay ? "opacity-100" : "opacity-0")} 
                style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
              >
                <circle
                  cx="32"
                  cy="32"
                  r="30"
                  stroke="white"
                  strokeOpacity="0.1"
                  strokeWidth="3"
                  fill="transparent"
                />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="30"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-primary"
                  strokeDasharray={`${2 * Math.PI * 30}`}
                  strokeDashoffset={`${2 * Math.PI * 30 * (1 - progress / 100)}`}
                  transition={{ duration: 0.15, ease: "linear" }}
                  style={{
                    filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.6))"
                  }}
                />
                {/* 突出点 (旋转的小球) */}
                <motion.circle
                  cx="68"
                  cy="32"
                  r="4"
                  fill="currentColor"
                  className="text-primary"
                  animate={{ rotate: (progress / 100) * 360 }}
                  transition={{ duration: 0.15, ease: "linear" }}
                  style={{
                    originX: "32px",
                    originY: "32px",
                    filter: "drop-shadow(0 0 8px hsl(var(--primary)))"
                  }}
                />
              </svg>

              <Button
                size="icon"
                variant="outline"
                className={cn(
                  "w-16 h-16 rounded-full border-2 transition-all shadow-xl backdrop-blur-md relative z-10",
                  isAutoPlay ? "bg-primary/20 border-primary text-white" : "border-white/20 text-white bg-black/40"
                )}
                onClick={() => setIsAutoPlay(!isAutoPlay)}
              >
                <motion.div
                  animate={isAutoPlay ? { rotate: 360 } : { rotate: 0 }}
                  transition={isAutoPlay ? { duration: 4, repeat: Infinity, ease: "linear" } : { duration: 0.5 }}
                  className="flex items-center justify-center w-full h-full"
                >
                  {isAutoPlay ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </motion.div>
              </Button>

              {/* 音乐切换控制 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute -left-16 top-1/2 -translate-y-1/2"
              >

              </motion.div>
            </div>

            <AnimatePresence>
              {!isAutoPlay && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    size="icon"
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-rainbow-blue to-rainbow-indigo text-white hover:brightness-110 shadow-2xl transition-transform active:scale-90 border-4 border-white/20"
                    onClick={fetchRandomImage}
                    disabled={loading}
                  >
                    <motion.div
                      animate={{ rotate: rotation }}
                      transition={{ duration: 0.5 }}
                    >
                      <RefreshCw className={cn("w-8 h-8", loading && "animate-spin")} />
                    </motion.div>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {showWallpaperPreview && item && (
        <WallpaperPreview 
          imageUrl={item.url}
          onClose={() => setShowWallpaperPreview(false)}
          onDownload={() => downloadFile(item.url, `wallpaper_${item.id}.jpg`)}
          onRefresh={fetchRandomImage}
          isAutoPlay={isAutoPlay}
          onToggleAutoPlay={() => setIsAutoPlay(!isAutoPlay)}
          progress={progress}
          loading={loading}
        />
      )}
    </div>
  );
}
