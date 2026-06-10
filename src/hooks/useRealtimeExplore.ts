import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/db/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MediaItem } from '@/types';

interface UseRealtimeExploreOptions {
  onNewApprovedItem?: (item: MediaItem) => void;
  enabled?: boolean;
  showNotification?: boolean;
}

/**
 * 监听探索页面的实时更新
 * 只监听新审核通过的内容
 */
export function useRealtimeExplore(options: UseRealtimeExploreOptions = {}) {
  const {
    onNewApprovedItem,
    enabled = true,
    showNotification = true
  } = options;

  const [newItemsCount, setNewItemsCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onNewApprovedItem);

  // 更新回调引用
  useEffect(() => {
    callbackRef.current = onNewApprovedItem;
  }, [onNewApprovedItem]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = 'explore-updates';

    console.debug('[Realtime] 订阅探索页频道:', channelName);

    // 创建 Realtime 订阅
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件，包括 INSERT 和 UPDATE
          schema: 'public',
          table: 'media_items',
          // 只有当状态为 approved 时才触发
          filter: 'status=eq.approved'
        },
        (payload: any) => {
          console.debug('[Realtime] 探索页收到变更:', payload);
          
          const { eventType, new: newRecord, old: oldRecord } = payload;

          // 处理 INSERT: 只要是新的 approved 内容
          if (eventType === 'INSERT' && newRecord?.status === 'approved') {
            const newItem = newRecord as MediaItem;
            setNewItemsCount(prev => prev + 1);
            if (callbackRef.current) callbackRef.current(newItem);
          }
          // 处理 UPDATE: 只有从非 approved 变为 approved 的情况
          else if (eventType === 'UPDATE' && oldRecord?.status !== 'approved' && newRecord?.status === 'approved') {
            const newItem = newRecord as MediaItem;
            setNewItemsCount(prev => prev + 1);
            if (callbackRef.current) callbackRef.current(newItem);
          }
        }
      )
      .subscribe((status) => {
        console.debug('[Realtime] 探索页订阅状态:', status);
      });

    channelRef.current = channel;

    // 清理函数
    return () => {
      console.debug('[Realtime] 取消订阅探索页频道:', channelName);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled]);

  // 重置新内容计数
  const resetNewItemsCount = () => {
    setNewItemsCount(0);
  };

  return {
    isSubscribed: channelRef.current !== null,
    newItemsCount,
    resetNewItemsCount
  };
}
