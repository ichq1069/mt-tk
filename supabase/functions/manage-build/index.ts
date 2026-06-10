import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check admin role
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Forbidden: Admin only')
    }

    const { action, version, buildId, status, downloadUrl, logs, env_config } = await req.json()

    if (action === 'trigger') {
      // Create pending build record
      const { data: build, error: buildError } = await supabaseClient
        .from('system_builds')
        .insert({
          version,
          status: 'pending',
          created_by: user.id,
          env_config: env_config || null,
          logs: `Build ${version} triggered by ${user.email} at ${new Date().toISOString()}`
        })
        .select()
        .single()

      if (buildError) throw buildError

      // Update to building status
      await supabaseClient
        .from('system_builds')
        .update({ status: 'building' })
        .eq('id', build.id)

      return new Response(JSON.stringify({ success: true, data: build }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update_status') {
      if (!buildId) throw new Error('Missing buildId')
      
      const updates: any = { status }
      if (downloadUrl) updates.download_url = downloadUrl
      if (logs) updates.logs = logs
      if (status === 'completed' || status === 'failed') {
        updates.finished_at = new Date().toISOString()
      }

      const { data, error } = await supabaseClient
        .from('system_builds')
        .update(updates)
        .eq('id', buildId)
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Invalid action')
  } catch (error) {
    console.error('[BuildManager] Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
