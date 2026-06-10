import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * 瀑布流滚动与状态保持 Hook
 * 支持三层兜底：内存、sessionStorage、bfcache
 */

interface ScrollKeepOptions<T> {
  key: string;              // 缓存键名
  data: T;                  // 当前列表数据
  onRestore: (data: T) => void; // 恢复数据时的回调
  scrollSelector?: string;  // 滚动容器选择器，默认为 window
  debounceTime?: number;    // 恢复滚动时的防抖延时
  enabled?: boolean;        // 是否启用
}

export function useWaterfallScrollKeep<T>({
  key,
  data,
  onRestore,
  scrollSelector,
  debounceTime = 100,
  enabled = true
}: ScrollKeepOptions<T>) {
  const location = useLocation();
  const navType = useNavigationType();
  const isRestored = useRef(false);
  const scrollTimer = useRef<any>(null);

  // 获取滚动高度
  const getScrollPos = useCallback(() => {
    if (scrollSelector) {
      const el = document.querySelector(scrollSelector);
      return el ? el.scrollTop : 0;
    }
    return window.scrollY || document.documentElement.scrollTop;
  }, [scrollSelector]);

  // 设置滚动高度
  const setScrollPos = useCallback((pos: number) => {
    if (scrollSelector) {
      const el = document.querySelector(scrollSelector);
      if (el) el.scrollTop = pos;
    } else {
      window.scrollTo({ top: pos, behavior: 'instant' as any });
    }
  }, [scrollSelector]);

  // 保存状态到 sessionStorage
  const saveState = useCallback(() => {
    if (!enabled) return;
    const state = {
      data,
      scrollPos: getScrollPos(),
      timestamp: Date.now(),
      pathname: location.pathname
    };
    try {
      sessionStorage.setItem(`scroll_keep_${key}`, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to sessionStorage', e);
    }
  }, [enabled, key, data, getScrollPos, location.pathname]);

  // 恢复状态
  const restoreState = useCallback(() => {
    if (!enabled || isRestored.current) return;

    // 仅在返回（POP）或初次进入时尝试恢复
    if (navType !== 'POP' && navType !== 'PUSH') return;

    const saved = sessionStorage.getItem(`scroll_keep_${key}`);
    if (!saved) return;

    try {
      const state = JSON.parse(saved);
      // 检查路径是否匹配，防止跨页面干扰
      if (state.pathname !== location.pathname) return;

      // 检查过期时间（2小时）
      if (Date.now() - state.timestamp > 2 * 60 * 60 * 1000) {
        sessionStorage.removeItem(`scroll_keep_${key}`);
        return;
      }

      // 1. 恢复数据
      if (state.data) {
        isRestored.current = true; // 先标记已恢复，防止 onRestore 触发重渲染导致无限循环
        onRestore(state.data);
      }

      // 2. 恢复滚动高度（需要防抖确保内容渲染完成）
      if (state.scrollPos > 0) {
        if (scrollTimer.current) clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => {
          setScrollPos(state.scrollPos);
        }, debounceTime);
      }
    } catch (e) {
      console.error('Failed to restore state from sessionStorage', e);
    }
  }, [enabled, key, navType, location.pathname, onRestore, setScrollPos, debounceTime]);

  // 监听多重触发场景进行保存
  useEffect(() => {
    if (!enabled) return;

    // 1. 路由变化前保存（卸载时）
    return () => {
      saveState();
    };
  }, [saveState, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // 2. 页面可见性变化时保存（如切到后台）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveState();
      }
    };

    // 3. bfcache 辅助：页面显示时（包括从缓存恢复）
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // 从 bfcache 恢复，通常不需要手动处理，但可以确保万无一失
        restoreState();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('beforeunload', saveState);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('beforeunload', saveState);
    };
  }, [saveState, restoreState, enabled]);

  // 组件挂载时执行恢复
  useEffect(() => {
    restoreState();
  }, [restoreState]);

  return {
    saveState,
    restoreState
  };
}
