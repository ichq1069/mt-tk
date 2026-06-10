import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'create_session' | 'check_session' | 'update_session' | 'bind_account' | 'create_user';
  scene_code?: string;
  openid?: string;
  code?: string; // 微信授权码
  username?: string;
  password?: string;
  user_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { action } = body;

    // 获取微信配置
    const appId = Deno.env.get('WECHAT_MINIPROGRAM_LOGIN_APP_ID');
    const appSecret = Deno.env.get('WECHAT_MINIPROGRAM_LOGIN_APP_SECRET');

    // 1. 创建会话（H5端生成二维码时调用）
    if (action === 'create_session') {
      const scene_code = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { data, error } = await supabase
        .from('miniprogram_login_sessions')
        .insert({
          scene_code,
          status: 'pending',
          action: 'login'
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. 检查会话状态（H5端轮询调用）
    if (action === 'check_session') {
      const { scene_code } = body;
      if (!scene_code) {
        throw new Error('scene_code is required');
      }

      const { data, error } = await supabase
        .from('miniprogram_login_sessions')
        .select('*')
        .eq('scene_code', scene_code)
        .single();

      if (error) throw error;

      // 如果成功，返回绑定的用户名
      let username = null;
      if (data.status === 'success' && data.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', data.user_id)
          .single();
        username = profile?.username;
      }

      return new Response(
        JSON.stringify({ success: true, data: { ...data, username } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. 更新会话（小程序端扫码后调用，获取 openid 并检查绑定）
    if (action === 'update_session') {
      const { scene_code, code } = body;
      let openid = body.openid;

      if (!scene_code) {
        throw new Error('scene_code is required');
      }

      // 如果提供了 code，则通过微信 API 获取 openid
      if (code && appId && appSecret) {
        const wxResponse = await fetch(
          `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`
        );
        const wxData = await wxResponse.json();
        if (wxData.openid) {
          openid = wxData.openid;
        } else {
          throw new Error('微信授权失败: ' + (wxData.errmsg || 'Unknown error'));
        }
      }

      if (!openid) {
        throw new Error('openid or code is required');
      }

      // 检查该openid是否已绑定用户
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('wechat_openid', openid)
        .maybeSingle();

      if (profile) {
        // 已绑定用户，直接登录成功
        await supabase
          .from('miniprogram_login_sessions')
          .update({
            openid,
            user_id: profile.id,
            status: 'success',
            action: 'login'
          })
          .eq('scene_code', scene_code);

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { 
              is_bound: true, 
              user_id: profile.id,
              openid,
              action: 'login'
            } 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // 未绑定用户，需要跳转注册或绑定
        await supabase
          .from('miniprogram_login_sessions')
          .update({
            openid,
            status: 'processing',
            action: 'bind'
          })
          .eq('scene_code', scene_code);

        return new Response(
          JSON.stringify({ 
            success: true, 
            data: { 
              is_bound: false,
              openid,
              action: 'bind'
            } 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. 绑定账户（小程序端输入账号密码绑定）
    if (action === 'bind_account') {
      const { scene_code, username, password } = body;
      if (!scene_code || !username || !password) {
        throw new Error('scene_code, username and password are required');
      }

      // 获取会话中的openid
      const { data: session } = await supabase
        .from('miniprogram_login_sessions')
        .select('openid')
        .eq('scene_code', scene_code)
        .single();

      if (!session || !session.openid) {
        throw new Error('Invalid session');
      }

      // 验证用户名密码
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${username}@miaoda.com`,
        password
      });

      if (authError) {
        return new Response(
          JSON.stringify({ success: false, error: '账号或密码错误' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 绑定openid到用户
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ wechat_openid: session.openid })
        .eq('id', authData.user.id);

      if (updateError) throw updateError;

      // 更新会话状态
      const { error: sessionError } = await supabase
        .from('miniprogram_login_sessions')
        .update({
          user_id: authData.user.id,
          status: 'success',
          action: 'login'
        })
        .eq('scene_code', scene_code);

      if (sessionError) throw sessionError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            user_id: authData.user.id,
            message: '绑定成功'
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. 创建新用户（小程序端选择创建新用户）
    if (action === 'create_user') {
      const { scene_code } = body;
      if (!scene_code) {
        throw new Error('scene_code is required');
      }

      // 更新会话状态为等待注册
      const { error } = await supabase
        .from('miniprogram_login_sessions')
        .update({
          status: 'processing',
          action: 'register'
        })
        .eq('scene_code', scene_code);

      if (error) throw error;

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            message: '请在H5页面完成注册',
            action: 'register'
          } 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
