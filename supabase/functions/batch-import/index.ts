import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash, createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// AWS Signature V4 签名函数
function hmacSha256(key: Uint8Array | string, data: string | Uint8Array): Uint8Array {
  const hmac = createHmac('sha256', key)
  hmac.update(data)
  return new Uint8Array(hmac.digest())
}

function sha256(data: string | Uint8Array) {
  const hash = createHash('sha256')
  hash.update(data)
  return hash.digest('hex')
}

function getSignatureKey(key, dateStamp, regionName, serviceName): Uint8Array {
  const kDate = hmacSha256('AWS4' + key, dateStamp)
  const kRegion = hmacSha256(kDate, regionName)
  const kService = hmacSha256(kRegion, serviceName)
  const kSigning = hmacSha256(kService, 'aws4_request')
  return kSigning
}

async function uploadToR2(fileBytes: Uint8Array, fileName, contentType, config) {
  const { endpoint, key_id, secret_key, bucket_name, custom_domain } = config
  
  const endpointUrl = new URL(endpoint)
  const host = endpointUrl.hostname
  const region = 'auto'
  const service = 's3'
  
  const canonicalUri = `/${bucket_name}/${fileName}`
  const canonicalQuerystring = ''
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256(fileBytes)
  
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = ['PUT', canonicalUri, canonicalQuerystring, canonicalHeaders, signedHeaders, payloadHash].join('\n')
  
  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [algorithm, amzDate, credentialScope, sha256(canonicalRequest)].join('\n')
  
  const signingKey = getSignatureKey(secret_key, dateStamp, region, service)
  const signature = Array.from(hmacSha256(signingKey, stringToSign)).map(b => b.toString(16).padStart(2, '0')).join('')
  const authorizationHeader = `${algorithm} Credential=${key_id}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  
  const uploadUrl = `${endpoint}${canonicalUri}`
  console.log(`正在上传到 R2: ${uploadUrl}`)
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Host': host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorizationHeader,
      'Content-Type': contentType,
    },
    body: fileBytes
  })

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text()
    console.error(`R2 上传失败响应: ${errorBody}`)
    throw new Error(`R2 上传失败: ${uploadResponse.status} ${errorBody}`)
  }

  let finalUrl = ''
  if (custom_domain) {
    // 确保 custom_domain 包含协议
    const domain = custom_domain.startsWith('http') ? custom_domain : `https://${custom_domain}`
    finalUrl = `${domain.replace(/\/$/, '')}/${fileName}`
  } else {
    finalUrl = `${endpoint.replace(/\/$/, '')}/${bucket_name}/${fileName}`
  }
  
  console.log(`上传成功，最终 URL: ${finalUrl}`)
  return finalUrl
}

async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('缺少必要的环境变量: SUPABASE_URL, SUPABASE_ANON_KEY 或 SUPABASE_SERVICE_ROLE_KEY');
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('缺少鉴权信息')

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('未授权或登录已过期')

    const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: config, error: configError } = await supabaseService.from('storage_configs').select('*').limit(1).maybeSingle()
    if (configError) throw configError;

    const body = await req.json().catch(() => ({}));
    const { urls, title } = body;
    if (!urls || !Array.isArray(urls)) throw new Error('参数缺失: urls 列表无效');

    // 生成默认标题格式: YYYYMMDDHHmm + 3位随机数 (例如: 202603130958652)
    const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
    const year = now.getUTCFullYear()
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0')
    const day = now.getUTCDate().toString().padStart(2, '0')
    const hours = now.getUTCHours().toString().padStart(2, '0')
    const minutes = now.getUTCMinutes().toString().padStart(2, '0')
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const defaultTitle = `${year}${month}${day}${hours}${minutes}${randomSuffix}`

    // 并行准备所有要插入的数据对象
    const mediaToInsert = await Promise.all(urls.map(async (url) => {
      try {
        if (!url || typeof url !== 'string') return null;
        const validUrl = new URL(url)
        
        let mediaType: 'image' | 'video' = 'image'
        if (url.match(/\.(mp4|mov|avi|wmv|flv|mkv)(\?.*)?$/i)) {
          mediaType = 'video'
        } else if (!url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i)) {
          try {
            const headRes = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(3000) })
            const contentType = headRes.headers.get('content-type') || ''
            if (contentType.includes('video')) {
              mediaType = 'video'
            }
          } catch (e) {
            const headErr = e as Error;
            console.warn(`HEAD 请求失败 [${url}]:`, headErr.message)
          }
        }

        return {
          user_id: user.id,
          url: url,
          title: title || defaultTitle,
          type: mediaType,
          status: 'pending'
        }
      } catch (err) {
        const itemErr = err as Error;
        console.error(`准备数据错误 [${url}]:`, itemErr.message)
        return null
      }
    }))

    const validItems = mediaToInsert.filter((item): item is NonNullable<typeof item> => item !== null)

    if (validItems.length === 0) {
      throw new Error('没有有效的 URL 可导入')
    }

    const { data: insertedData, error: dbError } = await supabaseClient
      .from('media_items')
      .insert(validItems)
      .select()

    if (dbError) throw dbError

    const results = urls.map(url => {
      const found = (insertedData || []).find((item) => item.url === url)
      return {
        url,
        success: !!found,
        media: found || null,
        error: found ? null : '导入失败或 URL 重复'
      }
    })

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    const err = error as Error;
    console.error('[Batch-Import Error]:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

Deno.serve(handler);
