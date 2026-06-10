import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

const VERSION = "10.0.61";

async function handler(req) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/check-in', '');

  // 健康检查接口
  if (path === '/health') {
    return new Response(
      JSON.stringify({ status: 'ok', version: VERSION, service: 'check-in' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const userId = body.userId;
    if (!userId) {
      throw new Error('参数缺失: userId 是必填项');
    }

    const now = new Date();
    const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const today = beijingNow.toISOString().split('T')[0];
    const currentTime = beijingNow.toISOString().split('T')[1].substring(0, 5); // HH:mm

    // 0. 检查签到时间限制
    const { data: globalConfigData } = await supabaseClient.from('system_configs').select('value').eq('key', 'check_in_settings').maybeSingle();
    const globalConfig = globalConfigData?.value || {};
    
    if (globalConfig.checkin_start_time && currentTime < globalConfig.checkin_start_time) {
      throw new Error(`签到尚未开启，开启时间: ${globalConfig.checkin_start_time}`);
    }
    if (globalConfig.checkin_end_time && currentTime > globalConfig.checkin_end_time) {
      throw new Error(`签到已结束，截止时间: ${globalConfig.checkin_end_time}`);
    }

    // 1. 检查今日是否已签到
    const { data: existingCheckIn, error: checkError } = await supabaseClient
      .from('check_ins')
      .select('*')
      .eq('user_id', userId)
      .eq('check_in_date', today)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingCheckIn) {
      return new Response(JSON.stringify({ error: '今日已签到' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 2. 计算连续签到天数
    const { data: lastLogs, error: logError } = await supabaseClient
      .from('check_ins')
      .select('check_in_date')
      .eq('user_id', userId)
      .order('check_in_date', { ascending: false })
      .limit(31);
    
    if (logError) throw logError;
    
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
    
    // 3. 获取所有奖励配置
    const { data: configs, error: configError } = await supabaseClient
      .from('signin_configs')
      .select('*')
      .order('day_number', { ascending: true });
    
    if (configError) throw configError;
    if (!configs || configs.length === 0) throw new Error('系统签到配置缺失');
    
    const maxDayNumber = Math.max(...configs.map(c => c.day_number));
    const dayNumber = ((currentStreak - 1) % maxDayNumber) + 1;
    const config = configs.find(c => c.day_number === dayNumber) || configs[0];
    
    const minPoints = Number(config?.min_points ?? 1);
    const maxPoints = Number(config?.max_points ?? 10);
    const pointsAwarded = Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints;
    const expAwarded = Number(config?.exp_reward ?? 10);
    
    // 4. 执行签到 (触发器将自动发放积分和经验奖励)
    const { error: insertError } = await supabaseClient
      .from('check_ins')
      .insert([{ 
        user_id: userId, 
        check_in_date: today,
        points_earned: pointsAwarded 
      }]);

    if (insertError) throw insertError;

    // 5. 触发勋章任务检查
    await supabaseClient.rpc('check_user_badge_tasks', { p_user_id: userId });

    console.log(`[Check-In Success]: User ${userId}, Points: ${pointsAwarded}, Exp: ${expAwarded}, Streak: ${currentStreak}`);

    return new Response(JSON.stringify({ 
      success: true, 
      points: pointsAwarded, 
      exp: expAwarded,
      streak: currentStreak 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const err = error;
    console.error('[Check-In Error]:', err.message);
    return new Response(JSON.stringify({ error: err.message || '签到失败' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}

Deno.serve(handler);
