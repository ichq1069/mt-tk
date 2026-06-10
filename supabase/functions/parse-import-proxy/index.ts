import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { apiUrl, targetUrl } = await req.json()

    if (!apiUrl || !targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing apiUrl or targetUrl' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Construct the full URL
    // We assume the apiUrl is a base URL and we append the targetUrl as a query parameter 'url'
    // If the apiUrl already has query parameters, we use & instead of ?
    const separator = apiUrl.includes('?') ? '&' : '?'
    const fullUrl = `${apiUrl}${separator}url=${encodeURIComponent(targetUrl)}`

    console.log(`Fetching parsing results from: ${fullUrl}`)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    })

    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
