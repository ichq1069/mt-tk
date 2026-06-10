import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const urlParams = new URL(req.url).searchParams;
    const b64Url = urlParams.get('u');
    const mode = urlParams.get('m') || 'blob';
    const expiry = urlParams.get('e');
    const sliceIndex = urlParams.get('s'); 

    if (!b64Url) throw new Error('参数缺失: 缺少 u (url) 参数');
    
    let imageUrl = '';
    try {
      imageUrl = decodeURIComponent(atob(b64Url));
    } catch (e) {
      throw new Error('参数错误: URL 解码失败');
    }

    // 1. 签名校验 (Signed Mode)
    if (mode === 'signed' && expiry) {
      const now = Math.floor(Date.now() / 1000);
      if (parseInt(expiry) < now) {
        throw new Error('权限过期: 签名 URL 已失效');
      }
    }

    // 2. 切片逻辑 (Slice Mode)
    // 采用 Weserv 的裁剪功能实现物理切片
    // 支持 2x2 网格切片
    const gridType = urlParams.get('gt');
    const gx = parseInt(urlParams.get('gx') || '0');
    const gy = parseInt(urlParams.get('gy') || '0');
    const count = parseInt(urlParams.get('c') || '4');
    const index = parseInt(sliceIndex || '0');
    
    let proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&output=webp`;
    
    if (mode === 'slice') {
      try {
        // 首先通过 Weserv 获取图片原始元数据
        const metaRes = await fetch(`https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&output=json`, { 
          signal: AbortSignal.timeout(5000) 
        });
        
        if (metaRes.ok) {
          const meta = await metaRes.json();
          const originalHeight = meta.height;
          const originalWidth = meta.width;
          
          if (originalHeight && originalWidth) {
            if (gridType === '2x2') {
              // 2x2 网格切片逻辑 (严格平分，以实现无缝拼接)
              const sliceWidth = Math.floor(originalWidth / 2);
              const sliceHeight = Math.floor(originalHeight / 2);
              
              const xOffset = gx * sliceWidth;
              const yOffset = gy * sliceHeight;
              
              // 使用 Weserv 的裁剪参数：cx/cy 为起始位置，cw/ch 为裁剪宽高
              proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&output=webp&cx=${xOffset}&cy=${yOffset}&cw=${sliceWidth}&ch=${sliceHeight}`;
            } else {
              // 默认垂直切片逻辑
              const sliceHeight = Math.floor(originalHeight / count);
              const yOffset = sliceHeight * index;
              
              const currentSliceHeight = (index === count - 1) 
                ? (originalHeight - yOffset) 
                : sliceHeight;
              
              proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}&output=webp&cx=0&cy=${yOffset}&cw=${originalWidth}&ch=${currentSliceHeight}`;
            }
          } else {
            throw new Error('无法解析图片元数据尺寸');
          }
        } else {
          throw new Error(`Weserv 元数据请求失败: ${metaRes.status}`);
        }
      } catch (e) {
        console.error('[MediaProxy] Slice mode error:', e.message);
        // 如果切片失败，不允许回退到全图，否则前端拼接会错乱
        throw new Error(`切片生成失败: ${e.message}`);
      }
    }

    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      // 降级：直接获取原始资源
      const fallback = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
      if (!fallback.ok) throw new Error('无法获取原始资源');
      
      const buffer = await fallback.arrayBuffer();
      const contentType = fallback.headers.get('Content-Type') || 'image/jpeg';
      return new Response(buffer, {
        headers: { ...corsHeaders, 'Content-Type': contentType },
      });
    }

    const buffer = await response.arrayBuffer();
    return new Response(buffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error: any) {
    console.error('[MediaProxy Error]:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
