import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, Award, Share2, Download, CheckCircle2, 
  Lock, Calendar, Info, Star, ShieldCheck, Heart, Sparkles,
  Smartphone, Maximize2, ListChecks, Trophy, Timer, Loader2
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogFooter 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BadgeItem {
  id: string;
  name: string;
  image_url: string;
  category: string;
  acquisition_method?: string;
  validity_days: number;
  description?: string;
  is_active: boolean;
}

interface UserBadge {
  id: string;
  badge_id: string;
  granted_at: string;
  expires_at?: string;
  badges: BadgeItem;
}

interface BadgeTask {
  id: string;
  badge_id: string;
  task_type: string;
  target_value: number;
  claim_type: 'auto' | 'manual';
  is_active: boolean;
  badges: BadgeItem;
}

export default function Badges() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [allBadges, setAllBadges] = useState<BadgeItem[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [unlockedInfo, setUnlockedInfo] = useState<UserBadge | null>(null);
  const [categories, setCategories] = useState<{ id: string, label: string }[]>([]);
  
  const [tasks, setTasks] = useState<BadgeTask[]>([]);
  const [userProgress, setUserProgress] = useState<any>({});
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  
  const [newBadgeUnlocked, setNewBadgeUnlocked] = useState<BadgeItem | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    
    // 先尝试触发自动授勋检查
    try {
      const { data: grantedCount } = await api.checkUserBadges(user!.id);
      if (grantedCount && grantedCount > 0) {
        // 如果有新授勋，可以在这里做一些逻辑，或者让下方的 userBadgesRes 获取最新数据
      }
    } catch (e) {
      console.error("Auto check failed", e);
    }

    const [badgesRes, userBadgesRes, tasksRes, progressRes, catsRes] = await Promise.all([
      api.getBadges(),
      api.getUserBadges(user!.id),
      api.getBadgeTasks(),
      api.getUserBadgeProgress(user!.id),
      api.getBadgeCategories()
    ]);

    if (badgesRes.data) setAllBadges(badgesRes.data);
    
    // 检查是否有新解锁的勋章 (与上次本地记录相比)
    if (userBadgesRes.data && userBadges.length > 0) {
       const prevIds = new Set(userBadges.map(ub => ub.badge_id));
       const newUnlocked = userBadgesRes.data.find((ub: any) => !prevIds.has(ub.badge_id));
       if (newUnlocked && newUnlocked.badges) {
         setNewBadgeUnlocked(newUnlocked.badges);
       }
    }
    
    if (userBadgesRes.data) setUserBadges(userBadgesRes.data);
    if (tasksRes.data) setTasks(tasksRes.data.filter((t: any) => t.is_active));
    if (progressRes) setUserProgress(progressRes);
    
    if (catsRes.data && catsRes.data.length > 0) {
      const dynamicCats = catsRes.data.map((c: any) => ({ id: c.name, label: c.name }));
      setCategories([{ id: 'all', label: '全部' }, ...dynamicCats]);
    } else {
      setCategories([
        { id: 'all', label: '全部' },
        { id: 'monthly', label: '月度限定' },
        { id: 'new_product', label: '新品系列' },
        { id: 'achievement', label: '成就系列' },
        { id: 'exclusive', label: '专属系列' }
      ]);
    }
    setLoading(false);
  };

  const handleClaimBadge = async (taskId: string, badgeId: string) => {
    setClaiming(taskId);
    try {
      const { error } = await api.claimBadge(user!.id, badgeId);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('勋章已成功领取！');
        fetchData(); // 刷新数据
      }
    } catch (e: any) {
      toast.error('领取失败，请稍后重试');
    } finally {
      setClaiming(null);
    }
  };

  const filteredBadges = allBadges.filter(b => activeTab === 'all' || b.category === activeTab);
  
  const isUnlocked = (badgeId: string) => userBadges.some(ub => ub.badge_id === badgeId);
  const getUnlockedInfo = (badgeId: string) => userBadges.find(ub => ub.badge_id === badgeId);

  const handleShowDetail = (badge: BadgeItem) => {
    setSelectedBadge(badge);
    setUnlockedInfo(getUnlockedInfo(badge.id) || null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20 safe-area-bottom">
      {/* 顶部背景装饰 */}
      <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-blue-600/20 via-slate-950 to-slate-950 pointer-events-none" />
      
      {/* 状态栏模拟/页面标题 */}
      <div className="relative z-10 p-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full text-white hover:bg-white/10"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black tracking-widest uppercase">我的勋章</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsTaskDialogOpen(true)}
          className="rounded-full text-white hover:bg-white/10 relative"
        >
          <ListChecks className="w-6 h-6" />
          {tasks.some(t => {
            const progress = userProgress[t.task_type] || 0;
            const canClaim = progress >= t.target_value && !isUnlocked(t.badge_id) && t.claim_type === 'manual';
            return canClaim;
          }) && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          )}
        </Button>
      </div>

      {/* 用户概况 */}
      <div className="relative z-10 px-6 pt-6 pb-12 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-2xl shadow-blue-500/30">
          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
             <div className="text-4xl">👑</div>
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-black">{user?.email?.split('@')[0]}</h2>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/10 text-blue-400 border-none rounded-full px-4 py-1 font-bold text-xs">
            已点亮 <span className="mx-1 text-sm">{userBadges.length}</span> 枚徽章
          </Badge>
        </div>
      </div>

      {/* 分类切换 */}
      <div className="relative z-10 sticky top-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-6 h-14">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={cn(
                "whitespace-nowrap text-sm font-bold transition-all relative h-full flex items-center",
                activeTab === cat.id ? "text-blue-400" : "text-slate-400"
              )}
            >
              {cat.label}
              {activeTab === cat.id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400 rounded-t-full shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 勋章网格展示区域 */}
      <div className="relative z-10 px-4 pt-8">
        {loading ? (
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex flex-col items-center gap-3">
                <Skeleton className="w-20 h-20 rounded-2xl bg-slate-900" />
                <Skeleton className="w-16 h-3 rounded-full bg-slate-900" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-y-10 gap-x-6">
            {filteredBadges.map(badge => {
              const unlocked = isUnlocked(badge.id);
              return (
                <button
                  key={badge.id}
                  onClick={() => handleShowDetail(badge)}
                  className="flex flex-col items-center gap-3 group active:scale-95 transition-transform"
                >
                  <div className={cn(
                    "w-20 h-20 rounded-2xl relative transition-all duration-500",
                    unlocked 
                      ? "shadow-[0_10px_25px_rgba(0,0,0,0.4)] group-hover:shadow-blue-500/20" 
                      : "grayscale opacity-40 grayscale-0-hover opacity-100-hover"
                  )}>
                    <img 
                      src={badge.image_url} 
                      alt={badge.name} 
                      className="w-full h-full object-contain rounded-2xl border border-white/5" 
                    />
                    {unlocked && (
                      <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-0.5 shadow-lg">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black tracking-tight text-center leading-tight max-w-[80px]",
                    unlocked ? "text-slate-200" : "text-slate-500"
                  )}>
                    {badge.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {filteredBadges.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
            <Award className="w-16 h-16 opacity-10" />
            <p className="text-sm font-bold">该系列暂无勋章可点亮</p>
          </div>
        )}
      </div>

      {/* 勋章详情弹窗 */}
      <Dialog open={!!selectedBadge} onOpenChange={(open) => !open && setSelectedBadge(null)}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-sm rounded-[40px] overflow-hidden sm:max-w-md">
          {selectedBadge && (
            <div className="bg-slate-950 text-white relative">
              <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-blue-600/30 to-slate-950" />
              <div className="absolute top-0 left-0 right-0 h-[300px] overflow-hidden opacity-30 pointer-events-none">
                <Sparkles className="w-full h-full text-blue-400 animate-pulse" />
              </div>
              
              <div className="relative pt-16 pb-10 px-8 flex flex-col items-center">
                <div className={cn(
                  "w-48 h-48 rounded-[40px] shadow-2xl relative transition-all duration-700",
                  unlockedInfo ? "shadow-blue-500/20" : "grayscale opacity-50"
                )}>
                  <img src={selectedBadge.image_url} alt={selectedBadge.name} className="w-full h-full object-contain rounded-[40px] border border-white/10" />
                  {unlockedInfo && <div className="absolute inset-0 rounded-[40px] border-2 border-blue-400/50 animate-pulse" />}
                </div>

                <div className="mt-10 text-center space-y-2">
                  <h3 className="text-3xl font-black tracking-tight flex items-center justify-center gap-2">
                    {unlockedInfo && <Star className="w-6 h-6 text-blue-400 fill-blue-400" />}
                    {selectedBadge.name}
                    {unlockedInfo && <Star className="w-6 h-6 text-blue-400 fill-blue-400" />}
                  </h3>
                  {unlockedInfo ? (
                    <p className="text-xs text-blue-400 font-bold tracking-widest flex items-center justify-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(unlockedInfo.granted_at).toLocaleDateString()} 点亮
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">未解锁</p>
                  )}
                </div>

                <div className="mt-8 text-center space-y-4 max-w-[260px]">
                  <p className="text-lg font-bold text-slate-200 leading-relaxed italic">
                    "{selectedBadge.description || '保持探索的热情，发现生活的每一份精彩。'}"
                  </p>
                  <div className="pt-4 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                      <Info className="w-3 h-3" /> 获取方式
                    </div>
                    <p className="text-xs text-slate-300 font-medium">{selectedBadge.acquisition_method || '参与平台活动获取'}</p>
                  </div>
                </div>

                <div className="mt-12 w-full flex gap-4">
                  <Button className="flex-1 h-14 rounded-full bg-slate-900 border border-white/10 text-white font-black hover:bg-slate-800 gap-2" onClick={() => { toast.success('分享链接已复制'); setSelectedBadge(null); }}>
                    <Share2 className="w-5 h-5" /> 炫耀一下
                  </Button>
                  {unlockedInfo && (
                    <Button className="flex-1 h-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black shadow-lg shadow-blue-500/20 gap-2" onClick={() => { toast.success('图片已保存至相册'); setSelectedBadge(null); }}>
                      <Download className="w-5 h-5" /> 保存图片
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 任务中心弹窗 */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="p-0 border-none bg-slate-950 text-white max-w-sm rounded-[32px] overflow-hidden sm:max-w-md">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              任务中心
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {tasks.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Timer className="w-12 h-12 mx-auto opacity-20 mb-2" />
                <p className="text-sm">暂无勋章任务，敬请期待</p>
              </div>
            ) : (
              tasks.map(task => {
                const progress = userProgress[task.task_type] || 0;
                const percentage = Math.min(100, (progress / task.target_value) * 100);
                const unlocked = isUnlocked(task.badge_id);
                const canClaim = progress >= task.target_value && !unlocked && task.claim_type === 'manual';
                
                const typeLabels: Record<string, string> = {
                  'upload_count': '累计上传审核通过',
                  'favorite_count': '获得收藏总数',
                  'checkin_count': '累计签到天数'
                };

                return (
                  <div key={task.id} className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-12 h-12 rounded-xl border border-white/10 p-1", !unlocked && "grayscale opacity-50")}>
                        <img src={task.badges?.image_url} alt={task.badges?.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate">{task.badges?.name}</h4>
                        <p className="text-[10px] text-slate-400">
                          {typeLabels[task.task_type] || task.task_type} 达到 {task.target_value}
                        </p>
                      </div>
                      {unlocked && <Badge className="bg-green-500/20 text-green-400 border-none text-[10px]">已达成</Badge>}
                    </div>
                    
                    {!unlocked && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-400">当前进度: {progress} / {task.target_value}</span>
                          <span className={cn(progress >= task.target_value ? "text-blue-400" : "text-slate-500")}>
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        
                        {task.claim_type === 'manual' ? (
                          <Button 
                            disabled={!canClaim || !!claiming}
                            onClick={() => handleClaimBadge(task.id, task.badge_id)}
                            className={cn(
                              "w-full h-9 rounded-xl font-bold text-xs transition-all",
                              canClaim 
                                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                                : "bg-white/5 text-slate-500 border border-white/5"
                            )}
                          >
                            {claiming === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (canClaim ? '立即领取' : '未达成')}
                          </Button>
                        ) : (
                          <div className="text-[10px] text-center text-slate-500 py-1 italic bg-white/5 rounded-lg border border-white/5">
                            满足条件后自动发放
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter className="p-4 border-t border-white/5">
            <Button 
              variant="ghost" 
              onClick={() => setIsTaskDialogOpen(false)}
              className="w-full h-12 rounded-2xl font-bold text-slate-400 hover:text-white"
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 获得勋章弹窗提示 */}
      <Dialog open={!!newBadgeUnlocked} onOpenChange={o => !o && setNewBadgeUnlocked(null)}>
        <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-sm rounded-[40px] overflow-hidden">
          <div className="relative bg-slate-900/95 backdrop-blur-3xl p-10 flex flex-col items-center text-center border border-white/10 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-600/30 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10 space-y-8 w-full">
              <div className="relative w-48 h-48 mx-auto group">
                 <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-[60px] animate-pulse group-hover:blur-[80px] transition-all" />
                 <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-yellow-400 animate-bounce" />
                 <img src={newBadgeUnlocked?.image_url} className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-white tracking-tighter">荣誉时刻！</h3>
                <div className="py-2 px-4 bg-blue-500/20 rounded-2xl inline-block border border-blue-500/20">
                  <p className="text-blue-400 font-black text-xl">获得【{newBadgeUnlocked?.name}】</p>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed px-4">{newBadgeUnlocked?.description}</p>
              </div>
              <Button 
                className="w-full h-16 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] transition-all active:scale-95"
                onClick={() => setNewBadgeUnlocked(null)}
              >
                收下这份荣誉
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
