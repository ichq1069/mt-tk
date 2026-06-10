import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const VERSION = '10.0.61';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function createResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
    status,
  });
}

// 创建 Supabase 客户端
function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

// 验证 API Key
async function validateApiKey(supabase, appId, apiKey) {
  if (!apiKey || !appId) return { valid: false };

  const { data, error } = await supabase
    .from('app_api_keys')
    .select('*')
    .eq('app_id', appId)
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return { valid: false };

  // 检查是否过期
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { valid: false };
  }

  // 更新使用次数和最后使用时间
  await supabase
    .from('app_api_keys')
    .update({
      usage_count: (data.usage_count || 0) + 1,
      last_used_at: new Date().toISOString()
    })
    .eq('id', data.id);

  return { valid: true, keyData: data };
}

// 记录 API 日志
async function logApiCall(supabase, appId, endpoint, method, statusCode, ip, userAgent, responseTime, apiKeyId = null, errorMsg = null) {
  try {
    await supabase.from('app_api_logs').insert({
      api_key_id: apiKeyId || null,
      app_id: appId,
      endpoint,
      method,
      ip_address: ip,
      user_agent: userAgent,
      status_code: statusCode,
      response_time_ms: responseTime,
      error_message: errorMsg || null
    });
  } catch (e) {
    console.error('[AppManagement] Log error:', e);
  }
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const url = new URL(req.url);
  const path = url.pathname.replace('/app-management', '').replace(/\/$/, '');
  const method = req.method;
  const action = url.searchParams.get('action');
  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';

  // OPTIONS 预检
  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

    if (action === 'all-apps' || action === 'check-integration' || (method === 'GET' && (path === '/health' || path === ''))) {
      return createResponse({
        status: 'ok',
        success: true,
        version: VERSION,
        service: 'app-management',
        timestamp: new Date().toISOString()
      });
    }

  const supabase = getSupabaseClient();

  try {
    // 1. 获取App完整配置
    if (method === 'GET' && (path.startsWith('/config/') || action === 'config')) {
      const appId = action === 'config' ? url.searchParams.get('appId') : path.replace('/config/', '');
      const apiKey = url.searchParams.get('apiKey') || req.headers.get('x-api-key') || '';
      
      if (!appId) return createResponse({ success: false, message: '缺少appId' }, 400);

      // 获取App配置
      const { data: appConfig, error: appError } = await supabase
        .from('app_configs')
        .select('*')
        .eq('app_id', appId)
        .maybeSingle();

      if (appError || !appConfig) {
        await logApiCall(supabase, appId, path, method, 404, ip, userAgent, Date.now() - startTime);
        return createResponse({ success: false, message: 'App配置不存在' }, 404);
      }

      // 检查是否公开或需要鉴权
      if (!appConfig.is_public) {
        if (!apiKey) {
          await logApiCall(supabase, appId, path, method, 401, ip, userAgent, Date.now() - startTime);
          return createResponse({ success: false, message: '该App配置未公开，需要提供API Key' }, 401);
        }
        const validation = await validateApiKey(supabase, appId, apiKey);
        if (!validation.valid) {
          await logApiCall(supabase, appId, path, method, 403, ip, userAgent, Date.now() - startTime);
          return createResponse({ success: false, message: 'API Key无效或已过期' }, 403);
        }
      }

      // 检查App是否启用
      if (!appConfig.is_active) {
        await logApiCall(supabase, appId, path, method, 403, ip, userAgent, Date.now() - startTime);
        return createResponse({ success: false, message: '该App已被停用' }, 403);
      }

      // 检查是否需要复用站点配置
      let cfr2 = appConfig.cfr2_config || {};
      const api_config = appConfig.api_config || {};
      const secureStorage = api_config.secureStorage;

      if (cfr2.useSiteSettings) {
        const { data: siteStorage } = await supabase
          .from('storage_configs')
          .select('user_id, key_id, secret_key, endpoint, custom_domain, bucket_name')
          .limit(1)
          .maybeSingle();

        if (siteStorage) {
          cfr2 = {
            ...cfr2,
            userId: siteStorage.user_id,
            keyId: siteStorage.key_id,
            secretKey: siteStorage.secret_key,
            endpoint: siteStorage.endpoint,
            customDomain: siteStorage.custom_domain,
            bucketName: siteStorage.bucket_name,
            enabled: true
          };

          // 如果App开启了加密存储，对下发的站点配置也进行混淆，保持一致性
          if (secureStorage) {
            const encrypt = (val: string) => val ? `__ENC__${btoa(encodeURIComponent(val))}` : val;
            if (cfr2.userId && !cfr2.userId.startsWith('__ENC__')) cfr2.userId = encrypt(cfr2.userId);
            if (cfr2.keyId && !cfr2.keyId.startsWith('__ENC__')) cfr2.keyId = encrypt(cfr2.keyId);
            if (cfr2.secretKey && !cfr2.secretKey.startsWith('__ENC__')) cfr2.secretKey = encrypt(cfr2.secretKey);
          }
        }
      }

      await logApiCall(supabase, appId, path, method, 200, ip, userAgent, Date.now() - startTime);

      return createResponse({
        success: true,
        data: {
          appId: appConfig.app_id,
          appName: appConfig.app_name,
          bundleId: appConfig.bundle_id,
          platform: appConfig.platform,
          description: appConfig.description,
          iconUrl: appConfig.icon_url,
          theme: appConfig.theme_config,
          features: appConfig.feature_flags,
          api: appConfig.api_config,
          storage: appConfig.storage_config,
          ui: appConfig.ui_config,
          cfr2,
          apk: appConfig.apk_config,
          custom: appConfig.custom_config,
          isActive: appConfig.is_active,
          updatedAt: appConfig.updated_at
        }
      });
    }

    // 2. 检查版本更新
    if (method === 'GET' && (path.startsWith('/version/') || action === 'version')) {
      const appId = action === 'version' ? url.searchParams.get('appId') : path.replace('/version/', '');
      const apiKey = url.searchParams.get('apiKey') || req.headers.get('x-api-key') || '';
      const platform = url.searchParams.get('platform') || 'android';
      const currentVersion = url.searchParams.get('version') || '';

      if (!appId) return createResponse({ success: false, message: '缺少appId' }, 400);

      // 获取App配置
      const { data: appConfig } = await supabase
        .from('app_configs')
        .select('is_public, is_active, app_id')
        .eq('app_id', appId)
        .maybeSingle();

      if (!appConfig) {
        await logApiCall(supabase, appId, path, method, 404, ip, userAgent, Date.now() - startTime);
        return createResponse({ success: false, message: 'App不存在' }, 404);
      }

      if (!appConfig.is_public) {
        if (!apiKey) {
          return createResponse({ success: false, message: '需要提供API Key' }, 401);
        }
        const validation = await validateApiKey(supabase, appId, apiKey);
        if (!validation.valid) {
          return createResponse({ success: false, message: 'API Key无效' }, 403);
        }
      }

      if (!appConfig.is_active) {
        return createResponse({ success: false, message: 'App已停用' }, 403);
      }

      // 获取该平台最新已发布版本
      const { data: latestVersion, error: verError } = await supabase
        .from('app_versions')
        .select('*')
        .eq('app_id', appId)
        .eq('platform', platform)
        .eq('status', 'published')
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verError) {
        console.error('[AppManagement] Version query error:', verError);
      }

      await logApiCall(supabase, appId, path, method, 200, ip, userAgent, Date.now() - startTime);

      if (!latestVersion) {
        return createResponse({
          success: true,
          hasUpdate: false,
          message: '暂无可用版本'
        });
      }

      // 简单版本比较（假设版本号格式为 x.x.x）
      const hasUpdate = currentVersion !== latestVersion.version;

      return createResponse({
        success: true,
        hasUpdate,
        currentVersion,
        latestVersion: {
          version: latestVersion.version,
          versionCode: latestVersion.version_code,
          downloadUrl: latestVersion.download_url,
          installUrl: latestVersion.install_url,
          releaseNotes: latestVersion.release_notes,
          isForceUpdate: latestVersion.is_force_update,
          minApiVersion: latestVersion.min_api_version,
          releasedAt: latestVersion.created_at
        },
        message: hasUpdate ? '发现新版本' : '当前已是最新版本'
      });
    }

    // 3. 验证API密钥
    if (method === 'POST' && (path === '/validate-key' || action === 'validate-key' || (path === '' && !action))) {
      let body: any = {};
      try {
        body = await req.json();
      } catch (e) {
        // ignore
      }

      const { appId, apiKey } = body;
      const finalAppId = appId || url.searchParams.get('appId');
      const finalApiKey = apiKey || url.searchParams.get('apiKey') || req.headers.get('x-api-key');

      if (!finalAppId || !finalApiKey) {
        return createResponse({ success: false, message: '缺少appId或apiKey' }, 400);
      }

      const validation = await validateApiKey(supabase, finalAppId, finalApiKey);

      await logApiCall(supabase, finalAppId, path || action || 'validate-key', method, validation.valid ? 200 : 403, ip, userAgent, Date.now() - startTime, validation.keyData?.id);

      if (!validation.valid) {
        return createResponse({ success: false, message: 'API Key无效或已过期', valid: false }, 403);
      }

      return createResponse({
        success: true,
        valid: true,
        message: 'API Key有效',
        permissions: validation.keyData.permissions,
        rateLimit: validation.keyData.rate_limit,
        expiresAt: validation.keyData.expires_at
      });
    }

    // 4. 获取功能开关
    if (method === 'GET' && (path.startsWith('/features/') || action === 'features')) {
      const appId = action === 'features' ? url.searchParams.get('appId') : path.replace('/features/', '');
      const apiKey = url.searchParams.get('apiKey') || req.headers.get('x-api-key') || '';

      if (!appId) return createResponse({ success: false, message: '缺少appId' }, 400);

      const { data: appConfig } = await supabase
        .from('app_configs')
        .select('is_public, is_active, feature_flags')
        .eq('app_id', appId)
        .maybeSingle();

      if (!appConfig) {
        return createResponse({ success: false, message: 'App不存在' }, 404);
      }

      if (!appConfig.is_public) {
        if (!apiKey) {
          return createResponse({ success: false, message: '需要提供API Key' }, 401);
        }
        const validation = await validateApiKey(supabase, appId, apiKey);
        if (!validation.valid) {
          return createResponse({ success: false, message: 'API Key无效' }, 403);
        }
      }

      if (!appConfig.is_active) {
        return createResponse({ success: false, message: 'App已停用' }, 403);
      }

      await logApiCall(supabase, appId, path, method, 200, ip, userAgent, Date.now() - startTime);

      return createResponse({
        success: true,
        features: appConfig.feature_flags || {}
      });
    }

    // 5. 获取所有公开App列表
    if (method === 'GET' && (path === '/all-apps' || action === 'all-apps')) {
      const { data, error } = await supabase
        .from('app_configs')
        .select('app_id, app_name, description, platform, icon_url, is_active, updated_at')
        .eq('is_public', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AppManagement] Query error:', error);
        return createResponse({ success: false, message: '查询失败' }, 500);
      }

      await logApiCall(supabase, 'public', path, method, 200, ip, userAgent, Date.now() - startTime);

      return createResponse({
        success: true,
        data: data || []
      });
    }

    // 6. 导出APK打包配置
    if (method === 'GET' && (path.startsWith('/export-build-config/') || action === 'export-build-config')) {
      const appId = action === 'export-build-config' ? url.searchParams.get('appId') : path.replace('/export-build-config/', '');
      const apiKey = url.searchParams.get('apiKey') || req.headers.get('x-api-key') || '';

      if (!appId) return createResponse({ success: false, message: '缺少appId' }, 400);

      const { data: appConfig, error: appError } = await supabase
        .from('app_configs')
        .select('*')
        .eq('app_id', appId)
        .maybeSingle();

      if (appError || !appConfig) {
        await logApiCall(supabase, appId, path, method, 404, ip, userAgent, Date.now() - startTime);
        return createResponse({ success: false, message: 'App配置不存在' }, 404);
      }

      if (!appConfig.is_public) {
        if (!apiKey) {
          return createResponse({ success: false, message: '需要提供API Key' }, 401);
        }
        const validation = await validateApiKey(supabase, appId, apiKey);
        if (!validation.valid) {
          return createResponse({ success: false, message: 'API Key无效' }, 403);
        }
      }

      const { data: keysData } = await supabase
        .from('app_api_keys')
        .select('api_key, key_name, permissions')
        .eq('app_id', appId)
        .eq('is_active', true);

      const apkConfig = appConfig.apk_config || {};
      const keys = keysData || [];

      await logApiCall(supabase, appId, path, method, 200, ip, userAgent, Date.now() - startTime);

      return createResponse({
        success: true,
        data: {
          app: {
            appId: appConfig.app_id,
            appName: appConfig.app_name,
            bundleId: appConfig.bundle_id,
            description: appConfig.description,
            iconUrl: appConfig.icon_url,
          },
          theme: appConfig.theme_config,
          features: appConfig.feature_flags,
          api: {
            ...appConfig.api_config,
            appManagementEndpoint: `${appConfig.api_config?.baseUrl || 'https://backend.appmiaoda.com'}/functions/v1/app-management`
          },
          apk: apkConfig,
          keys: keys.map((k: any) => ({
            keyName: k.key_name,
            apiKey: k.api_key,
            permissions: k.permissions
          })),
          buildInstructions: {
            method: 'android-studio',
            steps: [
              '下载MainActivity.kt、AndroidManifest.xml、build.gradle',
              '在Android Studio中新建项目',
              '替换对应文件内容',
              '同步Gradle并构建APK'
            ]
          }
        }
      });
    }

    // 404
    return createResponse({ success: false, message: '接口不存在', path }, 404);

  } catch (err: any) {
    console.error('[AppManagement] Unhandled error:', err);
    await logApiCall(supabase, 'unknown', path, method, 500, ip, userAgent, Date.now() - startTime, null, err.message);
    return createResponse({
      success: false,
      message: '服务暂时不可用，请稍后再试',
      error: err.message
    }, 500);
  }
});
