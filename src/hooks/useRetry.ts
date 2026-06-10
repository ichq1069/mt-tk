import { useCallback, useRef } from 'react';

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
}

export function useRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options;
  const attemptRef = useRef(0);

  const retryFn = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        const result = await fn(...args);
        attemptRef.current = 0; // 重置计数
        return result;
      } catch (error) {
        attemptRef.current += 1;
        
        if (attemptRef.current < maxRetries) {
          onRetry?.(attemptRef.current);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attemptRef.current));
          return retryFn(...args);
        }
        
        attemptRef.current = 0;
        throw error;
      }
    },
    [fn, maxRetries, retryDelay, onRetry]
  ) as T;

  return retryFn;
}
