import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CacheEntry {
  key: string;
  value: any;
  expiresAt: number;
}

// 简单的内存缓存实现（生产环境应使用 Redis）
const memoryCache = new Map<string, CacheEntry>();

const VERSION = "10.0.61";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/cache-manager', '');
  
  if (path === '/health') {
    return new Response(
      JSON.stringify({ status: 'ok', version: VERSION, service: 'cache-manager' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { action, key, value, ttl } = await req.json();

    switch (action) {
      case 'get': {
        // 尝试从缓存获取
        const cached = memoryCache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
          // 记录缓存命中
          await supabaseClient.rpc('record_cache_hit', {
            p_cache_key: key,
            p_is_hit: true,
          });

          return new Response(
            JSON.stringify({ data: cached.value, cached: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // 缓存未命中
        await supabaseClient.rpc('record_cache_hit', {
          p_cache_key: key,
          p_is_hit: false,
        });

        return new Response(
          JSON.stringify({ data: null, cached: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'set': {
        // 获取缓存配置
        const { data: config } = await supabaseClient
          .from('cache_config')
          .select('ttl_seconds, is_enabled')
          .eq('cache_key', key)
          .single();

        if (!config?.is_enabled) {
          return new Response(
            JSON.stringify({ success: false, message: 'Cache disabled for this key' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const ttlSeconds = ttl || config?.ttl_seconds || 300;
        const expiresAt = Date.now() + ttlSeconds * 1000;

        memoryCache.set(key, {
          key,
          value,
          expiresAt,
        });

        return new Response(
          JSON.stringify({ success: true, expiresAt }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        memoryCache.delete(key);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'clear': {
        memoryCache.clear();
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'stats': {
        const { data: stats } = await supabaseClient.rpc('get_cache_hit_rate', {
          p_cache_key: key,
        });

        return new Response(
          JSON.stringify({ data: stats }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Cache manager error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
