import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const url = new URL(req.url);
  const targetUrlB64 = url.searchParams.get('u');
  if (!targetUrlB64) {
    return new Response(JSON.stringify({ error: 'Missing target URL parameter "u"' }), { status: 400, headers: corsHeaders });
  }

  let targetUrl = '';
  try {
    targetUrl = atob(targetUrlB64);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid base64 URL' }), { status: 400, headers: corsHeaders });
  }

  try {
    // 智能路由选择
    const { data: nodes, error: nodeError } = await supabaseClient
      .from('video_proxy_configs')
      .select('*')
      .eq('is_enabled', true)
      .order('priority', { ascending: false });

    if (nodeError || !nodes || nodes.length === 0) {
      throw new Error('No available proxy nodes');
    }

    // 简单智能路由：按优先级排序，如果同优先级则随机
    const topPriority = nodes[0].priority;
    const bestNodes = nodes.filter(n => n.priority === topPriority);
    const selectedNode = bestNodes[Math.floor(Math.random() * bestNodes.length)];

    const proxyRequestUrl = selectedNode.node_url.replace('{url}', encodeURIComponent(targetUrl));

    // 代理请求
    const response = await fetch(proxyRequestUrl, {
      method: req.method,
      headers: {
        'User-Agent': req.headers.get('User-Agent') || 'Miaoda Video Proxy',
      }
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed with status ${response.status}`);
    }

    // 处理流式响应并计算流量
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = response.body?.getReader();
    let totalBytes = 0;

    (async () => {
      try {
        if (!reader) {
          writer.close();
          return;
        }
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          totalBytes += value.length;
          await writer.write(value);
        }
        writer.close();

        // 记录统计信息
        const duration = Date.now() - startTime;
        const estimatedCost = (totalBytes / (1024 * 1024 * 1024)) * (selectedNode.cost_per_gb || 0);

        await supabaseClient.from('video_proxy_logs').insert({
          request_url: targetUrl,
          proxy_url: proxyRequestUrl,
          proxy_node_id: selectedNode.id.toString(),
          status: 'success',
          response_time: duration,
          bytes_transferred: totalBytes,
          estimated_cost: estimatedCost
        });
      } catch (e) {
        console.error('Streaming error:', e);
        writer.abort(e);
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
        'Content-Length': response.headers.get('Content-Length') || '',
        'Cache-Control': 'public, max-age=3600',
      }
    });

  } catch (error: any) {
    console.error('Proxy error:', error);
    
    // 记录错误日志
    await supabaseClient.from('video_proxy_logs').insert({
      request_url: targetUrl,
      status: 'error',
      error_message: error.message,
      response_time: Date.now() - startTime
    });

    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
