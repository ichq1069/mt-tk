import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Deno 运行时兼容性补丁: 如果 Deno.writeAll 不存在 (Deno 2.x+), 提供一个简单的实现
if (typeof (Deno as any).writeAll !== "function") {
  (Deno as any).writeAll = async (writer: any, data: Uint8Array) => {
    let nwritten = 0;
    while (nwritten < data.length) {
      nwritten += await writer.write(data.subarray(nwritten));
    }
  };
}

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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    }

    const body = await req.json().catch(() => ({}));
    const { to, subject, content } = body;
    
    if (!to || !subject || !content) {
      throw new Error('参数缺失: to, subject 或 content 是必填项');
    }

    console.log(`[send-email] 开始处理发送邮件请求: to=${to}, subject=${subject}`);

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: config, error: configError } = await supabase
      .from('storage_configs')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (configError) {
      throw new Error(`获取 SMTP 配置失败: ${configError.message}`);
    }

    if (!config?.smtp_enabled || !config.smtp_host) {
      throw new Error('SMTP 服务未开启或未配置服务器地址');
    }

    const client = new SmtpClient();
    
    // 自动适配端口
    const port = parseInt(config.smtp_port) || 587;
    // QQ 邮箱 465 端口在 deno x/smtp 库中可能存在 Implicit TLS 握手问题 (invalid cmd)
    // 建议如果是 QQ 邮箱且使用 465 失败，优先尝试 587 端口。
    const isSSL = port === 465;

    console.log(`[send-email] 正在尝试连接 SMTP 服务器: ${config.smtp_host}:${port} (SSL=${isSSL})`);
    try {
      // 部分 SMTP 库对 port 465 需要特殊处理。如果 connect 报错 invalid cmd，
      // 说明服务器在等待 TLS 握手而客户端在发 EHLO。
      await client.connect({
        hostname: config.smtp_host,
        port: port,
        username: config.smtp_user,
        password: config.smtp_pass,
        tls: isSSL
      });
    } catch (connectError) {
      const connErr = connectError as Error;
      console.error('[send-email] SMTP 连接失败:', connErr.message);
      let helpfulMessage = connErr.message;
      if (connErr.message.includes('invalid cmd') || connErr.message.includes('handshake')) {
        helpfulMessage = `连接失败 (${connErr.message})。检测到可能是端口协议不匹配。如果是 465 端口，请确保您的 SMTP 服务商支持 Implicit TLS。对于 QQ 邮箱，强烈建议改用 587 端口。`;
      }
      throw new Error(helpfulMessage);
    }

    console.log(`[send-email] 正在发送邮件... FROM=${config.smtp_from || config.smtp_user}`);
    try {
      await client.send({
        from: config.smtp_from || config.smtp_user,
        to,
        subject,
        content,
      });
    } catch (sendError) {
      const sErr = sendError as Error;
      console.error('[send-email] 邮件发送失败:', sErr.message);
      throw sErr;
    }

    console.log(`[send-email] 邮件发送完成, 正在关闭连接`);
    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const err = error as Error;
    console.error('[send-email] 错误:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
}

Deno.serve(handler);
