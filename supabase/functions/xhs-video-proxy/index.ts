import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url).searchParams.get('url')
  if (!url) {
    return new Response('Missing url parameter', { status: 400 })
  }

  try {
    const range = req.headers.get('range')
    const headers = new Headers({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      // 不发送 Referer 绕过防盗链
    })
    
    if (range) {
      headers.set('range', range)
    }

    const response = await fetch(url, { headers })
    
    // 转发响应，包括状态码和部分头部
    const responseHeaders = new Headers(corsHeaders)
    const contentRange = response.headers.get('content-range')
    const contentType = response.headers.get('content-type')
    const contentLength = response.headers.get('content-length')
    const acceptRanges = response.headers.get('accept-ranges')

    if (contentRange) responseHeaders.set('content-range', contentRange)
    if (contentType) responseHeaders.set('content-type', contentType)
    if (contentLength) responseHeaders.set('content-length', contentLength)
    if (acceptRanges) responseHeaders.set('accept-ranges', acceptRanges)

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
