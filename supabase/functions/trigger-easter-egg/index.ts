import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { page, user_id, egg_id } = await req.json()

    if (!user_id) {
      throw new Error('User ID is required')
    }

    // 1. 获取活动中的彩蛋配置
    const now = new Date().toISOString()
    const { data: configs, error: configError } = await supabaseClient
      .from('easter_egg_configs')
      .select('*')
      .eq('status', 'active')
      .or(`start_at.is.null,start_at.lte.${now}`)
      .or(`end_at.is.null,end_at.gt.${now}`)
    
    let filteredConfigs = configs || []
    if (egg_id) {
      filteredConfigs = filteredConfigs.filter(egg => egg.id === egg_id)
    }

    if (configError) throw configError

    if (filteredConfigs.length === 0) {
      return new Response(JSON.stringify({ win: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. 检查是否有符合页面条件的彩蛋
    const validConfigs = configs.filter(egg => {
      if (!egg.page_paths || egg.page_paths.length === 0) return true
      return egg.page_paths.some((p: string) => {
        if (page === p) return true
        if (p === '/' && page === '') return true
        
        // 处理带参数的路径匹配，如 /album/:id
        if (p.includes(':')) {
          try {
            const regexPattern = p
              .replace(/\//g, '\\/')
              .replace(/:[^\/]+/g, '[^\\/]+');
            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(page);
          } catch (_e) {
            return false;
          }
        }
        
        return page.startsWith(p + '/')
      })
    })

    if (validConfigs.length === 0) {
      return new Response(JSON.stringify({ win: false, message: 'No valid eggs for this page' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. 随机逻辑与条件检查
    let winningEgg = null
    for (const egg of validConfigs) {
      // 检查中奖上限
      if (egg.current_winners >= egg.max_winners) continue

      // 检查单人中奖上限
      if (egg.max_wins_per_user && egg.max_wins_per_user > 0) {
        const { count: userWinCount, error: userWinError } = await supabaseClient
          .from('easter_egg_records')
          .select('*', { count: 'exact', head: true })
          .eq('egg_id', egg.id)
          .eq('user_id', user_id)
        
        if (userWinError) {
          console.error('Check user win count error:', userWinError)
          continue
        }
        
        if ((userWinCount || 0) >= egg.max_wins_per_user) {
          continue
        }
      }

      // 检查特定条件
      const condition = egg.trigger_condition || {}
      const type = condition.type || 'stay'
      
      // 收藏达标检查
      if (type === 'favorites') {
        const targetCount = condition.target_count || 0
        const { count, error: countError } = await supabaseClient
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user_id)
        
        if (countError) {
          console.error('Count favorites error:', countError)
          continue
        }

        if ((count || 0) < targetCount) continue
      }

      const prob = condition.probability || 0.01
      if (Math.random() < prob) {
        winningEgg = egg
        break
      }
    }

    // 4. 处理中奖
    if (winningEgg) {
      // 使用事务性操作（或乐观锁机制）
      // 这里简化处理：直接插入中奖记录并更新计数
      
      const { data: record, error: recordError } = await supabaseClient
        .from('easter_egg_records')
        .insert([{
          egg_id: winningEgg.id,
          user_id: user_id,
          reward_type: winningEgg.reward_type,
          reward_content: winningEgg.reward_content,
          claim_status: winningEgg.reward_type === 'points' ? 'claimed' : 'pending'
        }])
        .select()
        .single()

      if (recordError) {
        // 如果插入失败（可能是约束冲突，例如一个用户只能中一次同一个彩蛋），则不中奖
        console.error('Record creation failed:', recordError)
      } else {
        // 更新中奖人数
        await supabaseClient.rpc('increment_egg_winners', { egg_id: winningEgg.id })

        // 如果是积分奖励，自动发放
        if (winningEgg.reward_type === 'points') {
          const pointsAmount = winningEgg.reward_content?.amount || 0
          if (pointsAmount > 0) {
            // 更新用户积分并记录日志
            await supabaseClient.rpc('add_user_points_safe', { 
              user_id: user_id, 
              amount: pointsAmount, 
              reason_text: `中奖彩蛋：${winningEgg.name}` 
            })
          }
        }

        // 记录触发日志
        await supabaseClient.from('easter_egg_trigger_logs').insert([{
          user_id, egg_id: winningEgg.id, page, is_win: true
        }])

        return new Response(JSON.stringify({ 
          win: true, 
          egg: {
            name: winningEgg.name,
            reward_type: winningEgg.reward_type,
            reward_content: winningEgg.reward_content,
            message: winningEgg.message,
            icon_url: winningEgg.icon_url
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // 记录未中奖触发日志
    await supabaseClient.from('easter_egg_trigger_logs').insert([{
      user_id, page, is_win: false
    }])

    return new Response(JSON.stringify({ win: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
