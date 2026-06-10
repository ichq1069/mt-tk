import { connect } from "https://deno.land/x/redis@v0.31.0/mod.ts";

/**
 * 获取 Redis 客户端实例
 * 连接到容器内 Redis（云函数专用 DB 3）
 */
let lastConnectAttempt = 0;
let isRedisAvailable = true;

export async function getRedis() {
  const now = Date.now();
  // 如果 1 分钟内连接失败过，直接跳过，避免长时间等待
  if (!isRedisAvailable && (now - lastConnectAttempt < 60000)) {
    throw new Error("Redis recently failed, skipping");
  }

  const timeout = 2000; // 降低到 2 秒超时
  let timer: any;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Redis connection timeout")), timeout);
  });

  const connectPromise = (async () => {
    try {
      lastConnectAttempt = Date.now();
      // 这里的 hostname "redis" 在某些环境可能无法解析，或者解析很慢
      const client = await connect({
        hostname: "redis",
        port: 6379, 
        db: 3,
      });
      isRedisAvailable = true;
      return client;
    } catch (e) {
      // 仅在明确失败时尝试备用端口
      try {
        const client = await connect({
          hostname: "redis",
          port: 65535,
          db: 3,
        });
        isRedisAvailable = true;
        return client;
      } catch (e2) {
        isRedisAvailable = false;
        throw e2;
      }
    }
  })();

  try {
    const result = await Promise.race([connectPromise, timeoutPromise]) as any;
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    isRedisAvailable = false;
    throw err;
  }
}

// 兼容旧名称
export async function getRedisClient() {
  try {
    return await getRedis();
  } catch (error) {
    console.error("[Redis Shared] Connection failed:", error.message);
    return null;
  }
}

/**
 * 包装常用的 Redis 操作，增加容错处理
 */
export const redisUtils = {
  async get(key: string): Promise<string | null> {
    const client = await getRedisClient();
    if (!client) return null;
    try {
      const val = await client.get(key);
      return val || null;
    } catch (e) {
      console.warn(`[Redis Shared] Get key ${key} failed:`, e.message);
      return null;
    } finally {
      client.close();
    }
  },

  async set(key: string, value: string, ex?: number): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;
    try {
      if (ex) {
        await client.set(key, value, { ex });
      } else {
        await client.set(key, value);
      }
    } catch (e) {
      console.warn(`[Redis Shared] Set key ${key} failed:`, e.message);
    } finally {
      client.close();
    }
  },

  async del(key: string): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;
    try {
      await client.del(key);
    } catch (e) {
      console.warn(`[Redis Shared] Del key ${key} failed:`, e.message);
    } finally {
      client.close();
    }
  }
};
