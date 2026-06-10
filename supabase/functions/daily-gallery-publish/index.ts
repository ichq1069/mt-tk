import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 每日图集自动发布 Edge Function
 * 功能：
 * 1. 根据配置自动选择未使用的图片
 * 2. 生成随机密码
 * 3. 创建每日发布记录
 * 4. 可手动触发或定时触发
 */
const VERSION = "10.0.61";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/daily-gallery-publish', '');

  // 健康检查接口
  if (path === '/health') {
    return new Response(
      JSON.stringify({ status: 'ok', version: VERSION, service: 'daily-gallery-publish' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const urlToken = url.searchParams.get('token');
    
    // 获取配置
    const { data: configData } = await supabaseClient
      .from('system_configs')
      .select('value')
      .eq('key', 'daily_gallery_config')
      .maybeSingle();

    const config = configData?.value || {
      daily_count: 5,
      password_duration: 24
    };

    // 校验 Token (如果不是内部触发)
    // 如果没有配置 trigger_token 则默认允许，如果配置了则必须校验
    if (config.trigger_token && urlToken !== config.trigger_token) {
      return new Response(
        JSON.stringify({ success: false, message: '无效的令牌 (Invalid Token)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    let body: any = {};
    if (req.method === 'POST') {
      try {
        body = await req.json();
      } catch (e) {
        // 允许空 Body，走默认配置
      }
    }

    const targetDate = body.postDate || url.searchParams.get('postDate') || new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
    const imageIds = body.imageIds;
    const manualPassword = body.manualPassword || url.searchParams.get('password');

    // 检查是否已存在
    const { data: existing } = await supabaseClient
      .from('daily_gallery_posts')
      .select('id')
      .eq('post_date', targetDate)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, message: '该日期已有发布记录' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let selectedImageIds: string[] = [];

    // 选择图片
    if (imageIds && imageIds.length > 0) {
      // 手动指定 ID 选择
      // 也要检查 15 天规则
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const { data: recentImages, error: checkError } = await supabaseClient
        .from('media_items')
        .select('id, title')
        .in('id', imageIds)
        .or(`and(wechat_draft_status.in.("used","adopted"),wechat_last_used_at.gte."${fifteenDaysAgo.toISOString()}")`);
      
      if (checkError) {
        console.error('[DailyGalleryPublish] Manual check error:', checkError);
      }

      if (recentImages && recentImages.length > 0) {
        const titles = recentImages.map(img => img.title || img.id).join(', ');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `以下图片在微信草稿库中使用未满15天，不允许添加：${titles}` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      selectedImageIds = imageIds;
    } else {
      // 自动选择逻辑：
      // 优先从符合条件的图片中选择（旧图优先，遵守15天复用规则，避开已入稿素材）
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      // 1. 构造查询条件
      // 排除逻辑：
      // - 必须是 approved, image, not hidden, not deleted
      // - 排除已经在每日图集发布过的 (daily_gallery_status != used)
      // - 满足 15 天规则：wechat_draft_status = 'available' OR (wechat_last_used_at < 15 days ago OR is null)
      // - 优先使用 created_at 靠前的
      
      const { data: eligibleImages, error: eligibleError } = await supabaseClient
        .from('media_items')
        .select('id, wechat_draft_status, created_at, daily_gallery_status')
        .eq('status', 'approved')
        .eq('is_hidden', false)
        .eq('type', 'image')
        .is('deleted_at', null)
        .or('daily_gallery_status.is.null,daily_gallery_status.neq.used') // 避免每日图集自身重复
        .or(`wechat_draft_status.eq.available,and(wechat_draft_status.in.("used","adopted"),or(wechat_last_used_at.is.null,wechat_last_used_at.lt."${fifteenDaysAgo.toISOString()}"))`)
        .order('created_at', { ascending: true })
        .limit(100); // 先取一批出来，再在内存中做多次排序

      if (eligibleError) {
        console.error('[DailyGalleryPublish] Eligible images error:', eligibleError);
      }

      if (eligibleImages && eligibleImages.length > 0) {
        // 内存中三次排序：
        // 1. 优先使用已设为 'pending' (待发布库) 的素材
        // 2. available 状态 (草稿库外) 的排在前面
        // 3. created_at 靠前的排前面
        const sorted = [...eligibleImages].sort((a, b) => {
          // 优先级1：待发布库状态
          const aPending = a.daily_gallery_status === 'pending' ? 0 : 1;
          const bPending = b.daily_gallery_status === 'pending' ? 0 : 1;
          if (aPending !== bPending) return aPending - bPending;

          // 优先级2：微信可用性
          const aAvailable = a.wechat_draft_status === 'available' ? 0 : 1;
          const bAvailable = b.wechat_draft_status === 'available' ? 0 : 1;
          if (aAvailable !== bAvailable) return aAvailable - bAvailable;
          
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        selectedImageIds = sorted.slice(0, config.daily_count || 5).map(img => img.id);
      }

      if (selectedImageIds.length === 0) {
        return new Response(
          JSON.stringify({ success: false, message: '没有符合条件的图片（均在15天复用限制内或已入稿）' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // 生成密码（6位数字）
    const password = manualPassword || Math.floor(100000 + Math.random() * 900000).toString();

    // 计算密码过期时间
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setHours(passwordExpiresAt.getHours() + (config.password_duration || 1));

    // 创建发布记录
    const { data: post, error: postError } = await supabaseClient
      .from('daily_gallery_posts')
      .insert([{
        post_date: targetDate,
        password: password,
        password_expires_at: passwordExpiresAt.toISOString(),
        image_ids: selectedImageIds,
        is_published: true,
        published_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (postError) {
      console.error('[DailyGalleryPublish] Post creation error:', postError);
      return new Response(
        JSON.stringify({ success: false, message: '创建发布记录失败' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 更新已发布图片的状态为 used
    await supabaseClient
      .from('media_items')
      .update({ daily_gallery_status: 'used' })
      .in('id', selectedImageIds);

    // 生成并存入各公众号独立密码
    const { data: accountConfigs } = await supabaseClient
      .from('wechat_account_password_config')
      .select('*')
      .eq('push_enabled', true);

    if (accountConfigs && accountConfigs.length > 0) {
      const accountPasswords = accountConfigs.map(acct => {
        let acctPwd = '';
        if (acct.password_pattern === '6_digit_number') {
          acctPwd = Math.floor(100000 + Math.random() * 900000).toString();
        } else if (acct.password_pattern === '8_char_mixed') {
          acctPwd = Math.random().toString(36).substring(2, 10).toUpperCase();
        } else {
          acctPwd = password; // 默认使用主密码
        }
        return {
          post_id: post.id,
          wechat_account_id: acct.account_id,
          password: acctPwd
        };
      });
      
      await supabaseClient.from('daily_gallery_account_passwords').upsert(accountPasswords);
    }

    // 触发自动补充待发布素材库（为下一轮发布做准备）
    await supabaseClient.rpc('auto_refill_pending_daily_gallery_materials');

    return new Response(
      JSON.stringify({
        success: true,
        message: '发布成功',
        data: {
          postId: post.id,
          postDate: targetDate,
          password: password,
          imageCount: selectedImageIds.length,
          expiresAt: passwordExpiresAt.toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[DailyGalleryPublish] Error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
