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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({}));
    const { action, userId, password, email } = body;
    
    if (!action) {
      throw new Error('参数缺失: action 是必填项');
    }

    console.log(`[admin-auth-action] 执行操作: ${action}`, { userId, email });
    
    if (action === 'update_verification_settings') {
      // supabase-js 目前对 admin.updateConfig 的支持取决于具体版本和后端权限
      // 这里保持逻辑，但添加错误捕获
      try {
        await supabase.auth.admin.updateConfig({
          mailer: {
            secure_email_change_enabled: true,
            autofill_enabled: true,
            otp_exp: 3600,
          },
          sms: {
            test_otp: "123456",
            test_otp_enabled: true,
          }
        });
      } catch (e) {
        console.warn('[admin-auth-action] Auth Config 更新尝试失败 (可能受限于版本或环境):', (e as Error).message);
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    if (action === 'batch_repair_users') {
      console.log(`[admin-auth-action] 正在执行批量修复 Auth 用户...`);
      
      // 1. 获取所有需要修复的用户 (有邮箱)
      const { data: usersToRepair, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, username, auto_created, password_hash')
        .not('email', 'is', null)
        .limit(200);
      
      if (fetchError) throw fetchError;
      
      const results = {
        total: usersToRepair.length,
        repaired: 0,
        created: 0,
        failed: 0,
        skipped: 0,
        details: [] as string[]
      };

      // 2. 获取 Auth 中的现有用户列表
      const existingAuthIds = new Set<string>();
      const existingAuthEmails = new Set<string>();
      
      let currentPage = 1;
      while (true) {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
          page: currentPage,
          perPage: 1000
        });
        if (listError || !users || users.length === 0) break;
        users.forEach(u => {
          existingAuthIds.add(u.id);
          if (u.email) existingAuthEmails.add(u.email.toLowerCase());
        });
        if (users.length < 1000) break;
        currentPage++;
      }

      for (const p of usersToRepair) {
        try {
          const tempPassword = p.username || 'user';
          
          if (existingAuthIds.has(p.id) || existingAuthEmails.has(p.email.toLowerCase())) {
            results.skipped++;
            continue;
          }

          // 不在 Auth 中，创建之
          const { error: createError } = await supabase.auth.admin.createUser({
            id: p.id,
            email: p.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { repaired: true, batch_repaired: true }
          });

          if (createError) {
             results.failed++;
             results.details.push(`${p.email}: ${createError.message}`);
          } else {
             results.created++;
          }
        } catch (e) {
          results.failed++;
          results.details.push(`${p.email || p.id}: ${(e as Error).message}`);
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'reset_password') {
      if (!userId || !password) {
        throw new Error('参数缺失: userId 和 password 是必填项');
      }

      console.log(`[admin-auth-action] 正在尝试重置密码, 用户ID: ${userId}`);

      // 1. 尝试直接通过 ID 更新
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        password: password
      })
      
      if (!error) {
        console.log(`[admin-auth-action] 通过 ID 重置成功: ${userId}`);
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.warn(`[admin-auth-action] 通过 ID 重置失败: ${error.message}, 尝试寻找用户...`);

      // 2. 如果失败，通过分页寻找匹配的用户
      let targetUser = null;
      let currentPage = 1;
      
      while (true) {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
          page: currentPage,
          perPage: 100
        });
        
        if (listError) {
          console.error(`[admin-auth-action] List users error at page ${currentPage}:`, listError.message);
          break;
        }
        
        if (!users || users.length === 0) break;

        targetUser = users.find(u => 
          u.id === userId || 
          u.email === userId || 
          (email && u.email === email) ||
          (u.user_metadata?.username === userId) ||
          (u.email?.toLowerCase() === email?.toLowerCase())
        );

        if (targetUser) break;
        if (users.length < 100) break; // Last page
        currentPage++;
      }
      
      if (!targetUser) {
        throw new Error(`在 Auth 中未找到该用户: ${userId}${email ? ` (${email})` : ''}。请确认该用户是否已在 Auth 系统中注册。`);
      }

      console.log(`[admin-auth-action] 找到目标用户: ${targetUser.id}, 正在重置...`);
      const { data: retryData, error: retryError } = await supabase.auth.admin.updateUserById(targetUser.id, {
        password: password
      });

      if (retryError) throw retryError;

      return new Response(JSON.stringify({ success: true, data: retryData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'repair_user') {
      if (!userId || !email || !password) {
        throw new Error('参数缺失: userId, email 和 password 是必填项');
      }

      console.log(`[admin-auth-action] 正在尝试修复/重新创建 Auth 用户: ${userId} (${email})`);

      // 1. 检查是否已存在
      let existingUser = null;
      let currentPage = 1;
      while (true) {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
          page: currentPage,
          perPage: 100
        });
        if (listError) break;
        if (!users || users.length === 0) break;
        existingUser = users.find(u => u.id === userId || u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) break;
        if (users.length < 100) break;
        currentPage++;
      }

      if (existingUser) {
        // 如果存在，尝试更新密码即可
        const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
          password: password,
          email_confirm: true
        });
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, message: '用户已存在，已更新密码', data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. 不存在，则创建
      const { data, error } = await supabase.auth.admin.createUser({
        id: userId, // 关键：指定 ID 以匹配 profiles 表
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { repaired: true }
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: 'Auth 用户已重新创建', data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'update_email') {
      if (!userId || !email) {
        throw new Error('参数缺失: userId 和 email 是必填项');
      }
      
      console.log(`[admin-auth-action] 正在尝试更新邮箱, 用户ID: ${userId}, 新邮箱: ${email}`);

      // 1. 尝试直接更新
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        email: email,
        email_confirm: true
      })
      
      if (!error) {
        console.log(`[admin-auth-action] 通过 ID 更新邮箱成功: ${userId}`);
        return new Response(JSON.stringify({ success: true, data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.warn(`[admin-auth-action] 通过 ID 更新邮箱失败: ${error.message}, 尝试寻找用户...`);

      // 2. Fallback: 寻找用户
      let targetUser = null;
      let currentPage = 1;
      
      while (true) {
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
          page: currentPage,
          perPage: 100
        });
        
        if (listError) break;
        if (!users || users.length === 0) break;

        targetUser = users.find(u => u.id === userId || u.email === userId);

        if (targetUser) break;
        if (users.length < 100) break;
        currentPage++;
      }

      if (!targetUser) throw new Error(`未找到用户: ${userId}`);

      console.log(`[admin-auth-action] 找到目标用户: ${targetUser.id}, 正在更新邮箱...`);
      const { data: retryData, error: retryError } = await supabase.auth.admin.updateUserById(targetUser.id, {
        email: email,
        email_confirm: true
      });

      if (retryError) throw retryError;

      return new Response(JSON.stringify({ success: true, data: retryData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    if (action === 'send_invite_email') {
      if (!email) {
        throw new Error('参数缺失: email 是必填项');
      }
      // 1. 生成自定义邀请码
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let inviteCode = '';
      for (let i = 0; i < 8; i++) {
        inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // 2. 存入 redemption_codes 表
      const { error: codeError } = await supabase
        .from('redemption_codes')
        .insert({
          code: inviteCode,
          type: 'invite',
          email: email,
          max_uses: 1,
          created_by: null
        });
      
      if (codeError) throw codeError;

      // 3. 使用 Supabase Auth 邀请用户
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email)
      if (error) throw error

      return new Response(JSON.stringify({ success: true, inviteCode, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: `无效的操作类型: ${action}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  } catch (error) {
    const err = error as Error;
    console.error('[admin-auth-action] 错误:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}

Deno.serve(handler);
