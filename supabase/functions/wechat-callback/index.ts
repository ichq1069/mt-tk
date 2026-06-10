// supabase/functions/wechat-callback/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createHash, createDecipheriv } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { handleKeyword } from '../_shared/wechat_logic.ts';
import { autoCreateUser } from '../_shared/user_creation.ts';
import { encodeOpenId } from '../_shared/crypto.ts';

const VERSION = "10.0.61";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// 验证微信签名
function checkSignature(signature, timestamp, nonce, token) {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join('');
  const sha1 = createHash('sha1').update(str).digest('hex');
  return sha1 === signature;
}

// 解析微信 XML 消息
function parseXML(xml: string) {
  const result: any = {};
  if (!xml) return result;
  try {
    // 移除外层的 <xml> 标签以防止正则匹配最外层而跳过内部
    const cleanedXml = xml.replace(/<\/?xml[^>]*>/gi, '');
    const tagRegex = /<([a-zA-Z0-9_]+)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/\1>/gi;
    let match;
    while ((match = tagRegex.exec(cleanedXml)) !== null) {
      const key = match[1];
      const value = match[2].trim();
      result[key] = value;
      // 额外兼容性：如果 key 不是首字母大写的，也存一份首字母大写的
      const normalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
      if (!result[normalizedKey]) {
        result[normalizedKey] = value;
      }
    }
  } catch (e) {
    console.error('[WechatCallback] XML Parse Exception:', e);
  }
  
  return result;
}

// 生成 XML 文本消息
function generateTextMessage(toUser, fromUser, content) {
  const timestamp = Math.floor(Date.now() / 1000);
  return `<xml>
  <ToUserName><![CDATA[${toUser}]]></ToUserName>
  <FromUserName><![CDATA[${fromUser}]]></FromUserName>
  <CreateTime>${timestamp}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
</xml>`;
}

// 微信解密逻辑
function decryptWechatMessage(encryptedData: string, encodingAesKey: string) {
  try {
    const key = Buffer.from(encodingAesKey + '=', 'base64');
    const iv = key.slice(0, 16);
    const decipher = createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(false);
    
    let decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedData, 'base64')), decipher.final()]);
    
    // 去除填充
    const pad = decrypted[decrypted.length - 1];
    if (pad < 1 || pad > 32) return '';
    decrypted = decrypted.slice(0, decrypted.length - pad);
    
    // 解构：random(16) + msg_len(4) + msg + appid
    const msgLen = decrypted.readInt32BE(16);
    const msg = decrypted.slice(20, 20 + msgLen).toString('utf8');
    return msg;
  } catch (e) {
    console.error('[WechatCallback] Decrypt Error:', e);
    return '';
  }
}

// 核心处理函数
async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/wechat-callback', '');

  // 健康检查接口
  if (path === '/health') {
    return new Response(
      JSON.stringify({ status: 'ok', version: VERSION, service: 'wechat-callback' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('MIAODA_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('MIAODA_SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: galleryConfig } = await supabaseClient
      .from('system_configs')
      .select('value')
      .eq('key', 'daily_gallery_config')
      .maybeSingle();

    const configValue = galleryConfig?.value || {};
    const resetLimit = configValue.reset_limit ?? 1;

    // 格式化日期时间助手函数
    const formatDateTime = (date: Date) => {
      try {
        if (!date || isNaN(date.getTime())) return '未知时间';
        const bj = new Date(date.getTime() + 8 * 60 * 60 * 1000);
        const Y = bj.getUTCFullYear();
        const M = (bj.getUTCMonth() + 1).toString().padStart(2, '0');
        const D = bj.getUTCDate().toString().padStart(2, '0');
        const h = bj.getUTCHours().toString().padStart(2, '0');
        const m = bj.getUTCMinutes().toString().padStart(2, '0');
        const s = bj.getUTCSeconds().toString().padStart(2, '0');
        return `${Y}年${M}月${D}日 ${h}:${m}:${s}`;
      } catch (e) {
        return '日期格式错误';
      }
    };

    const signature = url.searchParams.get('signature');
    const timestamp = url.searchParams.get('timestamp');
    const nonce = url.searchParams.get('nonce');
    const echostr = url.searchParams.get('echostr');
    const configId = url.searchParams.get('config_id');
    
    if (!configId) {
      return new Response('Missing config_id', { status: 400 });
    }

    const { data: config, error: configError } = await supabaseClient
      .from('wechat_configs')
      .select('*')
      .eq('id', configId)
      .eq('is_active', true)
      .maybeSingle();

    if (configError || !config) {
      return new Response('Config not found', { status: 404 });
    }

    const token = config.token?.trim();
    if (!token) {
      return new Response('Token not configured', { status: 500 });
    }

    // 记录收到的请求头和查询参数以便排查
    const rawBody = await req.text().catch(() => "");
    console.log(`[WechatCallback] Received ${req.method} request with configId=${configId}`);
    
    if (req.method === 'GET') {
      if (!signature || !timestamp || !nonce || !echostr) {
        return new Response('Missing parameters', { status: 400 });
      }

      if (checkSignature(signature, timestamp, nonce, token)) {
        return new Response(echostr, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      } else {
        return new Response('Invalid signature', { status: 403 });
      }
    }

    if (req.method === "POST") {
      if (!signature || !timestamp || !nonce) {
        return new Response('Missing parameters', { status: 400 });
      }

      if (!checkSignature(signature, timestamp, nonce, token)) {
        return new Response('Invalid signature', { status: 403 });
      }

      // 解析 XML
      let message = parseXML(rawBody);
      let finalRawXml = rawBody;
      
      // 如果消息加密，进行解密
      if (message.Encrypt && config.aes_key) {
        console.log('[WechatCallback] Detected encrypted message, decrypting...');
        const decryptedXml = decryptWechatMessage(message.Encrypt, config.aes_key);
        if (decryptedXml) {
          console.log('[WechatCallback] Decrypted XML:', decryptedXml);
          finalRawXml = decryptedXml; // 关键：记录解密后的 XML 以便后续排查和修复
          message = parseXML(decryptedXml);
        } else {
          console.error('[WechatCallback] Failed to decrypt message');
        }
      }

      const { ToUserName, FromUserName, MsgType, Content, MsgId, Event, EventKey } = message;

      console.log(`[WechatCallback] Parsed message: type=${MsgType}, from=${FromUserName}, to=${ToUserName}, content=${Content}, event=${Event}`);

      let replyContent = '';

      // --- 处理微信业务逻辑 ---
      
      // 订阅通知相关事件处理
      if (MsgType === 'event') {
        // 1. 用户操作订阅弹窗事件
        if (Event === 'subscribe_msg_popup_event') {
          console.log(`[WechatCallback] Handling subscribe_msg_popup_event from ${FromUserName}`);
          // 由于微信的 List 标签可能存在多个，这里手动解析
          const listMatches = [...finalRawXml.matchAll(/<List>([\s\S]*?)<\/List>/gi)];
          for (const match of listMatches) {
            const listContent = match[1];
            const templateIdMatch = listContent.match(/<TemplateId>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/TemplateId>/i);
            const statusMatch = listContent.match(/<SubscribeStatusString>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/SubscribeStatusString>/i);
            const sceneMatch = listContent.match(/<PopupScene>([\s\S]*?)<\/PopupScene>/i);
            
            if (templateIdMatch && statusMatch) {
              const tplId = templateIdMatch[1].trim();
              const status = statusMatch[1].trim();
              const scene = sceneMatch ? parseInt(sceneMatch[1].trim()) : null;
              
              await supabaseClient
                .from('wechat_notification_subscriptions')
                .upsert({
                  config_id: configId,
                  openid: FromUserName,
                  template_id: tplId,
                  status: status,
                  popup_scene: scene,
                  updated_at: new Date().toISOString(),
                  created_at: new Date().toISOString()
                }, { onConflict: 'config_id,openid,template_id' });
              
              console.log(`[WechatCallback] Updated subscription for ${FromUserName}: ${tplId} -> ${status}`);
            }
          }
        }
        
        // 2. 用户管理订阅事件
        else if (Event === 'subscribe_msg_change_event') {
          console.log(`[WechatCallback] Handling subscribe_msg_change_event from ${FromUserName}`);
          const listMatches = [...finalRawXml.matchAll(/<List>([\s\S]*?)<\/List>/gi)];
          for (const match of listMatches) {
            const listContent = match[1];
            const templateIdMatch = listContent.match(/<TemplateId>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/TemplateId>/i);
            const statusMatch = listContent.match(/<SubscribeStatusString>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/SubscribeStatusString>/i);
            
            if (templateIdMatch && statusMatch) {
              const tplId = templateIdMatch[1].trim();
              const status = statusMatch[1].trim(); // 仅推送 reject
              
              await supabaseClient
                .from('wechat_notification_subscriptions')
                .update({
                  status: status,
                  updated_at: new Date().toISOString()
                })
                .eq('config_id', configId)
                .eq('openid', FromUserName)
                .eq('template_id', tplId);
              
              console.log(`[WechatCallback] Updated changed subscription for ${FromUserName}: ${tplId} -> ${status}`);
            }
          }
        }
        
        // 3. 发送状态回调事件
        else if (Event === 'subscribe_msg_sent_event') {
          console.log(`[WechatCallback] Handling subscribe_msg_sent_event for ${FromUserName}`);
          const listMatches = [...finalRawXml.matchAll(/<List>([\s\S]*?)<\/List>/gi)];
          for (const match of listMatches) {
            const listContent = match[1];
            const templateIdMatch = listContent.match(/<TemplateId>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/TemplateId>/i);
            const msgIdMatch = listContent.match(/<MsgID>([\s\S]*?)<\/MsgID>/i);
            const errorCodeMatch = listContent.match(/<ErrorCode>([\s\S]*?)<\/ErrorCode>/i);
            const errorStatusMatch = listContent.match(/<ErrorStatus>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/ErrorStatus>/i);
            
            if (msgIdMatch) {
              const msgId = msgIdMatch[1].trim();
              const errorCode = errorCodeMatch ? errorCodeMatch[1].trim() : '0';
              const errorStatus = errorStatusMatch ? errorStatusMatch[1].trim() : 'success';
              
              // 更新日志
              const { error: updateError } = await supabaseClient
                .from('wechat_notification_logs')
                .update({
                  status: errorCode === '0' ? 'success' : 'failed',
                  error_code: errorCode,
                  error_message: errorStatus,
                  sent_at: new Date().toISOString()
                })
                .eq('msg_id', msgId);
              
              if (updateError) {
                 console.error('[WechatCallback] Update notification log error:', updateError);
              }
              console.log(`[WechatCallback] Updated notification log status for msg_id: ${msgId}`);
            }
          }
        }
      }

      if (MsgType === 'event' && (Event === 'subscribe' || Event === 'SCAN')) {
        // --- 处理扫码登录逻辑 ---
        const eventKey = EventKey || '';
        const sceneStr = eventKey.replace('qrscene_', '');
        if (sceneStr.startsWith('login:')) {
           const code = sceneStr.replace('login:', '');
           // 更新绑定请求记录
           const { data: bindingReq } = await supabaseClient
             .from('wechat_binding_requests')
             .select('*')
             .eq('code', code)
             .eq('config_id', configId)
             .eq('type', 'wechat_to_user')
             .maybeSingle();

           if (bindingReq) {
              await supabaseClient
                .from('wechat_binding_requests')
                .update({ openid: FromUserName })
                .eq('id', bindingReq.id);
              
              replyContent = '🚀 您已成功扫码，请在浏览器中确认登录。';
           }
        } else if (sceneStr.startsWith('gallery:')) {
           // 处理每日图集扫码获取密码
           const rawDate = sceneStr.replace('gallery:', '');
           // 规范化日期格式 (20260323 -> 2026-03-23)
           const queryDate = rawDate.length === 8 ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` : rawDate;
           
           console.log(`[WechatCallback] Gallery scene scan detected: rawDate=${rawDate}, queryDate=${queryDate}, user=${FromUserName}`);
           
           
           // 自动创建用户并绑定 OpenID（扫码场景）
           console.log(`[WechatCallback] Auto-creating user for scan user: ${FromUserName}`);
           const createResult = await autoCreateUser(supabaseClient, FromUserName, "wechat_openid", "daily_gallery_scan");
           let nickname = "亲爱的用户";
           if (createResult.is_new_user && createResult.user_info) {
             nickname = createResult.user_info.username;
           } else {
             const { data: profile } = await supabaseClient
               .from("profiles")
               .select("username")
               .or(`mp_openid.eq."${FromUserName}",wechat_openid.eq."${FromUserName}"`)
               .maybeSingle();
             nickname = profile?.username || "亲爱的用户";
           }
           const { data: targetPost } = await supabaseClient
             .from('daily_gallery_posts')
             .select('id, password, is_published')
             .eq('post_date', queryDate)
             .eq('is_published', true)
             .maybeSingle();

           if (targetPost) {
             // 每个人生成独立密码
             const { data: userPwdRecord } = await supabaseClient
               .from('daily_gallery_user_passwords')
               .select('password, expires_at')
               .eq('openid', FromUserName)
               .eq('post_date', queryDate)
               .maybeSingle();
             
             let userPassword = userPwdRecord?.password;
             let expiresAtStr = userPwdRecord?.expires_at;
             
              if (!userPassword || new Date(expiresAtStr) < new Date()) {
                userPassword = Math.floor(100000 + Math.random() * 900000).toString();
                
                // 计算过期时间（明天晚上23:59:59）
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(23, 59, 59, 999);
                expiresAtStr = tomorrow.toISOString();
                
                console.log(`[WechatCallback] Generating new password for ${FromUserName}: ${userPassword}`);

                // 同步到三个表
                const [res1, res2, res3] = await Promise.all([
                  supabaseClient
                    .from('daily_gallery_user_passwords')
                    .upsert({
                      openid: FromUserName,
                      post_date: queryDate,
                      password: userPassword,
                      expires_at: expiresAtStr,
                      locked_browser_id: null,
                      reset_count: 0
                    }, { onConflict: 'openid,post_date' }),
                  
                  supabaseClient
                    .from('daily_gallery_special_passwords')
                    .upsert({
                      creator_id: FromUserName,
                      target_date: queryDate,
                      password: userPassword,
                      expires_at: expiresAtStr,
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
                      openid: FromUserName,
                      unlocked_at: new Date().toISOString(),
                      log_type: 'wechat_scan',
                      success: true
                    })
                ]);
               
               if (res1.error || res2.error || res3.error) {
                 console.error('[WechatCallback] DB Sync Error:', res1.error, res2.error, res3.error);
               } else {
                 console.log('[WechatCallback] DB Sync Success');
               }
             }

             const expiresTimeStr = formatDateTime(new Date(expiresAtStr));

             const configValue = galleryConfig?.value || {};
             const redirectDomain = configValue.wechat_redirect_domain;
             const includePasswordInReply = configValue.wechat_reply_include_password !== false;

             let baseUrl = (redirectDomain || 'https://app-b5vwlh6eky69.appmiaoda.com/').replace(/\/$/, '');
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

             const encryptedOpenId = encodeOpenId(FromUserName);
             const accessUrl = `${baseUrl}/daily-gallery?date=${queryDate}&openid=${encryptedOpenId}&p=${userPassword}`;
             
              replyContent = `📸 ${nickname}，你好
今日图集独立密码已发送
${includePasswordInReply ? ` 🔑 您的专属密码：${userPassword}
` : ""}⏰ 有效期至：${expiresTimeStr}
🔗 <a href="${accessUrl}">点击专属链接访问</a>

💡 提示：此密码/链接仅供您在当前浏览器使用，转发无效。

🔄 如果需要在其他浏览器查看请回复"重置看图密码"即可重置。`;
           } else {
             const { data: galleryConfig } = await supabaseClient
               .from('system_configs')
               .select('value')
               .eq('key', 'daily_gallery_config')
               .maybeSingle();
             const publishTime = galleryConfig?.value?.publish_time || '00:00';
             replyContent = `😔 抱歉，【${queryDate}】的内容尚未发布。${queryDate === new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0] ? `请在【${publishTime}】后重试。` : ''}`;
           }
        } else if (sceneStr.startsWith('reset:')) {
           // --- 处理重置密码扫码逻辑 ---
           const rawDate = sceneStr.replace('reset:', '');
           const queryDate = rawDate.length === 8 ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` : rawDate;
           
           console.log(`[WechatCallback] Reset password scan detected: rawDate=${rawDate}, queryDate=${queryDate}, user=${FromUserName}`);
           
           const { data: userPwdRecord } = await supabaseClient
             .from('daily_gallery_user_passwords')
             .select('*')
             .eq('openid', FromUserName)
             .eq('post_date', queryDate)
             .maybeSingle();

           if (!userPwdRecord) {
             replyContent = `⚠️ 未找到您在 ${queryDate} 的密码记录，无需重置。您可以直接发送"今日图片"获取。`;
           } else if ((userPwdRecord.reset_count || 0) >= resetLimit) {
             replyContent = `⚠️ 您在 ${queryDate} 的重置次数已用完（仅限${resetLimit}次）。如有疑问请联系客服。`;
           } else {
             const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
             const newExpiresAt = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
             newExpiresAt.setDate(newExpiresAt.getDate() + 1);
             newExpiresAt.setHours(23, 59, 59, 999);
             
             const { error: updateError } = await supabaseClient
               .from('daily_gallery_user_passwords')
               .update({
                 password: newPassword,
                 locked_browser_id: null,
                 reset_count: (userPwdRecord.reset_count || 0) + 1,
                 expires_at: newExpiresAt.toISOString()
               })
               .eq('id', userPwdRecord.id);

             if (updateError) {
               console.error("[WechatCallback] Failed to reset user password via scan:", updateError);
               replyContent = "⚠️ 重置失败，请稍后再试 😅";
             } else {
               // 同步更新到 daily_gallery_special_passwords
               await supabaseClient
                 .from('daily_gallery_special_passwords')
                 .upsert({
                   creator_id: FromUserName,
                   target_date: queryDate,
                   password: newPassword,
                   expires_at: newExpiresAt.toISOString(),
                   source: 'wechat',
                   password_type: 'periodic_single_user',
                   browser_id: null,
                   max_usages: 999
                 }, { onConflict: 'creator_id,target_date,source' });

               const { data: domainConfig } = await supabaseClient
                 .from('domain_configs')
                 .select('domain_url')
                 .eq('is_active', true)
                 .limit(1)
                 .maybeSingle();
               const baseUrl = (domainConfig?.domain_url || 'https://app-b5vwlh6eky69.appmiaoda.com/').replace(/\/$/, '');
               const encryptedOpenId = encodeOpenId(FromUserName);
               const accessUrl = `${baseUrl}/daily-gallery?date=${queryDate}&openid=${encryptedOpenId}&p=${newPassword}`;
               
               replyContent = `✅ 重置成功！【${queryDate}】图集原有锁定已解除。\n\n🔑 新专属密码：${newPassword}\n🔗 <a href="${accessUrl}">点击快速访问</a>\n\n💡 提示：新密码将再次锁定至首个打开它的浏览器。`;
               console.log(`[WechatCallback] User password reset successfully via scan: ${FromUserName}, date: ${queryDate}, newPwd: ${newPassword}`);
             }
           }
        }

        // --- 处理关注 / 二次关注统计逻辑 ---
        // 识别二次关注
        const { data: existingUser } = await supabaseClient
          .from('wechat_users')
          .select('*')
          .eq('config_id', configId)
          .eq('openid', FromUserName)
          .maybeSingle();

        let subscribeCount = 1;
        if (existingUser) {
          subscribeCount = (existingUser.unsubscribe_count || 0) + 1;
          // 更新关注状态
          await supabaseClient
            .from('wechat_users')
            .update({ 
              subscribe_status: true, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', existingUser.id);
          
          console.log(`[WechatCallback] User re-subscribed: ${FromUserName}, count: ${subscribeCount}`);
        } else {
          // 新关注用户
          await supabaseClient
            .from('wechat_users')
            .insert({
              config_id: configId,
              openid: FromUserName,
              subscribe_status: true,
              created_at: new Date().toISOString()
            });
        }

        if (!replyContent) {
          const { data: replies } = await supabaseClient
            .from('wechat_replies')
            .select('*')
            .eq('config_id', configId)
            .in('type', ['follow', 'refollow'])
            .eq('is_active', true);
          
          const followReply = replies?.find(r => r.type === 'follow')?.reply_content;
          const refollowReply = replies?.find(r => r.type === 'refollow')?.reply_content;

          if (subscribeCount > 1 && refollowReply) {
            replyContent = refollowReply.replace('{{count}}', subscribeCount.toString());
          } else if (followReply) {
            replyContent = followReply;
          } else {
            replyContent = '欢迎关注！';
          }
        }
      }

      // 核心处理函数：优先进行数据库关键词匹配
      if (MsgType === 'text' && Content && !replyContent) {
        const keywordReply = await handleKeyword(supabaseClient, configId, FromUserName, Content, 'wechat');
        if (keywordReply) {
          replyContent = keywordReply;
          console.log(`[WechatCallback] Matched dynamic keyword: "${Content}" -> "${replyContent}"`);
        }
      }

      // 处理文本消息关键词逻辑 (兜底原有的硬编码逻辑)
      if (MsgType === 'text' && Content && !replyContent) {
        const content = Content.trim();
        const contentLower = content.toLowerCase();
        
        // 1. 处理重置看图密码 (默认重置今日或最近一次)
        if (content === '重置看图密码') {
          console.log(`[WechatCallback] Global reset command: user=${FromUserName}`);
          // 查找该用户最近的一条密码记录
          const { data: latestRecord } = await supabaseClient
            .from('daily_gallery_user_passwords')
            .select('*')
            .eq('openid', FromUserName)
            .order('post_date', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          if (!latestRecord) {
            replyContent = '⚠️ 您还没有获取过任何图集密码，无需重置。您可以发送"今日图片"获取。';
          } else {
            // 执行重置逻辑 (复用之前的逻辑)
            const queryDate = latestRecord.post_date;
            // 允许重置
            if ((latestRecord.reset_count || 0) >= resetLimit) {
              replyContent = `⚠️ 您在 ${queryDate} 的重置次数已用完（仅限${resetLimit}次）。如有疑问请联系客服。`;
            } else {
              const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
              const newExpiresAt = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
              newExpiresAt.setDate(newExpiresAt.getDate() + 1);
              newExpiresAt.setHours(23, 59, 59, 999);
              
              const { error: updateError } = await supabaseClient
                .from('daily_gallery_user_passwords')
                .update({
                  password: newPassword,
                  locked_browser_id: null,
                  reset_count: (latestRecord.reset_count || 0) + 1,
                  expires_at: newExpiresAt.toISOString()
                })
                .eq('id', latestRecord.id);

              if (updateError) {
                console.error("[WechatCallback] Failed to reset user password:", updateError);
                replyContent = "⚠️ 重置失败，请稍后再试 😅";
              } else {
                // 同步更新到 daily_gallery_special_passwords
                await supabaseClient
                  .from('daily_gallery_special_passwords')
                  .upsert({
                    creator_id: FromUserName,
                    target_date: queryDate,
                    password: newPassword,
                    expires_at: newExpiresAt.toISOString(),
                    source: 'wechat',
                    password_type: 'periodic_single_user',
                    browser_id: null,
                    max_usages: 999,
                    is_one_time: false
                  }, { onConflict: 'creator_id,target_date,source' });

                const configValue = galleryConfig?.value || {};
                const redirectDomain = configValue.wechat_redirect_domain;
                const includePasswordInReply = configValue.wechat_reply_include_password !== false;

                let baseUrl = (redirectDomain || 'https://app-b5vwlh6eky69.appmiaoda.com/').replace(/\/$/, '');
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

                const encryptedOpenId = encodeOpenId(FromUserName);
                const accessUrl = `${baseUrl}/daily-gallery?date=${queryDate}&openid=${encryptedOpenId}&p=${newPassword}`;
                
                replyContent = `✅ 重置成功！【${queryDate}】图集原有锁定已解除。\n\n${includePasswordInReply ? `🔑 新专属密码：${newPassword}\n` : ''}🔗 <a href="${accessUrl}">点击快速访问</a>\n\n💡 提示：新密码将再次锁定至首个打开它的浏览器。`;
                console.log(`[WechatCallback] User password reset successfully: ${FromUserName}, date: ${queryDate}, newPwd: ${newPassword}`);
              }
            }
          }
        }
        
        // 2. 原有的重置日期关键词逻辑
        const resetMatch = content.match(/^(?:重置|cz)(\d{4,8})?$/i);
        if (resetMatch && !replyContent) {
          let queryDate = '';
          if (resetMatch[1]) {
            const dateStr = resetMatch[1];
            if (dateStr.length === 8) {
              queryDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
            } else if (dateStr.length === 4) {
              const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
              queryDate = `${now.getUTCFullYear()}-${dateStr.slice(0, 2)}-${dateStr.slice(2, 4)}`;
            }
          } else {
            queryDate = new Date(new Date().getTime() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
          }

          if (queryDate) {
            console.log(`[WechatCallback] Text reset command: date=${queryDate}, user=${FromUserName}`);
            const { data: userPwdRecord } = await supabaseClient
              .from('daily_gallery_user_passwords')
              .select('*')
              .eq('openid', FromUserName)
              .eq('post_date', queryDate)
              .maybeSingle();

            if (!userPwdRecord) {
              replyContent = `⚠️ 未找到您在 ${queryDate} 的密码记录。`;
            } else if ((userPwdRecord.reset_count || 0) >= resetLimit) {
              replyContent = `⚠️ 您在 ${queryDate} 的重置次数已用完（仅限${resetLimit}次）。`;
            } else {
              const newPassword = Math.floor(100000 + Math.random() * 900000).toString();
              const newExpiresAt = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
              newExpiresAt.setDate(newExpiresAt.getDate() + 1);
              newExpiresAt.setHours(23, 59, 59, 999);
              
              await supabaseClient
                .from('daily_gallery_user_passwords')
                .update({
                  password: newPassword,
                  locked_browser_id: null,
                  reset_count: (userPwdRecord.reset_count || 0) + 1,
                  expires_at: newExpiresAt.toISOString()
                })
                .eq('id', userPwdRecord.id);

              // 同步更新到 daily_gallery_special_passwords
              await supabaseClient
                .from('daily_gallery_special_passwords')
                .upsert({
                  creator_id: FromUserName,
                  target_date: queryDate,
                  password: newPassword,
                  expires_at: newExpiresAt.toISOString(),
                  source: 'wechat',
                  password_type: 'periodic_single_user',
                  browser_id: null,
                  max_usages: 999
                }, { onConflict: 'creator_id,target_date,source' });

              const { data: domainConfig } = await supabaseClient
                .from('domain_configs')
                .select('domain_url')
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
              const baseUrl = (domainConfig?.domain_url || 'https://app-b5vwlh6eky69.appmiaoda.com/').replace(/\/$/, '');
              const encryptedOpenId = encodeOpenId(FromUserName);
              const accessUrl = `${baseUrl}/daily-gallery?date=${queryDate}&openid=${encryptedOpenId}&p=${newPassword}`;
              
              replyContent = `✅ 重置成功！原有锁定已解除。\n\n🔑 新专属密码：${newPassword}\n🔗 <a href="${accessUrl}">点击快速访问</a>`;
            }
          }
        }
      }

      // 处理取消关注事件
      if (MsgType === 'event' && Event === 'unsubscribe') {
        const { data: existingUser } = await supabaseClient
          .from('wechat_users')
          .select('*')
          .eq('config_id', configId)
          .eq('openid', FromUserName)
          .maybeSingle();

        if (existingUser) {
          await supabaseClient
            .from('wechat_users')
            .update({ 
              subscribe_status: false,
              unsubscribe_count: (existingUser.unsubscribe_count || 0) + 1,
              last_unsubscribe_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUser.id);
          
          console.log(`[WechatCallback] User unsubscribed: ${FromUserName}`);
        }

        // 如果开启了取关提醒，记录到交互消息中
        if (config.unsubscribe_notif_enabled) {
          await supabaseClient
            .from('wechat_messages')
            .insert({
              config_id: configId,
              from_user: FromUserName,
              to_user: ToUserName,
              msg_type: 'event',
              event: 'unsubscribe',
              content: '用户取消关注',
              created_at: new Date().toISOString()
            });
        }
        
        // 取消关注不需要回复
        return new Response('success', { status: 200 });
      }

      
      // 2. 处理文本消息 (关键词匹配) - 优化后的消息分发机制
      if (MsgType === "text") {
        const userMsg = Content?.trim() || "";
        const userMsgLower = userMsg.toLowerCase();
        
        console.log(`[WechatCallback] Processing text message: "${userMsg}" (lowercase: "${userMsgLower}")`);
        
        // === 消息分发机制：按优先级处理关键词 ===
        
        // 1️⃣ 登录/绑定逻辑（高优先级，允许已绑定用户重新获取验证码）
        const loginKeywords = ["登录", "登陆", "dl", "绑定", "bind", "验证码"];
        if (loginKeywords.includes(userMsgLower)) {
          console.log("[WechatCallback] Matched keyword: LOGIN (Prioritized)");
          
          // 获取微信用户信息和域名配置（并行化提高速度）
          const [wechatUserRes, domainConfigRes] = await Promise.all([
            supabaseClient
              .from("wechat_users")
              .select("user_id")
              .eq("config_id", configId)
              .eq("openid", FromUserName)
              .maybeSingle(),
            supabaseClient
              .from("domain_configs")
              .select("domain_url, identifier")
              .eq("is_active", true)
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle()
          ]);

          const wechatUser = wechatUserRes.data;
          const domainConfig = domainConfigRes.data;

          console.log(`[WechatCallback] Wechat user binding status: ${wechatUser ? (wechatUser.user_id ? "BOUND" : "NOT_BOUND") : "NOT_FOUND"}`);

          // 生成登录码
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          const siteUrl = domainConfig?.domain_url || "https://app-b5vwlh6eky69-vitesandbox.miaoda.cn";

          // 插入绑定请求记录
          const { error: bindingCodeError } = await supabaseClient
            .from("wechat_binding_requests")
            .insert({
              config_id: configId,
              openid: FromUserName,
              code,
              type: "wechat_to_user",
              site_url: siteUrl,
              domain_identifier: domainConfig?.identifier || "default",
              expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
            });

          if (bindingCodeError) {
            console.error("[WechatCallback] Create login code error:", bindingCodeError);
            replyContent = "生成登录码暂时遇到点问题，请稍后再试 😅";
          } else {
            const bindUrl = `${siteUrl}/login?bind_code=${code}&config_id=${configId}`;
            const bindingReminder = wechatUser?.user_id ? "⚠️ 您已绑定账号，此码可用于其他设备快捷登录：\n\n" : "";
            replyContent = `${bindingReminder}您的登录验证码为：${code}\n请在 10 分钟内完成登录。\n\n[方式1] 在 H5 的"登录/注册"中输入此验证码。\n\n[方式2] <a href="${bindUrl}">点击此处直接登录</a>`;
            console.log(`[WechatCallback] Login code generated: ${code}`);
          }
        }

        // 2️⃣ 帮助/指令
        const helpKeywords = ["帮助", "help", "?", "指令", "菜单"];
        if (!replyContent && helpKeywords.includes(userMsgLower)) {
          console.log("[WechatCallback] Matched keyword: HELP");
          replyContent = `💡 常用指令指南：\n\n1️⃣ 发送"今日图片"或"每日图片"：获取当日图集访问密码及链接。\n2️⃣ 直接回复日期（如：0312、3月12日）：查询往期历史图集内容。\n3️⃣ 发送"登录"或"dl"：获取 6 位验证码，用于 H5 端登录或绑定账号。\n4️⃣ 发送"签到"或"qd"：每日签到领取奖励。\n5️⃣ 发送"查询"或"info"：查询您的等级、积分及账户状态。\n6️⃣ 发送"帮助"：再次查看此指令列表。\n\n提示：回复内容不区分大小写。`;
        }

        // 3️⃣ 签到逻辑
        const checkinKeywords = ["签到", "qd", "checkin"];
        if (!replyContent && checkinKeywords.includes(userMsgLower)) {
          console.log("[WechatCallback] Matched keyword: CHECKIN");

          // 获取全局配置
          const { data: checkInSettingsData } = await supabaseClient
            .from("system_configs")
            .select("value")
            .eq("key", "check_in_settings")
            .maybeSingle();
          const checkInSettings = checkInSettingsData?.value || {};

          // 检查微信签到是否开启
          if (checkInSettings.wechat_checkin_enabled === false) {
            replyContent = "⚠️ 微信公众号签到功能已关闭，请前往 H5 页面进行签到。";
          } else {
            // 获取北京时间
            const beijingNow = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
            const today = beijingNow.toISOString().split("T")[0];
            const currentTime = beijingNow.toISOString().split("T")[1].substring(0, 5); // HH:mm

            // 检查签到时间限制
            if (checkInSettings.checkin_start_time && currentTime < checkInSettings.checkin_start_time) {
              replyContent = `⏰ 签到尚未开启，开启时间: ${checkInSettings.checkin_start_time}`;
            } else if (checkInSettings.checkin_end_time && currentTime > checkInSettings.checkin_end_time) {
              replyContent = `⏰ 签到已结束，截止时间: ${checkInSettings.checkin_end_time}`;
            } else {
              // 获取/创建用户信息
              let { data: wechatUser } = await supabaseClient
                .from("wechat_users")
                .select("*")
                .eq("config_id", configId)
                .eq("openid", FromUserName)
                .maybeSingle();

              if (!wechatUser) {
                // 如果用户不存在，尝试创建（首次互动）
                const { data: newUser, error: createError } = await supabaseClient
                  .from("wechat_users")
                  .insert({
                    config_id: configId,
                    openid: FromUserName,
                    nickname: "微信用户",
                    created_at: new Date().toISOString()
                  })
                  .select()
                  .maybeSingle();
                
                if (!createError && newUser) {
                  wechatUser = newUser;
                } else {
                  console.error("[WechatCallback] Create wechat user error:", createError);
                }
              }

              // 检查今日是否已签到
              let alreadyCheckedIn = false;
              
              // 1. 检查 wechat_checkins 表
              if (FromUserName && today) {
                const { data: existingWechatCheckin } = await supabaseClient
                  .from("wechat_checkins")
                  .select("id")
                  .eq("openid", FromUserName)
                  .eq("checkin_date", today)
                  .maybeSingle();
                if (existingWechatCheckin?.id) {
                  console.log(`[WechatCallback] Found existing wechat checkin for openid: ${FromUserName} on ${today}`);
                  alreadyCheckedIn = true;
                }
              }

              // 2. 如果绑定了用户，检查主 check_ins 表
              if (!alreadyCheckedIn && wechatUser?.user_id && today) {
                const { data: existingUserCheckin } = await supabaseClient
                  .from("check_ins")
                  .select("id")
                  .eq("user_id", wechatUser.user_id)
                  .eq("check_in_date", today)
                  .maybeSingle();
                if (existingUserCheckin?.id) {
                  console.log(`[WechatCallback] Found existing user checkin for user_id: ${wechatUser.user_id} on ${today}`);
                  alreadyCheckedIn = true;
                }
              }

              if (alreadyCheckedIn) {
                console.log("[WechatCallback] User already checked in today");
                replyContent = "🌟 您今天已经签到过了，明天再来吧！";
              } else if (wechatUser) {
                // 计算连续天数
                const yesterdayStr = new Date(new Date(today).getTime() - 86400000).toISOString().split("T")[0];
                
                // 注意：last_checkin_at 是时间戳，需要转为北京日期字符串比较
                let lastCheckinStr = "";
                if (wechatUser.last_checkin_at) {
                  const lastCheckinDate = new Date(new Date(wechatUser.last_checkin_at).getTime() + 8 * 60 * 60 * 1000);
                  lastCheckinStr = lastCheckinDate.toISOString().split("T")[0];
                }
                
                const newContinuous = (lastCheckinStr === yesterdayStr) ? (wechatUser.continuous_checkin_days || 0) + 1 : 1;
                  
                  // 查询签到奖励配置
                  const { data: configs } = await supabaseClient
                    .from("signin_configs")
                    .select("*")
                    .eq("is_active", true)
                    .order("day_number", { ascending: false });
                  
                  let rule = configs?.find(c => c.day_number === newContinuous);
                  if (!rule) rule = configs?.find(c => c.day_number === 1);
                  
                  if (rule || checkInSettings.wechat_checkin_separate_reward) {
                    let earned_points = 0;
                    let earned_exp = 0;
                    let bonusStr = "";

                    if (checkInSettings.wechat_checkin_separate_reward) {
                      earned_points = checkInSettings.wechat_points || 0;
                      earned_exp = checkInSettings.wechat_exp || 0;
                    } else if (rule) {
                      const minP = rule.min_points || 0;
                      const maxP = rule.max_points || minP;
                      earned_points = Math.floor(Math.random() * (maxP - minP + 1)) + minP;
                      earned_exp = rule.exp_reward || 0;
                      bonusStr = (rule.is_bonus && rule.bonus_note) ? `\n\n🎉 连签大礼：${rule.bonus_note}` : "";
                    }
                    
                    // 更新签到记录
                    await supabaseClient.from("wechat_checkins").insert({
                      config_id: configId,
                      openid: FromUserName,
                      checkin_date: today,
                      points_earned: earned_points
                    });
                    
                    // 更新用户信息
                    await supabaseClient
                      .from("wechat_users")
                      .update({
                        last_checkin_at: new Date().toISOString(),
                        checkin_count: (wechatUser.checkin_count || 0) + 1,
                        continuous_checkin_days: newContinuous,
                        updated_at: new Date().toISOString()
                      })
                      .eq("id", wechatUser.id);
                    
                    // 如果绑定了用户，发放积分和经验
                    if (wechatUser.user_id) {
                      await supabaseClient.rpc("add_user_points", { 
                        p_user_id: wechatUser.user_id, 
                        p_amount: earned_points,
                        p_type: "income",
                        p_reason: `微信签到奖励 (Day ${newContinuous})`
                      }).catch(() => null);
                      
                      await supabaseClient.rpc("add_user_exp", { 
                        p_user_id: wechatUser.user_id, 
                        p_amount: earned_exp,
                        p_reason: `微信签到奖励 (Day ${newContinuous})`
                      }).catch(() => null);
                    }
                    
                    replyContent = `✅ 签到成功！\n\n奖励积分：+${earned_points}\n成长经验：+${earned_exp}\n连续签到：${newContinuous} 天${bonusStr}\n\n提示：回复"查询"查看个人信息。`;
                    console.log(`[WechatCallback] Checkin successful: ${newContinuous} days, ${earned_points} points`);
                  } else {
                    console.log("[WechatCallback] Checkin config not found");
                    replyContent = "❌ 签到奖励未配置，请联系管理员。";
                  }
                } else {
                  console.log("[WechatCallback] Wechat user not found for checkin");
                  replyContent = "❌ 无法获取您的签到信息，请稍后再试。";
                }
              }
            }
          }

        // 3️⃣ 查询个人信息
        const queryKeywords = ["查询", "info", "积分", "等级"];
        if (!replyContent && queryKeywords.includes(userMsgLower)) {
          console.log("[WechatCallback] Matched keyword: QUERY");
          
          // 尝试自动创建用户
          await autoCreateUser(supabaseClient, FromUserName, 'wechat_openid', 'query_auto');

          // 直接从 profiles 查找关联账户
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('username, points, exp, digital_id, created_at, rank')
            .or(`mp_openid.eq."${FromUserName}",wechat_openid.eq."${FromUserName}"`)
            .maybeSingle();

          if (profile) {
            replyContent = `👤 个人信息查询：\n\n用户名：${profile.username}\n靓号：${profile.digital_id || "暂无"}\n当前等级：${profile.rank || "初级赏析员"}\n当前积分：${profile.points || 0} pts\n累计经验：${profile.exp || 0} exp\n注册时间：${new Date(profile.created_at).toLocaleDateString('zh-CN')}\n\n提示：回复"今日图片"获取每日更新密码。`;
            console.log("[WechatCallback] Query successful for profile");
          } else {
            // 兜底重试
            const { data: profileRetry } = await supabaseClient
              .from('profiles')
              .select('username, points, exp, digital_id, created_at, rank')
              .eq('wechat_openid', FromUserName)
              .maybeSingle();
            
            if (profileRetry) {
              replyContent = `👤 个人信息查询：\n\n用户名：${profileRetry.username}\n靓号：${profileRetry.digital_id || "暂无"}\n当前等级：${profileRetry.rank || "初级赏析员"}\n当前积分：${profileRetry.points || 0} pts\n累计经验：${profileRetry.exp || 0} exp\n注册时间：${new Date(profileRetry.created_at).toLocaleDateString('zh-CN')}\n\n提示：回复"今日图片"获取每日更新密码。`;
            } else {
              replyContent = "❌ 未能获取到您的账户信息，请发送\"今日\"重试。";
              console.log("[WechatCallback] User not found in profiles after auto-creation");
            }
          }
        }
        
        // 5️⃣ 用户发送 6 位数字验证码（H5 端生成，用于绑定）
        if (!replyContent && /^\d{6}$/.test(userMsg)) {
          console.log(`[WechatCallback] Received 6-digit code: ${userMsg}`);
          const { data: bindingReq } = await supabaseClient
            .from("wechat_binding_requests")
            .select("*")
            .eq("code", userMsg)
            .eq("type", "user_to_wechat")
            .gt("expires_at", new Date().toISOString())
            .maybeSingle();

          if (bindingReq) {
            console.log("[WechatCallback] Found valid binding request");
            
            // 1. 查找当前微信 OpenID 是否已关联了其他 Profile (例如自动创建的)
            const { data: linkedProfiles } = await supabaseClient
              .from('profiles')
              .select('*')
              .or(`wechat_openid.eq.${FromUserName},mp_openid.eq.${FromUserName}`);
            
            const autoCreatedProfile = linkedProfiles?.find(p => p.id !== bindingReq.user_id);
            const targetProfileId = bindingReq.user_id;

            if (autoCreatedProfile) {
              console.log(`[WechatCallback] Merging auto-created account ${autoCreatedProfile.id} into target ${targetProfileId}`);
              
              // 获取目标账户当前数据
              const { data: targetProfile } = await supabaseClient
                .from('profiles')
                .select('id, points, exp')
                .eq('id', targetProfileId)
                .maybeSingle();
              
              // 合并积分和经验
              const newPoints = (targetProfile?.points || 0) + (autoCreatedProfile.points || 0);
              const newExp = (targetProfile?.exp || 0) + (autoCreatedProfile.exp || 0);

              // 更新目标账户的 OpenID、积分和经验
              await supabaseClient
                .from('profiles')
                .update({
                  wechat_openid: FromUserName,
                  points: newPoints,
                  exp: newExp,
                  updated_at: new Date().toISOString()
                })
                .eq('id', targetProfileId);

              // 删除原自动创建的 Profile
              await supabaseClient.from('profiles').delete().eq('id', autoCreatedProfile.id);
              // 尝试删除 Auth 用户 (异步)
              supabaseClient.functions.invoke('delete-user', { body: { userId: autoCreatedProfile.id } }).catch(() => {});
              
              console.log(`[WechatCallback] Merge complete: newPoints=${newPoints}, newExp=${newExp}`);
            } else {
              // 正常绑定：更新目标账户的 OpenID
              await supabaseClient
                .from('profiles')
                .update({
                  wechat_openid: FromUserName,
                  updated_at: new Date().toISOString()
                })
                .eq('id', targetProfileId);
              console.log(`[WechatCallback] Normal binding complete for ${targetProfileId}`);
            }

            // 2. 维护 wechat_users 表 (用于同步积分等微信侧展示逻辑)
            const { data: wechatUser } = await supabaseClient
              .from("wechat_users")
              .select("id")
              .eq("config_id", configId)
              .eq("openid", FromUserName)
              .maybeSingle();

            if (wechatUser) {
              await supabaseClient
                .from("wechat_users")
                .update({ user_id: targetProfileId, updated_at: new Date().toISOString() })
                .eq("id", wechatUser.id);
            } else {
              await supabaseClient
                .from("wechat_users")
                .insert({
                  config_id: configId,
                  openid: FromUserName,
                  user_id: targetProfileId,
                  subscribe_status: true,
                  updated_at: new Date().toISOString()
                });
            }

            // 3. 删除该绑定请求
            await supabaseClient.from("wechat_binding_requests").delete().eq("id", bindingReq.id);
            replyContent = "🎉 绑定成功！您的微信已成功关联至平台账号，且历史数据已自动合并。";
            console.log("[WechatCallback] Binding and merge process successful");
          } else {
            console.log("[WechatCallback] Invalid or expired binding code");
          }
        }
        
        // 6️⃣ 每日图集密码获取（已迁移至 handleKeyword 处理）
        if (!replyContent) {
           // ... 原有的硬编码逻辑已删除，改为依赖顶部的 handleKeyword
        }
        // 7️⃣ 自定义关键词回复（兜底逻辑）
        if (!replyContent) {
          console.log("[WechatCallback] No keyword matched, checking custom replies");
          const { data: allReplies } = await supabaseClient
            .from("wechat_replies")
            .select("type, match_type, keyword, reply_content")
            .eq("config_id", configId)
            .eq("is_active", true);

          if (allReplies && allReplies.length > 0) {
            // 精确匹配
            const exact = allReplies.find(r => r.type === "keyword" && r.match_type === "exact" && r.keyword === userMsg);
            if (exact) {
              replyContent = exact.reply_content;
              console.log("[WechatCallback] Matched exact keyword reply");
            } 
            // 模糊匹配
            else {
              const fuzzy = allReplies.find(r => r.type === "keyword" && r.match_type === "fuzzy" && userMsg.includes(r.keyword || ""));
              if (fuzzy) {
                replyContent = fuzzy.reply_content;
                console.log("[WechatCallback] Matched fuzzy keyword reply");
              }
              // 自动回复
              else {
                const auto = allReplies.find(r => r.type === "auto");
                if (auto) {
                  replyContent = auto.reply_content;
                  console.log("[WechatCallback] Using auto reply");
                }
              }
            }
          }
        }
      }

      // 处理点击菜单事件 (click)
      if (MsgType === 'event' && Event === 'CLICK' && EventKey) {
        // EventKey 就是我们在菜单配置里填写的 key，通常我们把它当作关键词处理
        const { data: keyMatch } = await supabaseClient
          .from('wechat_replies')
          .select('reply_content')
          .eq('config_id', configId)
          .eq('type', 'keyword')
          .eq('keyword', EventKey)
          .eq('is_active', true)
          .maybeSingle();
        
        replyContent = keyMatch?.reply_content || '';
      }

      // 保存消息记录
      const { error: insertError2 } = await supabaseClient.from('wechat_messages').insert({
        config_id: configId,
        msg_id: MsgId || null,
        from_user: FromUserName || null,
        to_user: ToUserName || null,
        msg_type: MsgType || 'unknown',
        content: Content || null,
        event: Event || null,
        event_key: EventKey || null,
        reply_content: replyContent || null,
        raw_xml: finalRawXml, // 使用解密后的 XML
      });

      if (insertError2) {
        console.error('[WechatCallback] Insert message error:', insertError2);
      } else {
        console.log('[WechatCallback] Message saved to database');
      }

      if (replyContent) {
        // 重要：确保返回给微信的 XML 格式严格正确，且响应编码正确
        const responseXml = generateTextMessage(FromUserName, ToUserName, replyContent);
        console.log(`[WechatCallback] Replying with XML: ${responseXml}`);
        
        return new Response(responseXml, {
          status: 200,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' }
        });
      }

      return new Response('success', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    const err = error as Error;
    console.error('[Wechat-Callback Error]:', err.message);
    return new Response('error', { status: 500 });
  }
}
Deno.serve(handler);
