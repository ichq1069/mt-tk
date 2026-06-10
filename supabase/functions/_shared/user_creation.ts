// supabase/functions/_shared/user_creation.ts

// 生成 GZH + 5位随机数的用户名 (使用 crypto 增强随机性)
export function generateRandomUsername(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const randomNum = 10000 + (arr[0] % 90000);
  return `GZH${randomNum}`;
}

// 自动创建用户并绑定 openid
export async function autoCreateUser(
  supabaseClient: any,
  openid: string,
  wechatType: 'mp_openid' | 'wechat_openid' = 'mp_openid',
  source: string = 'daily_gallery'
): Promise<{ is_new_user: boolean; user_info?: any }> {
  try {
    // 1. 检查是否已有该 openid 关联的用户
    // 优先匹配传入的 wechatType
    const { data: existingProfile } = await supabaseClient
      .from('profiles')
      .select('id, username, mp_openid, wechat_openid, security_status')
      .or(`mp_openid.eq.${openid},wechat_openid.eq.${openid}`)
      .maybeSingle();

    if (existingProfile) {
      console.log(`[UserCreation] OpenID ${openid} already linked to user:`, existingProfile.id);
      
      // 额外逻辑：如果匹配的是 mp_openid 但 wechat_openid 为空（或者反之），同步更新一下
      if (wechatType === 'wechat_openid' && !existingProfile.wechat_openid) {
        await supabaseClient.from('profiles').update({ wechat_openid: openid }).eq('id', existingProfile.id);
      } else if (wechatType === 'mp_openid' && !existingProfile.mp_openid) {
        await supabaseClient.from('profiles').update({ mp_openid: openid }).eq('id', existingProfile.id);
      }
      
      return { is_new_user: false, user_info: existingProfile };
    }

    // 2. 生成唯一用户名
    let username = generateRandomUsername();
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const { data: dupCheck } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      
      if (!dupCheck) break;
      username = generateRandomUsername();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error('[UserCreation] Failed to generate unique username after max attempts');
      return { is_new_user: false };
    }

    // 3. 创建 auth 用户（使用 username@miaoda.com 格式，与现有登录体系兼容）
    const email = `${username}@miaoda.com`;
    const defaultPassword = '123456';
    
    console.log(`[UserCreation] Creating auth user for openid=${openid}, wechatType=${wechatType}, email=${email}, source=${source}`);
    
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        username,
        auto_created: true,
        source: source,
        bind_openid: openid,
        bind_type: wechatType === 'mp_openid' ? 'miniprogram' : 'wechat'
      }
    });

    if (authError || !authData?.user) {
      const errMsg = authError?.message || 'unknown error';
      console.error(`[UserCreation] Auth user creation failed for openid=${openid}:`, errMsg, authError);
      
      // 如果报错是 Email 已存在，尝试绑定现有用户
      if (errMsg.includes('already registered') || errMsg.includes('already exists') || errMsg.includes('duplicate')) {
        console.log(`[UserCreation] Email ${email} already exists, attempting to bind to existing user`);
        try {
          const { data: existingUserByEmail } = await supabaseClient.auth.admin.listUsers();
          const targetUser = existingUserByEmail?.users?.find(u => u.email === email);
          
          if (targetUser) {
            const userId = targetUser.id;
            const profileData: any = {
              id: userId,
              username,
              email,
              role: 'pt',
              album_level: 'pt',
              auto_created: true,
              auto_created_source: source,
              security_status: 'reset_required',
              updated_at: new Date().toISOString()
            };
            profileData[wechatType] = openid;
            
            const { error: upsertErr } = await supabaseClient
              .from('profiles')
              .upsert(profileData, { onConflict: 'id' });
              
            if (upsertErr) {
              console.error('[UserCreation] Profile upsert failed for existing user:', upsertErr);
              return { is_new_user: false };
            }
            
            console.log('[UserCreation] Bound OpenID to existing auth user by email:', email, 'userId:', userId);
            return { is_new_user: true };
          }
        } catch (fallbackErr) {
          console.error('[UserCreation] Fallback binding failed:', fallbackErr);
        }
      }
      
      return { is_new_user: false };
    }

    const userId = authData.user.id;
    console.log('[UserCreation] Created auth user:', userId, 'username:', username, 'email:', email);

    // 4. 创建/更新 profile 记录（作为触发器的补充/回退）
    const profileData: any = {
      id: userId,
      username,
      email,
      role: 'pt',
      album_level: 'pt',
      auto_created: true,
      auto_created_source: source,
      security_status: 'reset_required',
      updated_at: new Date().toISOString()
    };
    profileData[wechatType] = openid;

    // 使用 upsert 避免与数据库触发器 handle_new_user() 冲突
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' });

    if (profileError) {
      console.error('[UserCreation] Profile upsert failed:', profileError);
      // 即使 upsert 失败，auth 用户已创建，触发器可能已处理
      // 返回 true 避免阻断流程
      return { is_new_user: true, user_info: { user_id: userId, username, email, default_password: defaultPassword, openid } };
    }

    console.log('[UserCreation] Auto-created user successfully:', { userId, username, email, openid, wechatType });

    return {
      is_new_user: true,
      user_info: {
        user_id: userId,
        username,
        email,
        default_password: defaultPassword,
        openid
      }
    };
  } catch (err: any) {
    console.error('[UserCreation] Auto-create user fatal error for openid=', openid, ':', err);
    return { is_new_user: false };
  }
}
