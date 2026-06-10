import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v5.2.1/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('缺少必要的环境变量: JWT_SECRET');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { grant_type, client_id, client_secret } = body;

    if (grant_type !== 'client_credentials') {
      return new Response(JSON.stringify({ error: 'unsupported_grant_type', error_description: 'Only client_credentials is supported' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!client_id || !client_secret) {
      return new Response(JSON.stringify({ error: 'invalid_client', error_description: 'Missing client_id or client_secret' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 验证客户端凭据
    const { data: client, error: clientError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', client_id)
      .eq('client_secret', client_secret)
      .eq('is_active', true)
      .maybeSingle();

    if (clientError || !client) {
      console.error('[OAuth] 客户端验证失败:', client_id, clientError);
      return new Response(JSON.stringify({ error: 'invalid_client', error_description: 'Invalid client credentials' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 签发 JWT Token
    // 注意: 这里签发的 Token 包含 role: admin, 使得 admin-api-gateway 可以识别
    const secret = new TextEncoder().encode(jwtSecret);
    const token = await new jose.SignJWT({
      role: 'admin',
      sub: `client:${client_id}`,
      iss: 'admin-oauth-server',
      aud: 'admin-api',
      scopes: client.scopes,
      is_oauth: true
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h') // Token 有效期 1 小时
      .sign(secret);

    return new Response(JSON.stringify({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: client.scopes.join(' ')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const err = error as Error;
    console.error('[OAuth Server] 错误:', err.message);
    return new Response(JSON.stringify({ error: 'server_error', error_description: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

Deno.serve(handler);
