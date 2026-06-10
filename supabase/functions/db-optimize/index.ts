import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Initialize admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Invalid authentication token')

    // Role check: Only admin
    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') throw new Error('Permission denied: Admin only')

    const body = await req.json()
    const { action } = body

    if (action === 'export-sql') {
        const { tables } = body
        const sqlParts = []
        
        for (const table of tables) {
            const { data, error } = await supabaseAdmin.from(table).select('*')
            if (error) continue
            
            if (data && data.length > 0) {
                sqlParts.push(`-- Table: ${table}`)
                for (const row of data) {
                    const columns = Object.keys(row).join(', ')
                    const values = Object.values(row).map(v => {
                        if (v === null) return 'NULL'
                        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`
                        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`
                        return v
                    }).join(', ')
                    sqlParts.push(`INSERT INTO ${table} (${columns}) VALUES (${values});`)
                }
                sqlParts.push('')
            }
        }
        
        return new Response(
            JSON.stringify({ success: true, sql: sqlParts.join('\n') }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        )
    }

    if (action === 'import-sql') {
        const { sql, conflictStrategy } = body // conflictStrategy: 'skip' | 'overwrite'
        const results = []
        
        // 分割 SQL 语句并处理 INSERT
        const statements = sql.split(';').map(s => s.trim()).filter(Boolean)
        for (const statement of statements) {
            if (statement.startsWith('--')) continue
            
            let finalSql = statement + ';'
            if (statement.startsWith('INSERT INTO')) {
                const match = statement.match(/INSERT INTO\s+(\w+)\s+\((.*?)\)\s+VALUES/i)
                if (match) {
                    const [, table, columns] = match
                    const columnList = columns.split(',').map(c => c.trim())
                    
                    if (conflictStrategy === 'overwrite') {
                        const updatePart = columnList.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ')
                        finalSql = `${statement} ON CONFLICT (id) DO UPDATE SET ${updatePart};`
                    } else {
                        finalSql = `${statement} ON CONFLICT (id) DO NOTHING;`
                    }
                }
            }

            try {
                const { error } = await supabaseAdmin.rpc('exec_sql', { query_text: finalSql })
                if (error && error.message.includes('id')) {
                    const { error: rawError } = await supabaseAdmin.rpc('exec_sql', { query_text: statement + ';' })
                    results.push({ sql: statement + ';', success: !rawError, error: rawError?.message })
                } else {
                    results.push({ sql: finalSql, success: !error, error: error?.message })
                }
            } catch (e) {
                results.push({ sql: statement + ';', success: false, error: e.message })
            }
        }
        
        return new Response(
            JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        )
    }

    if (action !== 'full-optimize') {
        throw new Error('Invalid action')
    }

    const results = []

    // 步骤 1: 统计数据库状态
    try {
        const { data: statsBefore, error: statsError } = await supabaseAdmin.rpc('get_database_stats')
        if (statsError) throw statsError
        results.push({ step: 'Stats Before', success: true, data: statsBefore })
    } catch (e) {
        results.push({ step: 'Stats Before', success: false, error: e.message })
    }

    // 步骤 2: 执行 ANALYZE (更新统计信息)
    try {
        const { error: analyzeError } = await supabaseAdmin.rpc('exec_sql', {
            query_text: 'ANALYZE media_items, system_configs, user_active_sessions;'
        })
        results.push({ step: 'ANALYZE', success: !analyzeError, error: analyzeError?.message })
    } catch (e) {
        results.push({ step: 'ANALYZE', success: false, error: e.message })
    }

    // 步骤 3: 重建索引 REINDEX (注：REINDEX 不能在事务块中运行，因此在 RPC 中会报错，改为仅 ANALYZE 重点表)
    try {
        const { error: analyzeExtraError } = await supabaseAdmin.rpc('exec_sql', {
            query_text: 'ANALYZE media_items, user_active_sessions;'
        })
        results.push({ step: 'ANALYZE INDEXES', success: !analyzeExtraError, error: analyzeExtraError?.message })
    } catch (e) {
        results.push({ step: 'ANALYZE INDEXES', success: false, error: e.message })
    }

    // 步骤 4: ANALYZE (更新统计信息，VACUUM 不能在事务块中运行)
    try {
        const { error: analyzeError } = await supabaseAdmin.rpc('exec_sql', {
            query_text: 'ANALYZE media_items;'
        })
        results.push({ step: 'ANALYZE', success: !analyzeError, error: analyzeError?.message })
    } catch (e) {
        results.push({ step: 'ANALYZE', success: false, error: e.message })
    }

    // 步骤 5: 调整 autovacuum 策略 (针对高频表)
    try {
        const { error: autovacuumError } = await supabaseAdmin.rpc('exec_sql', {
            query_text: 'ALTER TABLE media_items SET (autovacuum_vacuum_scale_factor = 0.05);'
        })
        results.push({ step: 'AUTOVACUUM POLICY', success: !autovacuumError, error: autovacuumError?.message })
    } catch (e) {
        results.push({ step: 'AUTOVACUUM POLICY', success: false, error: e.message })
    }

    // 步骤 6: 清理低命中率缓存
    try {
        // 直接删除命中率极低且请求数不少的缓存记录（在 media_cache_stats 表中）
        // 修正：表结构中没有 hit_rate，使用 hit_count / (hit_count + miss_count)
        const { error: cacheError } = await supabaseAdmin.rpc('exec_sql', {
            query_text: "DELETE FROM public.media_cache_stats WHERE (hit_count::float / NULLIF(hit_count + miss_count, 0)) < 0.2 AND (hit_count + miss_count) > 10;"
        })
        results.push({ step: 'CACHE CLEANUP', success: !cacheError, error: cacheError?.message })
    } catch (e) {
        results.push({ step: 'CACHE CLEANUP', success: false, error: e.message })
    }

    // 步骤 7: 统计优化后的状态
    try {
        const { data: statsAfter, error: statsAfterError } = await supabaseAdmin.rpc('get_database_stats')
        if (statsAfterError) throw statsAfterError
        results.push({ step: 'Stats After', success: true, data: statsAfter })
    } catch (e) {
        results.push({ step: 'Stats After', success: false, error: e.message })
    }

    // 记录操作日志
    await supabaseAdmin.from('admin_operation_logs').insert({
      admin_id: user.id,
      action_type: 'DB_OPTIMIZE',
      target_table: 'database',
      payload: { results }
    })

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})
