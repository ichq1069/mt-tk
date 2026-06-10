import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsEvent {
  type: string;
  page_path: string;
  page_title?: string;
  referrer?: string;
  visitor_uuid: string;
  session_uuid: string;
  event_uuid: string;
  website_id: string;
  pixel_key: string;
  user_id?: string | null;
  openid?: string | null;
  timestamp: number;
  [key: string]: any;
}

function createResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const { events, websiteId, pixelKey } = body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return createResponse({ error: 'No events provided' }, 400);
    }

    // 验证网站配置
    const { data: website, error: websiteError } = await supabaseClient
      .from('analytics_websites')
      .select('id, is_enabled')
      .eq('id', websiteId)
      .eq('pixel_key', pixelKey)
      .maybeSingle();

    if (websiteError || !website) {
      return createResponse({ error: 'Invalid website or pixel key' }, 401);
    }

    if (!website.is_enabled) {
      return createResponse({ error: 'Tracking disabled for this website' }, 403);
    }

    // 处理每个事件
    const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const country = req.headers.get('cf-ipcountry') || 'Unknown';
    
    const results = [];
    for (const event of events) {
      try {
        const eventWithMeta = { ...event, _ip: clientIp, _country: country };
        const result = await processEvent(supabaseClient, website.id, eventWithMeta);
        results.push(result);
      } catch (error: any) {
        console.error('[AnalyticsTrack] Error processing event:', error);
        results.push({ error: error.message });
      }
    }

    return createResponse({ success: true, processed: results.length });

  } catch (err: any) {
    console.error('[AnalyticsTrack] Global error:', err);
    return createResponse({ error: 'Internal server error' }, 500);
  }
});

async function processEvent(supabase: any, websiteId: string, event: AnalyticsEvent) {
  const { type } = event;

  switch (type) {
    case 'initiate_visitor':
      return await handleInitiateVisitor(supabase, websiteId, event);
    case 'landing_page':
      return await handleLandingPage(supabase, websiteId, event);
    case 'pageview':
      return await handlePageview(supabase, websiteId, event);
    case 'click':
    case 'scroll':
    case 'form_submit':
    case 'resize':
      return await handleGenericEvent(supabase, websiteId, event);
    case 'goal_conversion':
      return await handleGoalConversion(supabase, websiteId, event);
    case 'heartbeat':
      return await handleHeartbeat(supabase, websiteId, event);
    case 'web_vitals':
      return await handleWebVitals(supabase, websiteId, event);
    default:
      return await handleGenericEvent(supabase, websiteId, event);
  }
}

async function handleWebVitals(supabase: any, websiteId: string, event: AnalyticsEvent) {
  const visitorId = await getOrCreateVisitor(supabase, websiteId, event);
  const { data: session } = await supabase
    .from('analytics_sessions')
    .select('id')
    .eq('session_uuid', event.session_uuid)
    .maybeSingle();

  const { error } = await supabase
    .from('analytics_performance')
    .insert({
      website_id: websiteId,
      session_id: session?.id || null,
      visitor_id: visitorId,
      metric_name: event.metric_name,
      metric_value: event.metric_value,
      metric_id: event.metric_id,
      page_path: event.page_path
    });

  if (error) throw error;
  return { type: 'web_vitals_recorded' };
}

async function handleInitiateVisitor(supabase: any, websiteId: string, event: AnalyticsEvent) {
  const { visitor_info, _ip: ipAddress, _country: countryCode } = event as any;
  const userId = event.user_id || visitor_info?.user_id || null;
  const openid = event.openid || visitor_info?.openid || null;

  // 如果存在 user_id 或 openid，尝试查找已有绑定访客
  let existingVisitor = null;
  if (userId) {
    const { data } = await supabase
      .from('analytics_visitors')
      .select('id, visitor_uuid')
      .eq('user_id', userId)
      .eq('website_id', websiteId)
      .order('last_visit', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) existingVisitor = data;
  }
  if (!existingVisitor && openid) {
    const { data } = await supabase
      .from('analytics_visitors')
      .select('id, visitor_uuid')
      .eq('openid', openid)
      .eq('website_id', websiteId)
      .order('last_visit', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) existingVisitor = data;
  }
  
  // 综合识别：如果还没有匹配到，且具有 IP 和 visitor_uuid，尝试查找相同 IP+浏览器指纹的访客
  // 这里 visitor_uuid 实际上充当了浏览器指纹（Browser ID）的作用，因为它存储在 localStorage 中
  if (!existingVisitor && ipAddress && event.visitor_uuid) {
    const { data } = await supabase
      .from('analytics_visitors')
      .select('id')
      .eq('visitor_uuid', event.visitor_uuid)
      .eq('ip_address', ipAddress)
      .eq('website_id', websiteId)
      .order('last_visit', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) existingVisitor = data;
  }

  // 最后仅按 visitor_uuid 查找
  if (!existingVisitor) {
    const { data } = await supabase
      .from('analytics_visitors')
      .select('id')
      .eq('visitor_uuid', event.visitor_uuid)
      .eq('website_id', websiteId)
      .maybeSingle();
    existingVisitor = data;
  }

  if (existingVisitor) {
    const updateData: any = {
      last_visit: new Date().toISOString(),
      ip_address: ipAddress || 'unknown',
      country_code: countryCode || 'Unknown'
    };
    if (userId) updateData.user_id = userId;
    if (openid) updateData.openid = openid;
    // 有新身份绑定则增加会话计数
    if (userId || openid) {
      updateData.total_sessions = supabase.rpc('increment', { x: 1 });
    }

    await supabase
      .from('analytics_visitors')
      .update(updateData)
      .eq('id', existingVisitor.id);

    return { type: 'visitor_updated', visitor_id: existingVisitor.id };
  }

  const { data: newVisitor, error } = await supabase
    .from('analytics_visitors')
    .insert({
      visitor_uuid: event.visitor_uuid,
      website_id: websiteId,
      user_id: userId,
      openid: openid,
      ip_address: ipAddress || 'unknown',
      country_code: countryCode || 'Unknown',
      screen_resolution: visitor_info?.resolution?.width + 'x' + visitor_info?.resolution?.height,
      device_type: visitor_info?.device_type,
      browser_name: visitor_info?.browser_name,
      browser_version: visitor_info?.browser_version,
      os_name: visitor_info?.os_name,
      language: visitor_info?.language,
      timezone: visitor_info?.timezone
    })
    .select('id')
    .single();

  if (error) throw error;

  return { type: 'visitor_created', visitor_id: newVisitor.id };
}

async function handleLandingPage(supabase: any, websiteId: string, event: AnalyticsEvent) {
  const visitorId = await getOrCreateVisitor(supabase, websiteId, event);
  const userId = event.user_id || null;
  const openid = event.openid || null;

  const { data: session, error } = await supabase
    .from('analytics_sessions')
    .insert({
      session_uuid: event.session_uuid,
      visitor_id: visitorId,
      website_id: websiteId,
      user_id: userId,
      openid: openid,
      landing_page: event.page_path,
      referrer_url: event.referrer
    })
    .select('id')
    .single();

  if (error) throw error;

  return { type: 'session_created', session_id: session.id };
}

async function handlePageview(supabase: any, websiteId: string, event: AnalyticsEvent) {
  const visitorId = await getOrCreateVisitor(supabase, websiteId, event);
  const userId = event.user_id || null;
  const openid = event.openid || null;

  let { data: session } = await supabase
    .from('analytics_sessions')
    .select('id, pageviews')
    .eq('session_uuid', event.session_uuid)
    .eq('website_id', websiteId)
    .maybeSingle();

  if (!session) {
    const { data: newSession } = await supabase
      .from('analytics_sessions')
      .insert({
        session_uuid: event.session_uuid,
        visitor_id: visitorId,
        website_id: websiteId,
        user_id: userId,
        openid: openid,
        landing_page: event.page_path
      })
      .select('id')
      .single();

    session = newSession;
  } else {
    const updateData: any = {
      pageviews: (session.pageviews || 0) + 1,
      exit_page: event.page_path,
    };
    if (userId) updateData.user_id = userId;
    if (openid) updateData.openid = openid;

    await supabase
      .from('analytics_sessions')
      .update(updateData)
      .eq('id', session.id);
  }

  const { error } = await supabase
    .from('analytics_events')
    .insert({
      session_id: session.id,
      visitor_id: visitorId,
      website_id: websiteId,
      event_type: 'pageview',
      page_path: event.page_path,
      page_title: event.page_title,
      metadata: { url: event.url, referrer: event.referrer }
    });

  if (error) throw error;

  return { type: 'pageview_recorded' };
}

async function handleGoalConversion(supabase: any, websiteId: string, event: AnalyticsEvent) {
  const { data: goal } = await supabase
    .from('analytics_goals')
    .select('id')
    .eq('website_id', websiteId)
    .eq('goal_key', event.goal_key)
    .eq('is_active', true)
    .maybeSingle();

  if (!goal) {
    return { error: 'Goal not found or inactive' };
  }

  const visitorId = await getOrCreateVisitor(supabase, websiteId, event);

  const { data: session } = await supabase
    .from('analytics_sessions')
    .select('id')
    .eq('session_uuid', event.session_uuid)
    .maybeSingle();

  if (!session) {
    return { error: 'Session not found' };
  }

  const { error } = await supabase
    .from('analytics_goal_conversions')
    .insert({
      goal_id: goal.id,
      session_id: session.id,
      visitor_id: visitorId,
      website_id: websiteId,
      conversion_value: event.conversion_value
    });

  if (error) throw error;

  return { type: 'goal_converted', goal_id: goal.id };
}

async function handleHeartbeat(supabase: any, websiteId: string, event: AnalyticsEvent) {
  const userId = event.user_id || null;
  const openid = event.openid || null;
  const updateData: any = {
    duration: event.duration,
    is_active: true,
  };
  if (userId) updateData.user_id = userId;
  if (openid) updateData.openid = openid;

  await supabase
    .from('analytics_sessions')
    .update(updateData)
    .eq('session_uuid', event.session_uuid);

  await supabase
    .from('analytics_realtime')
    .upsert({
      website_id: websiteId,
      visitor_id: event.visitor_uuid,
      session_id: event.session_uuid,
      user_id: userId,
      openid: openid,
      current_page: event.page_path,
      page_title: event.page_title,
      last_active_at: new Date().toISOString(),
      is_online: true
    }, {
      onConflict: 'visitor_id,website_id',
      ignoreDuplicates: false
    });

  return { type: 'heartbeat_recorded' };
}

async function handleGenericEvent(supabase: any, websiteId: string, event: AnalyticsEvent) {
  const visitorId = await getOrCreateVisitor(supabase, websiteId, event);

  const { data: session } = await supabase
    .from('analytics_sessions')
    .select('id')
    .eq('session_uuid', event.session_uuid)
    .maybeSingle();

  const { error } = await supabase
    .from('analytics_events')
    .insert({
      session_id: session?.id || null,
      visitor_id: visitorId,
      website_id: websiteId,
      event_type: event.type,
      page_path: event.page_path,
      element_selector: event.element_selector,
      element_text: event.element_text,
      x_position: event.x_position,
      y_position: event.y_position,
      scroll_depth: event.scroll_depth,
      time_on_page: event.time_on_page,
      metadata: event
    });

  if (error) throw error;

  return { type: `${event.type}_recorded` };
}

async function getOrCreateVisitor(supabase: any, websiteId: string, event: AnalyticsEvent): Promise<string> {
  const visitorUuid = event.visitor_uuid;
  const userId = event.user_id || null;
  const openid = event.openid || null;
  const ipAddress = (event as any)._ip || 'unknown';
  const countryCode = (event as any)._country || 'Unknown';

  // 1. 按 visitor_uuid 查找
  const { data: visitorByUuid } = await supabase
    .from('analytics_visitors')
    .select('id, user_id, openid')
    .eq('visitor_uuid', visitorUuid)
    .eq('website_id', websiteId)
    .maybeSingle();

  if (visitorByUuid) {
    // 如果有新身份绑定，更新访客记录
    if ((userId && !visitorByUuid.user_id) || (openid && !visitorByUuid.openid)) {
      const updateData: any = { ip_address: ipAddress, country_code: countryCode };
      if (userId && !visitorByUuid.user_id) updateData.user_id = userId;
      if (openid && !visitorByUuid.openid) updateData.openid = openid;
      await supabase.from('analytics_visitors').update(updateData).eq('id', visitorByUuid.id);
    }
    return visitorByUuid.id;
  }

  // 2. 按 user_id 查找
  if (userId) {
    const { data: visitorByUser } = await supabase
      .from('analytics_visitors')
      .select('id')
      .eq('user_id', userId)
      .eq('website_id', websiteId)
      .order('last_visit', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (visitorByUser) return visitorByUser.id;
  }

  // 3. 按 openid 查找
  if (openid) {
    const { data: visitorByOpenid } = await supabase
      .from('analytics_visitors')
      .select('id')
      .eq('openid', openid)
      .eq('website_id', websiteId)
      .order('last_visit', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (visitorByOpenid) return visitorByOpenid.id;
  }

  // 4. 综合识别：IP + visitor_uuid (Browser ID)
  if (ipAddress && visitorUuid) {
    const { data: visitorByIpAndUuid } = await supabase
      .from('analytics_visitors')
      .select('id')
      .eq('visitor_uuid', visitorUuid)
      .eq('ip_address', ipAddress)
      .eq('website_id', websiteId)
      .order('last_visit', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (visitorByIpAndUuid) return visitorByIpAndUuid.id;
  }

  // 5. 创建新访客
  const { data: newVisitor, error } = await supabase
    .from('analytics_visitors')
    .insert({
      visitor_uuid: visitorUuid,
      website_id: websiteId,
      user_id: userId,
      openid: openid,
      ip_address: ipAddress,
      country_code: countryCode
    })
    .select('id')
    .single();

  if (error) throw error;

  return newVisitor?.id || '';
}
