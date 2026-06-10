/**
 * 图片本地缓存管理系统
 * 1. 利用浏览器 Cache API 存储媒体二进制数据 (Blob)
 * 2. 利用 IndexedDB 存储元数据 (过期时间、上次访问、大小)
 * 3. 实现 LRU (最近最少使用) 清理机制
 * 4. 内存级 Map 加速 (Blob URL 重用)
 */

const CACHE_NAME = 'media-app-images-v4';
const MAX_CACHE_ENTRIES = 500; // 降低缓存数量，避免移动端内存压力
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 默认缓存 7 天

// 内存中的 Blob URL 缓存 (原始 URL -> Blob URL)
const blobUrlCache = new Map<string, { url: string; timestamp: number }>();
const MAX_MEM_CACHE_ENTRIES = 30; // 降低内存缓存数量，防止移动端内存溢出 (从 100 降至 30)

/**
 * 将 Blob URL 放入内存缓存，并执行简单的 LRU 清理
 */
function putIntoMemCache(url: string, bUrl: string) {
  const now = Date.now();
  if (blobUrlCache.size >= MAX_MEM_CACHE_ENTRIES && !blobUrlCache.has(url)) {
    // 找到最旧的一个并移除
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, val] of blobUrlCache.entries()) {
      if (val.timestamp < oldestTime) {
        oldestTime = val.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      const entry = blobUrlCache.get(oldestKey);
      if (entry) {
        // 延迟释放，防止当前渲染周期内失效
        setTimeout(() => {
          try {
            URL.revokeObjectURL(entry.url);
          } catch (e) {}
        }, 5000);
        blobUrlCache.delete(oldestKey);
      }
    }
  }
  blobUrlCache.set(url, { url: bUrl, timestamp: now });
}

// 元数据数据库接口
interface CacheMetadata {
  url: string;
  size: number;
  lastUsed: number;
  expires: number;
}

// IndexedDB 管理元数据
const metadataDB = {
  db: null as IDBDatabase | null,
  async open() {
    if (this.db) return this.db;
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('media-cache-metadata', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'url' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  },

  async get(url: string): Promise<CacheMetadata | null> {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction('metadata', 'readonly');
      const request = tx.objectStore('metadata').get(url);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  },

  async set(metadata: CacheMetadata) {
    const db = await this.open();
    const tx = db.transaction('metadata', 'readwrite');
    tx.objectStore('metadata').put(metadata);
  },

  async delete(url: string) {
    const db = await this.open();
    const tx = db.transaction('metadata', 'readwrite');
    tx.objectStore('metadata').delete(url);
  },

  async getAllByLRU(): Promise<CacheMetadata[]> {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction('metadata', 'readonly');
      const request = tx.objectStore('metadata').getAll();
      request.onsuccess = () => {
        const results = (request.result || []) as CacheMetadata[];
        resolve(results.sort((a, b) => a.lastUsed - b.lastUsed));
      };
      request.onerror = () => resolve([]);
    });
  }
};

export const ImageCache = {
  /**
   * 检查并获取缓存中的图片 URL
   */
  async getOrFetch(url: string, options: { ttl?: number; signal?: AbortSignal; timeout?: number } = {}): Promise<string> {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;

    const { ttl = DEFAULT_TTL, signal, timeout } = options;
    const now = Date.now();

    // 1. 尝试内存缓存 (本会话级)
    const memCache = blobUrlCache.get(url);
    if (memCache) {
      memCache.timestamp = now;
      return memCache.url;
    }

    try {
      const cache = await caches.open(CACHE_NAME);
      
      // 2. 检查持久化层元数据
      const metadata = await metadataDB.get(url);
      
      if (metadata) {
        // 检查是否过期
        if (now < metadata.expires) {
          const cachedResponse = await cache.match(url);
          if (cachedResponse) {
            // 更新元数据中的最后访问时间
            metadata.lastUsed = now;
            metadataDB.set(metadata);

            const blob = await cachedResponse.blob();
            const bUrl = URL.createObjectURL(blob);
            putIntoMemCache(url, bUrl);
            return bUrl;
          }
        } else {
          // 已过期，清理
          await this.remove(url);
        }
      }

      // 3. 网络请求 (未命中或已过期)
      console.log(`[ImageCache] Fetching: ${url}`);
      
      // 安全处理 AbortSignal.timeout 和 AbortSignal.any
      const getCombinedSignal = (timeoutMs?: number, externalSignal?: AbortSignal) => {
        const signals: AbortSignal[] = [];
        
        if (externalSignal) signals.push(externalSignal);
        
        if (timeoutMs) {
          if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
            signals.push(AbortSignal.timeout(timeoutMs));
          } else {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), timeoutMs);
            signals.push(controller.signal);
          }
        }
        
        if (signals.length === 0) return undefined;
        if (signals.length === 1) return signals[0];
        
        if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
          return (AbortSignal as any).any(signals);
        }
        
        // 如果不支持 AbortSignal.any，则只使用第一个信号（通常是外部信号优先）
        return signals[0];
      };

      const fetchSignal = getCombinedSignal(timeout, signal);
      
      const response = await fetch(url, { 
        mode: 'cors',
        referrerPolicy: 'no-referrer',
        signal: fetchSignal
      });
      
      // 如果遇到限流，直接返回原图，不保存到缓存
      if (response.status === 429) {
        console.warn(`[ImageCache] Optimizer Rate Limited (429): ${url}`);
        return url;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${url}`);
      }

      const clone = response.clone();
      const fetchedBlob = await response.blob();
      
      // 存入缓存
      try {
        await cache.put(url, clone);
        await metadataDB.set({
          url,
          size: fetchedBlob.size,
          lastUsed: now,
          expires: now + ttl
        });
        
        // 触发异步清理逻辑
        this.maintenance();
      } catch (err) {
        console.warn('[ImageCache] Store error:', err);
      }

      const bUrl = URL.createObjectURL(fetchedBlob);
      putIntoMemCache(url, bUrl);
      return bUrl;

    } catch (e) {
      console.error(`[ImageCache] Error loading ${url}:`, e);
      return url; 
    }
  },

  /**
   * 缓存维护逻辑
   */
  async maintenance() {
    try {
      const allMetadata = await metadataDB.getAllByLRU();
      if (allMetadata.length > MAX_CACHE_ENTRIES) {
        const toRemove = allMetadata.slice(0, allMetadata.length - MAX_CACHE_ENTRIES);
        console.log(`[ImageCache] Cleaning up ${toRemove.length} old entries`);
        for (const meta of toRemove) {
          await this.remove(meta.url);
        }
      }
    } catch (e) {
      console.warn('[ImageCache] Maintenance failed:', e);
    }
  },

  /**
   * 删除特定缓存
   */
  async remove(url: string) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(url);
    await metadataDB.delete(url);
    
    const mem = blobUrlCache.get(url);
    if (mem) {
      URL.revokeObjectURL(mem.url);
      blobUrlCache.delete(url);
    }
  },

  /**
   * 预取并缓存
   */
  async prefetch(urls: string[]) {
    // 限制并发量
    const concurrencyLimit = 3;
    const queue = [...urls];
    
    const worker = async () => {
      while (queue.length > 0) {
        const url = queue.shift();
        if (url) {
          try {
            await this.getOrFetch(url);
          } catch (e) {
            // ignore prefetch errors
          }
        }
      }
    };

    const workers = Array(concurrencyLimit).fill(null).map(worker);
    await Promise.all(workers);
  },

  /**
   * 清空所有缓存
   */
  async clear() {
    // 释放所有 Blob URL 内存
    blobUrlCache.forEach(val => URL.revokeObjectURL(val.url));
    blobUrlCache.clear();
    
    await caches.delete(CACHE_NAME);
    
    const db = await metadataDB.open();
    const tx = db.transaction('metadata', 'readwrite');
    tx.objectStore('metadata').clear();
    
    console.log('[ImageCache] Cleared all');
  }
};
