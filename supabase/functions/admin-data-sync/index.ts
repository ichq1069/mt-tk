
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TABLES_ORDER = [
  'profiles',
  'content_categories',
  'tags',
  'permission_groups',
  'system_configs',
  'storage_configs',
  'domain_configs',
  'cache_config',
  'recommendation_settings',
  'miniprogram_configs',
  'wechat_configs',
  'wechat_menus',
  'wechat_replies',
  'wechat_notification_templates',
  'wecom_configs',
  'superbed_configs',
  'zonerama_album_configs',
  'site_shortcodes',
  'global_keyword_replacements',
  'user_content_keyword_replacements',
  'system_guide_categories',
  'system_guide_templates',
  'system_guides',
  'daily_gallery_posts',
  'badges',
  'badge_tasks',
  'rank_configs',
  'signin_configs',
  'photo_albums',
  'media_items',
  'media_tags',
  'album_photos',
  'album_custom_fields',
  'album_custom_field_groups',
  'ads',
  'notification_templates',
  'user_field_configs'
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing Authorization header')
      throw new Error('Unauthorized: Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user }, error: authError } = await userClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error(`Unauthorized: ${authError?.message || 'Invalid token'}`)
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      console.error('Profile check error:', profileError, 'Role:', profile?.role)
      throw new Error('Forbidden: Admin access required')
    }

    const { action, data, mode } = await req.json()
    const isIncremental = mode === 'incremental'

    if (action === 'export') {
      const exportData: Record<string, any[]> = {}
      for (const table of TABLES_ORDER) {
        let query = supabaseClient.from(table).select('*')
        
        // Special case for profiles: only export admins
        if (table === 'profiles') {
          query = query.eq('role', 'admin')
        }
        
        const { data: rows, error } = await query
        if (!error) {
          exportData[table] = rows
        } else {
          console.error(`Error exporting table ${table}:`, error)
        }
      }
      
      // Also export profiles table separately if it's not in the order
      if (!TABLES_ORDER.includes('profiles')) {
        const { data: adminProfiles } = await supabaseClient.from('profiles').select('*').eq('role', 'admin')
        if (adminProfiles) exportData['profiles'] = adminProfiles
      }

      return new Response(JSON.stringify({ success: true, data: exportData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'import') {
      if (!data) throw new Error('No data provided for import')
      
      const results: Record<string, any> = {}
      
      // Get current admin user ID to use as fallback for missing users
      const importerId = user.id

      // 映射各表的冲突处理列，优先使用业务唯一键
      const CONFLICT_COLUMNS_MAP: Record<string, string[]> = {
        'profiles': ['username'], // 优先使用用户名作为同步基准
        'permission_groups': ['name'],
        'system_configs': ['key'],
        'cache_config': ['cache_key'],
        'recommendation_settings': ['name'],
        'superbed_configs': ['id'],
        'site_shortcodes': ['key'],
        'rank_configs': ['name'],
        'signin_configs': ['day_number'],
        'user_field_configs': ['field_key'],
        'media_tags': ['media_id', 'tag_id'], // 联合主键
        'tags': ['name'],
        'content_categories': ['name'],
        'domain_configs': ['domain_url'],
        'global_keyword_replacements': ['original_word', 'type'],
        'user_badges': ['user_id', 'badge_id']
      }

      // 辅助函数：格式化 Postgres 数组
      const formatPostgresArray = (arr: any) => {
        if (!Array.isArray(arr)) return '{}';
        const escaped = arr.map(val => {
          const s = String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          return `"${s}"`;
        });
        return `{${escaped.join(',')}}`;
      };

      // 1. First import profiles (admins)
      if (data['profiles'] && Array.isArray(data['profiles'])) {
        // 先清洗 profile 数据
        const cleanProfiles = data['profiles'].map(p => {
          const { permission_groups, ...rest } = p; // 移除关联数据
          return rest;
        });
        
        // 使用 v3 版本的 RPC 支持 DO NOTHING
        const { data: syncRes, error } = await supabaseClient.rpc('upsert_table_data_v3', {
          p_table_name: 'profiles',
          p_rows: cleanProfiles,
          p_conflict_columns: ['username'],
          p_do_nothing: isIncremental
        })

        results['profiles'] = { 
          successCount: error || (syncRes && !syncRes.success) ? 0 : cleanProfiles.length, 
          failCount: error || (syncRes && !syncRes.success) ? cleanProfiles.length : 0, 
          errors: error || (syncRes && !syncRes.success) ? [error?.message || syncRes?.error] : [] 
        }
      }

      // 2. Topological import for other tables
      for (const table of TABLES_ORDER) {
        if (table === 'profiles') continue // already handled
        if (!data[table] || !Array.isArray(data[table])) continue
        
        let rows = data[table]
        if (rows.length === 0) continue

        // 针对 content_categories 进行 DISTINCT 去重
        if (table === 'content_categories') {
          const seenNames = new Set();
          rows = rows.filter(row => {
            if (!row.name || seenNames.has(row.name)) return false;
            seenNames.add(row.name);
            return true;
          });
        }

        // 统一数据清洗
        rows = rows.map(row => {
          const cleanRow = { ...row };
          
          // 处理 media_items 的 tags 数组
          if (table === 'media_items' && 'tags' in cleanRow) {
            cleanRow.tags = formatPostgresArray(cleanRow.tags);
          }
          
          // 移除 media_tags 可能存在的多余 id 字段
          if (table === 'media_tags') {
            delete cleanRow.id;
          }

          return cleanRow;
        });

        // Split into chunks of 100 to avoid request limits
        const chunkSize = 100
        let successCount = 0
        let failCount = 0
        const errors = []

        const conflictCols = CONFLICT_COLUMNS_MAP[table] || ['id']
        const doNothing = isIncremental || table === 'content_categories';

        for (let i = 0; i < rows.length; i += chunkSize) {
          let chunk = rows.slice(i, i + chunkSize)
          
          // 使用 v3 版本的 RPC 支持多冲突列及 DO NOTHING
          const { data: syncRes, error } = await supabaseClient.rpc('upsert_table_data_v3', {
            p_table_name: table,
            p_rows: chunk,
            p_conflict_columns: conflictCols,
            p_do_nothing: doNothing
          })

          if (error || (syncRes && !syncRes.success)) {
            console.error(`Error importing chunk for ${table}:`, error || syncRes?.error)
            failCount += chunk.length
            errors.push(error?.message || syncRes?.error || 'Unknown error')
          } else {
            successCount += chunk.length
          }
        }
        
        results[table] = { successCount, failCount, errors: errors.length > 0 ? Array.from(new Set(errors)).slice(0, 5) : [] }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Invalid action')

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
