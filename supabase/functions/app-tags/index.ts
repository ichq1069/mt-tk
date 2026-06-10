import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function createResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return createClient(url, key);
}

async function validateRequest(supabase: any, url: URL, req: Request) {
  const apiKey = url.searchParams.get('apiKey') || req.headers.get('x-api-key') || '';
  const appId = url.searchParams.get('appId') || '';

  if (!apiKey || !appId) return { valid: false, message: 'Missing apiKey or appId' };

  const { data, error } = await supabase
    .from('app_api_keys')
    .select('id, permissions, expires_at')
    .eq('app_id', appId)
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return { valid: false, message: 'Invalid API Key' };
  return { valid: true, keyData: data };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const supabase = getSupabaseClient();
  const validation = await validateRequest(supabase, url, req);

  if (!validation.valid) {
    return createResponse({ success: false, message: validation.message }, 403);
  }

  try {
    // 使用 RPC 或复杂查询来获取带计数的标签
    // 这里我们直接查询 tags 并通过逻辑获取计数，或者使用视图/RPC
    // 为了简单且高性能，我们执行一个 SQL 查询获取带计数的结果
    const { data, error } = await supabase.rpc('get_tags_with_counts');

    if (error) {
      // 如果 RPC 不存在，退回到基础查询
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('tags')
        .select('id, name');
      
      if (fallbackError) throw fallbackError;
      return createResponse({ success: true, data: fallbackData || [] });
    }

    return createResponse({
      success: true,
      data: data || []
    });
  } catch (err: any) {
    return createResponse({ success: false, message: err.message }, 500);
  }
});
