import { useEffect, useRef } from 'react';
import { supabase } from '@/db/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { AppNotification } from '@/types';
import { enhancedNotification } from '@/lib/enhanced-notification';

interface UseRealtimeNotificationsOptions {
  userId?: string;
  onNewNotification?: (notification: AppNotification) => void;
  enabled?: boolean;
}

/**
 * 监听 notifications 表的实时变化
 * 用于实时接收新通知
 */
export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const {
    userId,
    onNewNotification,
    enabled = true
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onNewNotification);

  // 更新回调引用
  useEffect(() => {
    callbackRef.current = onNewNotification;
  }, [onNewNotification]);

  useEffect(() => {
    if (!enabled || !userId) return;

    /*
    // 已根据用户要求移除 WSS (Realtime) 相关逻辑
    const channelName = `notifications-user-${userId}`;

    console.debug('[Realtime] 订阅通知频道:', channelName);

    // 创建 Realtime 订阅
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          console.debug('[Realtime] 收到新通知:', payload);
          
          const newNotification = payload.new as AppNotification;

          // 调用回调
          if (callbackRef.current) {
            callbackRef.current(newNotification);
          }

          // 使用增强通知系统显示
          enhancedNotification.showSystem(
            newNotification.title,
            newNotification.content,
            newNotification
          );
        }
      )
      .subscribe((status) => {
        console.debug('[Realtime] 通知订阅状态:', status);
        
        if (status === 'SUBSCRIBED') {
          console.debug('[Realtime] 成功订阅通知频道:', channelName);
        }
      });

    channelRef.current = channel;

    // 清理函数
    return () => {
      console.debug('[Realtime] 取消订阅通知频道:', channelName);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    */
    return () => {};
  }, [userId, enabled]);

  return {
    isSubscribed: channelRef.current !== null
  };
}
