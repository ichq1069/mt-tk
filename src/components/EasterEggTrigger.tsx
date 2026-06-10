import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Sparkles, X, Trophy, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Egg {
  id: string;
  name: string;
  reward_type: 'points' | 'physical' | 'coupon';
  reward_content: any;
  trigger_condition: any;
  icon_url?: string;
  message?: string;
  start_at?: string;
  end_at?: string;
  max_winners: number;
  current_winners: number;
  status: 'active' | 'paused' | 'ended';
  page_paths: string[];
  stay_duration: number;
}

export function EasterEggTrigger() {
  const { user } = useAuth();
  const location = useLocation();
  const [winningEgg, setWinningEgg] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeEggs, setActiveEggs] = useState<Egg[]>([]);
  const [navCount, setNavCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(sessionStorage.getItem('easter_egg_nav_count') || '0');
  });
  const timersRef = useRef<Record<string, number>>({});

  // 监听导航次数
  useEffect(() => {
    const newCount = navCount + 1;
    setNavCount(newCount);
    sessionStorage.setItem('easter_egg_nav_count', newCount.toString());
  }, [location.pathname]);

  // 监听导航触发
  useEffect(() => {
    const navEggs = activeEggs.filter(egg => egg.trigger_condition?.type === 'navigation');
    navEggs.forEach(egg => {
      const target = egg.trigger_condition?.target_count || 5;
      if (navCount >= target) {
        triggerCheck(egg.id);
      }
    });
  }, [navCount, activeEggs]);

  // 监听自定义点击事件
  useEffect(() => {
    const handleCustomClick = (e: any) => {
      const eventName = e.detail?.eventName;
      if (!eventName) return;

      const clickEggs = activeEggs.filter(egg => 
        egg.trigger_condition?.type === 'click' && 
        egg.trigger_condition?.target_event === eventName
      );
      
      clickEggs.forEach(egg => triggerCheck(egg.id));
    };

    window.addEventListener('easter-egg-click', handleCustomClick);
    return () => window.removeEventListener('easter-egg-click', handleCustomClick);
  }, [activeEggs]);

  // 监听收藏达标触发 (进入页面即检查)
  useEffect(() => {
    const favEggs = activeEggs.filter(egg => egg.trigger_condition?.type === 'favorites');
    favEggs.forEach(egg => triggerCheck(egg.id));
  }, [activeEggs]);

  // 监听收藏增加事件，实时触发检查
  useEffect(() => {
    const handleFavoriteAdded = () => {
      const favEggs = activeEggs.filter(egg => egg.trigger_condition?.type === 'favorites');
      favEggs.forEach(egg => triggerCheck(egg.id));
    };

    window.addEventListener('easter-egg-favorite-added', handleFavoriteAdded);
    return () => window.removeEventListener('easter-egg-favorite-added', handleFavoriteAdded);
  }, [activeEggs]);

  // 获取当前页面可用的彩蛋
  useEffect(() => {
    if (!user) return;
    fetchActiveEggs();
    
    return () => {
      // 清理所有定时器
      Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
      timersRef.current = {};
    };
  }, [location.pathname, user]);

  const fetchActiveEggs = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('easter_egg_configs')
        .select('*')
        .eq('status', 'active')
        .or(`start_at.is.null,start_at.lte.${now}`)
        .or(`end_at.is.null,end_at.gt.${now}`);

      if (error) throw error;

      // 过滤页面路径
      const eggs = (data || []) as Egg[];
      const filtered = eggs.filter(egg => {
        if (!egg.page_paths || egg.page_paths.length === 0) return true;
        
        return egg.page_paths.some((p: string) => {
          // 直接匹配
          if (location.pathname === p) return true;
          if (p === '/' && location.pathname === '') return true;
          
          // 处理带参数的路径匹配，如 /album/:id
          if (p.includes(':')) {
            try {
              const regexPattern = p
                .replace(/\//g, '\\/')
                .replace(/:[^\/]+/g, '[^\\/]+');
              const regex = new RegExp(`^${regexPattern}$`);
              return regex.test(location.pathname);
            } catch (e) {
              return false;
            }
          }
          
          // 前缀匹配 (可选)
          return location.pathname.startsWith(p + '/');
        });
      });

      setActiveEggs(filtered);

      // 为页面停留类型的彩蛋启动定时器
      filtered.forEach((egg: Egg) => {
        if (egg.trigger_condition?.type === 'stay') {
          const stayDuration = (egg.stay_duration || 5) * 1000;
          
          if (timersRef.current[egg.id]) {
            clearTimeout(timersRef.current[egg.id]);
          }

          timersRef.current[egg.id] = window.setTimeout(() => {
            triggerCheck(egg.id);
          }, stayDuration);
        }
      });

    } catch (e) {
      console.error('Fetch active eggs error:', e);
    }
  };

  const triggerCheck = async (eggId?: string) => {
    if (!user || !eggId) return;
    
    // 检查是否已经太频繁 (针对单个彩蛋)
    const lastTrigger = localStorage.getItem(`last_egg_trigger_${eggId}`);
    const now = Date.now();
    if (lastTrigger && now - parseInt(lastTrigger) < 30000) return; // 单个彩蛋30秒冷却

    localStorage.setItem(`last_egg_trigger_${eggId}`, now.toString());

    try {
      const { data, error } = await supabase.functions.invoke('trigger-easter-egg', {
        body: { 
          page: location.pathname,
          user_id: user.id,
          egg_id: eggId
        }
      });

      if (error) throw error;

      if (data?.win) {
        setWinningEgg(data.egg);
        setShowModal(true);
        playWinEffects();
      }
    } catch (e) {
      console.error('Easter egg trigger error:', e);
    }
  };

  const playWinEffects = () => {
    // 播放音效
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    audio.play().catch(e => console.log('Audio play failed', e));

    // 粒子效果
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  return (
    <>
      <AnimatePresence>
        {showModal && winningEgg && (
          <Dialog open={showModal} onOpenChange={setShowModal}>
            <DialogContent className="sm:max-w-md border-none bg-gradient-to-b from-primary/20 via-background to-background p-0 overflow-hidden rounded-3xl shadow-[0_0_50px_-12px_rgba(var(--primary),0.5)]">
              <div className="relative p-8 text-center space-y-6">
                {/* 装饰性背景 */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
                  />
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl"
                  />
                </div>

                <div className="relative">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-28 h-28 bg-gradient-to-tr from-primary to-accent rounded-full mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.4)]"
                  >
                    {winningEgg.icon_url ? (
                      <img src={winningEgg.icon_url} alt="Egg" className="w-16 h-16 object-contain drop-shadow-lg" />
                    ) : (
                      <Trophy className="w-14 h-14 text-white drop-shadow-md" />
                    )}
                    
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-4 border-white/20"
                    />
                  </motion.div>
                  
                  <div className="absolute top-0 right-1/4">
                    <motion.div animate={{ y: [0, -10, 0], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}>
                      <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                    </motion.div>
                  </div>
                  <div className="absolute bottom-4 left-1/4">
                    <motion.div animate={{ y: [0, -10, 0], opacity: [0, 1, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}>
                      <Sparkles className="w-5 h-5 text-primary fill-primary" />
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 space-y-2"
                  >
                    <h3 className="text-3xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">鸿运当头！</h3>
                    <p className="text-sm text-muted-foreground font-bold tracking-tight uppercase">发现神秘彩蛋奖励</p>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-muted/50 backdrop-blur-sm p-6 rounded-[2rem] border border-primary/20 relative group"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary px-4 py-1 rounded-full shadow-lg shadow-primary/20">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">恭喜获得</span>
                  </div>
                  
                  <div className="text-2xl font-black text-foreground mt-2">
                    {winningEgg.reward_type === 'points' && (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-primary">+</span>
                        {winningEgg.reward_content?.amount}
                        <span className="text-sm font-bold text-muted-foreground">积分</span>
                      </div>
                    )}
                    {winningEgg.reward_type === 'physical' && winningEgg.reward_content?.name}
                    {winningEgg.reward_type === 'coupon' && (
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-muted-foreground">优惠券</div>
                        <div className="text-xl tracking-wider text-primary">{winningEgg.reward_content?.code}</div>
                      </div>
                    )}
                  </div>
                  {winningEgg.message && (
                    <p className="text-xs text-muted-foreground mt-4 px-4 py-2 bg-background/40 rounded-xl italic leading-relaxed border border-border/40">
                      "{winningEgg.message}"
                    </p>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button 
                    onClick={() => setShowModal(false)}
                    className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/30 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all active:scale-95"
                  >
                    开心收下
                  </Button>
                </motion.div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
