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

// API Key 校验（和你其他接口保持一致）
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

// 主服务
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const supabase = getSupabaseClient();
  const validation = await validateRequest(supabase, url, req);

  if (!validation.valid) {
    return createResponse({ success: false, message: validation.message }, 403);
  }

  try {
    // ✅ 100% 匹配你的表：content_categories
    // ✅ 按 sort_order 正序排序（你定义的规则）
    const { data, error } = await supabase
      .from('content_categories')
      .select('id, name, icon, sort_order, created_at')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    // ✅ 返回格式完全适配你的前端：getCategories()
    return createResponse({
      success: true,
      data: data || []
    });
  } catch (err: any) {
    return createResponse({ success: false, message: err.message }, 500);
  }
});