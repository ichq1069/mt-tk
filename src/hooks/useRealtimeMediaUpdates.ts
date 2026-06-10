import { useEffect, useRef } from 'react';
import { supabase } from '@/db/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MediaItem } from '@/types';
import { enhancedNotification } from '@/lib/enhanced-notification';

interface MediaUpdatePayload {
  new: MediaItem;
  old: MediaItem;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

interface UseRealtimeMediaUpdatesOptions {
  userId?: string;
  onApproved?: (item: MediaItem) => void;
  onRejected?: (item: MediaItem) => void;
  onNewItem?: (item: MediaItem) => void;
  onUpdate?: (item: MediaItem) => void;
  enabled?: boolean;
}

/**
 * 监听 media_items 表的实时变化
 * 用于实时通知用户内容审核状态变化
 */
export function useRealtimeMediaUpdates(options: UseRealtimeMediaUpdatesOptions = {}) {
  const {
    userId,
    onApproved,
    onRejected,
    onNewItem,
    onUpdate,
    enabled = true
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef({ onApproved, onRejected, onNewItem, onUpdate });

  // 更新回调引用
  useEffect(() => {
    callbacksRef.current = { onApproved, onRejected, onNewItem, onUpdate };
  }, [onApproved, onRejected, onNewItem, onUpdate]);

  useEffect(() => {
    if (!enabled) return;

    /*
    // 已根据用户要求移除 WSS (Realtime) 相关逻辑
    // 创建唯一的 channel 名称
    const channelName = userId 
      ? `media-updates-user-${userId}` 
      : 'media-updates-global';

    console.debug('[Realtime] 订阅频道:', channelName);

    // 创建 Realtime 订阅
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_items',
          // 如果指定了 userId，只监听该用户的内容
          ...(userId ? { filter: `user_id=eq.${userId}` } : {})
        },
        (payload: any) => {
          console.debug('[Realtime] 收到变化:', payload);
          
          const { new: newRecord, old: oldRecord, eventType } = payload;

          // INSERT 事件 - 新内容创建
          if (eventType === 'INSERT' && newRecord) {
            if (callbacksRef.current.onNewItem) {
              callbacksRef.current.onNewItem(newRecord as MediaItem);
            }
          }

          // UPDATE 事件 - 状态变化
          if (eventType === 'UPDATE' && newRecord && oldRecord) {
            const statusChanged = oldRecord.status !== newRecord.status;
            
            if (statusChanged) {
              // 审核通过
              if (newRecord.status === 'approved' && oldRecord.status === 'pending') {
                if (callbacksRef.current.onApproved) {
                  callbacksRef.current.onApproved(newRecord as MediaItem);
                }
                
                // 如果是当前用户的内容，显示增强通知
                if (userId && newRecord.user_id === userId) {
                  enhancedNotification.showApproval(
                    newRecord.title || '未命名',
                    '内容已发布到探索页'
                  );
                }
              }
              
              // 审核拒绝
              if (newRecord.status === 'rejected' && oldRecord.status === 'pending') {
                if (callbacksRef.current.onRejected) {
                  callbacksRef.current.onRejected(newRecord as MediaItem);
                }
                
                // 如果是当前用户的内容，显示增强通知
                if (userId && newRecord.user_id === userId) {
                  enhancedNotification.showRejection(
                    newRecord.rejection_reason || newRecord.reason || '请修改后重新上传',
                    newRecord.title || '未命名'
                  );
                }
              }
            }

            // 通用更新回调
            if (callbacksRef.current.onUpdate) {
              callbacksRef.current.onUpdate(newRecord as MediaItem);
            }
          }
        }
      )
      .subscribe((status) => {
        console.debug('[Realtime] 订阅状态:', status);
        
        if (status === 'SUBSCRIBED') {
          console.debug('[Realtime] 成功订阅频道:', channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] 频道错误');
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] 订阅超时');
        }
      });

    channelRef.current = channel;

    // 清理函数
    return () => {
      console.debug('[Realtime] 取消订阅频道:', channelName);
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
