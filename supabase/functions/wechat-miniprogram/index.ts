import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { corsHeaders } from "../_shared/cors.ts";
import { handleKeyword } from "../_shared/wechat_logic.ts";
import { redisUtils } from "../_shared/redis.ts";

// 辅助函数：计算签名
async function calcSignature(token: string, timestamp: string, nonce: string) {
  const arr = [token, timestamp, nonce].sort();
  const str = arr.join("");
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// 辅助函数：生成校验码 (基于 ID 和密钥)
async function generateCheckCode(id: string) {
  const secret = Deno.env.get("MP_CHECK_SECRET") || "miaoda_mp_secret_default";
  const encoder = new TextEncoder();
  const data = encoder.encode(id + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 6); // 统一为 6 位
}

// 辅助函数：标准化日期 ID (去除前缀后缀，统一为 YYYY-MM-DD)
function normalizeDailyId(id: string) {
  if (!id) return id;
  // 去除前缀和后缀
  let clean = id.toString().replace(/daily_gallery_/g, '').split('_')[0];
  // 检查是否为 8 位数字开头的格式 (可能是 20260321 或 20260321ABCD)
  // 如果已经包含连字符则视为已标准化
  if (/^\d{8}/.test(clean) && !clean.includes('-')) {
    const datePart = clean.slice(0, 8);
    return `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
  }
  return clean;
}


// 辅助函数：获取客户端 IP
function getClientIp(req: Request) {
  // Supabase Edge Functions 运行在 Deno 中，真实 IP 通常在 x-forwarded-for
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    // x-forwarded-for 可能包含多个 IP，第一个通常是客户端真实 IP
    return xForwardedFor.split(',')[0].trim();
  }
  return req.headers.get("cf-connecting-ip") || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  console.log(`[WechatMP] Request received at ${new Date().toISOString()}, version: 10.0.61`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 微信服务器验证 (GET)
  if (req.method === "GET") {
    const signature = url.searchParams.get("signature");
    const timestamp = url.searchParams.get("timestamp");
    const nonce = url.searchParams.get("nonce");
    const echostr = url.searchParams.get("echostr");
    const configId = url.searchParams.get("config_id");

    if (!echostr || !signature || !timestamp || !nonce) {
      return new Response("Missing parameters", { status: 400 });
    }

    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      let query = supabaseClient.from("miniprogram_configs").select("token");
      if (configId) {
        query = query.eq("id", configId);
      }
      const { data: config } = await query.maybeSingle();

      if (!config?.token) {
        console.error("[WechatMP] Token not configured");
        return new Response("Token not configured", { status: 400 });
      }

      const calculated = await calcSignature(config.token, timestamp, nonce);
      if (calculated === signature) {
        console.log("[WechatMP] Verification success");
        return new Response(echostr);
      } else {
        console.error("[WechatMP] Verification failed");
        return new Response("Verification failed", { status: 403 });
      }
    } catch (e) {
      console.error("[WechatMP] GET Error:", e.message);
      return new Response(e.message, { status: 500 });
    }
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let body;
    const contentType = req.headers.get("content-type");

    // 处理微信推送消息 (POST)
    if (contentType?.includes("application/json") || contentType?.includes("text/xml")) {
      const rawBody = await req.text();
      try {
        body = JSON.parse(rawBody);
      } catch (e) {
        // 如果不是 JSON，尝试作为普通请求处理或忽略
        console.log("[WechatMP] Not a JSON body, raw:", rawBody.slice(0, 100));
        body = { raw: rawBody };
      }

      // 如果是微信事件推送
      if (body.ToUserName && body.FromUserName && body.MsgType === "event") {
        console.log(`[WechatMP] Received event: ${body.Event} from ${body.FromUserName}`);

        // 这里的处理逻辑可以根据业务扩展
        // 1. 登录事件
        // 2. 广告完播事件 (如果有微信官方回调支持)
        // 3. 其他客服消息等

        return new Response("success");
      }

      // 如果是微信文本消息推送 (客服消息)
      if (body.ToUserName && body.FromUserName && body.MsgType === "text" && body.Content) {
        console.log(`[WechatMP] Received text message: "${body.Content}" from ${body.FromUserName}`);
        
        // 我们通过客服消息接口回复用户
        const keywordReply = await handleKeyword(supabaseClient, "", body.FromUserName, body.Content, 'miniprogram');
        if (keywordReply) {
          console.log(`[WechatMP] Matched keyword: ${body.Content} -> ${keywordReply}`);
          // 实际发送客服消息的代码 (需要 Access Token)
          // 这里我们假设 keywordReply 包含了要回复的内容
          // 由于发送客服消息需要异步调用微信 API，我们在这里简单记录
        }
        
        return new Response("success");
      }
    } else {
      try {
        body = await req.json();
      } catch (e) {
        console.error("[WechatMP] JSON Parse Error:", e.message);
        throw new Error("Invalid JSON body");
      }
    }

    const { action, itemId, type, openid, userId, browserId, domain } = body;

    console.log(`[WechatMP] Request action: ${action}, itemId: ${itemId}, domain: ${domain}`);

    if (action === "generate_qr") {
      console.log(`[WechatMP] Entering generate_qr. Type: ${type}, itemId: ${itemId}, domain: ${domain}, bindUserId: ${body.bindUserId}`);
      console.log(`[WechatMP] Project URL: ${Deno.env.get("SUPABASE_URL")}`);
      // itemId 对于登录和绑定是可选的
      if (!itemId && type !== 'login' && !body.bindUserId) {
        console.error("[WechatMP] generate_qr error: Missing itemId and not login/bind");
        throw new Error("Missing itemId");
      }

      // 获取小程序配置
      console.log("[WechatMP] Fetching miniprogram config...");
      const { data: config, error: configError } = await supabaseClient
        .from("miniprogram_configs")
        .select("*")
        .maybeSingle();

      if (configError || !config) {
        console.error("[WechatMP] Config error or not found:", configError?.message);
        throw new Error("Mini Program config not found. Please configure it in the admin panel.");
      }

      // 获取并校验 Access Token 的内部函数
      const getValidAccessToken = async (forceRefresh = false) => {
        const redisKey = `wechat:mp:access_token:${config.id}`;
        
        // 1. 尝试从 Redis 获取
        if (!forceRefresh) {
          const redisToken = await redisUtils.get(redisKey);
          if (redisToken) {
            console.log("[WechatMP] Using Redis cached access token");
            return redisToken;
          }
        }

        let currentToken = config.access_token;
        let expiresAt = config.access_token_expires_at;

        if (forceRefresh || !currentToken || !expiresAt || new Date(expiresAt) < new Date()) {
          console.log(`[WechatMP] Access token ${forceRefresh ? 'force refresh' : 'missing/expired'}, refreshing...`);
          const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.app_id}&secret=${config.app_secret}`;
          const tokenRes = await fetch(tokenUrl);
          const tokenData = await tokenRes.json();

          if (tokenData.errcode) {
            console.error("[WechatMP] Refresh token error:", tokenData.errmsg);
            throw new Error(`Wechat token error: ${tokenData.errmsg}`);
          }

          currentToken = tokenData.access_token;
          const expiresIn = tokenData.expires_in;
          const newExpiresAt = new Date();
          newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (expiresIn - 200));

          await supabaseClient
            .from("miniprogram_configs")
            .update({
              access_token: currentToken,
              access_token_expires_at: newExpiresAt.toISOString(),
            })
            .eq("id", config.id);
          
          // 存入 Redis，提前 5 分钟过期
          await redisUtils.set(redisKey, currentToken, expiresIn - 300);
          
          console.log("[WechatMP] Access token refreshed and saved.");
        } else {
          // 如果数据库里有但 Redis 里没有（Redis 重启等），补齐 Redis 缓存
          const now = new Date();
          const exp = new Date(expiresAt);
          const remainingSeconds = Math.floor((exp.getTime() - now.getTime()) / 1000);
          if (remainingSeconds > 0) {
            await redisUtils.set(redisKey, currentToken, remainingSeconds);
          }
        }
        return currentToken;
      };

      let accessToken = await getValidAccessToken();

      // 生成小程序码
      let scene = '';
      let page = config.task_page_path || "pages/user/renwu";
      
      const cleanDomain = domain ? domain.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
      let mpIdentifier = '';
      
      if (cleanDomain) {
        // 尝试从域名配置表中查找对应的标识符，考虑末尾斜杠兼容性
        const targetDomain = domain.replace(/\/$/, '');
        const { data: allDomains } = await supabaseClient
          .from("domain_configs")
          .select("domain_url, identifier")
          .eq("is_active", true);
        
        const domainConfig = allDomains?.find(d => d.domain_url.replace(/\/$/, '') === targetDomain);
        
        if (domainConfig) {
          mpIdentifier = domainConfig.identifier;
        } else {
          // 如果没找到且 cleanDomain 本身看起来像个标识符（不含 .），则可能前端传的就是标识符
          if (!cleanDomain.includes('.')) {
            mpIdentifier = cleanDomain;
          }
        }
      }

      if (type === 'login' || action === 'mp_login' || body.bindUserId) {
        const ticket = (itemId || '').replace(/-/g, '');
        const bindId = (body.bindUserId || '').replace(/-/g, '');
        
        // 提取主要标识并缩短为 12 位
        const primaryId = (ticket || bindId).slice(0, 12);
        const checkCode = await generateCheckCode(primaryId);
        
        let shortIdentifier = mpIdentifier;
        // 恢复缩写映射逻辑，以防 scene 超出 32 位限制，且保持与小程序端原有逻辑一致
        if (shortIdentifier === 'miaoda') shortIdentifier = 'md-';
        else if (shortIdentifier === 'supabase') shortIdentifier = 'sp-';
        else if (shortIdentifier === 'wo58') shortIdentifier = 'wo-';
        else if (shortIdentifier === '正式版') shortIdentifier = 'main';

        let sceneParts = [];
        sceneParts.push(`c=${checkCode}`); // 校验码放在最前面，确保不被截断
        if (ticket) sceneParts.push(`t=${ticket.slice(0, 12)}`);
        if (bindId) sceneParts.push(`b=${bindId.slice(0, 12)}`);
        if (shortIdentifier) sceneParts.push(`h=${shortIdentifier}`);
        
        scene = sceneParts.join('&').slice(0, 32);
        page = config.login_page_path || "pages/user/wxlogin";
      } else {
        const shortItemId = (itemId || '').replace(/daily_gallery_/g, '').replace(/-/g, '').slice(0, 12);
        // 生成确定性的校验码
        const checkCode = await generateCheckCode(shortItemId);
        // 生成唯一标识符以区分不同用户的扫码请求，解决并发扫码时的识别混乱问题
        const uniqueToken = Math.random().toString(36).slice(2, 6);
        
        let shortIdentifier = mpIdentifier;
        // 激进缩写映射逻辑，以严格控制 scene 在 32 位限制内
        if (shortIdentifier.includes('miaoda') || shortIdentifier.startsWith('md-')) shortIdentifier = 'md';
        else if (shortIdentifier.includes('supabase') || shortIdentifier.startsWith('sp-')) shortIdentifier = 'sp';
        else if (shortIdentifier.includes('wo58') || shortIdentifier.startsWith('wo-') || shortIdentifier.includes('dhso')) shortIdentifier = 'wo';
        else if (shortIdentifier.includes('正式版') || shortIdentifier === 'main') shortIdentifier = 'ma';
        
        const shortCheckCode = checkCode; // 已经在 generateCheckCode 中缩短了
        const tinyToken = Math.random().toString(36).slice(2, 5); // 随机 token 缩短为 3 位
        
        if (shortIdentifier) {
          // 场景格式: c=CHECK&d=ID&h=HOST&s=TOKEN
          // 8 + 1 + 10 + 1 + 3 + 1 + 5 = 29 位 (c=123456&d=20260409&h=md&s=abc)
          scene = `c=${shortCheckCode}&d=${shortItemId}&h=${shortIdentifier}&s=${tinyToken}`.slice(0, 32);
        } else {
          scene = `c=${shortCheckCode}&d=${shortItemId}&s=${tinyToken}`.slice(0, 32);
        }
        // 任务模式默认路径
        page = config.task_page_path || "pages/user/task";
      }
      
      console.log(`[WechatMP] Final scene: ${scene}, page: ${page}`);
      
      // 记录生成小程序码请求流水 (更新为 mp_qr_generation_logs)
      await supabaseClient.from('mp_qr_generation_logs').insert({
        ticket: (type === 'login' || action === 'mp_login') ? itemId : null,
        scene: scene,
        page: page, // 记录页面信息
        log_type: type || (body.bindUserId ? 'bind' : 'task'),
        success: true,
        ip_address: getClientIp(req),
        openid: openid || body.openid || null, // 记录 openid
        user_id: userId || body.userId || null, // 记录 user_id
        details: {
          action: 'generate_qr',
          type: type || (body.bindUserId ? 'bind' : 'task'),
          itemId: itemId,
          bindUserId: body.bindUserId,
          browserId: body.browserId,
          domain: domain,
          timestamp: new Date().toISOString()
        }
      });
      
      const fetchQr = async (token: string, retry = true) => {
        const qrUrl = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${token}`;
        const qrBody = {
          scene: scene,
          page: page,
          width: 430,
          check_path: false,
          env_version: "release"
        };
        
        console.log("[WechatMP] Fetching QR from Wechat API...");
        const qrRes = await fetch(qrUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(qrBody)
        });

        const contentType = qrRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await qrRes.json();
          console.error(`[WechatMP] Wechat API returned error JSON:`, errorData);
          
          // 如果 token 错误且允许重试，则强制刷新并重试一次
          if (errorData.errcode === 40001 && retry) {
            console.log("[WechatMP] Access token invalid (40001), retrying with forced refresh...");
            const newToken = await getValidAccessToken(true);
            return fetchQr(newToken, false);
          }
          
          throw new Error(`Wechat API error (${errorData.errcode}): ${errorData.errmsg}`);
        }

        if (!qrRes.ok) {
          const errorText = await qrRes.text();
          console.error(`[WechatMP] QR Fetch failed with status ${qrRes.status}:`, errorText);
          throw new Error(`Wechat QR fetch failed: ${qrRes.status}`);
        }
        return qrRes;
      };

      const qrRes = await fetchQr(accessToken);

      console.log("[WechatMP] QR fetched successfully. Converting to Base64...");
      const qrBuffer = await qrRes.arrayBuffer();
      const bytes = new Uint8Array(qrBuffer);
      
      // 使用更稳健的 Base64 转换方法，避免大数组解包导致的栈溢出
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i += 1024) {
        binary += String.fromCharCode(...bytes.slice(i, i + 1024));
      }
      const base64 = btoa(binary);
      console.log(`[WechatMP] Base64 conversion complete. Length: ${base64.length}`);

      return new Response(JSON.stringify({ 
        success: true, 
        qr_data: `data:image/png;base64,${base64}`,
        scene: scene,
        page: page
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 获取小程序 OpenID (无感)
    if (action === "get_openid" || action === "mp_login" || action === "mp_bind" || action === "get_login_token" || action === "mp_scan") {
      let { code, bindUserId, ticket, scene, checkCode, hostIdentifier } = body;
      
      // 场景参数解析 (用于支持多端对接)
      if (scene) {
        console.log(`[WechatMP] Parsing scene: ${scene}`);
        // 增加对 URL 编码的兼容处理
        const decodedScene = scene.includes('%') ? decodeURIComponent(scene) : scene;
        decodedScene.split('&').forEach((p: string) => {
          const [k, v] = p.split('=');
          if (k === 't') ticket = v;
          if (k === 'b') bindUserId = v;
          if (k === 'c') checkCode = v;
          if (k === 'h') hostIdentifier = v;
        });
      }

      if (action === "mp_scan") {
        const finalTicket = ticket || body.ticket;
        if (finalTicket) {
          await supabaseClient.from('login_tickets').update({
            status: 'scanned',
            updated_at: new Date().toISOString()
          }).ilike('ticket', `${finalTicket.slice(0, 12)}%`);
          
          // 记录扫码流水
          await supabaseClient.from('mp_login_logs').insert({
            openid: body.openid || 'unknown',
            ticket: finalTicket,
            scene: scene || null,
            ip_address: getClientIp(req),
            log_type: 'mp_scan',
            success: true,
            details: {
              ua: req.headers.get("user-agent"),
              timestamp: new Date().toISOString()
            }
          });
          
          console.log(`[WechatMP] Ticket ${finalTicket} marked as scanned`);
        }
        return new Response(JSON.stringify({ success: true, version: "10.0.61" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[WechatMP] Processed login params: ticket=${ticket}, bindUserId=${bindUserId}, host=${hostIdentifier}`);

      if (!code && action !== "get_login_token") {
        return new Response(JSON.stringify({ error: "Missing code" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: config, error: configError } = await supabaseClient
        .from("miniprogram_configs")
        .select("app_id, app_secret, is_login_enabled, is_mp_login_enabled, is_mp_bind_enabled")
        .single();

      if (configError || !config) {
        return new Response(JSON.stringify({ error: "Mini Program not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let mpOpenid = "";
      if (code) {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.app_id}&secret=${config.app_secret}&js_code=${code}&grant_type=authorization_code`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.errcode) {
          console.error(`[WechatMP] jscode2session error:`, data.errmsg);
          // 记录获取 OpenID 失败
          await supabaseClient.from('mp_login_logs').insert({
            log_type: 'mp_openid_error',
            success: false,
            ip_address: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
            details: {
              errcode: data.errcode,
              errmsg: data.errmsg,
              timestamp: new Date().toISOString()
            }
          });
          return new Response(JSON.stringify({ error: data.errmsg }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        mpOpenid = data.openid;
      }

      // 如果是登录行为 (小程序扫码登录授权)
      if (action === "mp_login") {
        if (!config.is_mp_login_enabled && !bindUserId) {
          return new Response(JSON.stringify({ success: false, message: "小程序登录功能未开启" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // 核心安全验证: 验证校验码 (如果提供了 ticket/bindUserId 和 checkCode)
        if ((ticket || bindUserId) && checkCode) {
          // 统一处理逻辑：去除前缀、去除连字符、截取前12位，确保与生成逻辑一致
          const rawId = (ticket || bindUserId).toString();
          const cleanedId = rawId.replace(/daily_gallery_/g, '').replace(/-/g, '');
          const primaryId = cleanedId.slice(0, 12);
          const expected = await generateCheckCode(primaryId);
          if (expected !== checkCode) {
            console.error(`[WechatMP] Login/Bind checkCode mismatch, expected: ${expected}, got: ${checkCode}, rawId: ${rawId}, primaryId: ${primaryId}`);
            
            // 记录校验码失败
            await supabaseClient.from('mp_login_logs').insert({
              openid: mpOpenid,
              ticket: ticket || null,
              scene: scene || null,
              ip_address: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
              log_type: 'mp_login_check_error',
              success: false,
              details: {
                error: 'Check code mismatch',
                expected: expected,
                got: checkCode,
                timestamp: new Date().toISOString()
              }
            });
            
            return new Response(JSON.stringify({ success: false, message: "校验码验证失败" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // 自动绑定逻辑 (如果提供了 bindUserId 或 ticket 中预存了 user_id)
        let finalBindUserId = bindUserId;
        if (ticket && !finalBindUserId) {
          // 查找票据看是否有预存的 user_id (针对绑定流程)
          const { data: ticketRecord } = await supabaseClient
            .from('login_tickets')
            .select('user_id')
            .ilike('ticket', `${ticket.slice(0, 12)}%`)
            .maybeSingle();
          if (ticketRecord?.user_id) finalBindUserId = ticketRecord.user_id;
        }

        if (finalBindUserId) {
           console.log(`[WechatMP] Auto binding openid ${mpOpenid} to user ${finalBindUserId}`);
           const { error: bindError } = await supabaseClient
             .from("profiles")
             .update({ mp_openid: mpOpenid })
             .eq("id", finalBindUserId);
           
           if (bindError) {
              console.error("[WechatMP] Auto bind error:", bindError.message);
           } else {
              // 绑定成功后，标记票据状态
              if (ticket) {
                 await supabaseClient.from('login_tickets').update({
                   status: 'fulfilled',
                   openid: mpOpenid,
                   user_id: finalBindUserId,
                   fulfilled_at: new Date().toISOString()
                 }).ilike('ticket', `${ticket.slice(0, 12)}%`);
              }
           }
        }

        // 先检查该 OpenID 是否已经绑定了系统账户 (用于前端辅助判断)
        const { data: user } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("mp_openid", mpOpenid)
          .maybeSingle();

      // 记录登录授权流水 (增强日志记录)
      await supabaseClient.from('mp_login_logs').insert({
        openid: mpOpenid,
        user_id: user?.id || null,
        ticket: ticket || null,
        scene: scene || null,
        ip_address: getClientIp(req),
        log_type: bindUserId ? 'mp_bind_auto' : 'mp_login',
        success: true,
        details: {
          body: body,
          user_id: user?.id,
          is_bound: !!user,
          has_ticket: !!ticket,
          has_bind: !!bindUserId,
          timestamp: new Date().toISOString(),
          ua: req.headers.get("user-agent")
        }
      });

        // 更新票据状态，将 openid (和可能的 user_id) 传回 H5 轮询端
        if (ticket && ticket.trim() !== "") {
          let updateData: any = {
            status: 'confirmed',
            openid: mpOpenid,
            fulfilled_at: new Date().toISOString()
          };
          if (user) updateData.user_id = user.id;

          let query = supabaseClient.from('login_tickets').update(updateData);
          
          if (ticket.length < 32) {
            query = query.ilike('ticket', `${ticket}%`);
          } else {
            query = query.eq('ticket', ticket);
          }
          
          const { error: fulfillError } = await query;
          if (fulfillError) {
             console.error("[WechatMP] Fulfill ticket error:", fulfillError.message);
             // 如果绑定已经成功，这里就不强行报错了
          }
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: bindUserId ? "授权绑定成功" : "授权成功，请在网页端继续操作",
          openid: mpOpenid,
          isBound: !!user || !!bindUserId
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 获取登录令牌 (H5 端调用)
      if (action === "get_login_token") {
        const { userId: bodyUserId } = body;
        const finalUserId = bodyUserId || userId;
        if (!finalUserId) throw new Error("Missing userId");

        console.log(`[WechatMP] Generating login token for userId: ${finalUserId}`);

        // 验证用户信息
        const { data: userRecord, error: userError } = await supabaseClient.auth.admin.getUserById(finalUserId);
        if (userError || !userRecord.user) {
          console.error(`[WechatMP] User not found for id: ${finalUserId}`, userError?.message);
          throw new Error("User not found in authentication system");
        }
        
        const email = userRecord.user.email;
        if (!email) {
          console.error(`[WechatMP] User ${finalUserId} has no email`);
          throw new Error("User email not found");
        }

        // 生成登录链接 (Magic Link)
        console.log(`[WechatMP] Generating magiclink for: ${email}`);
        const { data: linkData, error: linkError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
        });

        if (linkError) {
          console.error(`[WechatMP] GenerateLink error:`, linkError.message);
          throw linkError;
        }

        console.log(`[WechatMP] Generated link: ${linkData.properties.action_link.slice(0, 50)}...`);
        const url = new URL(linkData.properties.action_link);
        let token_hash = url.searchParams.get('token_hash');
        
        // 某些版本的 Supabase 可能会将参数名设为 'token'
        if (!token_hash) {
          token_hash = url.searchParams.get('token');
        }

        if (!token_hash) {
          console.error(`[WechatMP] Could not find token_hash or token in generated link: ${linkData.properties.action_link}`);
          // 记录获取令牌失败
          await supabaseClient.from('mp_login_logs').insert({
            user_id: finalUserId,
            log_type: 'h5_login_token_error',
            success: false,
            ip_address: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
            details: {
              action: 'get_login_token',
              error: 'Could not extract token from login link',
              timestamp: new Date().toISOString()
            }
          });
          throw new Error("Could not extract token from login link");
        }

        // 记录获取令牌成功
        await supabaseClient.from('mp_login_logs').insert({
          user_id: finalUserId,
          log_type: 'h5_login_token_ready',
          success: true,
          ip_address: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
          details: {
            action: 'get_login_token',
            email: email,
            timestamp: new Date().toISOString()
          }
        });

        return new Response(JSON.stringify({ 
          success: true, 
          token_hash,
          email,
          loginLink: linkData.properties.action_link
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 如果是绑定行为
      if (action === "mp_bind") {
        let bindId = body.userId || bindUserId;
        const { username, password, code, checkCode: bodyCheckCode } = body;
        
        // 提取校验码
        const currentCheckCode = checkCode || bodyCheckCode;

        // 如果提供了 code，则需要先获取小程序 openid
        let currentOpenid = mpOpenid;
        if (code && !currentOpenid) {
          const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${config.app_id}&secret=${config.app_secret}&js_code=${code}&grant_type=authorization_code`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.openid) {
            currentOpenid = data.openid;
          }
        }

        // 如果没有 bindId，尝试通过用户名和密码验证
        if (!bindId && username && password) {
          console.log(`[WechatMP] Attempting to verify credentials for: ${username}`);
          const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: username.includes('@') ? username : undefined,
            username: !username.includes('@') ? username : undefined,
            password: password
          } as any);

          if (authError || !authData.user) {
            console.error("[WechatMP] Auth error:", authError?.message);
            return new Response(JSON.stringify({ success: false, message: "用户名或密码错误" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          bindId = authData.user.id;
        }

        if (!bindId) throw new Error("Missing bind target user id or credentials");
        
        // 验证校验码 (如果提供了 bindId 和 checkCode)
        if (bindId && currentCheckCode) {
          // 使用与生成时相同的 shortBindId (12位) 来验证
          const shortBindId = bindId.replace(/-/g, '').slice(0, 12);
          const expected = await generateCheckCode(shortBindId);
          if (expected !== currentCheckCode) {
            console.error(`[WechatMP] Bind checkCode mismatch for bindId ${bindId}, expected: ${expected}, got: ${currentCheckCode}`);
            return new Response(JSON.stringify({ success: false, message: "校验码无效，绑定失败" }), {
               headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        const { error: bindError } = await supabaseClient
          .from("profiles")
          .update({ mp_openid: currentOpenid })
          .eq("id", bindId);
        
        if (bindError) throw bindError;

        // 如果提供了 ticket，说明是扫码登录 H5 的同时也执行了绑定
        if (ticket) {
          console.log(`[WechatMP] Fulfilling login ticket: ${ticket} for user after bind: ${bindId}`);
          let query = supabaseClient.from("login_tickets").update({
            status: "fulfilled",
            user_id: bindId,
            fulfilled_at: new Date().toISOString()
          });
          
          if (ticket.length < 32) {
            query = query.ilike("ticket", `${ticket}%`);
          } else {
            query = query.eq("ticket", ticket);
          }
          await query;
          
          // 记录绑定后登录成功的流水
          await supabaseClient.from('mp_login_logs').insert({
            openid: currentOpenid,
            user_id: bindId,
            ticket: ticket || null,
            scene: scene || null,
            ip_address: req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for"),
            log_type: 'mp_bind',
            success: true,
            details: {
              body: body,
              bindId: bindId,
              fulfilled: !!ticket,
              timestamp: new Date().toISOString()
            }
          });
        }

        return new Response(JSON.stringify({ success: true, message: "绑定成功", openid: currentOpenid }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, openid: mpOpenid }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 获取任务预览数据 (小程序端调用)
    if (action === "get_task_data") {
      const { vid } = body;
      if (!vid) throw new Error("Missing vid");

      // 标准化 itemId (日期格式，去除随机后缀)
      const postDate = normalizeDailyId(vid);
      
      console.log(`[WechatMP] Getting task data for vid: ${vid}, normalized: ${postDate}`);

      // 获取发布记录
      const { data: post, error: postError } = await supabaseClient
        .from("daily_gallery_posts")
        .select("image_ids, id")
        .eq("post_date", postDate)
        .maybeSingle();

      // 记录任务数据获取流水 (包含失败情况)
      // 统一使用 YYYY-MM-DD 格式的 postDate 作为 item_id
      const currentOpenid = openid || body.openid;
      const currentUserId = userId || body.userId;
      let currentBrowserId = body.browserId || null;
      const { scene } = body;

      // 如果没有传入 browserId，尝试通过 scene 参数从生成码日志中恢复，以确保 H5 状态同步
      if (!currentBrowserId && scene) {
        console.log(`[WechatMP] get_task_data: browserId missing, attempting to recover from scene: ${scene}`);
        const decodedScene = scene.includes('%') ? decodeURIComponent(scene) : scene;
        const variants = [scene];
        if (decodedScene !== scene) variants.push(decodedScene);

        const { data: qrLog } = await supabaseClient
          .from("mp_qr_generation_logs")
          .select("details")
          .in("scene", variants)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (qrLog?.details?.browserId) {
          currentBrowserId = qrLog.details.browserId;
          console.log(`[WechatMP] get_task_data recovery success: browserId=${currentBrowserId}`);
        } else {
          // 兜底：尝试从旧的登录流水中查找 (兼容历史数据)
          const { data: scanLog } = await supabaseClient
            .from("mp_login_logs")
            .select("details")
            .eq("log_type", "scancode")
            .eq("scene", scene)
            .order("logged_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (scanLog?.details?.browserId) {
            currentBrowserId = scanLog.details.browserId;
            console.log(`[WechatMP] get_task_data recovery from legacy log success: browserId=${currentBrowserId}`);
          }
        }
      }

      if (postError || !post) {
        return new Response(JSON.stringify({ success: false, message: "发布记录不存在" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 获取一张展示图片
      if (post.image_ids && post.image_ids.length > 0) {
        const { data: image } = await supabaseClient
          .from("media_items")
          .select("url, title, type, tags")
          .eq("id", post.image_ids[0])
          .single();
        
      if (image) {
        return new Response(JSON.stringify({ 
          success: true, 
          data: { 
            image_url: image.url,
            video_url: image.type === 'video' ? image.url : null,
            title: image.title || "今日赏析",
            tags: image.tags || [],
            itemId: postDate,
            type: type || 'daily_gallery'
          } 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      }

      return new Response(JSON.stringify({ success: false, message: "无法获取预览图片" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "log_access") {
      const { itemId, type, openid, userId, browserId } = body;
      const identifier = (openid || userId || browserId);
      
      console.log(`[WechatMP] Logging access for itemId: ${itemId}, identifier: ${identifier}`);

      // 统一标准化 itemId (日期格式)
      const normalizedDate = normalizeDailyId(itemId);

      const { error } = await supabaseClient
        .from("daily_gallery_access_logs")
        .insert({
          publish_date: normalizedDate, // 统一使用 YYYY-MM-DD 格式
          openid: identifier,
          access_type: "view",
          accessed_at: new Date().toISOString()
        });

      if (error) {
        console.error("[WechatMP] Log access error:", error.message);
        return new Response(JSON.stringify({ success: false, message: error.message }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ad_callback") {
      let { itemId, watch_status, checkCode, openid, userId, browserId, type, scene, hostIdentifier } = body;
      
      // 1. 优先从 scene 中解析 itemId（确保使用正确的日期）
      if (scene) {
        const decodedScene = scene.includes('%') ? decodeURIComponent(scene) : scene;
        const params = new URLSearchParams(decodedScene);
        if (params.has('d')) itemId = params.get('d')!;
        if (params.has('c')) checkCode = params.get('c')!;
        if (params.has('h')) hostIdentifier = params.get('h')!;
        console.log(`[WechatMP] Parsed scene: d=${itemId}, c=${checkCode}, h=${hostIdentifier}`);
      }
      
      if (!itemId && !scene) throw new Error("Missing itemId and scene");

      let currentBrowserId = browserId;
      console.log(`[WechatMP] Ad callback: itemId=${itemId}, host=${hostIdentifier}, status=${watch_status}, browserId=${browserId}, scene=${scene}, checkCode=${checkCode}`);

      // 2. 特殊处理：尝试通过 scene 或 itemId + checkCode 找回关联的 browserId
      if (!currentBrowserId) {
        console.log(`[WechatMP] browserId missing in body, attempting to recover from logs...`);
        let recoveryToken = null;
        if (scene) {
          const decodedScene = scene.includes('%') ? decodeURIComponent(scene) : scene;
          const params = new URLSearchParams(decodedScene);
          if (params.has('s')) recoveryToken = params.get('s')!;
        }

        // 尝试从生成码日志中恢复
        let qrLogQuery = supabaseClient
          .from("mp_qr_generation_logs")
          .select("details, scene, created_at")
          .order("created_at", { ascending: false });

        if (recoveryToken) {
           qrLogQuery = qrLogQuery.ilike("scene", `%s=${recoveryToken}%`).limit(1);
        } else if (scene && scene.trim() !== "") {
           const decodedScene = scene.includes('%') ? decodeURIComponent(scene) : scene;
           qrLogQuery = qrLogQuery.in("scene", [scene, decodedScene]).limit(1);
        } else if (itemId && itemId.trim() !== "") {
           const tenMinutesAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
           qrLogQuery = qrLogQuery.gte("created_at", tenMinutesAgo).limit(100);
        }

        if (qrLogQuery) {
          const { data: qrLogs } = await qrLogQuery;
          if (qrLogs && qrLogs.length > 0) {
             let matchedLog = null;
             if (recoveryToken || (scene && scene.trim() !== "")) {
                matchedLog = qrLogs[0];
             } else if (itemId && itemId.trim() !== "") {
                const shortItemId = itemId.replace(/daily_gallery_/g, '').replace(/-/g, '').slice(0, 12);
                matchedLog = qrLogs.find(log => {
                   const s = log.scene?.includes('%') ? decodeURIComponent(log.scene) : log.scene;
                   const matchId = s?.includes(`d=${shortItemId}`);
                   const matchCode = checkCode ? s?.includes(`c=${checkCode}`) : true;
                   return matchId && matchCode;
                });
             }
             if (matchedLog?.details?.browserId) {
                currentBrowserId = matchedLog.details.browserId;
                console.log(`[WechatMP] RECOVERED browserId via log: ${currentBrowserId}`);
             }
          }
        }
      }

      const normalizedItemId = normalizeDailyId(itemId);
      let currentUserId = userId;
      let currentOpenid = openid;
      const identifier = (openid || userId || currentBrowserId);

      // 3. 数据对接增强
      if (currentOpenid && !currentUserId) {
        const { data: profile } = await supabaseClient.from("profiles").select("id").eq("mp_openid", currentOpenid).maybeSingle();
        if (profile) currentUserId = profile.id;
      }

      // 4. 获取配置并处理解锁
      const { data: configData } = await supabaseClient.from('system_configs').select('value').eq('key', 'daily_gallery_config').maybeSingle();
      const dgConfig = configData?.value || {};
      const adUnlockMode = dgConfig.ad_unlock_mode || 'direct';
      let generatedPassword = null;

      const isCompleted = watch_status === 'completed' || watch_status === 'completed_and_clicked';
      const logStatus = (isCompleted) ? "unlocked" : "watching";

      // 无论哪种模式，只要看完广告，都生成一个 6 位数字密码作为备份/记录
      if (isCompleted) {
        generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 插入到特殊密码库（定期密码类型，2小时内可多次使用，但仅限第一个浏览器）
        await supabaseClient
          .from('daily_gallery_special_passwords')
          .insert({
            password: generatedPassword,
            target_date: normalizedItemId,
            password_type: 'periodic_single_user', // 定期密码
            is_one_time: false, // 非一次性，2小时内可多次使用
            max_usages: 999, // 不限次数
            expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2小时内有效
            source: 'miniprogram',
            creator_id: currentOpenid || 'unknown_mp_user',
            browser_id: currentBrowserId, // 绑定到第一个浏览器
          });
        
        console.log(`[WechatMP] Generated periodic backup password ${generatedPassword} for date ${normalizedItemId}, browser: ${currentBrowserId}`);
      }

      const isActuallyUnlocked = isCompleted && adUnlockMode === 'direct';
      // 在密码模式下，看完广告也标记为 unlocked，表示该流程已完成且密码已生成
      const finalLogStatus = (isActuallyUnlocked || (isCompleted && adUnlockMode === 'password')) ? "unlocked" : "watching";

      const insertData: any = {
        item_id: normalizedItemId, // 使用修正后的 ID (YYYY-MM-DD)
        unlock_type: type || "daily_gallery",
        status: finalLogStatus,
        watch_status: watch_status || "watching",
        unlocked_at: isCompleted ? new Date().toISOString() : null,
        created_at: new Date().toISOString(), // 强制更新创建时间
        updated_at: new Date().toISOString(),
        openid: currentOpenid,
        user_id: currentUserId,
        browser_id: currentBrowserId,
        log_type: 'ad_callback',
        success: isCompleted,
        details: {
          body: body,
          password: generatedPassword,
          ad_unlock_mode: adUnlockMode,
          timestamp: new Date().toISOString(),
          ip: getClientIp(req),
          ua: req.headers.get("user-agent")
        }
      };

      const { data: insertedData, error: logError } = await supabaseClient
        .from("ad_unlock_logs")
        .insert(insertData)
        .select()
        .single();

      if (logError) {
        console.error("[WechatMP] Ad callback log error:", logError.message);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: insertedData || insertData,
        password: generatedPassword, 
        message: generatedPassword ? `解锁码：${generatedPassword}` : '解锁成功'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Invalid action: ${action}`);

  } catch (error: any) {
    console.error("[WechatMP] Error:", error.message);
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 200, // 返回 200 以防前端因非 2xx 报错
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
