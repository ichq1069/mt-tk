import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as decodeJpeg } from "https://deno.land/x/jpegts@1.1/mod.ts";
import { decode as decodePng } from "https://deno.land/x/pngs@0.1.1/mod.ts";
import { redisUtils } from "../_shared/redis.ts";

// 🔥 固定全局 CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

async function handler(req: Request) {
  // 1. 强制处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const CONCURRENCY = 10;
    let processedCount = 0;
    let failedCount = 0;

    // 设置实时日志频道
    const channel = supabase.channel('image-dedupe-progress');
    const sendLog = async (message: string, type: 'info' | 'error' | 'success' = 'info') => {
      console.log(`[Log] ${message}`);
      await channel.send({
        type: 'broadcast',
        event: 'log',
        payload: { message, type, timestamp: new Date().toISOString() }
      });
    };

    // 获取 Zonerama 配置以处理特殊链接
    const { data: zConfigData } = await supabase.from('system_configs').select('value').eq('key', 'zonerama_upload_config').maybeSingle();
    const zoneramaConfig = zConfigData?.value || {};
    const photoApi = zoneramaConfig.photo_api || '';

    // 获取存储配置用于图片处理规则
    const { data: storageConfig } = await supabase.from('storage_configs').select('image_processing_url, image_processing_rules').limit(1).maybeSingle();
    const dedupeRule = storageConfig?.image_processing_rules?.dedupe || 'rs:fit:80:80/q:75';
    const processingUrl = storageConfig?.image_processing_url;

    const body = await req.json().catch(() => ({}));
    const { action, ids, limit = 100 } = body;

    if (!action) {
      throw new Error('参数缺失: action 是必填项');
    }

    // ------------------------------
    // 生成图片指纹
    // ------------------------------
    if (action === 'generate_hashes') {
      let query = supabase
        .from('media_items')
        .select('id, url, type')
        .eq('type', 'image')
        .is('deleted_at', null);
      
      if (ids && ids.length > 0) {
        query = query.in('id', ids);
      } else {
        query = query.is('content_hash', null).is('dedupe_error', null).eq('dedupe_ignored', false);
      }

      const { data: items, error: fetchError } = await query.limit(limit);
      if (fetchError) {
        await sendLog(`❌ 获取待处理项失败: ${fetchError.message}`, 'error');
        console.error('[Image-Dedupe] Fetch Error:', fetchError);
        throw fetchError;
      }

      if (!items || items.length === 0) {
        await sendLog(`⚠️ 没有需要处理的项目`, 'info');
        return new Response(JSON.stringify({
          success: true,
          processed: 0,
          message: "没有需要处理的项目"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await sendLog(`🔍 开始处理 ${items.length} 张图片...`, 'info');

      for (let i = 0; i < items.length; i += CONCURRENCY) {
        const chunk = items.slice(i, i + CONCURRENCY);
        const chunkResults: any[] = [];

        await Promise.all(chunk.map(async (item) => {
          try {
            const cacheKey = `hash:${item.id}:${item.url}`;
            const cachedHash = await redisUtils.get(cacheKey);

            if (cachedHash) {
              chunkResults.push({
                id: item.id,
                content_hash: cachedHash,
                dedupe_error: null,
                updated_at: new Date().toISOString()
              });
              processedCount++;
              await sendLog(`✨ [命中缓存] ${item.id.slice(0, 8)}`, 'success');
              return;
            }

            let sourceUrl = item.url;
            if ((item.url.includes('zonerama.com') || item.url.includes('zomphoto.com')) && photoApi) {
              if (!item.url.includes('/Photo/Api/')) {
                const photoId = item.url.split('/').filter(Boolean).pop();
                if (photoId && /^\d+$/.test(photoId)) {
                  sourceUrl = `${photoApi}${photoId}`;
                }
              }
            }

            // ========== 核心修改：适配后台查重图片处理参数 ==========
            let thumbUrl = sourceUrl;
            if (processingUrl && dedupeRule) {
               const baseUrl = processingUrl.replace(/\/$/, '').replace(/\/unsafe$/, '');
               const cleanUrl = encodeURIComponent(sourceUrl);
               const normalizedRule = dedupeRule.replace(/,/g, '/');
               thumbUrl = `${baseUrl}/unsafe/${normalizedRule}/plain/${cleanUrl}`;
            }
            
            // 超时改为3秒，杜绝单张卡死
            const res = await fetch(thumbUrl, { signal: AbortSignal.timeout(3000) });

            if (!res.ok) {
              if (res.status === 404) throw new Error(`图片资源不存在 (404)`);
              throw new Error(`图片获取失败 (HTTP ${res.status})`);
            }

            const buffer = new Uint8Array(await res.arrayBuffer());
            // 自动获取真实图片类型
            const contentType = res.headers.get('content-type') || 'image/jpeg';
            const hash = await generateAHash(buffer, contentType);
            // =======================================================

            if (!hash) throw new Error('哈希生成失败 (不支持的图片格式或解析错误)');

            chunkResults.push({
              id: item.id,
              content_hash: hash,
              dedupe_error: null,
              updated_at: new Date().toISOString()
            });
            processedCount++;
            await sendLog(`✅ 处理完成: ${item.id.slice(0, 8)}`, 'success');
            await redisUtils.set(cacheKey, hash, 60 * 60 * 24 * 7);

          } catch (e) {
            const msg = (e as Error).message;
            console.error(`处理失败 ${item.id}:`, msg);
            chunkResults.push({
              id: item.id,
              dedupe_error: msg,
              updated_at: new Date().toISOString()
            });
            failedCount++;
            await sendLog(`❌ 处理失败: ${item.id.slice(0, 8)} - ${msg}`, 'error');
          }
        }));

        if (chunkResults.length > 0) {
          const { error: updateError } = await supabase.rpc('bulk_update_media_dedupe', {
            p_updates: chunkResults
          });

          if (updateError) {
            console.error('批量更新失败，回退单条更新', updateError);
            for (const res of chunkResults) {
              await supabase.from('media_items').update(res).eq('id', res.id);
            }
          }
          await sendLog(`📦 已完成批次更新 (${Math.min(i + CONCURRENCY, items.length)}/${items.length})`, 'info');
        }
      }

      await sendLog(`✨ 扫描任务全部完成: 成功 ${processedCount}, 失败 ${failedCount}`, 'success');
      
      return new Response(JSON.stringify({
        success: true,
        processed: processedCount,
        failed: failedCount,
        total: items.length
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------------------------------
    // 查询重复图片
    // ------------------------------
    if (action === 'find_duplicates') {
      const { data, error: rpcError } = await supabase.rpc('get_visually_duplicate_media', { p_threshold: 5 });
      if (rpcError) throw rpcError;

      return new Response(JSON.stringify({
        success: true,
        duplicates: data
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 无效 action
    return new Response(JSON.stringify({ error: `无效操作: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = (err as Error).message;
    console.error('[Image-Dedupe 异常]', message);

    return new Response(JSON.stringify({
      error: message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// 生成感知哈希
async function generateAHash(buffer: Uint8Array, contentType: string): Promise<string | null> {
  try {
    let raw: { width: number, height: number, data: Uint8Array };

    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      raw = decodeJpeg(buffer);
    } else if (contentType.includes('png') || contentType.includes('webp')) {
      const png = decodePng(buffer);
      raw = { width: png.width, height: png.height, data: png.image };
    } else {
      return null;
    }

    const { width, height, data } = raw;
    const size = 8;
    const pixels = new Uint8Array(size * size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcX = Math.floor(x * width / size);
        const srcY = Math.floor(y * height / size);
        const idx = (srcY * width + srcX) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        pixels[y * size + x] = Math.floor((r + g + b) / 3);
      }
    }

    const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
    let hash = BigInt(0);

    for (let i = 0; i < pixels.length; i++) {
      if (pixels[i] >= avg) hash |= BigInt(1) << BigInt(i);
    }

    return hash.toString(16).padStart(16, '0').toUpperCase();
  } catch (e) {
    console.error('AHash 失败', e);
    return null;
  }
}

Deno.serve(handler);
