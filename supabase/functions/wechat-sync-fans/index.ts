// supabase/functions/wechat-sync-fans/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// 获取微信 access_token
async function getAccessToken(appid: string, appsecret: string): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${appsecret}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errmsg} (${data.errcode})`);
  }
  
  return data.access_token;
}

// 获取粉丝列表（分页）
async function getUserList(accessToken: string, nextOpenid = ''): Promise<any> {
  const url = `https://api.weixin.qq.com/cgi-bin/user/get?access_token=${accessToken}&next_openid=${nextOpenid}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.errcode) {
    throw new Error(`获取粉丝列表失败: ${data.errmsg} (${data.errcode})`);
  }
  
  return data;
}

// 批量获取粉丝详细信息
async function batchGetUserInfo(accessToken: string, openidList: string[]): Promise<any[]> {
  if (openidList.length === 0) return [];
  
  const url = `https://api.weixin.qq.com/cgi-bin/user/info/batchget?access_token=${accessToken}`;
  const body = {
    user_list: openidList.map(openid => ({ openid, lang: 'zh_CN' }))
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  const data = await response.json();
  
  if (data.errcode) {
    throw new Error(`批量获取粉丝信息失败: ${data.errmsg} (${data.errcode})`);
  }
  
  return data.user_info_list || [];
}

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
    const { configId, mode = 'full' } = body;

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

    if (config.type !== 'service_auth') {
      throw new Error('权限不足: 仅支持已认证的服务号同步粉丝列表');
    }

    // 获取 access_token
    const accessToken = await getAccessToken(config.appid, config.appsecret);

    // 分页获取粉丝 OpenID
    let allOpenids: string[] = [];
    let nextOpenid = '';
    let totalCount = 0;

    const result = await getUserList(accessToken, '');
    totalCount = result.total || 0;
    allOpenids = result.data?.openid || [];
    nextOpenid = result.next_openid || '';

    // 如果是全量同步且还有更多页面，继续获取
    if (mode === 'full' && nextOpenid) {
      while (nextOpenid && allOpenids.length < totalCount) {
        const nextResult = await getUserList(accessToken, nextOpenid);
        const openids = nextResult.data?.openid || [];
        allOpenids = allOpenids.concat(openids);
        nextOpenid = nextResult.next_openid || '';
        
        if (allOpenids.length >= totalCount) break;
        if (allOpenids.length > 50000) { // 安全限制，防止死循环或超时
          console.warn('[SyncFans] 粉丝量巨大，单次同步限制为 50,000');
          break;
        }
      }
    }

    console.log(`获取到 ${allOpenids.length} 个粉丝 OpenID`);

    const batchSize = 100;
    let syncedCount = 0;

    for (let i = 0; i < allOpenids.length; i += batchSize) {
      const batch = allOpenids.slice(i, i + batchSize);
      const userInfoList = await batchGetUserInfo(accessToken, batch);

      for (const userInfo of userInfoList) {
        const { error: upsertError } = await supabase
          .from('wechat_fans')
          .upsert({
            config_id: configId,
            openid: userInfo.openid,
            nickname: userInfo.nickname || `微信用户(${userInfo.openid?.substring(0, 4) || '****'})`,
            avatar_url: userInfo.headimgurl || null,
            sex: userInfo.sex || 0,
            city: userInfo.city || null,
            province: userInfo.province || null,
            country: userInfo.country || null,
            subscribe_time: userInfo.subscribe_time ? new Date(userInfo.subscribe_time * 1000).toISOString() : null,
            remark: userInfo.remark || null,
            groupid: userInfo.groupid || null,
            tagid_list: userInfo.tagid_list ? JSON.stringify(userInfo.tagid_list) : null,
            subscribe_scene: userInfo.subscribe_scene || null,
            qr_scene: userInfo.qr_scene || null,
            qr_scene_str: userInfo.qr_scene_str || null,
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'config_id,openid'
          });

        if (!upsertError) {
          syncedCount++;
          
          // 同步状态到 wechat_users
          const { data: existingUser } = await supabase
            .from('wechat_users')
            .select('id, subscribe_status')
            .eq('config_id', configId)
            .eq('openid', userInfo.openid)
            .maybeSingle();

          if (existingUser) {
            if (existingUser.subscribe_status !== true) {
              await supabase
                .from('wechat_users')
                .update({ subscribe_status: true, updated_at: new Date().toISOString() })
                .eq('id', existingUser.id);
            }
          } else {
            await supabase
              .from('wechat_users')
              .insert({
                config_id: configId,
                openid: userInfo.openid,
                subscribe_status: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `成功同步 ${syncedCount} 名粉丝`,
      total: totalCount,
      synced: syncedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const err = error as Error;
    console.error('[Wechat-Sync-Fans Error]:', err.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message,
      message: '同步失败: ' + err.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}

Deno.serve(handler);
