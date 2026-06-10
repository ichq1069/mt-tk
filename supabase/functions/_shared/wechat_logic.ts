import { createClient } from "jsr:@supabase/supabase-js@2";
import { autoCreateUser } from "./user_creation.ts";
import { encodeOpenId } from "./crypto.ts";

export async function handleKeyword(
  supabaseClient: any,
  configId: string,
  openid: string,
  content: string,
  platform: 'wechat' | 'miniprogram' = 'wechat'
) {
  const contentTrimmed = content.trim();
  const contentLower = contentTrimmed.toLowerCase();

  // 1. 获取今日随机关键词配置
  const { data: galleryConfig } = await supabaseClient
    .from('system_configs')
    .select('value')
    .eq('key', 'daily_gallery_config')
    .maybeSingle();
  
  const configValue = galleryConfig?.value || {};
  const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  console.log(`[WechatLogic] handleKeyword: content="${contentTrimmed}", mode="${configValue.keyword_mode}", randomDate="${configValue.daily_random_keyword?.date}", today="${today}", keyword_match=${contentTrimmed === String(configValue.daily_random_keyword?.keyword)}`);
  
  // 1.1 如果是随机模式，且今日关键词尚未生成，则自动生成一个
  if (configValue.keyword_mode === 'random' && configValue.daily_random_keyword?.date !== today) {
    console.log(`[WechatLogic] Today's random keyword missing, auto-generating...`);
    const newKeyword = Math.floor(100000 + Math.random() * 900000).toString();
    const newConfig = {
      ...configValue,
      daily_random_keyword: {
        date: today,
        keyword: newKeyword
      }
    };
    
    await supabaseClient
      .from('system_configs')
      .update({ value: newConfig })
      .eq('key', 'daily_gallery_config');
    
    // 更新本地变量以便后续匹配
    configValue.daily_random_keyword = newConfig.daily_random_keyword;
    console.log(`[WechatLogic] Auto-generated today's keyword: ${newKeyword}`);
  }

  if (configValue.keyword_mode === 'random' && configValue.daily_random_keyword?.date === today) {
    if (contentTrimmed === String(configValue.daily_random_keyword.keyword)) {
      console.log(`[WechatLogic] Content matches today's random keyword: ${contentTrimmed}`);
      return await handleDailyGalleryAction(supabaseClient, configId, openid, platform, '');
    }
  }

  // 1.5 处理硬编码的每日图集关键词 (迁移自 wechat-callback)
  const passwordKeyword = configValue.password_keyword || '今日图片';
  const serviceKeyword = configValue.service_auth_keyword || '解锁';
  
  const parseDate = (input: string): string | null => {
    const year = today.split('-')[0];
    let match = input.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    match = input.match(/^(\d{2})(\d{2})$/);
    if (match) return `${year}-${match[1]}-${match[2]}`;
    match = input.match(/^(\d{1,2})-(\d{1,2})$/);
    if (match) return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    match = input.match(/^(\d{1,2})月(\d{1,2})日?$/);
    if (match) return `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    return null;
  };
  const targetDate = parseDate(contentTrimmed);

  if (contentTrimmed === passwordKeyword || contentTrimmed === serviceKeyword || contentTrimmed === '今日' || contentTrimmed === '查询' || contentTrimmed === '帮助' || contentTrimmed === '签到' || contentTrimmed === 'dl' || contentTrimmed.includes('每日图片') || contentTrimmed.includes('今日图片') || targetDate) {
    // 只有在以下情况下才拦截：
    // 1. 开启了随机模式
    // 2. 今天已有随机关键词
    // 3. 用户发送的是固定关键词，或者是解析出的日期正是今天
    const isTodayQuery = !targetDate || targetDate === today;
    if (configValue.keyword_mode === 'random' && configValue.daily_random_keyword?.date === today && isTodayQuery && (contentTrimmed === passwordKeyword || contentTrimmed === '今日')) {
       console.log(`[WechatLogic] Blocking fixed gallery keyword "${contentTrimmed}" because today's random keyword is active.`);
       return "💡 今日图集已开启【随机数字/关键词】模式，常规关键词（如\"今日\"）已暂时失效。\n\n请输入正确的随机数字获取今日内容。\n\n[提示] 往期内容不受影响，输入\"月日\"（如0504）或\"年月日\"（如20260504）即可查询今日之前的图集。";
    }
    
    // 如果是"查询"或"帮助"，优先返回这些 action
    if (contentTrimmed === '查询') return await handleAccountInfoAction(supabaseClient, openid);
    if (contentTrimmed === '帮助') return `💡 常用指令指南：\n\n1️⃣ 发送"登录"：获取验证码登录账号。\n2️⃣ 发送"今日图片"：查看今日推荐内容。\n3️⃣ 发送"签到"：每日领取奖励。\n4️⃣ 发送"查询"：查询您的积分和等级。`;
    if (contentTrimmed === '签到') return await handleCheckInAction(supabaseClient, configId, openid, '');
    if (contentTrimmed === 'dl') return await handleLoginAction(supabaseClient, configId, openid, '');
    
    return await handleDailyGalleryAction(supabaseClient, configId, openid, platform, '', targetDate);
  }

  let query = supabaseClient
    .from('wechat_replies')
    .select('*')
    .eq('is_active', true)
    .eq('type', 'keyword')
    .eq('platform', platform);

  if (configId) {
    query = query.eq('config_id', configId);
  } else if (platform === 'miniprogram') {
    // 如果没有提供 configId 且是小程序，则尝试查找第一个有效的
    const { data: mpConfig } = await supabaseClient
      .from('miniprogram_configs')
      .select('id')
      .maybeSingle();
    if (mpConfig) {
      query = query.eq('config_id', mpConfig.id);
      configId = mpConfig.id; // 给后续 Action 使用
    }
  }

  const { data: replies } = await query;

  let matchedReply = null;
  if (replies) {
    // 先匹配全等
    matchedReply = replies.find(r => r.match_type === 'exact' && r.keyword?.toLowerCase() === contentLower);
    // 再匹配模糊
    if (!matchedReply) {
      matchedReply = replies.find(r => r.match_type === 'fuzzy' && contentLower.includes(r.keyword?.toLowerCase() || ''));
    }
  }

  if (matchedReply) {
    // 获取随机美图配置
    const { data: beautyConfig } = await supabaseClient
      .from('random_beauty_configs')
      .select('*')
      .maybeSingle();

    let finalContent = matchedReply.reply_content;

    // 随机美图变量替换
    if (finalContent.includes('{{random.beauty_url}}')) {
      const { data: domainConfig } = await supabaseClient
        .from('domain_configs')
        .select('domain_url')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      const baseUrl = (domainConfig?.domain_url || 'https://app-b5vwlh6eky69.appmiaoda.com').replace(/\/$/, '');
      finalContent = finalContent.replace(/\{\{random\.beauty_url\}\}/g, `${baseUrl}/refresh-image`);
    }

    if (finalContent.includes('{{openid}}')) {
      let opid = openid;
      if (beautyConfig?.encrypt_openid !== false) {
        opid = encodeOpenId(openid);
      }
      finalContent = finalContent.replace(/\{\{openid\}\}/g, opid);
    }

    if (finalContent.includes('{{random.beauty_count}}') || finalContent.includes('{{random.beauty_limit}}') || finalContent.includes('{{random.beauty_remaining}}')) {
      const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: usage } = await supabaseClient
        .from('random_beauty_logs')
        .select('count')
        .eq('openid', openid)
        .eq('visit_date', today)
        .maybeSingle();
      
      const currentCount = usage?.count || 0;
      
      // 计算限额 (需要 profile)
      const { data: profileForLimit } = await supabaseClient
        .from('profiles')
        .select('role, group_id')
        .or(`mp_openid.eq.${openid},wechat_openid.eq.${openid}`)
        .maybeSingle();
      
      let limit = beautyConfig?.default_limit ?? 8;
      if (beautyConfig && beautyConfig.group_limits) {
        const possibleKeys = [profileForLimit?.group_id, profileForLimit?.role, 'pt'].filter(Boolean);
        for (const key of possibleKeys) {
          if (beautyConfig.group_limits[key as string] !== undefined) {
            limit = beautyConfig.group_limits[key as string];
            break;
          }
        }
      }

      finalContent = finalContent.replace(/\{\{random\.beauty_count\}\}/g, currentCount.toString());
      finalContent = finalContent.replace(/\{\{random\.beauty_limit\}\}/g, limit.toString());
      finalContent = finalContent.replace(/\{\{random\.beauty_remaining\}\}/g, Math.max(0, limit - currentCount).toString());
    }

    // 通用变量替换
    if (finalContent.includes('{{user.name}}') || finalContent.includes('{user.name}')) {
      // 优先从 profiles 获取（支持自动创建的用户）
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('username')
        .or(`mp_openid.eq.${openid},wechat_openid.eq.${openid}`)
        .maybeSingle();
      
      let nickname = profile?.username;
      
      // 兜底从 wechat_users 获取
      if (!nickname) {
        const { data: user } = await supabaseClient
          .from('wechat_users')
          .select('nickname')
          .eq('openid', openid)
          .maybeSingle();
        nickname = user?.nickname;
      }
      
      finalContent = finalContent.replace(/\{\{user\.name\}\}|\{user\.name\}/g, nickname || '亲爱的用户');
    }
    
    if (finalContent.includes('{{date.yyyy-mm-dd}}') || finalContent.includes('{date.yyyy-mm-dd}')) {
      const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
      finalContent = finalContent.replace(/\{\{date\.yyyy-mm-dd\}\}|\{date\.yyyy-mm-dd\}/g, today);
    }

    // 如果匹配到了关键词，且有分类 action，则执行对应逻辑
    if (matchedReply.category && matchedReply.category !== 'none') {
      // 关键逻辑：如果开启了随机关键词模式，屏蔽常规"每日图集"动作的固定关键词
      if (matchedReply.category === 'daily_gallery' && configValue.keyword_mode === 'random') {
        console.log(`[WechatLogic] Blocking standard gallery keyword "${contentTrimmed}" because random mode is active.`);
        return "💡 今日图集已开启【随机数字/关键词】模式，常规关键词（如\"今日\"）已暂时失效。\n\n请输入正确的随机数字获取内容。\n[提示] 随机数字获取方式请见公众号最新推文或菜单。";
      }
      return await executeCategoryAction(supabaseClient, configId, openid, matchedReply.category, platform, finalContent);
    }
    // 否则直接返回回复内容
    return finalContent;
  }

  return null;
}

async function executeCategoryAction(
  supabaseClient: any,
  configId: string,
  openid: string,
  category: string,
  platform: string,
  defaultReply: string
) {
  switch (category) {
    case 'login':
    case 'binding':
      return await handleLoginAction(supabaseClient, configId, openid, defaultReply);
    case 'daily_gallery':
      return await handleDailyGalleryAction(supabaseClient, configId, openid, platform, defaultReply);
    case 'random_beauty':
      return await handleRandomBeautyAction(supabaseClient, openid, defaultReply);
    case 'gallery_history':
      return await handleGalleryHistoryAction(supabaseClient, openid);
    case 'account_info':
      return await handleAccountInfoAction(supabaseClient, openid);
    case 'help':
      return defaultReply || `💡 常用指令指南：\n\n1️⃣ 发送"登录"：获取验证码登录账号。\n2️⃣ 发送"每日图集"：查看今日推荐内容。\n3️⃣ 发送"签到"：每日领取奖励。`;
    case 'check_in':
      return await handleCheckInAction(supabaseClient, configId, openid, defaultReply);
    default:
      return defaultReply;
  }
}

async function handleLoginAction(supabaseClient: any, configId: string, openid: string, defaultReply: string) {
  // 生成登录码逻辑 (复用原有逻辑)
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const { data: domainConfig } = await supabaseClient
    .from("domain_configs")
    .select("domain_url, identifier")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const siteUrl = domainConfig?.domain_url || "https://app-b5vwlh6eky69.appmiaoda.com";
  const bindUrl = `${siteUrl}/login?bind_code=${code}&config_id=${configId}`;
  
  const { error } = await supabaseClient
    .from("wechat_binding_requests")
    .insert({
      config_id: configId,
      openid: openid,
      code,
      type: "wechat_to_user",
      site_url: siteUrl,
      domain_identifier: domainConfig?.identifier || "default",
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

  if (error) return "验证码生成失败，请稍后再试。";
  
  const baseReply = defaultReply || "您的登录验证码为：{code}\n请在 10 分钟内完成登录。\n\n[方式1] 在 H5 的\"登录/注册\"中输入此验证码。\n\n[方式2] <a href=\"{url}\">点击此处直接登录</a>";

  return baseReply.replace('{code}', code).replace('{url}', bindUrl);
}

async function handleDailyGalleryAction(supabaseClient: any, configId: string, openid: string, platform: string, defaultReply: string, targetDate?: string | null) {
  const beijingNow = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
  const today = beijingNow.toISOString().split('T')[0];
  const queryDate = targetDate || today;
  
  // --- 关键优化：用户发送关键词时自动创建账户 ---
  console.log(`[WechatLogic] Triggering auto-creation for ${openid} on keyword for date ${queryDate}, platform: ${platform}`);
  const idField = platform === 'miniprogram' ? 'mp_openid' : 'wechat_openid';
  const createResult = await autoCreateUser(supabaseClient, openid, idField, 'daily_gallery_keyword');
  // --- 结束优化 ---

  let nickname = '亲爱的用户';
  if (createResult.is_new_user && createResult.user_info) {
    nickname = createResult.user_info.username;
  } else {
    // 获取用户信息用于回复
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('username')
      .or(`mp_openid.eq.${openid},wechat_openid.eq.${openid}`)
      .maybeSingle();
    nickname = profile?.username || '亲爱的用户';
  }

  const { data: post } = await supabaseClient
    .from('daily_gallery_posts')
    .select('id, password, is_published')
    .eq('post_date', queryDate)
    .eq('is_published', true)
    .maybeSingle();

  if (!post) return `😔 抱歉，【${queryDate === today ? '今日' : queryDate}】图集内容尚未发布，请稍后再来。`;

  // 获取访问链接基础 URL
  const { data: galleryConfig } = await supabaseClient
    .from('system_configs')
    .select('value')
    .eq('key', 'daily_gallery_config')
    .maybeSingle();

  const configValue = galleryConfig?.value || {};
  const redirectDomain = configValue.wechat_redirect_domain;
  const includePasswordInReply = configValue.wechat_reply_include_password !== false;

  let baseUrl = (redirectDomain || 'https://app-b5vwlh6eky69.appmiaoda.com/').replace(/\/$/, '');
  
  // 降级：如果没有配置自定义域名，尝试从 domain_configs 获取
  if (!redirectDomain) {
    const { data: domainConfig } = await supabaseClient
      .from('domain_configs')
      .select('domain_url')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (domainConfig?.domain_url) {
      baseUrl = domainConfig.domain_url.replace(/\/$/, '');
    }
  }

  // 获取/生成密码逻辑 (加入到随机密码库 daily_gallery_special_passwords)
  const { data: userPwdRecord } = await supabaseClient
    .from('daily_gallery_special_passwords')
    .select('*')
    .eq('creator_id', openid)
    .eq('target_date', queryDate)
    .eq('source', 'wechat')
    .maybeSingle();

  let userPassword = userPwdRecord?.password;
  let expiresAt = userPwdRecord?.expires_at;

  if (!userPassword || new Date(expiresAt) < new Date()) {
    userPassword = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 计算过期时间（明天晚上23:59:59）
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    expiresAt = tomorrow.toISOString();
    
    console.log(`[WechatLogic] Saving password for ${openid} on ${queryDate}: ${userPassword}`);
    
    // 同步到三个表
    const results = await Promise.all([
      supabaseClient
        .from('daily_gallery_user_passwords')
        .upsert({
          openid: openid,
          post_date: queryDate,
          password: userPassword,
          expires_at: expiresAt,
          locked_browser_id: null,
          reset_count: 0
        }, { onConflict: 'openid,post_date' }),

      supabaseClient
        .from('daily_gallery_special_passwords')
        .upsert({
          creator_id: openid,
          target_date: queryDate,
          password: userPassword,
          expires_at: expiresAt,
          source: 'wechat',
          password_type: 'periodic_single_user',
          is_one_time: false,
          is_used: false,
          max_usages: 999,
          used_count: 0,
          browser_id: null
        }, { onConflict: 'creator_id,target_date,source' }),

      supabaseClient
        .from('ad_unlock_logs')
        .insert({
          item_id: queryDate,
          unlock_type: 'daily_gallery',
          status: 'unlocked',
          openid: openid,
          unlocked_at: new Date().toISOString(),
          log_type: 'wechat_keyword_shared',
          success: true
        })
    ]);
    
    const syncError = results.find(r => r.error);
    if (syncError) {
      console.error("[WechatLogic] Failed to sync passwords:", syncError.error);
    } else {
      console.log("[WechatLogic] Successfully saved special password for user:", openid);
    }
  }

  // 格式化有效期时间
  const bj = new Date(new Date(expiresAt).getTime() + 8 * 60 * 60 * 1000);
  const expiresTimeStr = `${bj.getUTCFullYear()}年${(bj.getUTCMonth() + 1).toString().padStart(2, '0')}月${bj.getUTCDate().toString().padStart(2, '0')}日 ${bj.getUTCHours().toString().padStart(2, '0')}:${bj.getUTCMinutes().toString().padStart(2, '0')}:${bj.getUTCSeconds().toString().padStart(2, '0')}`;

  const encryptedOpenId = encodeOpenId(openid);
  const accessUrl = `${baseUrl}/daily-gallery?date=${queryDate}&openid=${encryptedOpenId}&p=${userPassword}`;
  
  let baseReplyText = defaultReply;
  if (!baseReplyText) {
    baseReplyText = `📸 {nickname}，你好\n【{date_text}】图集独立密码已发送\n${includePasswordInReply ? ' 🔑 您的专属密码：{password}\n' : ''}⏰ 有效期至：{expire_time}\n🔗 <a href="{url}">点击专属链接访问</a>\n\n💡 提示：此密码/链接仅供您在当前浏览器使用，转发无效。\n\n🔄 如果需要在其他浏览器查看请回复\"重置看图密码\"即可重置。`;
  }
  
  return baseReplyText
    .replace('{nickname}', nickname)
    .replace('{password}', userPassword)
    .replace('{date}', queryDate)
    .replace('{date_text}', queryDate === today ? '今日' : queryDate)
    .replace('{url}', accessUrl)
    .replace('{expire_time}', expiresTimeStr);
}

async function handleCheckInAction(supabaseClient: any, configId: string, openid: string, defaultReply: string) {
  const beijingNow = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
  const today = beijingNow.toISOString().split("T")[0];

  // 1. 获取用户信息 (从 profiles)
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("id, points, exp, custom_fields")
    .or(`wechat_openid.eq."${openid}",mp_openid.eq."${openid}"`)
    .maybeSingle();

  if (!profile) return "⚠️ 请先在 H5 页面完成账号绑定后再进行签到。";

  // 2. 检查今日是否已签到
  const { data: existingCheckin } = await supabaseClient
    .from("check_ins")
    .select("id")
    .eq("user_id", profile.id)
    .eq("check_in_date", today)
    .maybeSingle();

  if (existingCheckin) {
    return "🌟 您今天已经签到过了，明天再来吧！";
  }

  // 3. 执行签到 (获取连续签到天数，这里可以存放在 custom_fields 中)
  const yesterdayStr = new Date(new Date(today).getTime() - 86400000).toISOString().split("T")[0];
  const customFields = profile.custom_fields || {};
  const lastCheckinStr = customFields.last_checkin_date || "";
  
  const newContinuous = (lastCheckinStr === yesterdayStr) ? (customFields.continuous_days || 0) + 1 : 1;
  const earnedPoints = 10; // 默认奖励
  const earnedExp = 5;

  // 记录签到
  await supabaseClient.from("check_ins").insert({
    user_id: profile.id,
    check_in_date: today
  });

  // 更新 profiles 用户数据
  await supabaseClient.from("profiles").update({
    points: (profile.points || 0) + earnedPoints,
    exp: (profile.exp || 0) + earnedExp,
    custom_fields: {
      ...customFields,
      last_checkin_date: today,
      continuous_days: newContinuous
    }
  }).eq("id", profile.id);

  const baseReply = defaultReply || "🌟 签到成功！您今日已完成签到。\n\n📅 连续签到：{days} 天\n💰 获得奖励：{points} 积分\n📈 当前成长：{exp} 点";

  return baseReply
    .replace('{days}', newContinuous.toString())
    .replace('{points}', earnedPoints.toString())
    .replace('{exp}', earnedExp.toString());
}

async function handleRandomBeautyAction(supabaseClient: any, openid: string, defaultReply: string) {
  // 获取随机美图配置
  const { data: config } = await supabaseClient
    .from('random_beauty_configs')
    .select('*')
    .maybeSingle();

  // 获取用户信息以确定权限组
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role, group_id')
    .or(`wechat_openid.eq.${openid},mp_openid.eq.${openid}`)
    .maybeSingle();

  // 获取域名配置
  const { data: domainConfig } = await supabaseClient
    .from("domain_configs")
    .select("domain_url")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  const siteUrl = (domainConfig?.domain_url || "https://app-b5vwlh6eky69.appmiaoda.com").replace(/\/$/, '');
  
  let opid = openid;
  if (config?.encrypt_openid !== false) {
    opid = encodeOpenId(openid);
  }

  const accessUrl = `${siteUrl}/refresh-image?openid=${opid}`;
  
  // 获取当前使用情况
  const { data: usage } = await supabaseClient
    .from('random_beauty_logs')
    .select('count')
    .eq('openid', openid)
    .eq('visit_date', new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0])
    .maybeSingle();
  
  // 计算限额
  let limit = config?.default_limit ?? 8;
  if (config && config.group_limits) {
    const possibleKeys = [profile?.group_id, profile?.role, 'pt'].filter(Boolean);
    for (const key of possibleKeys) {
      if (config.group_limits[key as string] !== undefined) {
        limit = config.group_limits[key as string];
        break;
      }
    }
  }

  const currentCount = usage?.count || 0;
  const remainingCount = Math.max(0, limit - currentCount);

  const baseReply = defaultReply || "✨ 您的随机美图专属入口已准备就绪。\n\n📊 今日额度：{total} 次\n📈 今日已看：{count} 次\n📉 剩余额度：{remaining} 次\n\n🔗 <a href=\"{url}\">点击进入随机美图</a>\n\n💡 提示：进入后可开启\"自动播放\"模式，享受沉浸式体验。";

  return baseReply
    .replace('{url}', accessUrl)
    .replace('{total}', limit.toString())
    .replace('{count}', currentCount.toString())
    .replace('{remaining}', remainingCount.toString());
}

async function handleGalleryHistoryAction(supabaseClient: any, openid: string) {
  const { data: history, error } = await supabaseClient
    .from('daily_gallery_user_passwords')
    .select('post_date, password, expires_at')
    .eq('openid', openid)
    .order('post_date', { ascending: false })
    .limit(5);

  if (error || !history || history.length === 0) {
    return "🗓️ 您暂时没有历史访问记录哦，快发送\"今日\"开始探索吧！";
  }

  let reply = "📜 您的近 5 次图集访问密码记录：\n";
  history.forEach((item: any) => {
    const isExpired = new Date(item.expires_at) < new Date();
    reply += `\n📅 ${item.post_date}：${item.password}${isExpired ? ' (已过期)' : ''}`;
  });

  reply += "\n\n💡 提示：点击今日推送的专属链接可直接访问。";
  return reply;
}

async function handleAccountInfoAction(supabaseClient: any, openid: string) {
  // 1. 尝试自动创建用户（确保新用户发送"查询"也能识别）
  await autoCreateUser(supabaseClient, openid, 'wechat_openid', 'account_info_auto');

  // 2. 直接从 profiles 查找关联账户
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('username, points, exp, digital_id, mp_openid, wechat_openid, created_at, rank')
    .or(`mp_openid.eq."${openid}",wechat_openid.eq."${openid}"`)
    .maybeSingle();

  if (!profile) {
    // 尝试二次兜底查找 (有些 openid 可能带有特殊字符，增加引号尝试)
    const { data: profileRetry } = await supabaseClient
      .from('profiles')
      .select('username, points, exp, digital_id, mp_openid, wechat_openid, created_at, rank')
      .eq('wechat_openid', openid)
      .maybeSingle();
    
    if (profileRetry) {
      return `👤 我的账户信息：\n\n🆔 用户名：${profileRetry.username}\n🔢 靓号：${profileRetry.digital_id || '暂无'}\n⭐ 等级：${profileRetry.rank || '初级赏析员'}\n💰 积分：${profileRetry.points || 0}\n📈 经验：${profileRetry.exp || 0}\n📅 注册时间：${new Date(profileRetry.created_at).toLocaleDateString('zh-CN')}\n\n💡 提示：您可以发送\"历史\"查询看图记录。`;
    }

    return "🔍 未找到您的账户信息。请发送\"今日\"或登录网站自动创建账户。";
  }

  return `👤 我的账户信息：\n\n🆔 用户名：${profile.username}\n🔢 靓号：${profile.digital_id || '暂无'}\n⭐ 等级：${profile.rank || '初级赏析员'}\n💰 积分：${profile.points || 0}\n📈 经验：${profile.exp || 0}\n📅 注册时间：${new Date(profile.created_at).toLocaleDateString('zh-CN')}\n\n💡 提示：您可以发送\"历史\"查询看图记录。`;
}
