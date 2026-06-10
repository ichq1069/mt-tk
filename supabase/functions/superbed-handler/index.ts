import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get configuration from DB
    const { data: config, error: configError } = await supabaseClient
      .from("superbed_configs")
      .select("*")
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "Superbed configuration not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!config.is_enabled) {
      return new Response(JSON.stringify({ error: "Superbed storage is disabled" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user permission
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseClient.from("profiles").select("group_id").eq("id", user.id).single();
    const { data: group } = (profile && profile.group_id) ? await supabaseClient.from("permission_groups").select("name").eq("id", profile.group_id).single() : { data: null };

    const allowedGroups = config.allowed_groups || [];
    if (allowedGroups.length > 0 && (!group || !allowedGroups.includes(group.name))) {
      return new Response(JSON.stringify({ error: "User group not allowed to use Superbed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "GET" && action === "get-auth") {
      const ts = Math.floor(Date.now() / 1000);
      const signStr = `${config.superbed_id}-${config.superbed_token}-${ts}`;
      const signBuffer = await crypto.subtle.digest("MD5", new TextEncoder().encode(signStr));
      const hashArray = Array.from(new Uint8Array(signBuffer));
      const sign = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return new Response(JSON.stringify({ id: config.superbed_id, ts, sign }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      // Use token-based upload for server-side proxy
      const contentType = req.headers.get("content-type") || "";
      let file: any = null;
      let src: string | null = null;
      let otherParams: Record<string, string> = {};

      if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        file = formData.get("file");
        src = formData.get("src") as string | null;
        ["categories", "filename", "watermark", "compress", "webp"].forEach(param => {
          const val = formData.get(param);
          if (val) otherParams[param] = val as string;
        });
      } else if (contentType.includes("application/json")) {
        const body = await req.json();
        src = body.src;
        ["categories", "filename", "watermark", "compress", "webp"].forEach(param => {
          if (body[param]) otherParams[param] = body[param];
        });
      }

      const superbedFormData = new FormData();
      superbedFormData.append("token", config.superbed_token);

      if (file) {
        superbedFormData.append("file", file);
      } else if (src) {
        superbedFormData.append("src", src);
      } else {
         return new Response(JSON.stringify({ error: "No file or src provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      Object.entries(otherParams).forEach(([key, val]) => {
          superbedFormData.append(key, val);
      });

      let response;
      let retries = 0;
      const maxRetries = 2;
      
      while (retries <= maxRetries) {
        try {
          response = await fetch("https://api.superbed.cn/upload", {
            method: "POST",
            body: superbedFormData,
            // 增加超时控制
            signal: AbortSignal.timeout(60000) // 60s
          });
          
          if (response.ok) break;
          
          if (retries === maxRetries) {
            const errorText = await response.text();
            throw new Error(`Superbed API error (${response.status}): ${errorText}`);
          }
        } catch (err: any) {
          if (retries === maxRetries) throw err;
          console.warn(`Superbed upload attempt ${retries + 1} failed, retrying...`, err.message);
        }
        retries++;
        await new Promise(r => setTimeout(r, 1000 * retries));
      }

      if (!response) throw new Error("Superbed API request failed after retries");

      const result = await response.json();
      
      if (result.err === 0) {
        return new Response(JSON.stringify({
          success: true,
          url: result.url
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: result.msg || '聚合图床上传失败'
        }), {
          status: 200, // Return 200 but with success: false to match app logic
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

