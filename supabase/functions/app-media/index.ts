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
  // 🔥 关键修复：兼容 action 参数
  const action = url.searchParams.get('action');

  try {
    // 🔥 修复：支持 ?action=list
    if (path.endsWith('/app-media') && action === 'list' || path.endsWith('/list')) {
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      const type = url.searchParams.get('type') || 'all';
      const categoryId = url.searchParams.get('categoryId') || 'all';
      const sortBy = url.searchParams.get('sortBy') || 'latest';
      const tagIdsStr = url.searchParams.get('tagIds') || '';
      const tagIds = tagIdsStr ? tagIdsStr.split(',') : null;
      const userId = url.searchParams.get('userId') || null;

      const { data, error } = await supabase.rpc('get_optimized_media_items_v3', {
        p_user_id: userId,
        p_type: type,
        p_category_id: categoryId,
        p_tag_ids: tagIds,
        p_sort_by: sortBy,
        p_limit: limit,
        p_offset: page * limit
      });

      if (error) throw error;

      const items = (data || []).map((item) => ({
        ...item,
        profiles: item.username ? { username: item.username, avatar_url: item.avatar_url } : null,
      }));

      const total = items.length > 0 ? Number((items[0]).total_count) : 0;

      return createResponse({
        success: true,
        data: items,
        total
      });
    }

    if (path.endsWith('/random')) {
      const count = parseInt(url.searchParams.get('count') || '10');
      const type = url.searchParams.get('type') || 'image';
      const categoryId = url.searchParams.get('categoryId') || null;
      const tag = url.searchParams.get('tag') || null;
      
      let query = supabase
        .from('media_items')
        .select('*, profiles!user_id(username, avatar_url), media_tags(tags(name))')
        .eq('status', 'approved')
        .eq('is_hidden', false)
        .is('deleted_at', null)
        .limit(count);

      if (type && type !== 'all') query = query.eq('type', type);
      if (categoryId) query = query.eq('category_id', categoryId);
      if (tag) query = query.ilike('tags::text', `%${tag}%`);

      const { data, error } = await query.order('heat_score', { ascending: false });

      if (error) throw error;

      // 随机打乱顺序
      const shuffled = (data || []).sort(() => Math.random() - 0.5);
      return createResponse({ success: true, data: shuffled });
    }

    if (path.endsWith('/daily')) {
      const { data, error } = await supabase
        .from('media_items')
        .select('*, profiles!user_id(username, avatar_url)')
        .eq('daily_gallery_status', 'published')
        .order('daily_gallery_date', { ascending: false })
        .limit(50);

      return createResponse({ success: true, data: data || [] });
    }

    if (path.endsWith('/wallpapers')) {
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      
      const { data, error, count } = await supabase
        .from('media_items')
        .select('*, profiles!user_id(username, avatar_url)', { count: 'exact' })
        .eq('status', 'approved')
        .eq('type', 'image')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      return createResponse({ success: true, data: data || [], total: count });
    }

    if (path.includes('/detail/')) {
      const id = path.split('/').pop();
      if (!id) return createResponse({ success: false, message: 'Missing media id' }, 400);

      const { data, error } = await supabase
        .from('media_items')
        .select('*, profiles!user_id(username, avatar_url), media_tags(tags(name))')
        .eq('id', id)
        .maybeSingle();

      if (!data) return createResponse({ success: false, message: 'Media not found' }, 404);
      return createResponse({ success: true, data });
    }

    // 删除媒体（软删除）
    if (req.method === 'DELETE' && path.split('/').length > 2) {
      const id = path.split('/').pop();
      if (!id) return createResponse({ success: false, message: 'Missing media id' }, 400);

      const { data, error } = await supabase
        .from('media_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) return createResponse({ success: false, message: error.message }, 500);
      return createResponse({ success: true, data, message: '删除成功' });
    }

    // 搜索媒体
    if (path.endsWith('/search')) {
      const query = url.searchParams.get('q') || '';
      const page = parseInt(url.searchParams.get('page') || '0');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const type = url.searchParams.get('type') || 'all';

      if (!query.trim()) {
        return createResponse({ success: false, message: 'Missing search query' }, 400);
      }

      let dbQuery = supabase
        .from('media_items')
        .select('*, profiles!user_id(username, avatar_url), media_tags(tags(name))', { count: 'exact' })
        .is('deleted_at', null)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

      if (type !== 'all') dbQuery = dbQuery.eq('type', type);

      const { data, error, count } = await dbQuery
        .order('created_at', { ascending: false })
        .range(page * limit, (page + 1) * limit - 1);

      if (error) throw error;
      return createResponse({ success: true, data: data || [], total: count || 0 });
    }

    // 热门搜索标签
    if (path.endsWith('/trending-tags')) {
      const { data, error } = await supabase
        .from('tags')
        .select('id, name, color, description, media_count')
        .order('media_count', { ascending: false })
        .limit(30);

      if (error) throw error;
      return createResponse({ success: true, data: data || [] });
    }

    if (path.includes('/comments/')) {
      const mediaId = path.split('/').pop();
      if (!mediaId) return createResponse({ success: false, message: 'Missing mediaId' }, 400);

      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles!user_id(username, avatar_url)')
        .eq('media_id', mediaId)
        .order('created_at', { ascending: true });

      return createResponse({ success: true, data: data || [] });
    }

    if (path.endsWith('/comments') && req.method === 'POST') {
      const body = await req.json();
      const { mediaId, userId, content } = body;
      if (!mediaId || !userId || !content) return createResponse({ success: false, message: 'Missing fields' }, 400);

      const { data, error } = await supabase
        .from('comments')
        .insert({ media_id: mediaId, user_id: userId, content })
        .select()
        .single();

      return createResponse({ success: true, data });
    }

    if (path.endsWith('/upload') && req.method === 'POST') {
      const body = await req.json();
      const { userId, url: mediaUrl, type, title, description, categoryId, tags } = body;
      
      if (!userId || !mediaUrl) {
        return createResponse({ success: false, message: 'Missing userId or url' }, 400);
      }

      const { data, error } = await supabase
        .from('media_items')
        .insert({
          user_id: userId,
          url: mediaUrl,
          type: type || 'image',
          title: title || '未命名作品',
          description: description || '',
          category_id: categoryId,
          status: 'pending',
          tags: tags || []
        })
        .select()
        .single();

      return createResponse({ success: true, data });
    }

    return createResponse({ success: false, message: 'Action not found' }, 404);
  } catch (err) {
    return createResponse({ success: false, message: err.message }, 500);
  }
});
