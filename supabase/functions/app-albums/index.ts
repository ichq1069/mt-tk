import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return createClient(url, key);
}

async function validateRequest(supabase, url, req) {
  const apiKey = url.searchParams.get('apiKey') || req.headers.get('x-api-key') || '';
  const appId = url.searchParams.get('appId') || '';

  if (!apiKey || !appId) return { valid: false, message: 'Missing apiKey or appId' };

  const { data, error } = await supabase
    .from('app_api_keys')
    .select('id, permissions, expires_at')
    .eq('app_id', appId)
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return { valid: false, message: 'Invalid API Key' };
  return { valid: true, keyData: data };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const supabase = getSupabaseClient();
  const validation = await validateRequest(supabase, url, req);

  if (!validation.valid) {
    return createResponse({ success: false, message: validation.message }, 403);
  }

  const path = url.pathname;
  // 🔥 关键修复
  const action = url.searchParams.get('action');

  try {
    // 🔥 修复：支持 ?action=list
    if (path.endsWith('/app-albums') && action === 'list' || path.endsWith('/list')) {
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const search = url.searchParams.get('search') || '';
      const onlyPublic = url.searchParams.get('onlyPublic') === 'true';

      let query = supabase
        .from('photo_albums')
        .select('*, permission_groups(name), album_photos!album_id(url)', { count: 'exact' })
        .eq('is_active', true);

      if (onlyPublic) query = query.eq('is_public', true);
      if (search) query = query.ilike('title', `%${search}%`);

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .order('sort_order', { foreignTable: 'album_photos', ascending: true })
        .limit(1, { foreignTable: 'album_photos' })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;

      const processedAlbums = (data || []).map((album) => {
        if (!album.cover_url && album.album_photos?.[0]) {
          album.cover_url = album.album_photos[0].url;
        }
        return album;
      });

      return createResponse({
        success: true,
        data: processedAlbums,
        total: count || 0
      });
    }

    if (path.includes('/photos/')) {
      const albumId = path.split('/').pop();
      if (!albumId) return createResponse({ success: false, message: 'Missing albumId' }, 400);

      const { data, error } = await supabase
        .from('album_photos')
        .select('*')
        .eq('album_id', albumId)
        .order('sort_order', { ascending: true });

      return createResponse({ success: true, data: data || [] });
    }

    // 删除相册（软删除）
    if (req.method === 'DELETE' && path.split('/').length > 2) {
      const id = path.split('/').pop();
      if (!id) return createResponse({ success: false, message: 'Missing album id' }, 400);

      const { data, error } = await supabase
        .from('photo_albums')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) return createResponse({ success: false, message: error.message }, 500);
      return createResponse({ success: true, data, message: '删除成功' });
    }

    return createResponse({ success: false, message: 'Action not found' }, 404);
  } catch (err) {
    return createResponse({ success: false, message: err.message }, 500);
  }
});
