import { supabase } from '@/db/supabase';
import { toast } from 'sonner';

export interface UploadOptions {
  file: File;
  path: string;
  storageConfig?: any;
}

/**
 * 验证 URL 是否真实可访问（主要用于图片）
 * 使用 Image 对象验证图片，非图片使用 fetch HEAD
 */
function verifyUrl(url: string, timeout = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);
    // 图片 URL：使用 Image 对象验证（能准确检测 404）
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(url)) {
      const img = new Image();
      img.onload = () => { clearTimeout(timer); resolve(true); };
      img.onerror = () => { clearTimeout(timer); resolve(false); };
      img.src = url;
    } else {
      // 非图片：使用 fetch HEAD（no-cors 模式，至少验证域名可达）
      fetch(url, { method: 'HEAD', mode: 'no-cors' })
        .then(() => { clearTimeout(timer); resolve(true); })
        .catch(() => { clearTimeout(timer); resolve(false); });
    }
  });
}

export async function uploadToStorage(options: UploadOptions) {
  let { file, path, storageConfig } = options;
  
  // 核心修复：对上传路径进行脱敏处理，防止由于中文字符导致的 "InvalidKey" 错误（特别是在 Cloudflare R2/Worker 环境下）
  const sanitizePath = (p: string) => {
    return p.split('/').map(part => {
      // 仅保留基础字符，中文字符替换为下划线
      const sanitized = part.replace(/[^\w.-]/g, '_');
      // 如果经过过滤后变成空字符串（例如纯中文名），则使用时间戳兜底
      return sanitized || `file_${Date.now()}`;
    }).join('/');
  };
  
  path = sanitizePath(path);
  
  // 获取存储优先级和配置
  const storagePriority = storageConfig?.storage_priority || 'r2_first'; // r2_first | supabase_first
  const r2Mode = storageConfig?.r2_mode || 'direct'; // direct | worker
  const workerUrl = storageConfig?.r2_worker_url;
  const workerToken = storageConfig?.r2_worker_token;
  
  const tryWorkerUpload = async () => {
    if (!workerUrl) return null;
    try {
      const baseUrl = workerUrl.endsWith('/') ? workerUrl.slice(0, -1) : workerUrl;
      
      // 优先尝试 POST /upload（与 app-storage 标准接口一致）
      const postUrl = `${baseUrl}/upload`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', path);
      
      const postHeaders: Record<string, string> = {
        'Authorization': `Bearer ${workerToken}`,
      };
      if (storageConfig?.bucket_name) {
        postHeaders['x-bucket-name'] = storageConfig.bucket_name;
      }
      
      console.log('[Upload] 尝试 Worker POST /upload:', postUrl);
      let response = await fetch(postUrl, {
        method: 'POST',
        headers: postHeaders,
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.success) {
          const url = data.url || data.fakeUrl;
          if (!url) {
            console.warn('[Upload] Worker 返回成功但 URL 为空');
            return null;
          }
          // 验证 Worker 返回的 URL 是否真实可访问
          const isValid = await verifyUrl(url);
          if (isValid) {
            console.log('[Upload] Worker POST /upload 成功且 URL 验证通过:', url);
            return { success: true, url };
          }
          console.warn('[Upload] Worker 返回的 URL 无法访问，将尝试回退:', url);
          return null;
        }
      }
      
      // POST /upload 失败，尝试旧版 PUT 直接上传（兼容旧 Worker）
      console.warn('[Upload] Worker POST /upload 失败，尝试 PUT 直接上传...');
      const putUrl = `${baseUrl}/${path}`;
      response = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${workerToken}`,
          'Content-Type': file.type
        },
        body: file
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error text');
        console.error(`[Upload] Worker PUT 返回错误: ${response.status}`, errorText);
        throw new Error(`Worker upload failed: ${response.status}`);
      }
      
      let finalUrl = '';
      if (storageConfig?.custom_domain) {
        const domain = storageConfig.custom_domain.endsWith('/') ? storageConfig.custom_domain : storageConfig.custom_domain + '/';
        finalUrl = domain + path;
      } else {
        finalUrl = putUrl;
      }
      
      // 验证 PUT 上传后的 URL 是否可访问
      const isValid = await verifyUrl(finalUrl);
      if (isValid) {
        return { success: true, url: finalUrl };
      }
      console.warn('[Upload] Worker PUT 上传后 URL 验证失败:', finalUrl);
      return null;
    } catch (e) {
      console.error('Worker upload error:', e);
      return null;
    }
  };

  const tryR2S3Direct = async () => {
    // 尝试调用统一的 app-storage 云函数
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', path);
      if (storageConfig?.bucket_name) {
        formData.append('bucket', storageConfig.bucket_name);
      }
      
      const { data, error } = await supabase.functions.invoke('app-storage', { 
        body: formData,
        headers: {
          'x-bucket-name': storageConfig?.bucket_name || ''
        }
      });
      
      if (error || !data?.success) {
        return null;
      }
      // 云函数返回成功时，额外验证 URL 是否真实可访问（防御 Worker 返回假成功）
      if (data.url) {
        const isValid = await verifyUrl(data.url);
        if (!isValid) {
          console.warn('[Upload] app-storage 返回的 URL 验证失败:', data.url);
          return null;
        }
      }
      return data;
    } catch (e) {
      return null;
    }
  };

  const trySupabase = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('media_content')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('media_content')
        .getPublicUrl(path);
        
      return { success: true, url: publicUrl };
    } catch (e) {
      return null;
    }
  };

  // 执行策略
  console.log(`[Upload] 优先级: ${storagePriority}, 模式: ${r2Mode}, 文件: ${path}`);
  
  if (storagePriority === 'r2_first') {
    // 优先尝试 app-storage 云函数（内部包含 S3 直连 -> Worker -> Supabase 完整回退链）
    console.log('[Upload] 优先尝试 app-storage 云函数上传...');
    const edgeRes = await tryR2S3Direct();
    if (edgeRes?.success) {
      console.log('[Upload] app-storage 云函数上传成功:', edgeRes.url);
      return edgeRes;
    }
    console.warn('[Upload] app-storage 云函数上传失败，尝试前端直连 Worker...');
    
    // 前端直连 Worker（兼容旧配置）
    if (r2Mode === 'worker') {
      const workerRes = await tryWorkerUpload();
      if (workerRes?.success) {
        console.log('[Upload] 前端直连 Worker 上传成功:', workerRes.url);
        return workerRes;
      }
      console.warn('[Upload] Worker 上传失败，正在回退到 Supabase...');
      toast.error('云端存储上传失败，将尝试回退到 Supabase');
    } else {
      console.warn('[Upload] R2/S3 直连上传失败，正在回退到 Supabase...');
      toast.error('R2 直连上传失败，将尝试回退到 Supabase');
    }
    
    // Fallback to Supabase
    const supabaseRes = await trySupabase();
    if (supabaseRes?.success) {
      console.log('[Upload] 回退到 Supabase 上传成功');
    }
    return supabaseRes;
  } else {
    // Supabase First
    console.log('[Upload] 优先尝试 Supabase 上传...');
    const res = await trySupabase();
    if (res) {
      console.log('[Upload] Supabase 上传成功:', res.url);
      return res;
    }
    // Fallback to R2
    console.warn('[Upload] Supabase 上传失败，尝试回退到 R2...');
    toast.error('Supabase 存储失败，正在尝试回退到云端存储');
    if (r2Mode === 'worker') {
      return await tryWorkerUpload() || { success: false, url: '' };
    } else {
      return await tryR2S3Direct() || { success: false, url: '' };
    }
  }
}
