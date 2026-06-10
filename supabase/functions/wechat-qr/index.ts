import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { config_id, scene_str } = await req.json();

    if (!config_id || !scene_str) {
      throw new Error("Missing parameters: config_id or scene_str");
    }

    // 获取微信配置
    const { data: config, error: configError } = await supabaseClient
      .from("wechat_configs")
      .select("*")
      .eq("id", config_id)
      .maybeSingle();

    if (configError || !config) {
      throw new Error(`Wechat config not found: ${config_id}`);
    }

    // 仅服务号支持场景码 API
    if (config.type !== "service_auth") {
      return new Response(JSON.stringify({ 
        success: true, 
        qr_url: config.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=关注公众号并发送：${scene_str.replace('gallery:', '')}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = config.access_token;
    let expiresAt = config.access_token_expires_at;

    // 检查并刷新 access_token
    if (!accessToken || !expiresAt || new Date(expiresAt) < new Date()) {
      console.log(`[WechatQR] Fetching new access_token for ${config.appid}`);
      const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appid}&secret=${config.appsecret}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.errcode) {
        throw new Error(`Wechat token error: ${tokenData.errmsg}`);
      }

      accessToken = tokenData.access_token;
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokenData.expires_in - 200)); // 提前 200 秒过期

      await supabaseClient
        .from("wechat_configs")
        .update({
          access_token: accessToken,
          access_token_expires_at: newExpiresAt.toISOString(),
        })
        .eq("id", config_id);
    }

    // 创建临时二维码 ticket (有效期 30 天)
    const qrUrl = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${accessToken}`;
    const qrRes = await fetch(qrUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expire_seconds: 2592000,
        action_name: "QR_STR_SCENE",
        action_info: {
          scene: { scene_str: scene_str }
        }
      })
    });
    const qrData = await qrRes.json();

    if (qrData.errcode) {
      throw new Error(`Wechat QR error: ${qrData.errmsg}`);
    }

    const ticketUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(qrData.ticket)}`;

    return new Response(JSON.stringify({ 
      success: true, 
      qr_url: ticketUrl,
      ticket: qrData.ticket
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[WechatQR] Error:", error.message);
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
