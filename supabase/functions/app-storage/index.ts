import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bucket-name',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// AWS Signature V4 签名工具类
class AWS4Signer {
  static async hmacSha256(key: CryptoKey | Uint8Array, data: Uint8Array): Promise<Uint8Array> {
    let cryptoKey: CryptoKey;
    if (key instanceof Uint8Array) {
      cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
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

async function validateRequest(supabase: any, url: URL, req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const apiKey = url.searchParams.get('apiKey') || req.headers.get('x-api-key') || '';
  const appId = url.searchParams.get('appId') || '';

  // 1. 优先尝试 Supabase Auth 验证（内部调用，来自 supabase.functions.invoke）
  if (authHeader.startsWith('Bearer ') && !apiKey) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        // 验证用户是否为管理员
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.role === 'admin') {
          return { valid: true, keyData: { permissions: ['admin'], user_id: user.id } };
        }
      }
    } catch (e) {
      console.log('[AppStorage] Auth validation error:', e);
    }
  }

  // 2. API Key 验证（外部应用调用）
  if (!apiKey || !appId) return { valid: false, message: 'Missing apiKey or appId' };

  const { data, error } = await supabase
    .from('app_api_keys')
    .select('id, permissions, expires_at')
    .eq('app_id', appId)
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return { valid: false, message: 'Invalid API Key' };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { valid: false, message: 'API Key expired' };
  }

  return { valid: true, keyData: data };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const validation = await validateRequest(supabaseClient, url, req);
    if (!validation.valid) {
      return new Response(JSON.stringify({ success: false, message: validation.message }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. 获取存储配置
    const { data: config } = await supabaseClient
      .from('storage_configs')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!config) {
      throw new Error('未发现存储配置');
    }

    // 2. 解析请求
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    const headerBucket = req.headers.get('x-bucket-name');
    const formBucket = formData.get('bucket') as string;
    const targetBucket = headerBucket || formBucket || config.bucket_name || 'media_content';

    if (!file || !fileName) {
      throw new Error('缺少文件或文件名');
    }

    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    const contentType = file.type || 'application/octet-stream';

    // 3. 按照优先级尝试存储方式
    // 优先级 1: S3 直连配置
    const hasS3Config = config.endpoint && config.key_id && config.secret_key && config.bucket_name;
    if (hasS3Config) {
      console.log('[AppStorage] Using S3 Direct mode');
      try {
        const { endpoint, key_id, secret_key, custom_domain } = config;
        const endpointUrl = new URL(endpoint);
        const host = endpointUrl.hostname;
        const region = 'auto';
        const service = 's3';
        const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
        const dateStamp = amzDate.slice(0, 8);
        
        const canonicalUri = `/${targetBucket}/${fileName}`;
        const encodedUri = canonicalUri.split('/').map(s => encodeURIComponent(s)).join('/');
        const payloadHash = await AWS4Signer.sha256(fileBytes);
        const canonicalHeaders = `cache-control:public, max-age=86400\ncontent-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
        const signedHeaders = 'cache-control;content-type;host;x-amz-content-sha256;x-amz-date';
        const canonicalRequest = ['PUT', encodedUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
        const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await AWS4Signer.sha256(new TextEncoder().encode(canonicalRequest))].join('\n');
        const signingKey = await AWS4Signer.getSignatureKey(secret_key, dateStamp, region, service);
        const signatureArr = await AWS4Signer.hmacSha256(signingKey, new TextEncoder().encode(stringToSign));
        const signature = Array.from(signatureArr).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const uploadUrl = `${endpoint.replace(/\/+$/, '')}${encodedUri}`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Host': host,
            'x-amz-date': amzDate,
            'x-amz-content-sha256': payloadHash,
            'Authorization': `AWS4-HMAC-SHA256 Credential=${key_id}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400',
          },
          body: fileBytes
        });

        if (uploadRes.ok) {
          const publicUrl = custom_domain ? `${custom_domain.replace(/\/+$/, '')}/${fileName}` : `${endpoint.replace(/\/+$/, '')}/${targetBucket}/${fileName}`;
          return new Response(JSON.stringify({ success: true, url: publicUrl, mode: 's3' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        console.warn('[AppStorage] S3 upload failed, trying next method...');
      } catch (e) {
        console.error('[AppStorage] S3 error:', e);
      }
    }

    // 优先级 2: Worker 模式
    const hasWorkerConfig = config.r2_worker_url && config.r2_worker_token;
    if (hasWorkerConfig) {
      console.log('[AppStorage] Using Worker mode');
      try {
        const workerFormData = new FormData();
        workerFormData.append('file', file);
        workerFormData.append('fileName', fileName);
        
        const uploadRes = await fetch(`${config.r2_worker_url.replace(/\/$/, '')}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.r2_worker_token}`,
            'x-bucket-name': targetBucket
          },
          body: workerFormData
        });

        if (uploadRes.ok) {
          const data = await uploadRes.json();
          if (data.success) {
            const url = data.url || data.fakeUrl;
            if (url) {
              // 验证 Worker 返回的 URL 是否真实可访问
              try {
                const verifyRes = await fetch(url, { method: 'HEAD' });
                if (verifyRes.ok) {
                  return new Response(JSON.stringify({ success: true, url, mode: 'worker' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
                console.warn('[AppStorage] Worker URL 验证失败 (HEAD ' + verifyRes.status + '):', url);
              } catch (e) {
                console.warn('[AppStorage] Worker URL 验证出错:', e.message);
              }
            }
          }
        }
        console.warn('[AppStorage] Worker upload failed, trying next method...');
      } catch (e) {
        console.error('[AppStorage] Worker error:', e);
      }
    }

    // 优先级 3: Supabase 兜底
    console.log('[AppStorage] Falling back to Supabase Storage');
    const { data: uploadData, error: upError } = await supabaseClient.storage
      .from('media_content')
      .upload(fileName, fileBytes, { contentType, upsert: true });

    if (upError) throw upError;

    const { data: { publicUrl } } = supabaseClient.storage.from('media_content').getPublicUrl(fileName);
    return new Response(JSON.stringify({ success: true, url: publicUrl, mode: 'supabase' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})
