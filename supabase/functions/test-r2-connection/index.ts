import { createHash, createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// AWS Signature V4 签名函数
function hmacSha256(key: Uint8Array | string, data): Uint8Array {
  const hmac = createHmac('sha256', key)
  hmac.update(data)
  return new Uint8Array(hmac.digest())
}

function sha256(data) {
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

async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { endpoint, key_id, secret_key, bucket_name } = body;

    if (!endpoint || !key_id || !secret_key || !bucket_name) {
      throw new Error('配置信息不完整：请填写完整的端点、访问密钥ID、密钥和存储桶名称')
    }

    // 解析端点 URL
    let endpointUrl; 
    try { 
      endpointUrl = new URL(endpoint); 
    } catch (e) { 
      throw new Error('无效的端点 URL 地址'); 
    }
    const host = endpointUrl.hostname
    const region = 'auto' // Cloudflare R2 使用 'auto' 作为 region
    const service = 's3'
    
    // 构建请求路径（路径式访问）
    const canonicalUri = `/${bucket_name}/`
    const canonicalQuerystring = 'list-type=2&max-keys=1'
    
    // 获取当前时间
    const now = new Date()
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
    const dateStamp = amzDate.slice(0, 8)
    
    // 构建规范请求
    const payloadHash = sha256('')
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'
    
    const canonicalRequest = [
      'GET',
      canonicalUri,
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
      sha256(canonicalRequest)
    ].join('\n')
    
    // 计算签名
    const signingKey = getSignatureKey(secret_key, dateStamp, region, service)
    const signatureArr = Array.from(hmacSha256(signingKey, stringToSign));
    const signature = signatureArr.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // 构建 Authorization header
    const authorizationHeader = `${algorithm} Credential=${key_id}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    
    // 发送请求
    const testUrl = `${endpoint.replace(/\/+$/, '')}${canonicalUri}?${canonicalQuerystring}`
    
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Host': host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorizationHeader,
      },
      signal: AbortSignal.timeout(10000)
    })

    const responseText = await testResponse.text().catch(() => "")
    
    if (testResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "✅ R2 连接成功！配置正确，可以正常访问存储桶。"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // 提供详细的错误信息
      let errorMsg = `连接失败 (HTTP ${testResponse.status})`
      
      if (testResponse.status === 403) {
        errorMsg = '❌ 认证失败：请检查 Access Key ID 和 Secret Access Key 是否正确'
      } else if (testResponse.status === 404) {
        errorMsg = '❌ 存储桶不存在：请检查 Bucket Name 是否正确'
      } else if (testResponse.status >= 500) {
        errorMsg = '❌ 服务器错误：请检查 Endpoint 地址是否正确'
      }
      
      throw new Error(`${errorMsg}\n响应详情: ${responseText.slice(0, 200)}`)
    }
  } catch (error) {
    const err = error as Error;
    console.error('[Test-R2-Connection Error]:', err.message)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message || '未知错误'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

Deno.serve(handler);
