import { createClient } from 'jsr:@supabase/supabase-js@2';
// import { autoCreateUser } from '../_shared/user_creation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VERSION = "10.0.61";

function createResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

// 自动创建用户并绑定 openid
// 已迁移到 ../_shared/user_creation.ts

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/daily-gallery-verify', '').replace(/\/$/, '');

  // 1. 健康检查路由 (仅支持 GET)
  if (req.method === 'GET' && (path === '/health' || path === '')) {
    return createResponse({ 
      status: 'ok', 
      version: VERSION, 
      service: 'daily-gallery-verify',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. 解析与规范化参数
    const body = await req.json().catch(() => ({}));
    const rawPostDate = body.postDate || body.date;
    let postDate = rawPostDate;
    
    // 自动修正 8 位日期格式 (20260323 -> 2026-03-23)
    if (postDate && /^\d{8}$/.test(postDate)) {
      postDate = `${postDate.slice(0, 4)}-${postDate.slice(4, 6)}-${postDate.slice(6, 8)}`;
    }

    let password = body.password || body.p || body.password_used || null;
    if (password !== null) {
      password = String(password).trim();
    }

    const openid = body.openid || null;
    const browserId = body.browserId || null;
    const userId = body.userId || null;
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    console.log(`[DailyGalleryVerify v${VERSION}] Request:`, { postDate, password, openid, browserId, userId, ip });

    // 安全校验：如果已登录，校验 openid 是否与账户绑定的一致，防止 URL 篡改
    if (userId && openid) {
      const { data: userProfile } = await supabaseClient
        .from('profiles')
        .select('mp_openid, wechat_openid')
        .eq('id', userId)
        .maybeSingle();
      
      if (userProfile) {
        const boundOpenid = userProfile.mp_openid || userProfile.wechat_openid;
        if (boundOpenid && boundOpenid !== openid) {
          console.warn(`[DailyGalleryVerify] Security Alert: userId ${userId} tried to use openid ${openid} which doesn't match bound openid ${boundOpenid}`);
          return createResponse({ 
            success: false, 
            message: '身份验证异常，请勿篡改 URL 参数', 
            errorCode: 'SECURITY_ALERT' 
          }, 403);
        }
      }
    }

    if (!postDate) {
      return createResponse({ success: false, message: '缺少必要参数：postDate' }, 400);
    }

    // 3. 并行获取基础数据：锁定状态、配置、帖子基本信息
    const [lockoutRes, configRes, postRes] = await Promise.all([
      supabaseClient.from('daily_gallery_password_lockouts').select('*').eq('ip_address', ip).maybeSingle(),
      supabaseClient.from('system_configs').select('value').eq('key', 'daily_gallery_config').maybeSingle(),
      supabaseClient.from('daily_gallery_posts').select('id, is_published').eq('post_date', postDate).maybeSingle()
    ]);

    // 3.1 检查 IP 锁定
    const lockout = lockoutRes.data;
    if (lockout?.lockout_until && new Date(lockout.lockout_until).getTime() > Date.now()) {
      const waitMins = Math.ceil((new Date(lockout.lockout_until).getTime() - Date.now()) / 60000);
      return createResponse({ 
        success: false, 
        message: `密码错误次数过多，请在 ${waitMins} 分钟后再试`, 
        errorCode: 'IP_LOCKED' 
      });
    }

    // 3.2 检查帖子是否存在
    if (!postRes.data || postRes.data.is_published === false) {
      return createResponse({ success: false, message: '该日期还没有发布内容哦' }, 404);
    }

    // 3.3 解析配置
    const config = configRes.data?.value || {};
    const enablePassword = config.enable_password !== false;
    const enableMiniprogramAd = config.enable_miniprogram_ad === true;

    if (!enablePassword && !enableMiniprogramAd) {
      return createResponse({ success: false, message: '系统未配置任何验证方式' }, 400);
    }

    // 4. 逻辑：优先尝试校验密码，如果失败再检查广告解锁
    let rpcData: any = null;

    // 4.1 校验真实密码 (修复版)
    if (enablePassword && password && password !== 'BYPASS_MP_UNLOCK') {
      console.log('[DailyGalleryVerify] Trying password verification first...');
      const { data, error } = await supabaseClient.rpc(
        'verify_daily_gallery_v3',
        {
          p_post_date: postDate,
          p_password: password,
          p_openid: openid,
          p_browser_id: browserId,
          p_ip_address: ip
        }
      );

      // ✅ 修复：无论成功失败，直接返回结果，不继续执行
      if (data) {
        // 如果成功且有锁定记录，重置锁定记录
        if (data.success && lockout) {
          await supabaseClient.from('daily_gallery_password_lockouts')
            .update({ attempts: 0, lockout_until: null })
            .eq('ip_address', ip);
        }
        
          return createResponse(data);
      }
      
      if (error) {
        console.error('[DailyGalleryVerify] RPC Error:', error);
        return createResponse({
          success: false,
          message: '密码验证失败',
          errorCode: 'INVALID_PASSWORD'
        });
      }
    }

    // 4.2 检查广告解锁逻辑 (如果未通过密码校验)
    if (enableMiniprogramAd && (openid || browserId || userId)) {
      console.log('[DailyGalleryVerify] Checking ad unlock status...');
      const identifier = openid || browserId;
      const altPostDate = postDate.replace(/-/g, '');

      let adQuery = supabaseClient
        .from('ad_unlock_logs')
        .select('id, unlocked_at, created_at, browser_id')
        .in('item_id', [postDate, altPostDate])
        .eq('unlock_type', 'daily_gallery')
        .eq('status', 'unlocked')
        .order('unlocked_at', { ascending: false })
        .limit(1);

      if (userId) {
        adQuery = adQuery.or(`user_id.eq.${userId},browser_id.eq.${browserId}`);
      } else if (openid && openid !== '') {
        adQuery = adQuery.or(`openid.eq.${openid},browser_id.eq.${browserId}`);
      } else if (browserId) {
        adQuery = adQuery.eq('browser_id', browserId);
      }

      const { data: unlockRecord } = await adQuery.maybeSingle();

      if (unlockRecord) {
        // 校验浏览器锁定
        if (unlockRecord.browser_id && browserId && unlockRecord.browser_id !== browserId) {
          console.log('[DailyGalleryVerify] Ad unlock locked to another browser:', unlockRecord.browser_id);
          return createResponse({ 
            success: false, 
            message: '该内容已在其他设备或浏览器解锁，请使用首个解锁的设备。', 
            errorCode: 'BROWSER_LOCKED' 
          });
        }

        // 首次验证通过时锁定浏览器
        if (!unlockRecord.browser_id && browserId) {
           console.log('[DailyGalleryVerify] Locking ad unlock record to browser:', browserId);
           await supabaseClient.from('ad_unlock_logs').update({ browser_id: browserId }).eq('id', unlockRecord.id);
        }

        const unlockedAt = new Date(unlockRecord.unlocked_at || unlockRecord.created_at);
        const diffHours = (Date.now() - unlockedAt.getTime()) / (1000 * 60 * 60);
        
        if (diffHours <= 2) {
          console.log('[DailyGalleryVerify] Ad unlock valid, bypassing password check');
          const { data: bypassData, error: bypassError } = await supabaseClient.rpc(
            'verify_daily_gallery_v3',
            {
              p_post_date: postDate,
              p_password: 'BYPASS_MP_UNLOCK',
              p_openid: openid,
              p_browser_id: browserId
            }
          );
          
          if (!bypassError && bypassData?.success) {
            // 广告解锁成功且有 openid 时，检查 openid 是否存在
            if (openid) {
              const { data: profileCheck } = await supabaseClient
                .from('profiles')
                .select('id')
                .or(`mp_openid.eq.${openid},wechat_openid.eq.${openid}`)
                .maybeSingle();

              if (!profileCheck) {
                return createResponse({
                  success: false,
                  message: '该链接与公众号发送链接不符，请通过官方公众号获取',
                  errorCode: 'OPENID_NOT_FOUND'
                });
              }
            }
            return createResponse(bypassData);
          }
        } else {
          console.log('[DailyGalleryVerify] Ad unlock record found but expired');
        }
      }
    }

    // 4.3 如果是纯 bypass 模式请求 (且没找到广告记录)
    if (password === 'BYPASS_MP_UNLOCK') {
        return createResponse({ 
            success: false, 
            message: '请先扫码观看广告解锁内容', 
            errorCode: 'AD_UNLOCK_REQUIRED' 
        });
    }

    // 4.4 最后的密码尝试 (如果前面没试过，比如密码是 BYPASS_MP_UNLOCK 以外的其他值但 Step 4.1 没通过)
    // 或者是处理之前的失败记录
    if (rpcData) {
       // 记录密码尝试次数
       console.log('[DailyGalleryVerify] Password incorrect');
       const newAttempts = (lockout?.attempts || 0) + 1;
       const updates: any = { 
         attempts: newAttempts, 
         last_attempt_at: new Date().toISOString() 
       };
       
       if (newAttempts >= 5) {
         updates.lockout_until = new Date(Date.now() + 5 * 60 * 1000).toISOString();
       }

       if (lockout) {
         await supabaseClient.from('daily_gallery_password_lockouts').update(updates).eq('ip_address', ip);
       } else {
         await supabaseClient.from('daily_gallery_password_lockouts').insert({ ip_address: ip, ...updates });
       }

       return createResponse(rpcData);
    }

    // 6. 最终校验失败处理
    const failMessage = enableMiniprogramAd 
      ? (enablePassword ? '密码不正确或需要观看广告解锁' : '请先观看广告解锁内容')
      : '密码不正确，请向公众号获取正确凭证';
    
    const failCode = enableMiniprogramAd && (!password || password === 'BYPASS_MP_UNLOCK')
      ? 'AD_UNLOCK_REQUIRED' 
      : 'INVALID_PASSWORD';

    return createResponse({ 
      success: false, 
      message: failMessage, 
      errorCode: failCode 
    });

  } catch (err: any) {
    console.error('[DailyGalleryVerify] Unhandled error:', err);
    return createResponse({ 
      success: false, 
      message: '服务暂时不可用，请稍后再试',
      error: err.message
    }, 500);
  }
});
