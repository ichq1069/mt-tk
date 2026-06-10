const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const res1 = await fetch('https://api.ipify.org?format=json').then(r => r.json()).catch(() => null);
    const res2 = await fetch('https://ifconfig.me/all.json').then(r => r.json()).catch(() => null);
    const res3 = await fetch('https://ipinfo.io/json').then(r => r.json()).catch(() => null);
    
    const ip = res1?.ip || res2?.ip_addr || res3?.ip || '无法获取出口 IP';
    
    return new Response(JSON.stringify({ 
      ip: ip,
      details: {
        ipify: res1?.ip,
        ifconfig: res2?.ip_addr,
        ipinfo: res3?.ip
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const err = error as Error;
    console.error('[Get-Server-IP Error]:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}

Deno.serve(handler);
