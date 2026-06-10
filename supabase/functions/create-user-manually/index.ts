import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({}));
    const { username, password, role, groupId, customFields, email: providedEmail } = body;
    
    if (!username || !password) {
      throw new Error('参数缺失: username 和 password 是必填项');
    }

    const email = providedEmail || `${username}@miaoda.com`
    
    // 检查用户是否已存在
    const { data: existingUser, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError;

    if (existingUser?.users.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
      throw new Error(`用户名或邮箱已存在: ${email}`);
    }

    // 创建用户
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        username, 
        custom_fields: customFields || {},
        group_id: groupId || null
      }
    })

    if (createError) throw createError
    if (!userData.user) throw new Error('用户创建成功但未返回用户信息');
    
    // 如果指定了角色，手动更新 Profile
    if (role === 'admin') {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: role })
        .eq('id', userData.user.id)
          
      if (updateError) {
        console.warn(`[create-user-manually] 权限更新失败 (ID: ${userData.user.id}):`, updateError.message);
      }
    }

    return new Response(JSON.stringify({ success: true, user: userData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const err = error as Error;
    console.error('[Create-User-Manually Error]:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}

Deno.serve(handler);
