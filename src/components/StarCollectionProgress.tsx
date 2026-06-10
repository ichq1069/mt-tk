import React, { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Star, Trophy, Gift, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function StarCollectionProgress() {
  const { user } = useAuth();
  const [activity, setActivity] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchProgress();
  }, [user]);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const now = new Date().toISOString();
      
      // 1. 获取当前进行的活动
      const { data: activities, error: actError } = await supabase
        .from('star_hunt_activity_configs')
        .select('*')
        .eq('is_active', true)
        .lte('start_at', now)
        .or(`end_at.is.null,end_at.gt.${now}`)
        .limit(1);

      if (actError) throw actError;
      if (!activities || activities.length === 0) {
        setActivity(null);
        return;
      }

      const activeAct = activities[0] as any;
      setActivity(activeAct);

      if (!user) return;

      // 2. 获取用户的收集记录
      const { data: records, error: recError } = await supabase
        .from('star_hunt_collection_records')
        .select('*')
        .eq('activity_id', activeAct.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (recError) throw recError;
      setRecord(records);

    } catch (e) {
      console.error('Fetch star progress error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center bg-card/50 backdrop-blur-sm border-none shadow-sm rounded-3xl">
        <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
      </Card>
    );
  }

  if (!activity) return null;

  const count = record?.collected_count || 0;
  const target = activity.target_count || 10;
  const percentage = Math.min((count / target) * 100, 100);

  return (
    <Card className="p-4 relative overflow-hidden border-none shadow-lg rounded-3xl bg-gradient-to-br from-indigo-600/10 via-background to-background group">
      {/* 装饰性背景 */}
      <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
        <Star className="w-20 h-20 text-yellow-500 fill-yellow-500 rotate-12" />
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="relative shrink-0">
          <motion.div
            animate={{ 
              y: [0, -5, 0],
              rotate: [0, 2, -2, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border border-border/40"
          >
            {activity.bottle_icon_url ? (
              <img src={activity.bottle_icon_url} className="w-12 h-12 object-contain" alt="Bottle" />
            ) : (
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-400/20 rounded-lg" style={{ height: `${percentage}%`, bottom: 0, top: 'auto' }} />
                <Trophy className="w-8 h-8 text-yellow-500 relative z-10" />
              </div>
            )}
          </motion.div>
          {percentage >= 100 && (
            <div className="absolute -top-2 -right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
              <Gift className="w-3 h-3" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-foreground flex items-center gap-2">
              {activity.name}
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">进行中</Badge>
            </h4>
            <span className="text-sm font-black text-primary tabular-nums">
              {count} <span className="text-muted-foreground font-medium italic">/ {target}</span>
            </span>
          </div>
          
            <div className="space-y-1">
              <Progress value={percentage} className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${percentage}%` }} />
              </Progress>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  {percentage >= 100 ? '恭喜！已完成任务' : `再收集 ${target - count} 个特控⭐即可获得奖励`}
                </p>
                {percentage < 100 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 px-2 text-[9px] font-bold text-primary hover:bg-primary/10 rounded-full"
                    onClick={() => window.location.href = '/'}
                  >
                    去寻找 <ChevronRight className="w-2 h-2 ml-0.5" />
                  </Button>
                )}
              </div>
            </div>
        </div>
      </div>
    </Card>
  );
}
