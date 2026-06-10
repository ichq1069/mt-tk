// supabase/functions/auth-sms/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { redisUtils } from '../_shared/redis.ts';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('MIAODA_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('MIAODA_SUPABASE_SERVICE_KEY');
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(`缺少必要的环境变量: SUPABASE_URL (${!!supabaseUrl}) 或 SUPABASE_SERVICE_ROLE_KEY (${!!supabaseServiceKey})`);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const headers = {
      'X-Gateway-Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // 内联域名配置逻辑
    const matchDomainConfig = async (supabase: any, providedUrl?: string) => {
      if (!providedUrl) return null;
      // 去除末尾斜杠
      const cleanUrl = providedUrl.replace(/\/$/, '').toLowerCase();
      // 在 DB 中查询时也尝试去除斜杠和转小写
      const { data, error } = await supabase
        .from('domain_configs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (error || !data) return null;

      // 在内存中匹配，因为数据库里可能存了带斜杠的
      return data.find((d: any) => 
        d.domain_url.replace(/\/$/, '').toLowerCase() === cleanUrl
      ) || null;
    };

    const getDefaultDomainConfig = async (supabase: any) => {
      const { data } = await supabase
        .from('domain_configs')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      return data;
    };

    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { domainUrl } = body; // 前端传递的当前访问域名

    // 匹配域名配置，获取 identifier 和 site_url
    const domainConfig = await matchDomainConfig(supabase, domainUrl);
    
    if (!domainConfig && domainUrl) {
      console.warn(`[Auth-SMS] Unknown domain: ${domainUrl}. Configs in DB:`, 
        (await supabase.from('domain_configs').select('domain_url')).data?.map(d => d.domain_url));
      throw new Error(`非法访问域名 (${domainUrl})，请联系管理员配置域名映射`);
    }

    const finalConfig = domainConfig || await getDefaultDomainConfig(supabase);
    let siteUrl = finalConfig?.domain_url || req.headers.get('origin') || req.headers.get('referer') || url.origin;
    // 统一去除 siteUrl 末尾斜杠，避免拼接时出现双斜杠
    siteUrl = siteUrl.replace(/\/$/, '');
    
    const domainIdentifier = finalConfig?.identifier || 'default';

    const cleanPath = (p: string) => {
      if (!p) return p;
      return p.replace(/([^:])\/\//g, '$1/');
    };

    console.log(`[AuthSMS] Request domainUrl: ${domainUrl}, Matched siteUrl: ${siteUrl}, identifier: ${domainIdentifier}`);
    
    console.log(`[AuthSMS] Body:`, JSON.stringify(body));

    const pathname = url.pathname.toLowerCase();
    const { mobile, sessionId, code, configId, openid, username, password, email: providedEmail, customData, redirectTo } = body;

    if (pathname.endsWith('/send')) {
      if (!apiKey) throw new Error('缺少必要的环境变量: INTEGRATIONS_API_KEY');
      if (!mobile) throw new Error('参数缺失: 请输入手机号');
      
      // Redis 频率限制: 每个手机号 60 秒只能发送一次
      const rateLimitKey = `sms:limit:${mobile}`;
      const isLimited = await redisUtils.get(rateLimitKey);
      if (isLimited) {
        throw new Error('发送频率过快，请 60 秒后再试');
      }

      const response = await fetch('https://app-b5vwlh6eky69-api-W9z3M74x6ZNL-gateway.appmiaoda.com/v1/code/send_message', {
        method: 'POST',
        headers,
        body: JSON.stringify({ mobile })
      });
      
      const resData = await response.json().catch(() => ({ status: -1, msg: '网关响应解析失败' }));
      if (resData.status !== 0) throw new Error(resData.msg || '发送验证码失败');
      
      // 设置频率限制
      await redisUtils.set(rateLimitKey, '1', 60);

      return new Response(JSON.stringify({ 
        success: true, 
        sessionId: resData.data?.sessionId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (pathname.endsWith('/verify')) {
      if (!code) throw new Error('参数缺失: code 是必填项');

      // 验证微信绑定请求
      // 优化：放宽 config_id 限制，优先匹配传入的 configId，若无则全局匹配
      let query = supabase
        .from('wechat_binding_requests')
        .select('*')
        .eq('code', code)
        .eq('type', 'wechat_to_user')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (configId) {
        query = query.or(`config_id.eq.${configId},config_id.is.null`);
      }

      const { data: bindingReq, error: bindError } = await query.limit(1).maybeSingle();

      if (bindError) throw bindError;
      if (!bindingReq) throw new Error('验证码无效或已过期，请重新在公众号回复“绑定”获取');

      // 如果还没有 openid，说明还没扫码或扫码后还没回调成功
      if (!bindingReq.openid) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: '等待扫码中...' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const actualConfigId = bindingReq.config_id;

      // 验证通过，检查对应的微信用户是否已绑定了平台账户
      const { data: wechatUser, error: wechatError } = await supabase
        .from('wechat_users')
        .select('id, user_id, openid')
        .eq('config_id', actualConfigId)
        .eq('openid', bindingReq.openid)
        .maybeSingle();

      if (wechatError) throw wechatError;

      if (wechatUser && wechatUser.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, email')
          .eq('id', wechatUser.user_id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile) {
          const { data: { user: authUser }, error: getUserError } = await supabase.auth.admin.getUserById(profile.id);
          if (getUserError || !authUser) throw new Error('关联账户异常或已删除');

          const finalRedirectTo = cleanPath(redirectTo || `${siteUrl}/profile`);

          // 关键修复：在生成登录链接前，检查是否需要绑定 OpenID
          // 这里我们已经在 bindingReq 中有了 openid
          // 如果 wechat_users 中没有记录，说明还没完成正式绑定逻辑（比如是通过验证码流程刚校验通过）
          if (bindingReq.openid && !wechatUser) {
             console.log(`[AuthSMS/Verify] Auto-binding openid ${bindingReq.openid} to user ${profile.id}`);
             await supabase.from('wechat_users').upsert({
                config_id: actualConfigId,
                openid: bindingReq.openid,
                user_id: profile.id,
                subscribe_status: true,
                domain_identifier: domainIdentifier
             }, { onConflict: 'config_id,openid' });
          }

          const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: authUser.email as string,
            options: { redirectTo: finalRedirectTo }
          });

          if (linkError) throw linkError;

          // 消耗掉此验证码
          await supabase.from('wechat_binding_requests').delete().eq('id', bindingReq.id);

          return new Response(JSON.stringify({ 
            success: true, 
            exists: true, 
            loginLink: linkData.properties.action_link,
            profile 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        exists: false,
        openid: bindingReq.openid,
        configId: actualConfigId, // 返回实际匹配的公众号ID
        requestId: bindingReq.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (pathname.endsWith('/create-account')) {
      if (!openid || !username || !password || !configId) throw new Error('参数缺失: openid, username, password 或 configId 是必填项');

      // 1. 先检查该微信是否已绑定
      const { data: wechatUser } = await supabase
        .from('wechat_users')
        .select('id, user_id')
        .eq('config_id', configId)
        .eq('openid', openid)
        .maybeSingle();

      if (wechatUser && wechatUser.user_id) {
        throw new Error('该微信已绑定了账号，请直接登录');
      }

      // 2. 创建用户
      const email = providedEmail || `${username}@miaoda.com`;
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { username, custom_fields: customData || {} },
        email_confirm: true
      });

      if (createError) throw createError;
      if (!newUser.user) throw new Error('用户创建成功但未返回用户信息');

      // 3. 关联微信 (使用之前查询到的 wechatUser)
      if (wechatUser) {
        await supabase.from('wechat_users').update({ 
          user_id: newUser.user.id,
          domain_identifier: domainIdentifier 
        }).eq('id', wechatUser.id);
      } else {
        await supabase.from('wechat_users').insert({
          config_id: configId,
          openid: openid,
          user_id: newUser.user.id,
          subscribe_status: true,
          domain_identifier: domainIdentifier
        });
      }

      const finalRedirectTo = cleanPath(redirectTo || `${siteUrl}/profile`);
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: { redirectTo: finalRedirectTo }
      });

      if (linkError) throw linkError;

      return new Response(JSON.stringify({ 
        success: true, 
        loginLink: linkData.properties.action_link 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (pathname.endsWith('/bind-account')) {
      if (!openid || !username || !password || !configId) throw new Error('参数缺失: openid, username, password 或 configId 是必填项');

      const email = `${username}@miaoda.com`;
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      
      if (signInError) throw new Error('用户名或密码错误');

      const { data: wechatUser } = await supabase
        .from('wechat_users')
        .select('id, user_id')
        .eq('config_id', configId)
        .eq('openid', openid)
        .maybeSingle();

      if (wechatUser && wechatUser.user_id && wechatUser.user_id !== data.user.id) {
        throw new Error('该微信已绑定了其他账号，请先在网页端解除绑定后再试');
      }

      if (wechatUser) {
        await supabase.from('wechat_users').update({ user_id: data.user.id, subscribe_status: true }).eq('id', wechatUser.id);
      } else {
        await supabase.from('wechat_users').insert({
          config_id: configId,
          openid: openid,
          user_id: data.user.id,
          subscribe_status: true
        });
      }

      if (code) {
        await supabase.from('wechat_binding_requests').delete().match({ openid, config_id: configId, code });
      }

      return new Response(JSON.stringify({ success: true, loginLink: cleanPath(`${siteUrl}/login`) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (pathname.endsWith('/generate-qr')) {
      if (!configId) throw new Error('参数缺失: configId 是必填项');

      const { data: config, error: configError } = await supabase.from('wechat_configs').select('*').eq('id', configId).maybeSingle();
      if (configError) throw configError;
      if (!config || config.type !== 'service_auth') throw new Error('仅认证服务号支持生成带参数二维码');

      const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appid}&secret=${config.appsecret}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json().catch(() => ({ errmsg: '微信响应解析失败' }));
      if (!tokenData.access_token) throw new Error('获取微信授权失败: ' + (tokenData.errmsg || 'Unknown Error'));

      const accessToken = tokenData.access_token;
      const sceneCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const qrUrl = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`;
      const qrRes = await fetch(qrUrl, {
        method: 'POST',
        body: JSON.stringify({
          expire_seconds: 300,
          action_name: 'QR_STR_SCENE',
          action_info: { scene: { scene_str: `login:${sceneCode}` } }
        })
      });
      const qrData = await qrRes.json().catch(() => ({ errmsg: '二维码接口响应解析失败' }));
      if (!qrData.ticket) throw new Error('生成二维码失败: ' + (qrData.errmsg || 'Unknown Error'));

      const qrImageUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(qrData.ticket)}`;

      await supabase.from('wechat_binding_requests').insert({
        config_id: configId,
        code: sceneCode,
        type: 'wechat_to_user',
        site_url: siteUrl, // 记录来源站点
        domain_identifier: domainIdentifier, // 记录来源站点标识
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      });

      return new Response(JSON.stringify({ 
        success: true, 
        qrUrl: qrImageUrl, 
        code: sceneCode 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Path Not Found', { status: 404 });

  } catch (error) {
    const err = error as Error;
    console.error('[AuthSMS Error]:', err.message);
    return new Response(JSON.stringify({ 
      success: false, 
      message: err.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}

Deno.serve(handler);
