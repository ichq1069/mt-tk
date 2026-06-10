import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RankingItem {
  id: string;
  username: string;
  avatar_url?: string;
  continuous_read_days: number;
  total_read_days?: number;
}

interface ReadingRankingProps {
  ranking: RankingItem[];
  userRank?: { rank: number; continuous_read_days: number; total_read_days: number } | null;
  activeType: 'continuous' | 'total';
  onTypeChange: (type: 'continuous' | 'total') => void;
  className?: string;
}

export function ReadingRanking({ ranking, userRank, activeType, onTypeChange, className }: ReadingRankingProps) {
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1: return <Medal className="w-5 h-5 text-slate-400" />;
      case 2: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="text-xs font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
    }
  };

  return (
    <Card className={cn("border-none shadow-xl rounded-[2.5rem] bg-white/80 dark:bg-black/60 backdrop-blur-xl overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            阅读排行榜
          </CardTitle>
          <div className="flex bg-muted/50 p-1 rounded-xl">
            <button 
              onClick={() => onTypeChange('continuous')}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                activeType === 'continuous' ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              连续
            </button>
            <button 
              onClick={() => onTypeChange('total')}
              className={cn(
                "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                activeType === 'total' ? "bg-white dark:bg-zinc-800 shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              累计
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground font-medium">
          {activeType === 'continuous' ? "连续查看天数前10名 (0点更新)" : "累计查看天数前10名"}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {ranking.length > 0 ? (
          <div className="space-y-2">
            {ranking.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 flex justify-center">
                    {getRankIcon(index)}
                  </div>
                  <Avatar className="w-8 h-8 rounded-xl border border-border/50">
                    <AvatarImage src={item.avatar_url} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-[10px]">
                      {item.username?.substring(0, 1) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-bold truncate max-w-[100px]">{item.username || '匿名用户'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black text-primary">
                    {activeType === 'continuous' ? item.continuous_read_days : (item.total_read_days || 0)}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">天</span>
                </div>
              </div>
            ))}

            {userRank && (
              <>
                <div className="h-px bg-border/50 my-2" />
                <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-6 flex justify-center">
                      <span className="text-xs font-bold text-primary">{userRank.rank}</span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-black text-primary">我的排名</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-primary">
                      {activeType === 'continuous' ? userRank.continuous_read_days : (userRank.total_read_days || 0)}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">天</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-xs italic">
            暂无排行榜数据
          </div>
        )}
      </CardContent>
    </Card>
  );
}
