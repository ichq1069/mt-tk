import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const img = url.searchParams.get("img");
    const auth = url.searchParams.get("auth");

    if (!img || !auth) {
      return new Response(JSON.stringify({ error: "缺少 img 或 auth" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. 访问授权页获取 Cookie
    // 注意：这里我们调用用户提供的 worker 或者直接实现逻辑
    // 考虑到效率和稳定性，我们直接调用提供的 worker 接口，或者复用其逻辑
    // 根据指令：ALL third-party API calls MUST be implemented through Supabase Edge Functions
    // 我们在这里实现逻辑。
    
    const authRes = await fetch(auth, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    const cookies = authRes.headers.get("set-cookie");

    // 2. 拼接完整图片地址
    const imageUrl = "https://eu.zonerama.com" + img;

    // 3. 请求图片
    const imgRes = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Cookie": cookies || "",
        "Referer": "https://eu.zonerama.com/",
      },
    });

    // 返回图片
    const responseHeaders = new Headers(imgRes.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Cache-Control", "public, max-age=31536000");
    // 确保 Content-Type 正确
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    responseHeaders.set("Content-Type", contentType);

    return new Response(imgRes.body, {
      status: imgRes.status,
      headers: responseHeaders,
    });
  } catch (e) {
    console.error("Zonerama Proxy Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
