/**
 * 图片 CORS 代理
 * 用于解决第三方图床（如 imgdb.cn、superbed.cn）的 CORS 跨域问题
 * 
 * 使用方式：
 * GET /image-cors-proxy?url={图片URL}
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { redisUtils } from "../_shared/redis.ts";

const ALLOWED_DOMAINS = [
  'imgdb.cn',
  'superbed.cn',
  'files.superbed.cn',
  'pic1.imgdb.cn',
  'pic2.imgdb.cn',
  'pic3.imgdb.cn'
];

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: '缺少 url 参数' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 尝试从 Redis 获取缓存
    const cacheKey = `cors_proxy:${imageUrl}`;
    const cached = await redisUtils.get(cacheKey);
    if (cached) {
      const { bodyB64, contentType } = JSON.parse(cached);
      const body = Uint8Array.from(atob(bodyB64), c => c.charCodeAt(0));
      return new Response(body, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Cache': 'HIT'
        },
      });
    }

    // 验证 URL 是否在允许的域名列表中
    const isAllowed = ALLOWED_DOMAINS.some(domain => imageUrl.includes(domain));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: '不支持的图片域名' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 请求图片，设置 30 秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://imgdb.cn/',
        },
        redirect: 'follow', // 自动跟随重定向
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 获取图片数据
      const imageData = await response.arrayBuffer();
      const imageDataUint8 = new Uint8Array(imageData);
      const contentType = response.headers.get('Content-Type') || 'image/jpeg';

      // 如果较小 (512KB)，缓存 24 小时
      if (imageDataUint8.length < 512 * 1024) {
        const bodyB64 = btoa(String.fromCharCode(...imageDataUint8));
        await redisUtils.set(cacheKey, JSON.stringify({ bodyB64, contentType }), 60 * 60 * 24);
      }

      // 返回图片，添加 CORS 头
      return new Response(imageDataUint8, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Proxy-Status': 'success',
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // 检查是否是超时错误
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({ error: '请求超时' }), {
          status: 504,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('Image proxy error:', error);
    
    return new Response(JSON.stringify({ 
      error: '代理请求失败', 
      message: error instanceof Error ? error.message : String(error) 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
