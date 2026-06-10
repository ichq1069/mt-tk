import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Trophy, Gift, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Activity {
  id: string;
  name: string;
  page_paths: string[];
  total_stars: number;
  star_icon_url?: string;
  target_count: number;
  probability?: number;
  show_partially?: boolean;
}

interface StarPosition {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity?: number;
}

export function StarHuntTrigger() {
  const { user } = useAuth();
  const location = useLocation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stars, setStars] = useState<StarPosition[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [winningActivity, setWinningActivity] = useState<any>(null);
  const [pageHeight, setPageHeight] = useState(0);

  // 监听页面高度变化
  useEffect(() => {
    const updateHeight = () => {
      setPageHeight(Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        window.innerHeight
      ));
    };

    updateHeight();
    const observer = new MutationObserver(updateHeight);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [location.pathname]);

  // 检查当前页面是否有活动
  useEffect(() => {
    if (!user) return;
    fetchActiveActivities();
  }, [location.pathname, user]);

  const fetchActiveActivities = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('star_hunt_activity_configs')
        .select('*')
        .eq('is_active', true)
        .or(`start_at.is.null,start_at.lte.${now}`)
        .or(`end_at.is.null,end_at.gt.${now}`);

      if (error) throw error;

      const matched = (data || []).filter((act: any) => {
        // 概率检查
        const prob = act.probability ?? 1.0;
        if (Math.random() > prob) return false;

        if (!act.page_paths || act.page_paths.length === 0) return true;
        return act.page_paths.some((p: string) => {
          if (location.pathname === p) return true;
          if (p.includes(':')) {
            const regexPattern = p.replace(/\//g, '\\/').replace(/:[^\/]+/g, '[^\\/]+');
            return new RegExp(`^${regexPattern}$`).test(location.pathname);
          }
          return location.pathname.startsWith(p + '/');
        });
      }) as any[];

      if (matched.length === 0) {
        setActivities([]);
        setStars([]);
        return;
      }

      // 检查完成限制
      const activityId = matched[0].id;
      const [completionsRes, dailyCompletionsRes] = await Promise.all([
        supabase.from('star_hunt_completions').select('id', { count: 'exact', head: true }).eq('activity_id', activityId).eq('user_id', user!.id),
        supabase.from('star_hunt_completions').select('id', { count: 'exact', head: true }).eq('activity_id', activityId).eq('user_id', user!.id).eq('completion_date', new Date().toISOString().split('T')[0])
      ]);

      const totalCompletions = completionsRes.count || 0;
      const dailyCompletions = dailyCompletionsRes.count || 0;

      if ((matched[0].per_user_max_total > 0 && totalCompletions >= matched[0].per_user_max_total) ||
          (matched[0].per_user_max_daily > 0 && dailyCompletions >= matched[0].per_user_max_daily)) {
        setActivities([]);
        setStars([]);
        return;
      }

      setActivities(matched as any[]);
      generateStars(matched[0]);
    } catch (e) {
      console.error('Fetch star activities error:', e);
    }
  };

  const generateStars = (activity: any) => {
    const count = activity.total_stars || 3;
    const showPartially = activity.show_partially ?? false;
    const newStars: StarPosition[] = [];
    
    for (let i = 0; i < count; i++) {
      // 随机位置，使用百分比。X轴 5%-95%，Y轴由页面高度决定
      newStars.push({
        id: Math.random().toString(36).substring(7),
        x: Math.random() * 90 + 5, 
        y: Math.random() * 85 + 5, // 在页面 5%-90% 的垂直位置
        scale: Math.random() * 0.5 + 0.8,
        rotation: Math.random() * 360,
        opacity: showPartially ? (Math.random() * 0.6 + 0.4) : 1
      });
    }
    setStars(newStars);
  };

  const handleCollect = async (activityId: string, starId: string) => {
    if (!user || isCollecting) return;
    setIsCollecting(true);

    try {
      const { data, error } = await supabase.rpc('increment_star_collection', {
        activity_id_param: activityId,
        user_id_param: user.id
      } as any);

      if (error) throw error;

      // 移除这个星星
      setStars(prev => prev.filter(s => s.id !== starId));

      const result = (data as any)?.[0];
      if (result) {
        if (result.target_reached) {
          setWinningActivity({
            ...activities[0],
            new_count: result.new_count
          });
          setShowSuccessModal(true);
          setStars([]); // 任务完成，清除当前页面的所有星星
          playTargetReachedEffects();
        } else {
          toast.success(`收集成功！当前进度: ${result.new_count}/${(activities[0] as any).target_count}`, {
            icon: <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          });
        }
      }
    } catch (e: any) {
      toast.error('收集失败: ' + e.message);
    } finally {
      setIsCollecting(false);
    }
  };

  const playTargetReachedEffects = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF4500']
    });
  };

  if (activities.length === 0 || stars.length === 0) return null;

  return (
    <div 
      className="absolute top-0 left-0 w-full pointer-events-none z-[60] overflow-hidden"
      style={{ height: pageHeight > 0 ? `${pageHeight}px` : '100%' }}
    >
      <AnimatePresence>
        {stars.map((star) => (
          <motion.div
            key={star.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: star.scale, 
              opacity: star.opacity ?? 1,
              rotate: star.rotation,
              y: [0, -10, 0]
            }}
            exit={{ scale: 2, opacity: 0, y: -50 }}
            transition={{ 
              scale: { duration: 0.3 },
              opacity: { duration: 0.3 },
              y: { duration: 2 + Math.random(), repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute pointer-events-auto cursor-pointer group"
            style={{ 
              left: `${star.x}%`, 
              top: `${star.y}%`,
              // 随机裁剪/透明度来支持“可能显示一半”
              filter: (activities[0].show_partially && Math.random() > 0.7) ? 'blur(1px) opacity(0.6)' : 'none'
            }}
            onClick={() => handleCollect(activities[0].id, star.id)}
          >
            <div className="relative">
              {activities[0].star_icon_url ? (
                <img 
                  src={activities[0].star_icon_url} 
                  className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] group-hover:scale-110 transition-transform" 
                  alt="Star"
                />
              ) : (
                <div className="p-2 rounded-full bg-yellow-400/20 backdrop-blur-sm border border-yellow-400/50 shadow-[0_0_15px_rgba(254,240,138,0.6)] group-hover:bg-yellow-400/40 transition-all">
                  <Star className="w-8 h-8 text-yellow-500 fill-yellow-500 drop-shadow-md" />
                </div>
              )}
              
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-yellow-400/30 blur-md -z-10"
              />
              
              <div className="absolute -top-1 -right-1">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessModal && winningActivity && (
          <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
            <DialogContent className="sm:max-w-md border-none bg-gradient-to-b from-yellow-500/20 via-background to-background p-0 overflow-hidden rounded-[2.5rem] shadow-[0_0_50px_-12px_rgba(234,179,8,0.5)]">
              <div className="relative p-8 text-center space-y-6">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-24 -left-24 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"
                  />
                </div>

                <div className="relative">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-28 h-28 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)]"
                  >
                    {winningActivity.bottle_icon_url ? (
                      <img src={winningActivity.bottle_icon_url} alt="Reward" className="w-16 h-16 object-contain drop-shadow-lg" />
                    ) : (
                      <Trophy className="w-14 h-14 text-white drop-shadow-md" />
                    )}
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 space-y-2"
                  >
                    <h3 className="text-3xl font-black bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">任务圆满完成！</h3>
                    <p className="text-sm text-muted-foreground font-bold tracking-tight uppercase">已成功收集所有特控⭐</p>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-muted/50 backdrop-blur-sm p-6 rounded-[2rem] border border-yellow-500/20 relative group"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 px-4 py-1 rounded-full shadow-lg shadow-yellow-500/20">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">获得奖励</span>
                  </div>
                  
                  <div className="text-2xl font-black text-foreground mt-2">
                    {winningActivity.reward_type === 'points' && (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-yellow-600">+</span>
                        {winningActivity.reward_content?.amount}
                        <span className="text-sm font-bold text-muted-foreground">积分</span>
                      </div>
                    )}
                    {winningActivity.reward_type === 'physical' && winningActivity.reward_content?.name}
                    {winningActivity.reward_type === 'coupon' && (
                      <div className="space-y-1">
                        <div className="text-sm font-bold text-muted-foreground">优惠券</div>
                        <div className="text-xl tracking-wider text-yellow-600">{winningActivity.reward_content?.code}</div>
                      </div>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Button 
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full h-14 rounded-2xl font-black shadow-xl shadow-yellow-500/30 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 transition-all active:scale-95"
                  >
                    开心收下
                  </Button>
                </motion.div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
