import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createHash } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { configId } = body;

    if (!configId) {
      throw new Error('参数缺失: configId 是必填项');
    }

    // 获取微信配置
    const { data: config, error: configError } = await supabase
      .from('wechat_configs')
      .select('*')
      .eq('id', configId)
      .maybeSingle();

    if (configError) throw configError;
    if (!config) {
      throw new Error(`微信配置不存在: ${configId}`);
    }

    if (!config.token) {
      throw new Error('Token 未配置，请先在管理后台生成 Token');
    }

    // 获取服务器配置
    const { data: serverConfigData } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'wechat_server_config')
      .maybeSingle();
    
    const serverConfig = serverConfigData?.value || { baseUrl: 'https://backend.appmiaoda.com/projects/supabase290871706745094144' };
    const baseUrl = (serverConfig.baseUrl || '').endsWith('/') ? serverConfig.baseUrl.slice(0, -1) : serverConfig.baseUrl;

    if (!baseUrl) throw new Error('未配置服务器 baseUrl，请在系统设置中完善');

    // 构造回调 URL
    const callbackUrl = `${baseUrl}/functions/v1/wechat-callback?config_id=${configId}`;

    // 生成测试参数
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2, 15);
    const echostr = Math.random().toString(36).substring(2, 15);

    // 计算签名
    const arr = [config.token.trim(), timestamp, nonce].sort();
    const str = arr.join('');
    const signature = createHash('sha1').update(str).digest('hex');

    // 发送 GET 请求验证
    const testUrl = `${callbackUrl}&signature=${signature}&timestamp=${timestamp}&nonce=${nonce}&echostr=${echostr}`;
    
    console.log('[Wechat-Test] Testing URL:', testUrl);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'WeChat-Test-Bot'
      }
    });

    const responseText = await response.text().catch(() => "");
    
    console.log('[Wechat-Test] Status:', response.status, 'Response:', responseText);

    if (response.status === 200 && responseText === echostr) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: '连通性测试成功！服务器配置正确且能够处理微信验证。',
        details: {
          url: callbackUrl,
          status: response.status,
          echostr_match: true
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        message: '连通性测试失败: 服务器响应不符合预期',
        details: {
          url: callbackUrl,
          status: response.status,
          expected: echostr,
          received: responseText,
          echostr_match: responseText === echostr
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

  } catch (error) {
    const err = error as Error;
    console.error('[Wechat-Test-Connection Error]:', err.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message,
      message: '测试失败: ' + err.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}

Deno.serve(handler);
