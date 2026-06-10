import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// 微信 API 基础地址
const WECHAT_API_BASE = 'https://api.weixin.qq.com/cgi-bin'

// 获取 access_token（带本地数据库缓存）
// forceRefresh=true 时强制从微信重新获取，覆盖本地缓存
async function getAccessToken(supabase, configId, appid, appsecret, forceRefresh = false) {
  // 1. 尝试从数据库缓存中读取
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from('wechat_access_tokens')
      .select('*')
      .eq('config_id', configId)
      .maybeSingle()

    if (cached && cached.expires_at && new Date(cached.expires_at) > new Date()) {
      return cached.access_token
    }
  }

  // 缓存失效或强制刷新，重新获取
  const url = `${WECHAT_API_BASE}/token?grant_type=client_credential&appid=${appid}&secret=${appsecret}`
  const response = await fetch(url)
  const data = await response.json()

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: [${data.errcode}] ${data.errmsg}`)
  }

  const accessToken = data.access_token
  const expiresIn = data.expires_in || 7200 // 默认 2 小时

  // 存入数据库缓存（提前 5 分钟过期）
  const expiresInSeconds = Number(expiresIn);
  const expiresAt = new Date(Date.now() + (expiresInSeconds - 300) * 1000).toISOString();
  await supabase.from('wechat_access_tokens').upsert({
    config_id: configId,
    access_token: accessToken,
    expires_at: expiresAt
  }, { onConflict: 'config_id' });

  return accessToken;
}

// 创建自定义菜单
async function createMenu(accessToken, menuData) {
  const url = `${WECHAT_API_BASE}/menu/create?access_token=${accessToken}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(menuData)
  })
  return await response.json()
}

// 查询自定义菜单
async function getMenu(accessToken) {
  const url = `${WECHAT_API_BASE}/menu/get?access_token=${accessToken}`
  const response = await fetch(url)
  return await response.json()
}

// 删除自定义菜单
async function deleteMenu(accessToken) {
  const url = `${WECHAT_API_BASE}/menu/delete?access_token=${accessToken}`
  const response = await fetch(url)
  return await response.json()
}

// 获取用户信息
async function getUserInfo(accessToken, openid) {
  const url = `${WECHAT_API_BASE}/user/info?access_token=${accessToken}&openid=${openid}&lang=zh_CN`
  const response = await fetch(url)
  return await response.json()
}

// 辅助函数：检测图片 MIME 类型并获取正确扩展名
async function fetchImageWithCorrectInfo(imageUrl: string, isContentImage = false) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20秒超时

  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`下载图片失败 (${response.status}): ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const blob = await response.blob();
    
    // 映射 MIME 到扩展名
    const mimeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'heif'
    };
    
    let extension = mimeMap[contentType.toLowerCase()];
    
    // 微信永久素材接口 (add_material) 主要支持 jpg, png, gif。
    // 内容图片接口 (uploadimg) 对格式更宽容。
    // 对于封面图（非内容图），严格限制格式
    if (!isContentImage) {
      if (!extension || extension === 'webp' || extension === 'heic' || extension === 'heif') {
        throw new Error(`微信封面图不支持的格式: ${contentType}。请使用 JPG, PNG 或 GIF 格式。`);
      }
    } else {
      // 内容图允许更多格式，微信 uploadimg 会自动转换
      if (!extension) {
        extension = 'jpg'; // 未知格式尝试作为 jpg
      }
    }
    
    const filename = `image.${extension}`;
    
    return { blob, filename, contentType, extension };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('下载图片超时（超过20秒），请检查图片链接是否可访问。');
    }
    throw err;
  }
}

// 上传图片素材（永久素材，返回 media_id）
async function uploadImage(accessToken, imageUrl) {
  const { blob, filename } = await fetchImageWithCorrectInfo(imageUrl, false);
  
  const formData = new FormData()
  formData.append('media', blob, filename)
  
  const url = `${WECHAT_API_BASE}/material/add_material?access_token=${accessToken}&type=image`
  const response = await fetch(url, {
    method: 'POST',
    body: formData
  })
  const result = await response.json();
  if (result.errcode) {
    throw new Error(`上传封面素材失败: [${result.errcode}] ${result.errmsg}`);
  }
  return result;
}

// 上传图文内容内的图片（返回 URL，非 media_id）
async function uploadContentImage(accessToken, imageUrl) {
  const { blob, filename } = await fetchImageWithCorrectInfo(imageUrl, true);
  
  const formData = new FormData()
  formData.append('media', blob, filename)
  
  const url = `https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=${accessToken}`
  const response = await fetch(url, {
    method: 'POST',
    body: formData
  })
  const result = await response.json();
  if (result.errcode) {
    throw new Error(`上传内容图片失败: [${result.errcode}] ${result.errmsg}`);
  }
  return result;
}

// 处理内容中的图片（并行处理以提升效率）
async function processContentImages(accessToken, content) {
  if (!content) return content;
  
  // 匹配 img 标签的 src 属性
  const imgRegex = /<img [^>]*src="([^"]+)"[^>]*>/g;
  let newContent = content;
  const urlsToReplace = [];
  
  let match;
  while ((match = imgRegex.exec(content)) !== null) {
    const originalUrl = match[1];
    // 如果不是微信域名的图片，且看起来是有效的 URL（支持 http 和 https）
    if (originalUrl && !originalUrl.includes('mmbiz.qpic.cn') && /^https?:\/\//.test(originalUrl)) {
      urlsToReplace.push(originalUrl);
    }
  }
  
  // 去重处理
  const uniqueUrls = Array.from(new Set(urlsToReplace));
  if (uniqueUrls.length === 0) return content;

  console.log(`[Wechat-API] 发现 ${uniqueUrls.length} 个非微信域名图片需要处理`);
  
  // 并行上传图片（限制并发数以防被微信封禁或资源耗尽）
  const results = await Promise.all(uniqueUrls.map(async (url) => {
    try {
      const uploadResult = await uploadContentImage(accessToken, url);
      if (uploadResult.url) {
        return { original: url, wechat: uploadResult.url };
      }
      console.warn(`[Wechat-API] 图片转换失败 (无URL返回): ${url}`, uploadResult);
    } catch (e) {
      console.error(`[Wechat-API] 图片转换报错: ${url}`, e.message);
    }
    return { original: url, wechat: null };
  }));

  // 执行替换
  for (const res of results) {
    if (res.wechat) {
      newContent = newContent.split(res.original).join(res.wechat);
    }
  }
  
  return newContent;
}

// 新建草稿
async function addDraft(accessToken, articles) {
  // 先并行处理每个文章的内容图片
  const processedArticles = await Promise.all(
    articles.map(async (article) => {
      const processedContent = await processContentImages(accessToken, article.content);
      return {
        ...article,
        content: processedContent
      };
    })
  );

  const url = `${WECHAT_API_BASE}/draft/add?access_token=${accessToken}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articles: processedArticles })
  })
  const result = await response.json();
  if (result.errcode) {
    throw new Error(`创建草稿失败: [${result.errcode}] ${result.errmsg}`);
  }
  return result;
}

// 修改草稿
// 微信 draft/update API 参数: media_id, index, articles (单个文章对象)
async function updateDraft(accessToken, media_id, index, articles) {
  const articleToProcess = Array.isArray(articles) ? articles[0] : articles;
  
  if (articleToProcess && articleToProcess.content) {
    articleToProcess.content = await processContentImages(accessToken, articleToProcess.content);
  }

  const url = `${WECHAT_API_BASE}/draft/update?access_token=${accessToken}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_id, index, articles: articleToProcess })
  })
  const result = await response.json();
  if (result.errcode) {
    throw new Error(`更新草稿失败: [${result.errcode}] ${result.errmsg}`);
  }
  return result;
}

// 获取草稿列表
async function getDraftList(accessToken, offset = 0, count = 20) {
  const url = `${WECHAT_API_BASE}/draft/batchget?access_token=${accessToken}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offset, count, no_content: 0 })
  })
  return await response.json()
}

// 获取草稿详情
async function getDraft(accessToken, mediaId) {
  const url = `${WECHAT_API_BASE}/draft/get?access_token=${accessToken}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_id: mediaId })
  })
  return await response.json()
}

// 删除草稿
async function deleteDraft(accessToken, mediaId) {
  const url = `${WECHAT_API_BASE}/draft/delete?access_token=${accessToken}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_id: mediaId })
  })
  return await response.json()
}

// 获取已发布文章列表
async function getPublishedList(accessToken, offset = 0, count = 20) {
  const url = `${WECHAT_API_BASE}/freepublish/batchget?access_token=${accessToken}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ offset, count, no_content: 0 })
  })
  return await response.json()
}

// 删除已发布文章
async function deletePublished(accessToken, article_id) {
  const url = `${WECHAT_API_BASE}/freepublish/delete?access_token=${accessToken}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ article_id })
  })
  return await response.json()
}

// 发布草稿
async function submitPublish(accessToken, media_id) {
  const url = `${WECHAT_API_BASE}/freepublish/submit?access_token=${accessToken}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ media_id })
  })
  return await response.json()
}

const VERSION = "10.0.61";

// 检查微信 API 返回结果是否包含 access_token 失效错误码 (40001)
function isInvalidTokenError(result: any): boolean {
  return result && typeof result === 'object' && result.errcode === 40001;
}

async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/wechat-api', '');

  // 健康检查接口
  if (path === '/health') {
    return new Response(
      JSON.stringify({ status: 'ok', version: VERSION, service: 'wechat-api' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { action, configId, menuData, openid, articles, mediaId, index, offset, count, imageUrl } = body;

    if (!action || !configId) {
      throw new Error('参数缺失: action 和 configId 是必填项');
    }

    // 获取微信配置
    const { data: config, error: configError } = await supabase
      .from('wechat_configs')
      .select('*')
      .eq('id', configId)
      .eq('is_active', true)
      .maybeSingle();

    if (configError) throw configError;
    if (!config) {
      throw new Error(`微信配置不存在或未启用: ${configId}`);
    }

    // 获取 access_token
    let accessToken = await getAccessToken(supabase, config.id, config.appid, config.appsecret);

    // 定义执行逻辑（用于重试）
    const executeAction = async (token: string) => {
      switch (action) {
        case 'get_access_token':
          return { access_token: token };

        case 'create_menu':
          if (!menuData) throw new Error('参数缺失: create_menu 需要 menuData');
          return await createMenu(token, menuData);

        case 'get_menu':
          return await getMenu(token);

        case 'delete_menu':
          return await deleteMenu(token);

        case 'get_user_info':
          if (!openid) throw new Error('参数缺失: get_user_info 需要 openid');
          return await getUserInfo(token, openid);

        case 'upload_image':
          if (!imageUrl) throw new Error('参数缺失: upload_image 需要 imageUrl');
          return await uploadImage(token, imageUrl);

        case 'upload_content_image':
          if (!imageUrl) throw new Error('参数缺失: upload_content_image 需要 imageUrl');
          return await uploadContentImage(token, imageUrl);

        case 'add_draft':
          if (!articles || !Array.isArray(articles)) throw new Error('参数缺失: add_draft 需要 articles 数组');
          return await addDraft(token, articles);

        case 'update_draft':
          if (!mediaId) throw new Error('参数缺失: update_draft 需要 mediaId');
          if (!articles) throw new Error('参数缺失: update_draft 需要 articles');
          return await updateDraft(token, mediaId, index || 0, articles);

        case 'get_draft_list':
          return await getDraftList(token, offset || 0, count || 20);

        case 'get_draft':
          if (!mediaId) throw new Error('参数缺失: get_draft 需要 mediaId');
          return await getDraft(token, mediaId);

        case 'delete_draft':
          if (!mediaId) throw new Error('参数缺失: delete_draft 需要 mediaId');
          return await deleteDraft(token, mediaId);

        case 'get_published_list':
          return await getPublishedList(token, offset || 0, count || 20);

        case 'delete_published':
          if (!body.articleId) throw new Error('参数缺失: delete_published 需要 articleId');
          return await deletePublished(token, body.articleId);

        case 'submit_publish':
          if (!mediaId) throw new Error('参数缺失: submit_publish 需要 mediaId');
          return await submitPublish(token, mediaId);

        default:
          throw new Error(`未知操作类型: ${action}`);
      }
    };

    // 第一次执行
    let apiResult: any = await executeAction(accessToken);

    // 如果返回 40001（access_token 无效），强制刷新并重试
    if (isInvalidTokenError(apiResult)) {
      console.warn(`[Wechat-API] 检测到 access_token 失效 (40001)，正在强制刷新并重试: ${action}`);
      // 清除缓存
      await supabase.from('wechat_access_tokens').delete().eq('config_id', config.id);
      // 强制重新获取
      accessToken = await getAccessToken(supabase, config.id, config.appid, config.appsecret, true);
      // 重试
      apiResult = await executeAction(accessToken);
    }

    return new Response(JSON.stringify({ success: true, data: apiResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Wechat-API Error]:', error);
    const errMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
}

Deno.serve(handler);
