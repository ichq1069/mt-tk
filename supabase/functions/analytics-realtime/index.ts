import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function createResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const { websiteId } = body;

    if (!websiteId) {
      return createResponse({ error: 'Missing websiteId' }, 400);
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // 获取最近5分钟内有活动的在线访客
    const { data: realtimeVisitors, error } = await supabaseClient
      .from('analytics_realtime')
      .select(`
        *,
        visitor:analytics_visitors!visitor_id (
          visitor_uuid,
          device_type,
          browser_name,
          os_name,
          country_code,
          city_name
        )
      `)
      .eq('website_id', websiteId)
      .eq('is_online', true)
      .gte('last_active_at', fiveMinutesAgo)
      .order('last_active_at', { ascending: false });

    if (error) {
      throw error;
    }

    // 清理过期的在线记录
    await supabaseClient
      .from('analytics_realtime')
      .update({ is_online: false })
      .eq('website_id', websiteId)
      .lt('last_active_at', fiveMinutesAgo);

    return createResponse({
      visitors: realtimeVisitors || [],
      count: realtimeVisitors?.length || 0,
      timestamp: Date.now()
    });

  } catch (err: any) {
    console.error('[AnalyticsRealtime] Error:', err);
    return createResponse({ error: 'Internal server error' }, 500);
  }
});
