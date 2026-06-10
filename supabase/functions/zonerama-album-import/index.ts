import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { albumId } = await req.json();
    if (!albumId) {
      return new Response(JSON.stringify({ error: "albumId is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 初始化 Supabase 客户端
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 从数据库读取图集内图片列表接口配置
    console.log('[zonerama-album-import] 读取图集内图片列表接口配置...');
    const { data: configData, error: configError } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'zonerama_upload_config')
      .single();

    if (configError) {
      console.error('[zonerama-album-import] 读取配置失败:', configError);
      return new Response(JSON.stringify({ 
        code: 500,
        msg: '读取配置失败: ' + configError.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // 提取图集内图片列表接口配置
    const albumPhotoApi = configData?.value?.album_photo_api || '';
    console.log('[zonerama-album-import] 图集内图片列表接口配置:', albumPhotoApi);

    if (!albumPhotoApi) {
      return new Response(JSON.stringify({ 
        code: 400,
        msg: '图集内图片列表接口未配置，请在后台管理系统配置：系统参数设置 → 存储管理 → 专享上传 → 图集内图片列表接口（可选）' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 拼接完整的 API URL
    const apiUrl = `${albumPhotoApi}${albumId}`;
    console.log(`[zonerama-album-import] 调用 Zonerama API: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
      console.error(`[zonerama-album-import] API 响应失败: ${response.status}`);
      return new Response(JSON.stringify({ 
        code: 502,
        msg: `Zonerama API 响应失败，状态码: ${response.status}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    const data = await response.json();
    console.log('[zonerama-album-import] API 响应数据:', JSON.stringify(data).substring(0, 200));

    // 提取 photos 数组中的 url 字段
    const photos = data.photos || [];
    if (!Array.isArray(photos) || photos.length === 0) {
      return new Response(JSON.stringify({ 
        code: 404,
        msg: '该图集下未找到图片' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 提取所有图片 URL
    const imageUrls = photos.map((photo: any) => photo.url).filter(Boolean);
    console.log(`[zonerama-album-import] 提取到 ${imageUrls.length} 个图片 URL`);

    // 读取图片接口配置（用于代理处理）
    const photoApi = configData?.value?.photo_api || '';
    console.log('[zonerama-album-import] 图片接口配置:', photoApi);

    // 如果配置了图片接口，则对所有 URL 进行代理处理
    let processedUrls = imageUrls;
    if (photoApi) {
      processedUrls = imageUrls.map((url: string) => {
        // 检查是否为 Zonerama 图片
        if (url.includes('zonerama.com/photos')) {
          // 如果 URL 已经包含接口前缀，则不再重复拼接
          if (url.startsWith(photoApi)) {
            return url;
          }
          // 拼接接口前缀
          return `${photoApi}${url}`;
        }
        return url;
      });
      console.log(`[zonerama-album-import] 已对 ${processedUrls.length} 个 URL 应用代理接口`);
    } else {
      console.warn('[zonerama-album-import] ⚠️ 图片接口未配置，返回原始 URL');
    }

    // 返回处理后的 URL 列表
    return new Response(JSON.stringify({ 
      code: 200,
      msg: '获取成功',
      list: processedUrls,
      data: processedUrls
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[zonerama-album-import] 错误:", err);
    return new Response(JSON.stringify({ 
      code: 500,
      msg: err.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
