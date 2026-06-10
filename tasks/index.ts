import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function createResponse(data, status = 200) {
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

async function validateRequest(supabase, url, req) {
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
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { valid: false, message: 'API Key expired' };
  }

  return { valid: true, keyData: data };
}

async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ====================== 🔥 已删除 JWT 校验 ======================
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(`缺少 Supabase 配置`);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const url = new URL(req.url);
    const validation = await validateRequest(supabaseAdmin, url, req);

    if (!validation.valid) {
      return createResponse({ success: false, message: validation.message }, 403);
    }

    const pathParts = url.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    
    let body = {};
    try {
      body = await req.json();
    } catch (e) {}
    
    let action = body.action;
    if (!action) {
      if (lastPart === 'login' || url.searchParams.get('action') === 'login') action = 'login';
      else if (lastPart === 'register' || url.searchParams.get('action') === 'register') action = 'register';
    }

    const username = body.username;
    const password = body.password;
    const providedEmail = body.email;
    const customData = body.customData;

    if (!username || !password) {
      throw new Error('用户名和密码不能为空');
    }

    const email = providedEmail || (username.includes('@') ? username : `${username}@miaoda.com`);

    // ====================== 注册 ======================
    if (action === 'register') {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .or(`username.eq.${username},email.eq.${email}`)
        .maybeSingle();
        
      if (existingProfile) {
        throw new Error('用户名或邮箱已存在');
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      const profileId = crypto.randomUUID();
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: profileId,
          username: username,
          email: email,
          password_hash: passwordHash,
          ...customData
        })
        .select()
        .single();

      if (profileError) throw profileError;
      return createResponse({ success: true, profile });
    }

    // ====================== 登录（带自动同步回填） ======================
    if (action === 'login') {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .or(`username.eq.${username},email.eq.${username}`)
        .maybeSingle();
      
      if (!profile || profileError) throw new Error('用户不存在');

      let isValid = false;
      if (profile.password_hash) {
        isValid = bcrypt.compareSync(password, profile.password_hash);
      } else {
        // 🔥 核心逻辑：如果本地无哈希，尝试从 Supabase 原生 Auth 验证并同步
        try {
          const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({ 
            email: profile.email || `${profile.username}@miaoda.com`, 
            password: password 
          });
          
          if (!authError && authData.user) {
            isValid = true;
            // 同步：生成哈希并存入本地 profiles 表，下次登录就不用调原生 Auth 了
            const salt = bcrypt.genSaltSync(10);
            const newHash = bcrypt.hashSync(password, salt);
            await supabaseAdmin.from('profiles').update({ password_hash: newHash }).eq('id', profile.id);
            console.log(`[AppAuth] 成功为用户 ${username} 同步并回填密码哈希`);
          }
        } catch (e) {
          console.error('Fallback Auth 验证失败:', e);
        }
      }

      if (!isValid) throw new Error('用户名或密码错误');

      // 直接返回 token，不需要 JWT
      return createResponse({ 
        success: true, 
        access_token: "token-" + profile.id,
        token_type: "bearer",
        expires_in: 604800,
        user: {
          id: profile.id,
          username: profile.username,
          email: profile.email
        }
      });
    }

    throw new Error('无效的操作类型');

  } catch (error) {
    return createResponse({ error: error.message }, 400);
  }
}

Deno.serve(handler);
