import { useEffect, useRef } from 'react';
import { getProtectedUrl } from '@/lib/media';
import { useConfig } from '@/contexts/ConfigContext';

/**
 * 图片和媒体预加载 Hook
 * 现在整合了 内存 Blob 缓存
 * @param urls 需要预加载的 URL 列表
 * @param type 资源类型 'image' | 'video'
 */
export function usePreload(urls: string[], type: 'image' | 'video' = 'image') {
  const loadedSet = useRef<Set<string>>(new Set());
  const { config } = useConfig();

  useEffect(() => {
    if (!urls || urls.length === 0) return;

    // 分批加载，避免阻塞主线程
    const batchSize = 3;
    let index = 0;

    const loadNextBatch = async () => {
      const batch = urls.slice(index, index + batchSize);
      if (batch.length === 0) return;

      await Promise.all(batch.map(async (url) => {
        if (!url || loadedSet.current.has(url)) return;
        
        // 跳过 blob URL，不需要预加载
        if (url.startsWith('blob:')) {
          loadedSet.current.add(url);
          return;
        }

        try {
          if (type === 'image') {
            // 通过 getProtectedUrl 预取并存入内存 Blob 缓存
            await getProtectedUrl(url, true, {
              enableBlob: config?.enable_blob ?? true,
              enableCache: config?.enable_image_cache ?? false,
              priority: false, // 预加载使用低优先级
              config: config || null
            });
            loadedSet.current.add(url);
          } else {
            const video = document.createElement('video');
            video.src = url;
            video.preload = 'metadata';
            video.onloadedmetadata = () => loadedSet.current.add(url);
          }
        } catch (e) {
          // console.warn('Preload failed for:', url);
        }
      }));

      index += batchSize;
      if (index < urls.length) {
        setTimeout(loadNextBatch, 500); // 增加批次间延迟
      }
    };

    loadNextBatch();
  }, [urls, type, config?.enable_blob, config?.enable_image_cache]);
}

/**
 * 手动预加载函数
 */
export const preloadResource = async (url: string, type: 'image' | 'video' = 'image') => {
  if (!url) return Promise.resolve();
  
  // 跳过 blob URL
  if (url.startsWith('blob:')) {
    return Promise.resolve();
  }
  
  if (type === 'image') {
    return getProtectedUrl(url);
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.oncanplaythrough = () => resolve(url);
    video.onerror = () => reject(new Error(`Failed to load video: ${url}`));
    video.src = url;
    video.preload = 'auto';
  });
};

/**
 * 路由组件预加载辅助函数
 * 允许在用户交互之前提前加载页面组件
 */
export const prefetchPage = (importFunc: () => Promise<any>) => {
  try {
    importFunc();
  } catch (e) {
    // ignore
  }
};

