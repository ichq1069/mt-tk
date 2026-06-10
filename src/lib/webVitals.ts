import { supabase } from '@/db/supabase';

// 性能监控工具
export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

// LCP (Largest Contentful Paint) 阈值
const LCP_THRESHOLDS = { good: 2500, poor: 4000 };

// FID (First Input Delay) 阈值
const FID_THRESHOLDS = { good: 100, poor: 300 };

// CLS (Cumulative Layout Shift) 阈值
const CLS_THRESHOLDS = { good: 0.1, poor: 0.25 };

// FCP (First Contentful Paint) 阈值
const FCP_THRESHOLDS = { good: 1800, poor: 3000 };

// TTFB (Time to First Byte) 阈值
const TTFB_THRESHOLDS = { good: 800, poor: 1800 };

function getRating(value: number, thresholds: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

export function reportWebVitals(onReport?: (metric: WebVitalsMetric) => void) {
  if (!onReport || typeof window === 'undefined') return;

  // 监控 LCP
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        const value = lastEntry.renderTime || lastEntry.loadTime;
        
        onReport({
          name: 'LCP',
          value,
          rating: getRating(value, LCP_THRESHOLDS),
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.warn('LCP monitoring not supported');
    }

    // 监控 FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const value = entry.processingStart - entry.startTime;
          
          onReport({
            name: 'FID',
            value,
            rating: getRating(value, FID_THRESHOLDS),
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.warn('FID monitoring not supported');
    }

    // 监控 CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        onReport({
          name: 'CLS',
          value: clsValue,
          rating: getRating(clsValue, CLS_THRESHOLDS),
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('CLS monitoring not supported');
    }

    // 监控 FCP
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          onReport({
            name: 'FCP',
            value: entry.startTime,
            rating: getRating(entry.startTime, FCP_THRESHOLDS),
          });
        });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('FCP monitoring not supported');
    }
  }

  // 监控 TTFB
  if ('performance' in window && 'timing' in window.performance) {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart;
        
        onReport({
          name: 'TTFB',
          value: ttfb,
          rating: getRating(ttfb, TTFB_THRESHOLDS),
        });
      }
    });
  }
}

const reportedMetrics = new Set<string>();

export async function sendToAnalytics(metric: WebVitalsMetric) {
  const { name, value, rating } = metric;
  
  // 避免重复上报相同评分的相同指标 (每个会话周期内)
  const reportKey = `${name}-${rating}`;
  if (reportedMetrics.has(reportKey)) {
    return;
  }
  
  if (import.meta.env.DEV) {
    console.debug(`[Web Vitals] ${name}:`, {
      value: `${value.toFixed(2)}ms`,
      rating,
    });
  }
  
  reportedMetrics.add(reportKey);
  
  // 发送到 Supabase
  try {
    const sessionId = (window as any).__session_id;
    await (supabase.from('web_vitals_logs') as any).insert([{
      name,
      value,
      rating,
      user_agent: navigator.userAgent,
      path: window.location.pathname,
      session_id: sessionId
    }]);
  } catch (e) {
    // 失败时不影响主流程
    console.warn('Failed to report performance metrics', e);
    // 失败时移除标记，允许重试
    reportedMetrics.delete(reportKey);
  }
}

/**
 * 获取性能摘要
 */
export function getPerformanceSummary(): {
  navigation: PerformanceNavigationTiming | null;
  resources: PerformanceResourceTiming[];
  memory?: any;
} {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const memory = (performance as any).memory;

  return {
    navigation,
    resources,
    memory,
  };
}

/**
 * 标记性能时间点
 */
export function markPerformance(name: string) {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(name);
  }
}

/**
 * 测量两个时间点之间的性能
 */
export function measurePerformance(name: string, startMark: string, endMark: string) {
  if ('performance' in window && 'measure' in performance) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
      return measure.duration;
    } catch (e) {
      console.warn(`[Performance] Failed to measure ${name}:`, e);
      return null;
    }
  }
  return null;
}
