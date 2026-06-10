import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const {
      metric_name,
      metric_value,
      metric_rating,
      user_agent,
      page_url,
      timestamp,
    } = await req.json();

    // 验证必填字段
    if (!metric_name || metric_value === undefined || !metric_rating) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取当前用户（如果已登录）
    const { data: { user } } = await supabaseClient.auth.getUser();

    // 插入性能数据
    const { error: insertError } = await supabaseClient
      .from('web_vitals_logs')
      .insert({
        metric_name,
        metric_value,
        metric_rating,
        user_agent,
        page_url,
        user_id: user?.id || null,
        session_id: req.headers.get('x-session-id') || null,
      });

    if (insertError) {
      console.error('Failed to insert web vitals log:', insertError);
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Web vitals collector error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
