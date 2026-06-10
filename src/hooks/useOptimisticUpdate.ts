import { useEffect, useRef } from 'react';

interface UseOptimisticUpdateOptions<T> {
  onUpdate: (data: T) => Promise<void>;
  onRollback?: (error: any) => void;
}

export function useOptimisticUpdate<T>({ onUpdate, onRollback }: UseOptimisticUpdateOptions<T>) {
  const previousDataRef = useRef<T | null>(null);

  const update = async (newData: T, optimisticUpdate: () => void) => {
    // 保存当前数据
    previousDataRef.current = newData;
    
    // 立即更新 UI（乐观更新）
    optimisticUpdate();

    try {
      // 执行实际的后端更新
      await onUpdate(newData);
    } catch (error) {
      // 如果失败，回滚到之前的状态
      if (onRollback && previousDataRef.current) {
        onRollback(error);
      }
      throw error;
    }
  };

  return { update };
}
