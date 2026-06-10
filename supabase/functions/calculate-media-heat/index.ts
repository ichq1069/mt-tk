import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import { redisUtils } from "../_shared/redis.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 处理 CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 防止并发重复运行 (5 分钟内只允许运行一次)
    const lockKey = 'media_heat_calc_lock';
    const isLocked = await redisUtils.get(lockKey);
    if (isLocked) {
      return new Response(
        JSON.stringify({ message: "Task already running or recently completed. Please try again later." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // 设置 5 分钟锁定
    await redisUtils.set(lockKey, 'true', 300);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 调用数据库中的热度计算函数
    const { error } = await supabaseClient.rpc('update_all_media_heat_scores')

    if (error) throw error

    return new Response(
      JSON.stringify({ message: "Heat scores updated successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})
