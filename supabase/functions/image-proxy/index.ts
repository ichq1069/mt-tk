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
    const b64Url = url.searchParams.get('u') || url.searchParams.get('url');
    let originUrl = '';
    
    if (b64Url) {
      try {
        // 先尝试标准的 URL 字符串 (直接拼接的 u=https%3A%2F%2F...)
        originUrl = decodeURIComponent(b64Url);
        // 如果解码后依然像是个编码字符串或 Base64，且不包含 http，尝试 atob
        if (!originUrl.startsWith('http') && /^[A-Za-z0-9+/=]+$/.test(b64Url)) {
          originUrl = decodeURIComponent(atob(b64Url));
        }
      } catch (e) {
        originUrl = b64Url;
      }
    }

    const w = parseInt(url.searchParams.get('w') || url.searchParams.get('width') || '0');
    const h = parseInt(url.searchParams.get('h') || url.searchParams.get('height') || '0');
    const quality = parseInt(url.searchParams.get('q') || url.searchParams.get('quality') || '80');
    const fit = url.searchParams.get('fit') || 'contain';
    const format = url.searchParams.get('output') || url.searchParams.get('format') || 'jpg';

    if (!originUrl) {
      throw new Error('参数缺失: 缺少 u 或 url 参数');
    }

    // 1. 尝试从 Redis 获取缓存
    const cacheKey = `proxy:${b64Url}:${w}:${h}:${quality}:${fit}:${format}`;
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
        console.warn('[Image Proxy] Cache parse error:', e.message);
      }
    }

    console.log(`[Image Proxy] originUrl: ${originUrl}, w: ${w}, h: ${h}, q: ${quality}, fit: ${fit}`);

    // 使用 wsrv.nl 引擎
    const weservUrl = new URL('https://wsrv.nl/');
    weservUrl.searchParams.set('url', originUrl);
    
    if (w > 0) weservUrl.searchParams.set('w', String(w));
    if (h > 0) weservUrl.searchParams.set('h', String(h));
    if (quality > 0) weservUrl.searchParams.set('q', String(quality));
    if (fit) weservUrl.searchParams.set('fit', fit);
    if (format) weservUrl.searchParams.set('output', format);
    
    // 如果是 jpg 格式，开启渐进式加载
    if (format === 'jpg' || format === 'jpeg') {
      weservUrl.searchParams.set('il', 'true');
    }

    console.log(`[Image Proxy] Calling weserv: ${weservUrl.toString()}`);

    const response = await fetch(weservUrl.toString(), { 
      signal: AbortSignal.timeout(15000) 
    });

    if (!response.ok) {
      console.warn(`[Image Proxy] Engine status: ${response.status}. Falling back to original.`);
      const originalRes = await fetch(originUrl, { signal: AbortSignal.timeout(10000) });
      return new Response(originalRes.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': originalRes.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const body = await response.arrayBuffer();
    const bodyUint8 = new Uint8Array(body);

    // 如果图片较小（小于 512KB），存入 Redis 缓存 24 小时
    if (bodyUint8.length < 512 * 1024) {
      const bodyB64 = btoa(String.fromCharCode(...bodyUint8));
      await redisUtils.set(cacheKey, JSON.stringify({ bodyB64, contentType }), 60 * 60 * 24);
    }

    return new Response(bodyUint8, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Proxy-By': 'Supabase-Weserv-Proxy'
      },
    });

  } catch (error) {
    const err = error as Error;
    console.error('[Image Proxy Error]:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
