import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// AWS Signature V4 签名工具类 (使用原生 Web Crypto)
class AWS4Signer {
  static async hmacSha256(key: CryptoKey | Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    let cryptoKey: CryptoKey;
    if (key instanceof Uint8Array) {
      cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
    } else {
      cryptoKey = key;
    }
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return new Uint8Array(signature);
  }

  static async sha256(data: Uint8Array): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static async getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<Uint8Array> {
    const kDate = await this.hmacSha256(new TextEncoder().encode('AWS4' + key), new TextEncoder().encode(dateStamp));
    const kRegion = await this.hmacSha256(kDate, new TextEncoder().encode(regionName));
    const kService = await this.hmacSha256(kRegion, new TextEncoder().encode(serviceName));
    const kSigning = await this.hmacSha256(kService, new TextEncoder().encode('aws4_request'));
    return kSigning;
  }
}

const VERSION = "10.0.61";

async function handler(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname.replace('/upload-to-r2', '');

  // 健康检查接口
  if (path === '/health') {
    return new Response(
      JSON.stringify({ status: 'ok', version: VERSION, service: 'upload-to-r2' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }

  // 处理跨域预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('缺少必要的环境变量: SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey);

    // API Key 验证 (去除强制 JWT)
    const apiKey = url.searchParams.get('apiKey') || req.headers.get('x-api-key') || '';
    const appId = url.searchParams.get('appId') || '';

    if (apiKey && appId) {
      const { data: keyData, error: keyError } = await supabaseService
        .from('app_api_keys')
        .select('id')
        .eq('app_id', appId)
        .eq('api_key', apiKey)
        .eq('is_active', true)
        .maybeSingle();
      
      if (keyError || !keyData) {
        throw new Error('API Key 无效或已过期');
      }
    } else {
      // 如果没有 API Key，尝试验证 JWT (兼容旧逻辑或内部调用)
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseClient = createClient(
          supabaseUrl,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
          throw new Error('未授权或登录已过期');
        }
      } else {
        throw new Error('缺少鉴权信息 (API Key 或 Authorization Header)');
      }
    }

    // 解析请求体
    const formData = await req.formData().catch(() => { throw new Error('解析表单数据失败') });
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string
    const targetBucket = (formData.get('bucket') as string) || 'media_content'

    if (!file || !fileName) {
      throw new Error('参数缺失: 缺少文件或文件名')
    }

    // 获取 R2 配置
    const { data: config, error: configError } = await supabaseService
      .from('storage_configs')
      .select('*')
      .limit(1)
      .maybeSingle()
    
    if (configError) throw configError;

    const notifyAdmins = async () => {
      try {
        const { data: admins } = await supabaseService
          .from('profiles')
          .select('id')
          .eq('role', 'admin')

        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            user_id: admin.id,
            title: '存储配置失效 (Cloudflare R2)',
            content: '系统检测到 Cloudflare R2 (cfrw) 存储配置无效或上传失败，已自动切换至系统 Supabase 存储。请立即检查管理后台的存储配置信息，确保密钥和端点正确。',
            type: 'system',
            link: '/admin/pc/storage',
            link_type: 'internal'
          }))
          await supabaseService.from('notifications').insert(notifications)
        }
      } catch (e) {
        const notifyErr = e as Error;
        console.error('发送管理员通知失败:', notifyErr.message)
      }
    }

    const uploadToSupabase = async () => {
      const fileBuffer = await file.arrayBuffer()
      // 检查存储桶是否存在，不存在则使用默认的 media_content
      const bucketName = targetBucket || 'media_content'
      const { data: buckets } = await supabaseService.storage.listBuckets()
      const bucketExists = buckets?.some(b => b.id === bucketName)
      const finalBucket = bucketExists ? bucketName : 'media_content'

      // 使用 supabaseService 而不是 supabaseClient，以绕过 RLS 限制（后台回退上传是受信任的）
      const { data: uploadData, error: uploadError } = await supabaseService.storage
        .from(finalBucket)
        .upload(fileName, fileBuffer, {
          contentType: file.type || 'application/octet-stream',
          cacheControl: '86400',
          upsert: true
        })

      if (uploadError) {
        throw new Error(`Supabase Storage 上传失败 (${finalBucket}): ${uploadError.message}`)
      }

      const { data: { publicUrl } } = supabaseService.storage
        .from(finalBucket)
        .getPublicUrl(uploadData.path)

      return publicUrl
    }

    const isR2Configured = config && (
      (config.r2_mode === 'worker' && config.r2_worker_url && config.r2_worker_token) ||
      (config.endpoint && config.key_id && config.secret_key && config.bucket_name)
    );

    if (!isR2Configured) {
      console.log('R2 配置缺失或不完整，使用 Supabase Storage 并通知管理员')
      await notifyAdmins()
      const url = await uploadToSupabase()
      return new Response(
        JSON.stringify({ 
          success: true, 
          url,
          message: 'R2 未配置或配置不完整，已回退至 Supabase Storage'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { endpoint, key_id, secret_key, bucket_name, custom_domain, r2_mode, r2_worker_url, r2_worker_token } = config

    try {
      // Worker 模式对接
      if (r2_mode === 'worker') {
        if (!r2_worker_url || !r2_worker_token) {
          throw new Error('Worker 模式下 Worker 接口域名和密钥不能为空');
        }

        const workerFormData = new FormData();
        workerFormData.append('file', file);
        workerFormData.append('fileName', fileName);
        
        const uploadUrl = `${r2_worker_url.replace(/\/$/, '')}/upload`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${r2_worker_token}`,
            'x-bucket-name': targetBucket || bucket_name || ''
          },
          body: workerFormData
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => 'No response body');
          throw new Error(`Worker 上传失败: ${uploadRes.status} - ${errText.slice(0, 100)}`);
        }

        const data = await uploadRes.json();
        if (!data.success) {
          throw new Error(`Worker 接口返回错误: ${data.message || '未知错误'}`);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            url: data.url || data.fakeUrl,
            message: '上传成功 (Worker)'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 直连模式 (S3 兼容)
      // 读取文件内容
      const fileBuffer = await file.arrayBuffer()
      const fileBytes = new Uint8Array(fileBuffer)

      // 解析端点 URL
      let endpointUrl;
      try {
        endpointUrl = new URL(endpoint);
      } catch (e) {
        throw new Error('无效的 R2 端点 URL');
      }
      const host = endpointUrl.hostname
      const region = 'auto'
      const service = 's3'
      
      // 构建请求路径并进行 URI 编码（AWS Signature V4 要求规范化路径）
      const canonicalUri = `/${bucket_name}/${fileName}`
      const encodedUri = canonicalUri.split('/').map(s => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');
      
      const canonicalQuerystring = ''
      
      // 获取当前时间
      const now = new Date()
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
      const dateStamp = amzDate.slice(0, 8)
      
      // 计算文件哈希
      const payloadHash = await AWS4Signer.sha256(fileBytes)
      const contentType = file.type || 'application/octet-stream'
      const cacheControl = 'public, max-age=86400'
      
      // 构建规范请求 (使用编码后的 URI)
      const canonicalHeaders = `cache-control:${cacheControl}\ncontent-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
      const signedHeaders = 'cache-control;content-type;host;x-amz-content-sha256;x-amz-date'
      
      const canonicalRequest = [
        'PUT',
        encodedUri,
        canonicalQuerystring,
        canonicalHeaders,
        signedHeaders,
        payloadHash
      ].join('\n')
      
      // 构建待签名字符串
      const algorithm = 'AWS4-HMAC-SHA256'
      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
      const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        await AWS4Signer.sha256(new TextEncoder().encode(canonicalRequest))
      ].join('\n')
      
      // 计算签名
      const signingKey = await AWS4Signer.getSignatureKey(secret_key, dateStamp, region, service)
      const signatureArr = await AWS4Signer.hmacSha256(signingKey, new TextEncoder().encode(stringToSign))
      const signature = Array.from(signatureArr).map(b => b.toString(16).padStart(2, '0')).join('')
      
      // 构建 Authorization header
      const authorizationHeader = `${algorithm} Credential=${key_id}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
      
      // 上传文件到 R2 (使用编码后的 URI)
      const uploadUrl = `${endpoint.replace(/\/+$/, '')}${encodedUri}`
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Host': host,
          'x-amz-date': amzDate,
          'x-amz-content-sha256': payloadHash,
          'Authorization': authorizationHeader,
          'Content-Type': contentType,
          'Cache-Control': cacheControl,
        },
        body: fileBytes
      })

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text().catch(() => 'No response body')
        console.error(`[R2 Upload Error] Status: ${uploadResponse.status}, Response: ${errText}`)
        throw new Error(`R2 上传响应错误: ${uploadResponse.status} - ${errText.slice(0, 100)}`)
      }

      // 生成访问 URL（优先使用自定义域名）
      let publicUrl
      const trimmedDomain = custom_domain?.replace(/\/+$/, '')
      const trimmedEndpoint = endpoint.replace(/\/+$/, '')
      const cleanFileName = fileName.replace(/^\/+/, '')

      if (trimmedDomain) {
        publicUrl = `${trimmedDomain}/${cleanFileName}`
      } else {
        publicUrl = `${trimmedEndpoint}/${bucket_name}/${cleanFileName}`
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          url: publicUrl,
          message: '上传成功'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (r2Error) {
      const r2Err = r2Error as Error;
      console.error('R2 上传失败，回退至 Supabase:', r2Err.message)
      await notifyAdmins()
      const url = await uploadToSupabase()
      return new Response(
        JSON.stringify({ 
          success: true, 
          url,
          message: 'R2 上传失败，已回退至 Supabase Storage',
          error: r2Err.message
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    const err = error as Error;
    console.error('R2 上传错误:', err.message)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message || '上传失败'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

serve(handler);
