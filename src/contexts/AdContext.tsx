import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ExternalLink, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';

interface AdContextType {
  ads: any[];
  loading: boolean;
  getAdsByPlacement: (placement: string) => any[];
  logAdEvent: (adId: string, eventType: string) => Promise<void>;
  refreshAds: () => Promise<void>;
  isSplashActive: boolean;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export const useAds = () => {
  const context = useContext(AdContext);
  if (!context) throw new Error('useAds must be used within AdProvider');
  return context;
};

export const AdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSplash, setActiveSplash] = useState<any>(null);
  const [activePopup, setActivePopup] = useState<any>(null);
  const [splashSeconds, setSplashSeconds] = useState(5);
  const [shownSplashIds, setShownSplashIds] = useState<Set<string>>(new Set());

  const logAdEvent = useCallback(async (adId: string, eventType: string) => {
    try {
      // 核心修复：清理非标准 UUID (如 ad-UUID-index-page)
      let cleanId = adId;
      if (adId.startsWith('ad-')) {
        const parts = adId.split('-');
        // UUID 应该有 5 个部分 (8-4-4-4-12)，加上 'ad-' 前缀，parts 长度至少应为 6
        if (parts.length >= 6) {
          cleanId = parts.slice(1, 6).join('-');
        }
      }
      
      // 基础验证，确保是有效的 UUID 格式
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(cleanId)) {
        console.warn('[AdContext] 拦截非法广告 ID 上报:', cleanId);
        return;
      }

      await api.logAdEvent(cleanId, eventType, profile?.id, profile?.mp_openid || profile?.wechat_openid);
    } catch (e) {
      console.error('Log ad event error:', e);
    }
  }, [profile?.id]);

  const checkFrequency = useCallback((ad: any) => {
    if (!ad.frequency_type || ad.frequency_type === 'always') return true;
    
    const key = `ad_viewed_${ad.id}`;
    const lastViewed = localStorage.getItem(key);
    
    if (ad.frequency_type === 'session') {
      const sessionViewed = sessionStorage.getItem(key);
      return !sessionViewed;
    }
    
    if (ad.frequency_type === 'daily') {
      if (!lastViewed) return true;
      const lastDate = new Date(parseInt(lastViewed)).toDateString();
      const today = new Date().toDateString();
      return lastDate !== today;
    }
    
    return true;
  }, []);

  const markViewed = useCallback((ad: any) => {
    const key = `ad_viewed_${ad.id}`;
    localStorage.setItem(key, Date.now().toString());
    sessionStorage.setItem(key, 'true');
    logAdEvent(ad.id, 'impression');
  }, [logAdEvent]);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.getAds();
      if (data) {
        // Filter ads based on targeting (levels)
        const userLevel = profile?.album_level || 'pt';
        const filtered = data.filter((ad: any) => {
          if (!ad.target_levels || ad.target_levels.includes('all')) return true;
          return ad.target_levels.includes(userLevel);
        });
        setAds(filtered);

        // Handle Splash/Popup display
        if (filtered.length > 0) {
          // 1. Check for Splash ad
          const splashAds = filtered.filter((ad: any) => {
            if (ad.type !== 'splash') return false;
            if (shownSplashIds.has(ad.id)) return false; // 本次运行期间已显示过，不再重复
            if (!checkFrequency(ad)) return false;
            
            // Appearance probability check
            const prob = ad.appearance_probability ?? 100;
            if (prob < 100 && Math.random() * 100 > prob) return false;
            
            return true;
          });
          
          if (splashAds.length > 0) {
            // 随机选择一个符合条件的开屏广告
            const splash = splashAds[Math.floor(Math.random() * splashAds.length)];
            setActiveSplash(splash);
            setSplashSeconds(splash.display_duration || 5);
            markViewed(splash);
            setShownSplashIds(prev => new Set(prev).add(splash.id));
          } else {
            // 2. Check for Popup ad if no splash
            const popupAds = filtered.filter((ad: any) => {
              if (ad.type !== 'popup') return false;
              if (shownSplashIds.has(ad.id)) return false;
              if (!checkFrequency(ad)) return false;
              
              // Appearance probability check
              const prob = ad.appearance_probability ?? 100;
              if (prob < 100 && Math.random() * 100 > prob) return false;
              
              return true;
            });
            
            if (popupAds.length > 0) {
              const popup = popupAds[Math.floor(Math.random() * popupAds.length)];
              // Delay popup a bit for better UX
              setTimeout(() => {
                setActivePopup(popup);
                markViewed(popup);
                setShownSplashIds(prev => new Set(prev).add(popup.id));
              }, 1500);
            }
          }
        }
      }
    } catch (e) {
      console.error('Fetch ads error:', e);
    } finally {
      setLoading(false);
    }
  }, [profile?.album_level, checkFrequency, markViewed]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // Splash countdown
  useEffect(() => {
    if (activeSplash && splashSeconds > 0) {
      const timer = setInterval(() => {
        setSplashSeconds(s => s - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (activeSplash && splashSeconds === 0) {
      setActiveSplash(null);
    }
  }, [activeSplash, splashSeconds]);

  const getAdsByPlacement = useCallback((placement: string) => {
    return ads.filter(ad => 
      (ad.type === 'in-feed' || ad.type === 'waterfall') && 
      (ad.placements?.includes('all') || ad.placements?.includes(placement))
    );
  }, [ads]);

  const handleAdClick = (ad: any) => {
    logAdEvent(ad.id, 'click');
    if (ad.cta_url) {
      window.open(ad.cta_url, '_blank');
    }
  };

  const contextValue = useMemo(() => ({
    ads,
    loading,
    getAdsByPlacement,
    logAdEvent,
    refreshAds: fetchAds,
    isSplashActive: !!activeSplash
  }), [ads, loading, getAdsByPlacement, logAdEvent, fetchAds, activeSplash]);

  return (
    <AdContext.Provider value={contextValue}>
      {children}

      {/* Splash Ad */}
      <AnimatePresence>
        {activeSplash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120000] bg-black flex flex-col items-center justify-center overflow-hidden"
          >
            <ProtectedMedia 
              src={activeSplash.image_url} 
              type="image"
              alt={activeSplash.title}
              className="w-full h-full object-cover cursor-pointer"
              ruleKey={activeSplash.image_rule || "毫秒级优化"}
              onClick={() => handleAdClick(activeSplash)}
            />
            
            <div className="absolute top-[calc(max(env(safe-area-inset-top),20px)+1rem)] right-4 flex items-center gap-2 z-[120010]">
              <Button 
                variant="secondary" 
                size="sm" 
                className="rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white font-black px-6 h-10 hover:bg-black/80 shadow-2xl transition-all active:scale-95 flex items-center gap-2"
                onClick={() => setActiveSplash(null)}
              >
                <span>跳过</span>
                {splashSeconds > 0 && <span className="opacity-60 text-xs border-l border-white/20 pl-2 ml-1">{splashSeconds}s</span>}
              </Button>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-8 pt-32 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-6 pointer-events-none z-[120005]">
              <div className="space-y-3 pointer-events-auto cursor-pointer" onClick={() => handleAdClick(activeSplash)}>
                <div className="flex items-center gap-2">
                  <Badge 
                    className="bg-primary/90 text-[10px] h-5 px-2 rounded-lg font-black tracking-widest uppercase shadow-lg border-none"
                    style={activeSplash.theme_color ? { backgroundColor: activeSplash.theme_color } : {}}
                  >
                    {activeSplash.badge_text || '广告'}
                  </Badge>
                  <span className="text-white/50 text-[10px] font-bold tracking-widest uppercase">Sponsored</span>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">{activeSplash.title}</h2>
                {activeSplash.description && (
                  <p className="text-base text-white/70 line-clamp-2 font-medium leading-relaxed drop-shadow-lg">{activeSplash.description}</p>
                )}
              </div>
              
              {activeSplash.cta_text && (
                <div className="pointer-events-auto w-full">
                  <Button 
                    className="w-full h-14 rounded-2xl bg-white text-black text-lg font-black shadow-2xl hover:bg-white/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    onClick={() => handleAdClick(activeSplash)}
                  >
                    {activeSplash.cta_text}
                    <ExternalLink className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup Ad */}
      <Dialog open={!!activePopup} onOpenChange={(open) => { if (!open) setActivePopup(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden bg-white">
          <div className="relative group">
            <div className="aspect-[4/5] overflow-hidden">
              <ProtectedMedia 
                src={activePopup?.image_url} 
                type="image"
                alt={activePopup?.title} 
                isThumbnail={true}
                className="w-full h-full object-cover cursor-pointer"
                ruleKey={activePopup?.image_rule || "首瀑"}
                onClick={() => { handleAdClick(activePopup); setActivePopup(null); }}
              />
            </div>
            
            <Button 
              size="icon" 
              variant="ghost" 
              className="absolute top-4 right-4 rounded-full bg-black/20 hover:bg-black/40 text-white border-none z-10"
              onClick={() => setActivePopup(null)}
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
            
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white space-y-4">
              <Badge 
                className="bg-primary border-none font-black text-[10px] tracking-widest px-3 py-1 mb-2"
                style={activePopup?.theme_color ? { backgroundColor: activePopup.theme_color } : {}}
              >
                {activePopup?.badge_text || '精彩推荐'}
              </Badge>
              <h3 className="text-2xl font-black drop-shadow-md">{activePopup?.title}</h3>
              <p className="text-sm opacity-90 line-clamp-2 drop-shadow-sm font-medium">{activePopup?.description}</p>
              
              <div className="pt-4 flex gap-3">
                <Button 
                  className="flex-1 h-12 rounded-2xl font-black bg-white text-slate-900 hover:bg-slate-50 transition-all shadow-xl shadow-black/20"
                  onClick={() => { handleAdClick(activePopup); setActivePopup(null); }}
                >
                  {activePopup?.cta_text || '立即查看'}
                </Button>
                {activePopup?.allow_skip !== false && (
                  <Button 
                    variant="ghost"
                    className="h-12 rounded-2xl font-bold text-white/60 hover:text-white hover:bg-white/10"
                    onClick={() => setActivePopup(null)}
                  >
                    暂不需要
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdContext.Provider>
  );
};
