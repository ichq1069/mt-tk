import { supabase } from '@/db/supabase';

/**
 * 缓存管理工具类
 * 封装与 cache-manager Edge Function 的交互
 */
class CacheManager {
  private edgeFunctionName = 'cache-manager';

  /**
   * 从缓存获取数据
   */
  async get<T = any>(key: string): Promise<{ data: T | null; cached: boolean }> {
    try {
      const { data, error } = await supabase.functions.invoke(this.edgeFunctionName, {
        body: { action: 'get', key },
      });

      if (error) throw error;
      return data;
    } catch (e) {
      console.error(`[Cache] Failed to get ${key}:`, e);
      return { data: null, cached: false };
    }
  }

  /**
   * 设置缓存数据
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke(this.edgeFunctionName, {
        body: { action: 'set', key, value, ttl },
      });

      if (error) throw error;
      return data?.success || false;
    } catch (e) {
      console.error(`[Cache] Failed to set ${key}:`, e);
      return false;
    }
  }

  /**
   * 删除缓存数据
   */
  async delete(key: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke(this.edgeFunctionName, {
        body: { action: 'delete', key },
      });

      if (error) throw error;
      return data?.success || false;
    } catch (e) {
      console.error(`[Cache] Failed to delete ${key}:`, e);
      return false;
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke(this.edgeFunctionName, {
        body: { action: 'clear' },
      });

      if (error) throw error;
      return data?.success || false;
    } catch (e) {
      console.error('[Cache] Failed to clear:', e);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(key: string): Promise<{
    cache_key: string;
    hit_count: number;
    miss_count: number;
    hit_rate: number;
  } | null> {
    try {
      const { data, error } = await supabase.functions.invoke(this.edgeFunctionName, {
        body: { action: 'stats', key },
      });

      if (error) throw error;
      return data?.data || null;
    } catch (e) {
      console.error(`[Cache] Failed to get stats for ${key}:`, e);
      return null;
    }
  }

  /**
   * 带缓存的数据获取封装
   * 如果缓存存在则返回缓存，否则执行 fetcher 并缓存结果
   */
  async getOrFetch<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T | null> {
    // 尝试从缓存获取
    const { data: cachedData, cached } = await this.get<T>(key);
    if (cached && cachedData !== null) {
      console.log(`[Cache] Hit: ${key}`);
      return cachedData;
    }

    // 缓存未命中，执行 fetcher
    console.log(`[Cache] Miss: ${key}, fetching...`);
    try {
      const freshData = await fetcher();
      // 缓存新数据
      await this.set(key, freshData, ttl);
      return freshData;
    } catch (e) {
      console.error(`[Cache] Fetcher failed for ${key}:`, e);
      return null;
    }
  }
}

export const cacheManager = new CacheManager();
