import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('APP_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const jwtSecret = Deno.env.get('APP_JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET') || 'fallback_secret_not_recommended';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not set');
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json();
    const { action, username, password, email: providedEmail, customData, inviteCode } = body;

    const email = providedEmail || (username.includes('@') ? username : `${username}@miaoda.com`);

    if (action === 'register') {
      // 1. 检查用户是否已存在于 profiles
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, wechat_openid, mp_openid')
        .or(`username.eq.${username},email.eq.${email}`)
        .maybeSingle();
        
      if (existingProfile) {
        // --- 绑定逻辑优化 ---
        const bindOpenId = body.bind_openid || customData?.bind_openid;
        const bindType = body.bind_type || customData?.bind_type;

        if (bindOpenId && bindType) {
          const updateData: any = {};
          if (bindType === 'wechat' && !existingProfile.wechat_openid) {
            updateData.wechat_openid = bindOpenId;
          } else if (bindType === 'miniprogram' && !existingProfile.mp_openid) {
            updateData.mp_openid = bindOpenId;
          }

          if (Object.keys(updateData).length > 0) {
            await supabaseAdmin.from('profiles').update(updateData).eq('id', existingProfile.id);
            return new Response(JSON.stringify({ 
              success: true, 
              message: '已成功绑定现有账号，请直接登录',
              is_bound: true,
              profile: { ...existingProfile, ...updateData }
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        throw new Error('用户名或邮箱已存在');
      }

      // 2. 密码加密
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);

      // 3. 尝试创建 Supabase Auth 用户（同步）
      let supabaseUser = null;
      try {
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { username, ...customData }
        });
        if (!createError) supabaseUser = userData.user;
      } catch (e) {
        console.warn('Supabase Auth 用户创建失败（将继续创建本地 Profile）:', e);
      }

      // 4. 创建本地 Profile（带有密码哈希）
      const profileId = supabaseUser?.id || crypto.randomUUID();
      const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: profileId,
        username,
        email,
        password_hash: passwordHash,
        ...customData
      }).select().single();

      if (profileError) throw profileError;

      return new Response(JSON.stringify({ success: true, profile }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (action === 'login') {
      // 1. 获取 Profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .or(`username.eq.${username},email.eq.${username}`)
        .maybeSingle();
        
      if (!profile || profileError) throw new Error('用户不存在');

      // 2. 验证密码
      let isValid = false;
      if (profile.password_hash) {
        isValid = bcrypt.compareSync(password, profile.password_hash);
      } else {
        // 如果本地没有密码哈希，尝试通过 Supabase Auth 登录
        try {
          const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({ 
            email: profile.email || `${profile.username}@miaoda.com`, 
            password 
          });
          if (!authError && authData.user) {
            isValid = true;
            // 同步密码哈希到本地，供下次使用
            const salt = bcrypt.genSaltSync(10);
            const newHash = bcrypt.hashSync(password, salt);
            await supabaseAdmin.from('profiles').update({ password_hash: newHash }).eq('id', profile.id);
          }
        } catch (e) {
          console.warn('Fallback Auth 验证失败:', e);
        }
      }

      if (!isValid) throw new Error('用户名或密码错误');

      // 3. 生成自定义 JWT (模拟 Supabase session)
      const payload = {
        aud: "authenticated",
        exp: getNumericDate(7 * 24 * 60 * 60), // 7 天
        sub: profile.id,
        email: profile.email,
        phone: "",
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: { username: profile.username },
        role: "authenticated",
        session_id: crypto.randomUUID()
      };

      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(jwtSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );

      const token = await create({ alg: "HS256", typ: "JWT" }, payload, key);

      return new Response(JSON.stringify({ 
        success: true, 
        access_token: token,
        token_type: "bearer",
        expires_in: 7 * 24 * 60 * 60,
        refresh_token: crypto.randomUUID(), // Mock refresh token
        user: {
          id: profile.id,
          aud: "authenticated",
          role: "authenticated",
          email: profile.email,
          user_metadata: { username: profile.username },
          created_at: profile.created_at,
          updated_at: new Date().toISOString()
        }
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    throw new Error('无效的操作类型');

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 400 
    });
  }
}

Deno.serve(handler);
