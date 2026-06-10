import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { redisUtils } from '../_shared/redis.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let imageUrl = url.searchParams.get('url');
    const path = url.searchParams.get('path');
    const b64Url = url.searchParams.get('u'); // Base64 encoded URL
    const b64Path = url.searchParams.get('p'); // Base64 encoded path

    const R2_DOMAIN = 'https://pub-a39e26dae2e041e189462c89729727c7.r2.dev';

    if (b64Url) {
      try {
        // 先尝试 Base64 解码 (带 encodeURIComponent 容错)
        imageUrl = decodeURIComponent(b64Url); if (!imageUrl.startsWith("http") && /^[A-Za-z0-9+/=]+$/.test(b64Url)) { imageUrl = decodeURIComponent(atob(b64Url)); }
      } catch (e) {
        try {
          // 如果 atob 失败，回退到普通 URI 解码
          imageUrl = decodeURIComponent(b64Url);
        } catch (e2) {
          imageUrl = b64Url;
        }
      }
    } else if (b64Path) {
      try {
        const decodedPath = decodeURIComponent(atob(b64Path));
        imageUrl = `${R2_DOMAIN}/${decodedPath.startsWith('/') ? decodedPath.substring(1) : decodedPath}`;
        console.log(`[Image-Optimizer] Decoded p (Base64): ${decodedPath} -> ${imageUrl}`);
      } catch (e) {
        const decodedPath = decodeURIComponent(b64Path);
        imageUrl = `${R2_DOMAIN}/${decodedPath.startsWith('/') ? decodedPath.substring(1) : decodedPath}`;
        console.log(`[Image-Optimizer] Using raw p: ${decodedPath} -> ${imageUrl}`);
      }
    } else if (!imageUrl && path) {
      imageUrl = `${R2_DOMAIN}/${path.startsWith('/') ? path.substring(1) : path}`;
      console.log(`[Image-Optimizer] Using direct path: ${path} -> ${imageUrl}`);
    }

    const quality = parseInt(url.searchParams.get('quality') || url.searchParams.get('q') || '80');
    const widthStr = url.searchParams.get('width') || url.searchParams.get('w');
    const heightStr = url.searchParams.get('height') || url.searchParams.get('h');
    const fit = url.searchParams.get('fit') || 'cover';
    const width = widthStr ? parseInt(widthStr) : undefined;
    const height = heightStr ? parseInt(heightStr) : undefined;

    if (!imageUrl) {
      throw new Error('参数缺失: 无法获取图片地址 (url, path, u, p 均为空或解码失败)');
    }

    // 尝试从 Redis 获取缓存
    const cacheKey = `optimize:${imageUrl}:${width}:${height}:${quality}:${fit}`;
    const cachedData = await redisUtils.get(cacheKey);
    if (cachedData) {
      try {
        const { bodyB64, contentType } = JSON.parse(cachedData);
        const body = Uint8Array.from(atob(bodyB64), c => c.charCodeAt(0));
        return new Response(body, {
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'X-Cache': 'HIT'
          },
        });
      } catch (e) {
        console.warn('[Image-Optimizer] Cache parse error:', e.message);
      }
    }

    // 处理缩放和优化引擎 (wsrv.nl)
    const weservUrl = new URL('https://wsrv.nl/');
    weservUrl.searchParams.set('url', imageUrl);
    if (width) weservUrl.searchParams.set('w', String(width));
    if (height) weservUrl.searchParams.set('h', String(height));
    weservUrl.searchParams.set('q', String(quality));
    weservUrl.searchParams.set('fit', fit);
    weservUrl.searchParams.set('output', 'webp');

    console.log(`[Image-Optimizer] Dispatching to engine: ${weservUrl.toString()}`);

    try {
      const optimizedResponse = await fetch(weservUrl.toString(), { 
        signal: AbortSignal.timeout(15000) 
      });
      if (optimizedResponse.ok) {
        const contentType = 'image/webp';
        const optimizedBuffer = await optimizedResponse.arrayBuffer();
        const optimizedUint8 = new Uint8Array(optimizedBuffer);
        
        console.log('[Image-Optimizer] Optimization successful');

        // 如果较小，缓存到 Redis
        if (optimizedUint8.length < 512 * 1024) {
          const bodyB64 = btoa(String.fromCharCode(...optimizedUint8));
          await redisUtils.set(cacheKey, JSON.stringify({ bodyB64, contentType }), 60 * 60 * 24);
        }

        return new Response(optimizedUint8, {
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } else {
        console.warn(`[Image-Optimizer] Engine returned status: ${optimizedResponse.status}`);
      }
    } catch (e) {
      console.warn('[Image-Optimizer] Engine fetch exception:', e);
    }

    // 回退逻辑：如果优化失败，尝试直接获取原始图片
    console.log(`[Image-Optimizer] Falling back to original source: ${imageUrl}`);
    const originalResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!originalResponse.ok) {
      console.error(`[Image-Optimizer] Original fetch failed with status: ${originalResponse.status}`);
      throw new Error(`无法获取原始图片 (状态码 ${originalResponse.status})`);
    }

    const originalBuffer = await originalResponse.arrayBuffer();
    const contentType = originalResponse.headers.get('Content-Type') || 'image/jpeg';

    return new Response(originalBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (error) {
    const err = error as Error;
    console.error('[Image-Optimizer Error]:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
