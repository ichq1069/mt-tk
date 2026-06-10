import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const supabase = getSupabaseClient();
  const validation = await validateRequest(supabase, url, req);

  if (!validation.valid) {
    return createResponse({ success: false, message: validation.message }, 403);
  }

  // Path format: /functions/v1/app-user/check-in-status/:userId or /functions/v1/app-user/check-in
  const pathParts = url.pathname.split('/').filter(Boolean);
  const action = pathParts.find(p => ['check-in-status', 'check-in', 'favorite-status', 'toggle-favorite', 'favorites', 'media', 'profile'].includes(p)) || '';
  const userIdFromPath = pathParts[pathParts.length - 1];

  try {
    // 1. 获取 userId
    let userId = userIdFromPath;
    let body = {};
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}));
      userId = body.userId || userId;
    }

    if (!userId || userId.length < 10) {
      // 某些接口可能在 body 中没有 userId，但在 query 中有
      userId = url.searchParams.get('userId') || userId;
    }

    // 2. 处理 action
    if (action === 'check-in-status') {
      const now = new Date();
      const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const today = beijingNow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', userId)
        .eq('check_in_date', today)
        .maybeSingle();

      if (error) throw error;

      return createResponse({
        success: true,
        hasCheckedIn: !!data,
        date: today
      });
    }

    if (action === 'check-in') {
      // ... (existing check-in logic)
      const now = new Date();
      const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const today = beijingNow.toISOString().split('T')[0];
      const currentTime = beijingNow.toISOString().split('T')[1].substring(0, 5); // HH:mm

      // 0. 检查时间限制
      const { data: globalConfigData } = await supabase.from('system_configs').select('value').eq('key', 'check_in_settings').maybeSingle();
      const globalConfig = globalConfigData?.value || {};
      
      if (globalConfig.checkin_start_time && currentTime < globalConfig.checkin_start_time) {
        throw new Error(`签到尚未开启，开启时间: ${globalConfig.checkin_start_time}`);
      }
      if (globalConfig.checkin_end_time && currentTime > globalConfig.checkin_end_time) {
        throw new Error(`签到已结束，截止时间: ${globalConfig.checkin_end_time}`);
      }

      // 1. 检查今日是否已签到
      const { data: existingCheckIn } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', userId)
        .eq('check_in_date', today)
        .maybeSingle();

      if (existingCheckIn) {
        return createResponse({ success: false, message: '今日已签到' }, 400);
      }

      // 2. 计算连续签到
      const { data: lastLogs } = await supabase
        .from('check_ins')
        .select('check_in_date')
        .eq('user_id', userId)
        .order('check_in_date', { ascending: false })
        .limit(31);
      
      let currentStreak = 1;
      if (lastLogs && lastLogs.length > 0) {
        const yesterdayDate = new Date(beijingNow.getTime() - 86400000);
        const yesterday = yesterdayDate.toISOString().split('T')[0];
        
        if (lastLogs[0].check_in_date === yesterday) {
          let checkDate = yesterdayDate;
          for (const log of lastLogs) {
            if (log.check_in_date === checkDate.toISOString().split('T')[0]) {
              currentStreak++;
              checkDate = new Date(checkDate.getTime() - 86400000);
            } else {
              break;
            }
          }
        }
      }
      
      // 3. 获取奖励配置
      const { data: configs } = await supabase
        .from('signin_configs')
        .select('*')
        .order('day_number', { ascending: true });
      
      if (!configs || configs.length === 0) throw new Error('系统签到配置缺失');
      
      const maxDayNumber = Math.max(...configs.map(c => c.day_number));
      const dayNumber = ((currentStreak - 1) % maxDayNumber) + 1;
      const config = configs.find(c => c.day_number === dayNumber) || configs[0];
      
      const minPoints = Number(config?.min_points ?? 1);
      const maxPoints = Number(config?.max_points ?? 10);
      const pointsAwarded = Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints;
      
      // 4. 插入记录
      const { error: insertError } = await supabase
        .from('check_ins')
        .insert([{ 
          user_id: userId, 
          check_in_date: today,
          points_earned: pointsAwarded 
        }]);

      if (insertError) throw insertError;

      // 5. 触发任务
      await supabase.rpc('check_user_badge_tasks', { p_user_id: userId });

      return createResponse({ 
        success: true, 
        points: pointsAwarded, 
        streak: currentStreak 
      });
    }

    if (action === 'favorite-status') {
      const mediaId = url.searchParams.get('mediaId');
      if (!mediaId || !userId) return createResponse({ success: false, message: 'Missing mediaId or userId' }, 400);

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('media_id', mediaId)
        .maybeSingle();

      return createResponse({ success: true, isFavorite: !!data });
    }

    if (action === 'toggle-favorite') {
      const mediaId = body.mediaId;
      if (!mediaId || !userId) return createResponse({ success: false, message: 'Missing mediaId or userId' }, 400);

      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('media_id', mediaId)
        .maybeSingle();

      if (existing) {
        await supabase.from('favorites').delete().eq('id', existing.id);
        return createResponse({ success: true, action: 'removed' });
      } else {
        await supabase.from('favorites').insert({ user_id: userId, media_id: mediaId });
        return createResponse({ success: true, action: 'added' });
      }
    }

    if (action === 'favorites') {
      const page = Number(url.searchParams.get('page') || '0');
      const limit = Number(url.searchParams.get('limit') || '20');
      
      const { data, error, count } = await supabase
        .from('favorites')
        .select('*, media_items(*)', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;
      return createResponse({ 
        success: true, 
        data: data?.map(f => f.media_items).filter(Boolean) || [],
        total: count 
      });
    }

    if (action === 'media') {
      const page = Number(url.searchParams.get('page') || '0');
      const limit = Number(url.searchParams.get('limit') || '20');
      
      const { data, error, count } = await supabase
        .from('media_items')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;
      return createResponse({ success: true, data: data || [], total: count });
    }

    if (action === 'profile' || (!action && userId)) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, permission_groups(*)')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return createResponse({ success: true, data: profile });
    }

    return createResponse({ success: false, message: 'Invalid action' }, 404);

  } catch (err) {
    return createResponse({ success: false, message: err.message }, 500);
  }
});
