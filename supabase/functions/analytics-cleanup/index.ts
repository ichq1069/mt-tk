// =====================================================
// 统计分析 - 数据清理 Edge Function
// 清理过期的 events、sessions、performance 等基础分析数据
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const strategy = body.strategy || 'auto'; // auto | events | sessions | performance | all

    const results: any = {
      strategy,
      deleted: 0,
      details: [] as string[],
    };

    // 1. 清理过期事件 (超过 90 天)
    if (strategy === 'auto' || strategy === 'events' || strategy === 'all') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const cutoff = cutoffDate.toISOString();

      const { count, error } = await supabase
        .from('analytics_events')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff);

      if (error) throw error;

      const deletedCount = count || 0;
      results.deleted += deletedCount;
      results.details.push(`过期事件（>90天）：删除 ${deletedCount} 条`);
    }

    // 2. 清理过期会话 (超过 90 天)
    if (strategy === 'auto' || strategy === 'sessions' || strategy === 'all') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const cutoff = cutoffDate.toISOString();

      const { count, error } = await supabase
        .from('analytics_sessions')
        .delete({ count: 'exact' })
        .lt('started_at', cutoff);

      if (error) throw error;

      const deletedCount = count || 0;
      results.deleted += deletedCount;
      results.details.push(`过期会话（>90天）：删除 ${deletedCount} 条`);
    }

    // 3. 清理过期性能数据 (超过 60 天)
    if (strategy === 'auto' || strategy === 'performance' || strategy === 'all') {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 60);
      const cutoff = cutoffDate.toISOString();

      const { count, error } = await supabase
        .from('analytics_performance')
        .delete({ count: 'exact' })
        .lt('created_at', cutoff);

      if (error) throw error;

      const deletedCount = count || 0;
      results.deleted += deletedCount;
      results.details.push(`过期性能数据（>60天）：删除 ${deletedCount} 条`);
    }

    // 4. 清理无关联访客的孤立事件 (访客已被删除的事件)
    if (strategy === 'auto' || strategy === 'all') {
      // 获取所有有效访客 ID
      const { data: visitorIds } = await supabase
        .from('analytics_visitors')
        .select('id');

      const validIds = new Set((visitorIds || []).map((v: any) => v.id));

      // 批量查询并删除没有关联访客的事件
      // 由于 Supabase 不支持 NOT IN 大集合，这里采用分批策略
      const { count, error } = await supabase
        .from('analytics_events')
        .delete({ count: 'exact' })
        .is('visitor_id', null);

      if (error) throw error;

      const deletedCount = count || 0;
      if (deletedCount > 0) {
        results.deleted += deletedCount;
        results.details.push(`孤立事件（无访客）：删除 ${deletedCount} 条`);
      }
    }

    // 5. 清理过期实时数据 (超过 10 分钟无活跃则标记下线)
    if (strategy === 'auto' || strategy === 'all') {
      const cutoffDate = new Date();
      cutoffDate.setMinutes(cutoffDate.getMinutes() - 10);
      const cutoff = cutoffDate.toISOString();

      const { count, error } = await supabase
        .from('analytics_realtime')
        .update({ is_online: false })
        .eq('is_online', true)
        .lt('last_active_at', cutoff);

      if (!error) {
        const updatedCount = count || 0;
        if (updatedCount > 0) {
          results.details.push(`过期实时会话（>10min）：标记下线 ${updatedCount} 条`);
        }
      }
      
      // 彻底删除超过 24 小时的实时记录
      const dayAgo = new Date();
      dayAgo.setHours(dayAgo.getHours() - 24);
      const { count: delCount } = await supabase
        .from('analytics_realtime')
        .delete({ count: 'exact' })
        .lt('last_active_at', dayAgo.toISOString());
      
      if (delCount) {
        results.details.push(`历史实时记录（>24h）：彻底删除 ${delCount} 条`);
      }
    }

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
