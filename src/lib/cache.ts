/**
 * 极简 API 缓存层
 */

import { supabase } from '@/db/supabase';
import { storage } from './storage';

const memoryCache = new Map<string, { data: any, timestamp: number }>();
const ongoingRequests = new Map<string, Promise<any>>();

let hitQueue: { recordKey: string, isHit: boolean }[] = [];
let hitTimeout: any = null;
const recentlyRecorded = new Set<string>();

const flushHits = async () => {
  if (hitQueue.length === 0) return;
  const batch = [...hitQueue];
  hitQueue = [];
  hitTimeout = null;
  
  try {
    // 按照 recordKey 进行去重，同一个批次内同一个 key 只记一次
    const uniqueBatch = batch.filter((item, index, self) => 
      index === self.findIndex((t) => t.recordKey === item.recordKey)
    );

    await Promise.all(uniqueBatch.map(item => 
      (supabase.rpc as any)('record_cache_hit', { p_cache_key: item.recordKey, p_is_hit: item.isHit })
    ));
  } catch (e: any) {
    console.warn('[Cache Stats Error]', e.message);
  }
};

export const cache = {
  get<T>(key: string, ttl: number = 60000, recordKey?: string): T | null {
    const now = Date.now();
    
    // 1. 优先尝试内存缓存
    const cached = memoryCache.get(key);
    if (cached && (now - cached.timestamp <= ttl)) {
      this._recordStats(recordKey, true);
      return cached.data as T;
    }

    // 2. 尝试持久化缓存 (模拟 SDK 行为)
    const persisted = storage.get<{data: T, timestamp: number} | null>(`api_cache_${key}`, null);
    if (persisted && (now - persisted.timestamp <= ttl)) {
      // 填补内存缓存
      memoryCache.set(key, persisted);
      this._recordStats(recordKey, true);
      return persisted.data as T;
    }

    this._recordStats(recordKey, false);

    // 后台管理页面禁用缓存，确保 CRUD 实时生效
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      return null;
    }
    
    return null;
  },

  set<T>(key: string, data: T, persist: boolean = false): void {
    const entry = { data, timestamp: Date.now() };
    memoryCache.set(key, entry);
    ongoingRequests.delete(key);

    if (persist) {
      storage.set(`api_cache_${key}`, entry);
    }
  },

  async getOrFetch<T>(key: string, fetchFn: () => Promise<T>, ttl: number = 60000, recordKey?: string, persist: boolean = false): Promise<T> {
    const cached = this.get<T>(key, ttl, recordKey);
    if (cached !== null) return cached;

    const ongoing = ongoingRequests.get(key);
    if (ongoing) return ongoing;

    const request = fetchFn().then(data => {
      this.set(key, data, persist);
      return data;
    }).catch(err => {
      ongoingRequests.delete(key);
      throw err;
    });

    ongoingRequests.set(key, request);
    return request;
  },

  _recordStats(recordKey?: string, isHit: boolean = false): void {
    if (recordKey && !recentlyRecorded.has(recordKey)) {
      recentlyRecorded.add(recordKey);
      // 5分钟后允许再次记录该 key
      setTimeout(() => recentlyRecorded.delete(recordKey), 300000);

      hitQueue.push({ recordKey, isHit });
      if (hitQueue.length >= 10) {
        flushHits();
      } else if (!hitTimeout) {
        hitTimeout = setTimeout(flushHits, 2000);
      }
    }
  },

  invalidate(key: string): void {
    memoryCache.delete(key);
    storage.remove(`api_cache_${key}`);
    ongoingRequests.delete(key);
  },

  clear(): void {
    memoryCache.clear();
  }
};
