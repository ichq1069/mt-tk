import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';

export interface CacheStats {
  stat_time: string;
  total_requests: number;
  hit_count: number;
  miss_count: number;
  hit_rate: number;
}

export function useRealtimeCacheStats() {
  const [stats, setStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    // 1. 获取最新统计数据
    const fetchLatestStats = async () => {
      const { data, error } = await supabase
        .from('explore_cache_stats')
        .select('*')
        .order('stat_time', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) setStats(data);
    };

    fetchLatestStats();

    /*
    // 已根据用户要求移除 WSS (Realtime) 相关逻辑
    // 2. 订阅实时更新
    const channel = supabase
      .channel('explore-cache-stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'explore_cache_stats'
        },
        (payload) => {
          console.debug('[Realtime Stats] 缓存统计更新:', payload);
          if (payload.new) {
            setStats(payload.new as CacheStats);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    */
    return () => {};
  }, []);

  return stats;
}
