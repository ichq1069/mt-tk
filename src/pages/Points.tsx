import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Trophy, ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { SystemText } from '@/components/common/KeywordText';

export default function Points() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.getPointsLogs(user?.id);
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40 h-14 flex items-center px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2 rounded-full h-10 w-10">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-black tracking-tight">积分记录</h1>
      </header>

      <div className="pt-20 px-4 pb-20 space-y-6">
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-[2rem] border-none shadow-xl shadow-amber-500/20 text-white relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest mt-2">当前可用积分</p>
            <h2 className="text-4xl font-black tabular-nums">{profile?.points || 0}</h2>
          </div>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-black text-muted-foreground px-1 uppercase tracking-wider">最近变动记录</h3>
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center opacity-40">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-xs font-bold mt-4">同步中...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
              <p className="text-sm font-bold text-muted-foreground">暂无积分记录</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">签到或发布内容赚取积分吧</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-card border border-border/40 rounded-3xl shadow-sm transition-all hover:border-amber-500/20 group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                      log.amount > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                    )}>
                      {log.amount > 0 ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black">
                        <SystemText>{log.reason || '积分变动'}</SystemText>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">{new Date(log.created_at).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "text-base font-black tabular-nums",
                    log.amount > 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {log.amount > 0 ? '+' : ''}{log.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
