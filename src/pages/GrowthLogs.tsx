import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { GrowthLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, History, ChevronLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import { SystemText } from '@/components/common/KeywordText';

export default function GrowthLogs() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [ranks, setRanks] = useState<any[]>([]);
  const limit = 20;

  useEffect(() => {
    if (user) {
      fetchLogs(0);
      fetchRanks();
    }
  }, [user]);

  const fetchRanks = async () => {
    try {
      const { data } = await api.getRanks();
      if (data) setRanks(data);
    } catch (err) {
      console.error('Failed to fetch ranks:', err);
    }
  };

  const getReasonLabel = (reason: string) => {
    const mapping: Record<string, string> = {
      'system/daily_login': '每日登录奖励',
      'system/check_in': '每日签到',
      'system/image_publish': '发布图片奖励',
      'system/video_publish': '发布视频奖励',
      'system/invite_user': '邀请好友奖励',
      'system/admin_adjust': '管理员手动调整',
      'system/level_up': '等级提升奖励',
      'system/comment_approved': '评论被审核通过',
      'system/download_media': '下载作品消耗',
      'system/gift_points': '兑换码奖励'
    };

    if (mapping[reason]) return mapping[reason];
    
    // 处理带 ID 的动态原因
    if (reason.startsWith('post_')) return '发布作品获得成长';
    if (reason.startsWith('invite_')) return '成功邀请好友获得成长';

    return reason || '系统调整';
  };

  const getTypeLabel = (type: string) => {
    const mapping: Record<string, string> = {
      'reward': '奖励',
      'penalty': '惩罚',
      'adjustment': '调整',
      'consume': '消耗',
      'daily': '日常'
    };
    return mapping[type] || type;
  };

  const getNextRankInfo = () => {
    if (!profile || ranks.length === 0) return null;
    const currentExp = profile.exp || 0;
    const sortedRanks = [...ranks].sort((a, b) => a.min_exp - b.min_exp);
    const nextRank = sortedRanks.find(r => r.min_exp > currentExp);
    
    if (!nextRank) return { isMax: true };

    const currentRank = [...sortedRanks].reverse().find(r => r.min_exp <= currentExp) || sortedRanks[0];
    const range = nextRank.min_exp - currentRank.min_exp;
    const progress = currentExp - currentRank.min_exp;
    const percent = Math.min(Math.max((progress / range) * 100, 0), 100);

    return {
      nextRankName: nextRank.name,
      neededExp: nextRank.min_exp - currentExp,
      percent
    };
  };

  const nextRankInfo = getNextRankInfo();

  const fetchLogs = async (pageNum: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error, count } = await api.getUserGrowthLogs(user.id, pageNum, limit);
      if (error) throw error;
      
      if (pageNum === 0) {
        setLogs(data || []);
      } else {
        setLogs(prev => [...prev, ...(data || [])]);
      }
      
      setHasMore((data || []).length === limit);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch growth logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchLogs(page + 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40 h-14 flex items-center px-4 gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold tracking-tight"><SystemText>成长值</SystemText>记录</h1>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* User Summary */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-[2rem] overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-indigo-100 text-sm font-medium">当前<SystemText>成长值</SystemText></p>
                <h2 className="text-4xl font-black">{profile?.exp || 0}</h2>
              </div>
              <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* 进度条与下一级提示 */}
            {nextRankInfo && !nextRankInfo.isMax && (
              <div className="mt-8 space-y-3">
                <div className="flex justify-between items-end">
                  <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest opacity-80">成长进度</p>
                  <p className="text-white text-xs font-black">
                    距离 <span className="text-yellow-300">{nextRankInfo.nextRankName}</span> 还需 {nextRankInfo.neededExp}
                  </p>
                </div>
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 backdrop-blur-sm border border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 rounded-full shadow-[0_0_10px_rgba(253,224,71,0.5)] transition-all duration-1000 ease-out"
                    style={{ width: `${nextRankInfo.percent}%` }}
                  />
                </div>
              </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
              <p className="text-indigo-100 text-xs font-medium">当前等级: <span className="text-white font-bold ml-1 uppercase">{profile?.rank || '普通用户'}</span></p>
              {nextRankInfo?.isMax && <span className="text-[10px] px-2 py-0.5 bg-yellow-400/20 rounded-full text-yellow-300 font-bold border border-yellow-400/20">已满级</span>}
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">最近变动</h3>
          </div>

          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      log.amount > 0 ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                    )}>
                      {log.amount > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="font-bold text-slate-800 truncate text-sm">
                          <SystemText>{getReasonLabel(log.reason)}</SystemText>
                        </h4>
                        <span className={cn(
                          "font-black text-sm tabular-nums",
                          log.amount > 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {log.amount > 0 ? '+' : ''}{log.amount}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm')}
                        </div>
                        <div className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-bold uppercase tracking-tighter">
                          {getTypeLabel(log.type)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {hasMore && (
                <Button 
                  variant="ghost" 
                  className="w-full h-12 rounded-2xl text-slate-500 font-bold hover:bg-slate-100 mt-2"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '加载更多记录'}
                </Button>
              )}
            </div>
          ) : (
            !loading && (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <History className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold">暂无<SystemText>成长值</SystemText>变动记录</p>
              </div>
            )
          )}

          {loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
              <p className="text-slate-400 font-medium animate-pulse">正在获取记录...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
