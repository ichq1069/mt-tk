import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1"
import * as jose from 'https://deno.land/x/jose@v5.2.1/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VERSION = "10.0.61";

serve(async (req) => {
  // CORS 响应
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace('/admin-api-gateway', '')
  
  // 健康检查接口
  if (path === '/health') {
    return new Response(
      JSON.stringify({ status: 'ok', version: VERSION, service: 'admin-api-gateway' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET');

    // 初始化客户端（管理员模式使用 service_role 执行敏感操作）
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 获取认证信息
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '');
    let adminId = null;
    let isOAuth = false;

    // 尝试验证是否为 OAuth Token (由 admin-oauth-server 签发)
    try {
      if (jwtSecret) {
        const secret = new TextEncoder().encode(jwtSecret);
        const { payload } = await jose.jwtVerify(token, secret, {
          iss: 'admin-oauth-server',
          aud: 'admin-api',
        });
        
        if (payload.role === 'admin') {
          adminId = payload.sub as string;
          isOAuth = true;
          console.log('[Auth] 认证通过: OAuth Token', adminId);
        }
      }
    } catch (e) {
      // 不是有效的 OAuth Token，继续尝试普通 JWT
      console.log('[Auth] 非 OAuth Token 或验证失败，尝试普通 JWT');
    }

    // 如果不是 OAuth，尝试普通 Supabase Auth JWT
    if (!adminId) {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      if (authError || !user) {
        throw new Error('Invalid authentication token')
      }

      // 鉴权：检查是否为管理员
      const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'admin') {
        throw new Error('Permission denied: Admin only')
      }
      adminId = user.id;
    }

    const method = req.method
    let responseData = null

    // 基础路由逻辑
    // 路径: /users
    if (path === '/users') {
      if (method === 'GET') {
        const { data, error } = await supabaseAdmin.from('profiles').select('*, auth_user:id(*)').limit(100)
        if (error) throw error
        responseData = data
      } else if (method === 'PUT') {
        const body = await req.json()
        const { id, role, custom_fields } = body
        if (!id) throw new Error('User ID required')
        
        const { data, error } = await supabaseAdmin.from('profiles').update({ 
          role, 
          custom_fields,
          updated_at: new Date().toISOString()
        }).eq('id', id).select().single()
        
        if (error) throw error
        responseData = data
        await logOperation(supabaseAdmin, adminId, 'UPDATE', 'profiles', id, body)
      } else if (method === 'DELETE') {
        const userId = url.searchParams.get('id')
        if (!userId) throw new Error('Missing user ID')
        
        // 执行逻辑删除与 auth 删除
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteAuthError) throw deleteAuthError
        
        const { error: deleteProfileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
        if (deleteProfileError) throw deleteProfileError

        responseData = { message: 'User deleted successfully' }
        await logOperation(supabaseAdmin, adminId, 'DELETE', 'profiles', userId, { deleted: true })
      }
    } 
    // 路径: /logs
    else if (path === '/logs') {
      if (method === 'GET') {
        const { data, error } = await supabaseAdmin.from('admin_operation_logs').select('*, profiles(username)').order('created_at', { ascending: false }).limit(100)
        if (error) throw error
        responseData = data
      }
    }
    // 路径: /configs
    else if (path === '/configs') {
      if (method === 'GET') {
        const { data, error } = await supabaseAdmin.from('system_configs').select('*')
        if (error) throw error
        responseData = data
      } else if (method === 'POST') {
        const body = await req.json()
        const { key, value, description } = body
        if (!key || !value) throw new Error('Key and value required')
        
        const { data, error } = await supabaseAdmin.from('system_configs').upsert({ 
          key, 
          value, 
          description,
          updated_at: new Date().toISOString(),
          updated_by: isOAuth ? 'system' : adminId
        }).select().single()
        
        if (error) throw error
        responseData = data
        await logOperation(supabaseAdmin, adminId, 'CONFIG_CHANGE', 'system_configs', key, body)
      }
    } else {
      throw new Error('Endpoint not found')
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    )
  }
})

// 辅助函数：记录操作日志
async function logOperation(client, adminId, type, table, id, payload) {
  await client.from('admin_operation_logs').insert({
    admin_id: adminId.startsWith('client:') ? null : adminId, // 如果是 OAuth 客户端，这里存 null 或者专门的字段
    action_type: type,
    target_table: table,
    target_id: id,
    payload: { ...payload, auth_type: adminId.startsWith('client:') ? 'oauth' : 'user', client_id: adminId }
  })
}

