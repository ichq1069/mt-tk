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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { postDate, openid, browserId } = await req.json();

    if (!postDate || !openid || !browserId) {
      return new Response(
        JSON.stringify({ success: false, message: '缺少必要参数' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. 获取配置
    const { data: configData } = await supabaseClient
      .from('system_configs')
      .select('value')
      .eq('key', 'daily_gallery_config')
      .maybeSingle();
    
    const resetLimit = configData?.value?.reset_limit ?? 1;

    // 2. 查找现有记录
    const { data: userPwd, error: pwdError } = await supabaseClient
      .from('daily_gallery_special_passwords')
      .select('*')
      .eq('target_date', postDate)
      .eq('creator_id', openid)
      .eq('source', 'wechat')
      .maybeSingle();

    if (pwdError || !userPwd) {
      return new Response(
        JSON.stringify({ success: false, message: '未找到您的密码记录，请先通过公众号获取' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 3. 检查重置次数
    if ((userPwd.reset_count || 0) >= resetLimit) {
      return new Response(
        JSON.stringify({ success: false, message: `您已达到重置上限（${resetLimit}次），无法再次重置。如需帮助请联系客服。` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 4. 执行重置：生成新密码，清空锁定，增加计数
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 更新有效期为从现在起 24 小时
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 24);

    const { error: updateError } = await supabaseClient
      .from('daily_gallery_special_passwords')
      .update({
        password: newPassword,
        browser_id: null,
        reset_count: (userPwd.reset_count || 0) + 1,
        expires_at: newExpiresAt.toISOString()
      })
      .eq('id', userPwd.id);

    if (updateError) {
      console.error('[DailyGalleryReset] Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, message: '重置失败，请稍后重试' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[DailyGalleryReset] User ${openid} reset password for ${postDate} successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          newPassword: newPassword,
          expiresAt: newExpiresAt.toISOString()
        },
        message: '密码已重置，原有密码已失效。'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DailyGalleryReset] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
