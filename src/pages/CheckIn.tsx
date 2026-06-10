import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, CheckCircle2, ChevronLeft, Loader2, Sparkles, Trophy, 
  ArrowLeft, CalendarCheck, Flame, History, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, getBeijingDate } from '@/lib/utils';
import { SystemText } from '@/components/common/KeywordText';

export default function CheckIn() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkInLogs, setCheckInLogs] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchData();
      // 追踪页面浏览
      (window as any).pixelTrack?.('check_in_view');
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ hasCheckedIn: checked }, { data: logs }] = await Promise.all([
        api.getCheckInStatus(user!.id),
        api.getCheckInHistory(user!.id)
      ]);
      
      setHasCheckedIn(checked);
      setCheckInLogs(logs || []);
      setTotalCount(logs?.length || 0);
      
      // 计算连续签到
      let currentStreak = 0;
      if (logs && logs.length > 0) {
        const sortedLogs = [...logs].sort((a, b) => new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime());
        const today = getBeijingDate();
        // 昨天：先转 Date，减 24 小时，再转北京日期字符串
        const todayDate = new Date(new Intl.DateTimeFormat("en-US", {timeZone: 'Asia/Shanghai'}).format(new Date()));
        const yesterdayDate = new Date(todayDate.getTime() - 86400000);
        const yesterday = new Intl.DateTimeFormat("en-CA", {year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Shanghai'}).format(yesterdayDate);
        
        if (sortedLogs[0].check_in_date === today || sortedLogs[0].check_in_date === yesterday) {
          currentStreak = 1;
          for (let i = 0; i < sortedLogs.length - 1; i++) {
            const current = new Date(sortedLogs[i].check_in_date);
            const prev = new Date(sortedLogs[i+1].check_in_date);
            const diffDays = Math.floor((current.getTime() - prev.getTime()) / (1000 * 3600 * 24));
            if (diffDays === 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }
      setStreak(currentStreak);
    } catch (e) {
      console.error(e);
      toast.error('数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (hasCheckedIn || checking) return;
    
    setChecking(true);
    try {
      const { data, error } = await api.performCheckIn(user!.id);
      if (!error) {
        toast.success('签到成功');
        (window as any).pixelTrack?.('check_in', { points: data?.points_earned || 10 });
        setHasCheckedIn(true);
        fetchData();
        refreshProfile();
      } else {
        // 读取边缘函数返回的错误详情
        let errorMsg = '签到失败';
        try {
          const responseText = typeof error?.context?.text === "function" ? await error.context.text() : error?.message;
          if (responseText) {
            const body = JSON.parse(responseText);
            errorMsg = body.error || error.message;
          } else {
            errorMsg = error.message || '签到失败';
          }
        } catch {
          errorMsg = error.message || '签到失败';
        }
        toast.error(errorMsg);
      }
    } catch (e: any) {
      toast.error(e.message || '网络请求错误');
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-xs text-muted-foreground font-medium">载入中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40 h-14 flex items-center px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full shrink-0 mr-2">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-black tracking-tight">签到中心</h1>
      </header>

      <div className="pt-20 px-4 container max-w-lg mx-auto">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-[2.5rem] p-8 text-center border border-primary/10 relative overflow-hidden mb-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="w-20 h-20 bg-background rounded-3xl shadow-xl border border-primary/20 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-75 duration-500">
              <CalendarCheck className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black mb-1">
              {hasCheckedIn ? '今日已签到' : '每日一签'}
            </h2>
            <p className="text-xs text-muted-foreground mb-8">
              {hasCheckedIn ? '坚持就是胜利，明天再来哦' : '完成签到即可获得随机积分奖励'}
            </p>

            <Button 
              className={cn(
                "w-full h-14 rounded-2xl text-lg font-black shadow-xl transition-all active:scale-95",
                hasCheckedIn ? "bg-muted text-muted-foreground cursor-default" : "bg-primary text-primary-foreground shadow-primary/30"
              )}
              disabled={hasCheckedIn || checking}
              onClick={handleCheckIn}
            >
              {checking ? <Loader2 className="w-6 h-6 animate-spin" /> : (hasCheckedIn ? '已签到' : '立即签到')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="border-none shadow-sm rounded-3xl bg-muted/30">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1 text-primary">
                <Flame className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  <SystemText>连续签到</SystemText>
                </span>
              </div>
              <div className="text-2xl font-black">{streak} <span className="text-xs text-muted-foreground font-medium">天</span></div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm rounded-3xl bg-muted/30">
            <CardContent className="p-4 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-1 text-amber-500">
                <Trophy className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">累计签到</span>
              </div>
              <div className="text-2xl font-black">{totalCount} <span className="text-xs text-muted-foreground font-medium">次</span></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              签到记录
            </h3>
          </div>

          <div className="space-y-2">
            {checkInLogs.length === 0 ? (
              <div className="py-12 text-center bg-muted/20 rounded-3xl border border-dashed border-border">
                <p className="text-xs text-muted-foreground">暂无记录，快去签到吧</p>
              </div>
            ) : (
              checkInLogs.slice(0, 10).map((log, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border/40">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">
                        <SystemText>每日签到</SystemText>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{log.check_in_date}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none font-black">
                    +{log.points_earned || 10}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
