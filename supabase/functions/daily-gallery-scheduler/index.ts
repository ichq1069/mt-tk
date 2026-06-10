import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 每日图集定时调度逻辑
 */
async function checkAndPublish(isManual = false) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  const startTime = Date.now();

  try {
    // 获取配置
    const { data: configData } = await supabaseClient
      .from('system_configs')
      .select('value')
      .eq('key', 'daily_gallery_config')
      .maybeSingle();

    if (!configData?.value) {
      const msg = '配置不存在';
      if (isManual) {
        await supabaseClient.from('scheduled_task_logs').insert({
          task_name: 'daily_gallery_auto_publish',
          status: 'failed',
          message: msg,
          duration_ms: Date.now() - startTime
        });
      }
      return { success: false, message: msg };
    }

    const config = configData.value;
    if (!config.auto_publish && !isManual) {
      return { success: false, message: '自动发布未启用' };
    }

    // 获取北京时间
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const currentHour = beijingTime.getUTCHours();
    const currentMinute = beijingTime.getUTCMinutes();
    const todayDate = beijingTime.toISOString().split('T')[0];

    // 解析配置的发布时间
    const [targetHour, targetMinute] = (config.publish_time || '00:00').split(':').map(Number);

    // 0点清理失效密码
    if (currentHour === 0 && currentMinute < 10 && !isManual) {
      await supabaseClient
        .from('daily_gallery_special_passwords')
        .delete()
        .lt('expires_at', now.toISOString());
    }

    // 检查今天是否已发布
    const { data: existingPost } = await supabaseClient
      .from('daily_gallery_posts')
      .select('id')
      .eq('post_date', todayDate)
      .maybeSingle();

    if (existingPost) {
      const msg = `今日 ${todayDate} 已发布过，无需操作。`;
      if (isManual) {
        await supabaseClient.from('scheduled_task_logs').insert({
          task_name: 'daily_gallery_auto_publish',
          status: 'success',
          message: msg,
          duration_ms: Date.now() - startTime
        });
      }
      return { success: true, message: msg, postDate: todayDate };
    }

    // 时间窗口检查
    // 如果是手动触发，跳过时间检查
    if (!isManual) {
      // 容错±30分钟
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const targetTotalMinutes = targetHour * 60 + (targetMinute || 0);
      const diff = Math.abs(currentTotalMinutes - targetTotalMinutes);
      
      // 考虑跨天情况 (23:55 和 00:05)
      const isTimeMatch = diff <= 30 || diff >= (24 * 60 - 30);

      if (!isTimeMatch) {
        console.log(`[DailyGalleryScheduler] Not in publish window. Current: ${currentHour}:${currentMinute}, Target: ${targetHour}:${targetMinute}`);
        return { success: false, message: '不在发布时间窗口内' };
      }
    }

    // 触发发布
    console.log(`[DailyGalleryScheduler] Triggering auto-publish for ${todayDate} (Manual: ${isManual})`);
    const urlToken = config.trigger_token ? `?token=${config.trigger_token}` : '';
    const { data: publishResult, error: publishError } = await supabaseClient.functions.invoke(
      `daily-gallery-publish${urlToken}`,
      { body: { postDate: todayDate } }
    );

    if (publishError) throw publishError;
    
    // 只有在执行了发布动作（无论成功失败）或者是手动触发时才记录日志
    await supabaseClient.from('scheduled_task_logs').insert({
      task_name: 'daily_gallery_auto_publish',
      status: publishResult.success ? 'success' : 'failed',
      message: publishResult.message || (isManual ? '手动执行完成' : '自动发布任务触发完成'),
      duration_ms: Date.now() - startTime
    });
    
    return publishResult;
  } catch (error) {
    console.error('[DailyGalleryScheduler] Cron error:', error);
    await supabaseClient.from('scheduled_task_logs').insert({
      task_name: 'daily_gallery_auto_publish',
      status: 'failed',
      message: `执行报错：${error.message}`,
      duration_ms: Date.now() - startTime
    });
    return { success: false, error: error.message };
  }
}

/**
 * 注册 Deno.cron 定时任务 (每5分钟运行一次)
 */
try {
  // @ts-ignore: Deno.cron is a relatively new API in Edge Functions
  if (typeof Deno.cron === 'function') {
    Deno.cron("Daily Gallery Auto Publish", "*/5 * * * *", async () => {
      console.log("[DailyGalleryScheduler] Running cron task check...");
      await checkAndPublish(false);
    });
  }
} catch (e) {
  console.error('[DailyGalleryScheduler] Failed to register cron:', e);
}

const VERSION = "10.0.61";

/**
 * 同时提供 HTTP 接口供手动检查
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/daily-gallery-scheduler', '');

  // 健康检查接口
  if (path === '/health') {
    return new Response(
      JSON.stringify({ status: 'ok', version: VERSION, service: 'daily-gallery-scheduler' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  const result = await checkAndPublish(true);
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: result.success ? 200 : 200 // 统一返回200，错误信息在body里
  });
});
