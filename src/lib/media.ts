import { supabase } from '@/db/supabase';
import type { StorageConfig } from '@/types';
import { ImageCache } from './image-cache';

// -------------------------------------------------------------------------
// Helper: URL-safe Base64 Encoding
// -------------------------------------------------------------------------
function urlSafeBase64(string: string): string {
  const encoded = btoa(unescape(encodeURIComponent(string)));
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 优化小红书图片链接
 */
export function optimizeXiaohongshuUrl(url: string): string {
  if (!url) return url;
  
  const isXhsVideo = url.includes('sns-video-zl.xhscdn.com');
  if (isXhsVideo) {
    // 视频域名特殊处理：通过 Edge Function 代理绕过跨域与防盗链
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/xhs-video-proxy?url=${encodeURIComponent(url)}`;
  }

  // 识别小红书相关域名和路径
  const isCiDomain = url.includes('ci.xiaohongshu.com');
  const isSnsImgHw = url.includes('sns-img-hw.xhscdn.com');
  const hasNotesPrePost = url.includes('/notes_pre_post/');
  
  // 如果既不是 ci 域名也没有 notes_pre_post 路径，直接返回
  if (!isCiDomain && !hasNotesPrePost) {
    return url;
  }
  
  try {
    const cleanUrl = url.trim();
    const urlObj = new URL(cleanUrl);
    
    // 如果是视频域名，不做图片优化
    if (urlObj.hostname.includes('video')) {
      return cleanUrl;
    }

    let pathname = urlObj.pathname;
    
    // 只有在 ci.xiaohongshu.com 域名下，才必须强制去除 notes_pre_post 并转到 sns-img-hw
    // 因为 ci 域名本身在公网访问受限
    if (isCiDomain) {
      if (pathname.includes('/notes_pre_post/')) {
        pathname = pathname.replace('/notes_pre_post/', '/');
      }
      const segments = pathname.split('/').filter(Boolean);
      const imageId = segments.pop();
      
      if (imageId) {
        return `https://sns-img-hw.xhscdn.com/${imageId}?imageView2/2/w/1920/format/jpg`;
      }
    } 
    // 如果已经是 sns-img-hw.xhscdn.com 域名，且包含 notes_pre_post
    // 我们保留原始路径，因为某些预览资源（notes_pre_post）可能尚未同步到根目录，去掉会导致 404/403
    // 但我们可以统一协议为 https
    else if (isSnsImgHw && hasNotesPrePost) {
      if (url.startsWith('http://')) {
        return url.replace('http://', 'https://');
      }
    }
  } catch (e) {
    console.warn('小红书链接优化失败:', e);
  }
  return url;
}

// 缓存 Zonerama 图片接口配置
let cachedPhotoApi: string | null = null;
// 缓存 Zonerama 图集内图片接口配置
let cachedAlbumPhotoApi: string | null = null;
// 缓存 Zonerama 图片链接模式
let cachedUrlMode: 'id' | 'url' = 'id';
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 分钟缓存

// 缓存排除域名列表
let cachedExcludeDomains: string[] = [];
let lastDomainsFetchTime = 0;


// 缓存存储配置
let cachedStorageConfig: StorageConfig | null = null;
let lastStorageConfigFetchTime = 0;

let storageConfigPromise: Promise<StorageConfig | null> | null = null;

/**
 * 初始化存储配置
 */
export async function initStorageConfig(): Promise<StorageConfig | null> {
  const now = Date.now();
  if (cachedStorageConfig && now - lastStorageConfigFetchTime < CACHE_DURATION) {
    return cachedStorageConfig;
  }

  if (storageConfigPromise) {
    return storageConfigPromise;
  }

  storageConfigPromise = (async () => {
    try {
      const { data } = await supabase
        .from('storage_configs')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        cachedStorageConfig = data as StorageConfig;
        lastStorageConfigFetchTime = now;
        return cachedStorageConfig;
      }
    } catch (err) {
      console.warn('[initStorageConfig] 获取存储配置失败:', err);
    } finally {
      storageConfigPromise = null;
    }
    return null;
  })();

  return storageConfigPromise;
}

let proxyExcludeDomainsPromise: Promise<void> | null = null;

/**
 * 初始化图片代理排除域名配置
 */
export async function initProxyExcludeDomains(): Promise<void> {
  const now = Date.now();
  if (cachedExcludeDomains.length > 0 && now - lastDomainsFetchTime < CACHE_DURATION) {
    return;
  }

  if (proxyExcludeDomainsPromise) {
    return proxyExcludeDomainsPromise;
  }
  
  proxyExcludeDomainsPromise = (async () => {
    try {
      const { data } = await supabase
        .from('proxy_exclude_domains')
        .select('domain')
        .eq('is_enabled', true);
      
      if (data) {
        cachedExcludeDomains = (data as any[]).map(item => item.domain.toLowerCase());
        lastDomainsFetchTime = now;
      }
    } catch (err) {
      console.warn('[initProxyExcludeDomains] 获取排除域名失败:', err);
    } finally {
      proxyExcludeDomainsPromise = null;
    }
  })();

  return proxyExcludeDomainsPromise;
}

/**
 * 从 Zonerama URL 中提取图片 ID
 * 支持多种格式，包括原始 URL 和代理后的 URL
 * @param url 输入的 URL 或 ID
 * @returns 提取出的图片 ID
 */
export function extractZoneramaPhotoId(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  // 1. 匹配查询参数 id=12345
  const idQueryMatch = trimmed.match(/[?&]id=(\d+)/i);
  if (idQueryMatch && idQueryMatch[1]) return idQueryMatch[1];

  // 2. 匹配 Zonerama 路径格式 photos/(public/)?123456
  const photoMatch = trimmed.match(/photos\/(?:public\/)?(\d+)/i);
  if (photoMatch && photoMatch[1]) return photoMatch[1];

  // 3. 匹配 /photo/12345 (常见代理格式)
  const proxyMatch = trimmed.match(/\/photo\/(\d+)/i);
  if (proxyMatch && proxyMatch[1]) return proxyMatch[1];

  // 4. 匹配纯数字
  if (/^\d+$/.test(trimmed)) return trimmed;

  return '';
}

/**
 * 获取 Zonerama 原始图片 URL
 * @param id 图片 ID
 * @param width 宽度 (默认 2000)
 * @param height 高度 (默认 2000)
 * @returns 原始高清图片 URL
 */
export function getZoneramaOriginalUrl(id: string, width: number = 2000, height: number = 2000): string {
  if (!id) return '';
  // 如果输入包含 zonerama.com，说明已经是 URL，尝试提取 ID
  const photoId = id.includes('zonerama.com') ? extractZoneramaPhotoId(id) : id;
  if (!photoId) return id.includes('http') ? id : ''; // 无法提取且是 URL 则返回原样
  return `https://us.zonerama.com/photos/${photoId}_${width}x${height}_0.jpg`;
}

let isInitializingPhotoApi = false;
let photoApiPromise: Promise<void> | null = null;

/**
 * 初始化 Zonerama 图片接口配置（预加载到缓存）
 * 应在应用启动时调用
 */
export async function initZoneramaPhotoApi(): Promise<void> {
  const now = Date.now();
  if (cachedPhotoApi !== null && now - lastFetchTime < CACHE_DURATION) {
    return;
  }

  if (photoApiPromise) {
    return photoApiPromise;
  }

  photoApiPromise = (async () => {
    console.log('[initZoneramaPhotoApi] 开始加载图片接口配置与排除域名...');
    // 并行初始化其他配置，它们也有自己的锁
    await Promise.all([
      initProxyExcludeDomains().catch(console.error),
      initStorageConfig().catch(console.error)
    ]);

    try {
      const { data, error } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'zonerama_upload_config')
        .single() as any;
      
      if (error) {
        console.error('[initZoneramaPhotoApi] 查询失败:', error);
        cachedPhotoApi = '';
        cachedAlbumPhotoApi = '';
        cachedUrlMode = 'id';
        lastFetchTime = Date.now();
        return;
      }
      
      console.log('[initZoneramaPhotoApi] 查询结果:', data);
      
      if (data?.value && typeof data.value === 'object') {
        const config = data.value as any;
        
        // 加载图片接口配置
        cachedPhotoApi = config.photo_api || '';
        console.log('[initZoneramaPhotoApi] 图片接口配置已加载:', cachedPhotoApi);
        
        // 加载图集内图片接口配置
        cachedAlbumPhotoApi = config.album_photo_api || '';
        console.log('[initZoneramaPhotoApi] 图集内图片接口配置已加载:', cachedAlbumPhotoApi);
        
        // 加载链接模式
        cachedUrlMode = config.url_mode || 'id';
        console.log('[initZoneramaPhotoApi] 链接模式已加载:', cachedUrlMode);
        
        lastFetchTime = Date.now();
      } else {
        cachedPhotoApi = '';
        cachedAlbumPhotoApi = '';
        cachedUrlMode = 'id';
        lastFetchTime = Date.now();
        console.log('[initZoneramaPhotoApi] 配置为空');
      }
    } catch (err) {
      console.warn('[initZoneramaPhotoApi] 获取配置失败:', err);
      cachedPhotoApi = '';
      cachedAlbumPhotoApi = '';
      cachedUrlMode = 'id';
      lastFetchTime = Date.now();
    } finally {
      photoApiPromise = null;
    }
  })();

  return photoApiPromise;
}

/**
 * 获取 Zonerama 图片配置（含 URL 模式）
 */
async function getZoneramaConfigData() {
  const now = Date.now();
  if (cachedPhotoApi !== null && now - lastFetchTime < CACHE_DURATION) {
    return { 
      photoApi: cachedPhotoApi || '', 
      albumPhotoApi: cachedAlbumPhotoApi || '', 
      urlMode: cachedUrlMode || 'id' 
    };
  }
  
  await initZoneramaPhotoApi();
  return { 
    photoApi: cachedPhotoApi || '', 
    albumPhotoApi: cachedAlbumPhotoApi || '', 
    urlMode: cachedUrlMode || 'id' 
  };
}

/**
 * 获取 Zonerama 图片接口配置
 */
async function getZoneramaPhotoApi(): Promise<string> {
  const config = await getZoneramaConfigData();
  return config.photoApi;
}

/**
 * 获取 Zonerama 图集内图片接口配置
 */
async function getZoneramaAlbumPhotoApi(): Promise<string> {
  const config = await getZoneramaConfigData();
  return config.albumPhotoApi;
}

/**
 * 同步应用 Zonerama 图片接口配置（从缓存读取）
 * 根据后台配置的模式（ID 或 URL）自动生成代理链接
 * 
 * @param url 原始图片 URL 或 ID
 * @returns 应用接口后的 URL，如果配置为空则返回空字符串
 */
export function applyZoneramaPhotoApiSync(input: string | null | undefined): string {
  if (!input) return '';
  
  // 1. 提取 ID 和检测内容
  const photoId = extractZoneramaPhotoId(input);
  const isZonerama = photoId !== '' || input.includes('zonerama.com/photos');
  
  if (!isZonerama) return input;

  // 2. 检查代理配置
  if (cachedPhotoApi === null || cachedPhotoApi === '') {
    // 安全拦截：禁止直接加载原图
    if (input.includes('zonerama.com')) {
      console.warn('[applyZoneramaPhotoApiSync] ⚠️ 安全拦截：未配置代理接口，拒绝加载 Zonerama 原图');
      return '';
    }
    return input;
  }
  
  // 3. 根据 photoId 内容自动判断模式：纯数字 → ID 模式，否则 → URL 模式
  const isIdMode = photoId && /^\d+$/.test(photoId);
  
  if (isIdMode) {
    // ID 模式：photoId 是纯数字，直接拼接
    const prefix = cachedPhotoApi;
    return `${prefix}${photoId}`;
  } else {
    // URL 模式：photoId 非纯数字或为空，传递完整原始 URL
    let originalUrl = input;
    // 如果输入是 ID 或不包含完整路径，构造一个原始 URL
    if (!input.includes('zonerama.com/photos') && photoId) {
      originalUrl = getZoneramaOriginalUrl(photoId);
    } else {
      // 从可能带有代理前缀的链接中提取原始 Zonerama URL
      const urlMatch = input.match(/(https?:\/\/(?:us|eu|www)\.zonerama\.com\/photos\/[^?&]+)/i);
      if (urlMatch) {
        originalUrl = urlMatch[1];
      }
    }
    return `${cachedPhotoApi}${originalUrl}`;
  }
}

/**
 * 同步应用 Zonerama 图集内图片接口配置（从缓存读取）
 * 如果 URL 包含 zonerama.com/photos，则使用图集接口格式
 * 
 * @param url 原始图片 URL 或 ID
 * @param albumId 图集 ID
 * @returns 应用接口后的 URL，如果配置为空则返回空字符串
 */
export function applyZoneramaAlbumPhotoApiSync(url: string | null | undefined, albumId?: string | null): string {
  if (!url) return '';
  
  // 1. 提取 ID 和检测内容
  const photoId = extractZoneramaPhotoId(url);
  const isZonerama = photoId !== '' || url.includes('zonerama.com/photos');
  
  if (!isZonerama) return url;
  
  // 2. 检查配置
  if (cachedAlbumPhotoApi === null || cachedAlbumPhotoApi === '') {
    if (url.includes('zonerama.com')) return '';
    return url;
  }
  
  // 3. 提取图片路径
  let photoPath = url;
  if (url.includes('zonerama.com')) {
    photoPath = url.replace('https://us.zonerama.com', '').replace('https://zonerama.com', '').replace('https://eu.zonerama.com', '');
    // 确保以 /photos/ 开头
    const pathMatch = photoPath.match(/(\/photos\/[^?&]+)/i);
    if (pathMatch) photoPath = pathMatch[1];
  } else if (photoId) {
    photoPath = `/photos/${photoId}_0.jpg`;
  }

  // 4. 拼接接口前缀
  // 格式：https://zomphoto.wo58.cn/album?albumId=12345&img=/photos/xxx.jpg
  let result = cachedAlbumPhotoApi;
  if (albumId) {
    result += albumId;
  }
  result += `&img=${encodeURIComponent(photoPath)}`;
  
  return result;
}


/**
 * 应用 Zonerama 图片接口配置（异步版本）
 * @param url 原始图片 URL 或 ID
 * @returns 应用接口后的 URL
 */
export async function applyZoneramaPhotoApi(url: string | null | undefined): Promise<string> {
  if (!url) return '';
  await getZoneramaConfigData();
  return applyZoneramaPhotoApiSync(url);
}


/**
 * 检测 URL 是否为 Zonerama 图片，并自动应用代理加速
 * @param url 原始图片 URL 或 ID
 * @param _authToken 不再使用
 * @param _albumId 不再使用
 * @param _options 不再使用
 * @returns 代理加速后的 URL 或原始 URL
 */
export function getZoneramaProxyUrl(
  url: string | null | undefined, 
  _authToken?: string | null, 
  _albumId?: string | null,
  _options: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!url) return '';
  
  // 使用鲁棒的检测逻辑
  const photoId = extractZoneramaPhotoId(url);
  const isZonerama = photoId !== '' || (url.includes('zonerama.com/photos') && !url.includes('?img=') && !url.includes('?url='));
  
  if (!isZonerama) return url;

  // 使用同步版本应用代理
  return applyZoneramaPhotoApiSync(url);
}

const blobCache = new Map<string, string>();
const blobCacheTimestamps = new Map<string, number>();
const MAX_BLOB_CACHE_SIZE = 30; // 降低容量，防止移动端内存溢出 (从 100 降至 30)

function putInBlobCache(key: string, bUrl: string) {
  if (blobCache.size >= MAX_BLOB_CACHE_SIZE && !blobCache.has(key)) {
    let oldestKey = '';
    let oldestTime = Infinity;
    for (const [k, t] of blobCacheTimestamps.entries()) {
      if (t < oldestTime) {
        oldestTime = t;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      const urlToRevoke = blobCache.get(oldestKey);
      // 检查是否正在被使用（虽然无法完全确定，但增加延迟释放或增加容量是更好的办法）
      if (urlToRevoke && urlToRevoke.startsWith('blob:')) {
        // 延迟释放，防止当前渲染周期内失效
        setTimeout(() => {
          try {
            URL.revokeObjectURL(urlToRevoke);
          } catch (e) {}
        }, 5000);
      }
      blobCache.delete(oldestKey);
      blobCacheTimestamps.delete(oldestKey);
    }
  }
  blobCache.set(key, bUrl);
  blobCacheTimestamps.set(key, Date.now());
}
const pendingRequests = new Map<string, Promise<string>>();
let hitQueue: { cacheKey: string; isHit: boolean; timestamp: number; originalUrl?: string; size?: number }[] = [];
let hitTimeout: any = null;
const recentlyRecordedHits = new Set<string>();

// 请求队列管理，限制并发请求量以避免 429
class RequestQueue {
  private queue: { resolve: () => void, priority: boolean }[] = [];
  private activeCount = 0;
  private readonly maxConcurrent: number;

  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(fn: () => Promise<T>, priority = false): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      await new Promise<void>(resolve => {
        if (priority) {
          // 高优先级插入队列头部
          this.queue.unshift({ resolve, priority });
        } else {
          this.queue.push({ resolve, priority });
        }
      });
    }
    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        next?.resolve();
      }
    }
  }
}

const mediaRequestQueue = new RequestQueue(8); // 限制并发数为 8

async function getMD5(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('MD5', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 记录缓存命中情况 (带采样与批处理优化)
 */
export async function recordCacheHit(cacheKey: string = 'media_cache', isHit: boolean, originalUrl?: string, size?: number) {
  // 采样记录：仅记录 10% 的请求，减少数据库压力
  if (Math.random() > 0.1) return;

  // 接口风暴优化：5分钟内同一个 key 只记一次
  const dedupKey = `${cacheKey}_${isHit}`;
  if (recentlyRecordedHits.has(dedupKey)) return;
  
  recentlyRecordedHits.add(dedupKey);
  setTimeout(() => recentlyRecordedHits.delete(dedupKey), 300000);
  
  hitQueue.push({ cacheKey, isHit, timestamp: Date.now(), originalUrl, size });
  
  // 达到 5 条或 10 秒内未发送则执行批处理
  if (hitQueue.length >= 5) {
    flushCacheHits();
  } else if (!hitTimeout) {
    hitTimeout = setTimeout(flushCacheHits, 10000);
  }
}

/**
 * 立即发送缓存记录
 */
async function flushCacheHits() {
  if (hitQueue.length === 0) return;
  
  const currentBatch = [...hitQueue];
  hitQueue = [];
  if (hitTimeout) {
    clearTimeout(hitTimeout);
    hitTimeout = null;
  }

  try {
    // 批处理去重
    const uniqueBatch = currentBatch.filter((item, index, self) => 
      index === self.findIndex((t) => t.cacheKey === item.cacheKey && t.isHit === item.isHit)
    );

    await Promise.all(uniqueBatch.map(item => {
      // 如果是 proxy_cache，使用新接口
      if (item.cacheKey.startsWith('proxy_')) {
        return (supabase.rpc as any)('record_proxy_cache_event', { 
          p_key: item.cacheKey.replace('proxy_', ''), 
          p_is_hit: item.isHit,
          p_original_url: item.originalUrl,
          p_size: item.size
        });
      }
      // 否则使用旧接口
      return (supabase.rpc as any)('record_cache_hit', { 
        p_cache_key: item.cacheKey, 
        p_is_hit: item.isHit 
      });
    }));
  } catch (e) {
    // console.warn('Failed to record batch cache hits:', e);
  }
}

/**
 * 检查浏览器是否支持 WebP
 */
let _webpSupported: boolean | null = null;
export function canUseWebp(): boolean {
  if (_webpSupported !== null) return _webpSupported;
  
  // 简单环境检查，NodeJS 下返回 false
  if (typeof document === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    _webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } else {
    _webpSupported = false;
  }
  return _webpSupported;
}

/**
 * 从 Zonerama URL 中提取相册 ID
 * 支持格式: 
 * - https://eu.zonerama.com/gztu/Album/15081395
 * - https://us.zonerama.com/tkpro/Album/1000394224?secret=Qw1CUSQo5ulH8e3urVol2pDT7
 * @param input 输入的 URL 或 ID
 * @returns 提取出的相册 ID
 */
export function extractZoneramaAlbumId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // 匹配 /Album/ 后面跟随的数字
  const albumMatch = trimmed.match(/\/Album\/(\d+)/i);
  if (albumMatch && albumMatch[1]) {
    return albumMatch[1];
  }
  
  // 如果输入本身就是纯数字，直接返回
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  
  return trimmed; // 如果没匹配到，返回原始输入（可能是已有的 ID）
}

/**
 * 获取安全转换后的 URL (签名、切片、或者 Blob)
 * 注意：物理切片模式已取消，改为纯客户端虚拟切片
 */
export function getSecurityUrl(url: string, mode: 'original' | 'blob' | 'blob_slice' | 'canvas_slice' | 'canvas', options: any = {}): string {
  if (!url) return '';
  
  // 先应用 Zonerama 图片接口配置（同步版本）
  const processedUrl = applyZoneramaPhotoApiSync(url);
  
  if (mode === 'original') return processedUrl;
  
  // 这些模式在前端组件中处理，这里返回处理后的地址供后续处理
  if (['blob_slice', 'canvas_slice', 'canvas', 'blob'].includes(mode)) {
    return processedUrl;
  }
  
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/media-security-proxy`;
  const params = new URLSearchParams();
  params.append('u', btoa(encodeURIComponent(processedUrl)));
  params.append('m', mode);
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * 获取优化后的图片地址 (已根据用户要求停用优化器，直接返回原图以避免 500 错误)
 */
export function getOptimizedImageUrl(url: string | null | undefined, _options: { width?: number; height?: number; quality?: number; version?: string } = {}): string {
  if (!url) return '';
  // 如果是 blob 或 data URL，直接返回
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;
  
  // 对于视频不处理
  if (url.includes('.mp4') || url.includes('.mov') || url.includes('.webm')) return url;

  // 根据用户要求，直接返回原图，不再使用 image-optimizer Edge Function
  return url;
}

/**
 * 获取图片代理处理后的 URL (支持实时缩放、裁剪、压缩)
 * 仿 pic1.imgdb.cn 功能
 */
export function getImageProxyUrl(url: string | null | undefined, options: { w?: number; h?: number; quality?: number; mode?: 'crop'; format?: 'webp' | 'jpg'; version?: string } = {}): string {
  if (!url) return '';
  
  // 仅处理 CFR2 图片
  const R2_DOMAIN = 'https://pub-a39e26dae2e041e189462c89729727c7.r2.dev';
  if (!url.startsWith(R2_DOMAIN)) return url;

  // 默认根据浏览器支持决定 format
  const { w, h, quality, mode = 'crop', format = canUseWebp() ? 'webp' : 'jpg', version } = options;
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy`;
  
  const params = new URLSearchParams();
  // 总是使用 u 参数传递全路径，进行单重编码确保特殊字符安全
  params.append('u', url);
  
  if (w) params.append('w', String(w));
  if (h) params.append('h', String(h));
  if (quality) params.append('q', String(quality));
  if (mode) params.append('fit', mode === 'crop' ? 'cover' : 'contain');
  
  // 根据浏览器支持决定格式，不传则使用默认，或者指定 webp
  if (format) params.append('output', format);
  // if (version) params.append('v', version); // 已根据用户要求移除缓存参数
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * 通用图片 URL 处理，自动根据配置和场景选择缩略图或原图
 * @param url 原始图片 URL
 * @param isThumbnail 是否需要缩略图
 * @param config 存储配置对象
 * @param albumId 可选的图集 ID (用于 Zonerama 加速)
 */
/**
 * 应用 imgproxy 图片处理逻辑
 * 结构：{image_processing_url}/unsafe/{params}/plain/{url}
 * 
 * @param url 原始图片 URL
 * @param config 存储配置
 * @param ruleKey 场景规则名 (dedupe, waterfall, pre_load, portrait_list, daily_list)
 * @returns 处理后的 URL
 */
export function applyImageProcessing(url: string, config: StorageConfig | null, ruleKey?: string): string {
  // 增加对环境配置的 fallback，确保游客模式或配置加载失败时仍有处理
  const baseUrl = config?.image_processing_url || import.meta.env.VITE_IMAGE_PROCESSING_URL;
  if (!url || !baseUrl) return url;
  
  const lowerUrl = url.toLowerCase();
  // 如果是 blob 或 data URL，直接返回
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // 视频后缀判断：如果是以视频后缀结尾，且不是明显的图片请求，则跳过处理
  // 满足需求：部分图片可能包含 .mp4 字样但实际是图片（如 example.mp4.jpg），需放行
  const isVideo = (/\.(mp4|mov|webm|m3u8)($|\?)/i.test(lowerUrl) || lowerUrl.includes('video')) && 
                 !/\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i.test(lowerUrl);

  if (isVideo) {
    return url;
  }

  // 默认规则配置（当后台未设置时使用这些默认值，确保功能开箱即用）
  const defaultRules: Record<string, string> = {
    // 壁纸类
    '首瀑': 'rs:fill:300:400/q:80',           // 首页瀑布流列表
    '大图': 'rs:fit:2560:2560/q:90',         // 大图预览
    '抖音': 'rs:fit:1080:1920/q:85',         // 抖音feed
    
    // 写真类
    '写-封': 'rs:fill:300:400/q:80',         // 写真封面
    '写-网': 'rs:fill:300:300/q:80',         // 写真网格模式
    '写book': 'rs:fit:1920:1920/q:90',       // 写真翻页/电子书模式
    
    // 每日图集
    '每日': 'rs:fill:300:300/q:80',          // 每日图集网格模式
    
    // 审核
    '审核': 'rs:fit:300:300/q:70',           // 审核、查重、分级、分类及每日图集清理页面
    
    // 过渡
    '过渡': 'rs:fit:40:40/q:15/blur:20',    // 超低分辨率过渡图，用于瞬间展示轮廓
    
    // 后台
    '后': 'rs:fit:400:400/q:75',             // 后台所有涉及图片地方（除审核规则外）
    
    // 毫秒级优化 (由用户新增需求)
    '毫秒级优化': 'rs:fit:1280:1280/q:70/f:webp', // 确保加载时间低于 1000ms 的优化规则
    
    // 兼容旧规则名称
    waterfall: 'rs:fill:300:400/q:80',
    portrait_list: 'rs:fill:300:400/q:80',
    pre_load: 'rs:fit:1920:1920/q:80',
    large_preview: 'rs:fit:2560:2560/q:90',
    douyin: 'rs:fit:1080:1920/q:85',
    dedupe: 'rs:fit:150:150/q:60',
    audit: 'rs:fit:300:300/q:70'
  };

  if (ruleKey === '毫秒级优化') {
    const adjustment = parseInt(typeof window !== 'undefined' ? localStorage.getItem('ms_opt_adjustment') || '0' : '0');
    if (adjustment > 0) {
      // 动态降低质量或尺寸
      const quality = Math.max(10, 70 - adjustment);
      const size = Math.max(400, 1280 - (adjustment * 10));
      return `${baseUrl}/rs:fit:${size}:${size}/q:${quality}/f:webp/${url}`;
    }
  }

  let rule = ruleKey ? (config?.image_processing_rules?.[ruleKey] || defaultRules[ruleKey]) : null;
  
  // 毫秒级优化：如果全局开启了毫秒级优化，且当前没有规则或规则是大图，则强制使用毫秒级优化规则
  if (config?.ms_optimization_enabled && (!ruleKey || ruleKey === '大图' || ruleKey === 'large_preview')) {
    rule = defaultRules['毫秒级优化'];
  }

  if (!rule) return url;

  // 动态处理缩略图宽度冲突：如果是 waterfall 或 首瀑 规则且配置了显式的 thumbnail_width，则优先使用配置值
  if ((ruleKey === 'waterfall' || ruleKey === '首瀑') && config?.thumbnail_width) {
    // 自动替换规则中的第一个数字 (通常是宽度)
    rule = rule.replace(/(rs:[^:]+:)\d+/, `$1${config?.thumbnail_width}`);
  }

  // 移除末尾的斜杠和 /unsafe 路径，统一处理
  const finalBaseUrl = baseUrl.replace(/\/$/, '').replace(/\/unsafe$/, '');
  
  // 满足需求：处理水印 (如果开启)
  let watermarkParams = '';
  if (config?.watermark_enabled) {
    const opacity = config!.watermark_opacity || 0.3;
    const position = config!.watermark_position || 'bottom-right';
    const scale = (config!.watermark_size || 10) / 100;
    
    // 映射位置到 imgproxy 格式
    const posMap: Record<string, string> = {
      'top-left': 'no',
      'top-right': 'ne',
      'bottom-left': 'so',
      'bottom-right': 'se',
      'center': 'ce',
      'tile': 're' // replicate/tile
    };
    const imgproxyPos = posMap[position] || 'se';
    
    // 如果是平铺水印 (全屏水印)
    if (position === 'tile') {
      watermarkParams = `/wm:${opacity}:re:0:0:${scale}`;
    } else {
      watermarkParams = `/wm:${opacity}:${imgproxyPos}:10:10:${scale}`;
    }
  }

  // imgproxy 参数组之间用 / 分隔（规范格式），兼容用户填写了逗号的情况
  // 同时将 format: 兼容替换为 f:，因为部分 imgproxy 版本对前者支持不佳
  const normalizedRule = rule.trim().replace(/,/g, '/').replace(/format:/g, 'f:');
  
  // 统一使用 URL-safe Base64 编码源地址
  const sourcePart = urlSafeBase64(url);
  
  // 构造路径：/{options}/{source_url}
  const imagePath = `/${normalizedRule}${watermarkParams}/${sourcePart}`.replace(/\/+/g, '/');
  
  // 简化处理：不再使用服务器签名，统一使用 unsafe 模式
  // 这种方式不需要修改 Imgproxy 服务器的 KEY/SALT 环境变量
  return `${finalBaseUrl}/unsafe${imagePath}`;
}


export function getImageUrl(url: string | null | undefined, isThumbnail: boolean, config?: StorageConfig | null, _albumId?: string | null, ruleKey?: string): string {
  if (!url) return '';
  
  // 0. 决定场景规则：优先使用显式指定的 ruleKey，缩略图模式默认使用 首瀑，非缩略图尝试 大图
  const effectiveRuleKey = ruleKey === 'none' ? null : (ruleKey || (isThumbnail ? '首瀑' : '大图'));

  // 1. 遇到 Zonerama 图片则特殊处理
  const photoId = extractZoneramaPhotoId(url);
  const isZonerama = photoId !== '' || url.includes('zonerama.com') || url.includes('zomphoto.com');
  
  if (isZonerama) {
    // Zonerama 图片：同步获取代理后的直接链接
    const directUrl = applyZoneramaPhotoApiSync(url);
    
    // 如果启用了图片处理，且 directUrl 有效，且不是视频链接
    // 统一使用 !== false 判断，确保默认启用处理（除非明确禁用）
    // 对于 Zonerama，如果是缩略图模式，即使包含视频标识也尝试处理
    const isVideo = (directUrl.includes('.mp4') || directUrl.includes('.mov')) && !isThumbnail;
    if (config?.enable_image_processing !== false && directUrl && !isVideo) {
      return applyImageProcessing(directUrl, config || null, effectiveRuleKey || undefined);
    }
    return directUrl;
  }

  // 检查域名排除列表 (仅针对基础代理)
  let isExcludedFromProxy = false;
  const excludeDomainsFromConfig = config?.image_proxy_exclude_domains 
    ? config.image_proxy_exclude_domains.split(/[,，]/).map(d => d.trim().toLowerCase()).filter(Boolean)
    : [];
  
  // 合并系统级排除域名（缓存版本）
  const allExcludeDomains = [...excludeDomainsFromConfig, ...cachedExcludeDomains];

  if (allExcludeDomains.length > 0) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      if (allExcludeDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
        isExcludedFromProxy = true;
      }
    } catch (e) {
      // 无法解析 URL 则尝试简单的字符串包含检查
      const urlLower = url.toLowerCase();
      if (allExcludeDomains.some(domain => urlLower.includes(domain))) {
        isExcludedFromProxy = true;
      }
    }
  }

  // 2. 核心代理与处理逻辑
  // 满足场景：即使域名在代理排除列表中，如果开启了图片处理，仍应进入处理逻辑
  const lowerUrl = url.toLowerCase();
  const isVideo = (lowerUrl.includes('.mp4') || lowerUrl.includes('.mov') || lowerUrl.includes('.webm')) && 
                  !/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(lowerUrl) && 
                  !isThumbnail;

  // 如果是视频，尝试应用视频代理加速
  if (isVideo && config?.enable_video_proxy) {
    return getVideoProxyUrl(url, config);
  }

  if ((isThumbnail || effectiveRuleKey) && !url.startsWith('blob:') && !url.startsWith('data:') && !isVideo) {
    
    // A. 基础代理路径计算
    let proxyBase = config?.image_proxy_url;
    let proxiedUrl = url;
    // 如果不在排除列表中且开启了代理，才允许使用基础代理
    const canProxy = !isExcludedFromProxy && config?.enable_image_proxy === true;

    if (canProxy) {
      if (!proxyBase) {
        proxyBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?u=`;
      }
      
      // 满足用户需求：对于代理请求，始终进行完整编码以确保特殊域名（如 pic1.imgdb.cn）能被正确识别
      const cleanUrl = encodeURIComponent(url);
      
      // 自动处理 URL 拼接
      try {
        if (proxyBase.includes('=')) {
          const needsSeparator = !proxyBase.endsWith('=') && !proxyBase.endsWith('&');
          proxiedUrl = `${proxyBase}${needsSeparator ? '&u=' : ''}${cleanUrl}`;
        } else {
          const separator = proxyBase.includes('?') ? '&u=' : '?u=';
          proxiedUrl = `${proxyBase}${separator}${cleanUrl}`;
        }
      } catch (e) {
        proxiedUrl = `${proxyBase}${encodeURIComponent(url)}`;
      }
    }

    // B. 集成 imgproxy 处理
    // 满足需求：代理地址是否同步参与图片处理
    if (effectiveRuleKey && config?.image_processing_url && config?.enable_image_processing !== false) {
      const isProxyUsed = canProxy && proxiedUrl !== url;
      const syncWithProxy = config.enable_proxy_image_processing === true;

      if (isProxyUsed) {
        if (syncWithProxy) {
          // 场景1: 代理加载且同步处理 -> imgproxy(proxy(url))
          return applyImageProcessing(proxiedUrl, config || null, effectiveRuleKey || undefined);
        } else {
          // 场景2: 代理加载但不同步处理 -> proxy(url) 直出原图
          return proxiedUrl;
        }
      } else {
        // 场景3: 未走代理 -> 直接 imgproxy 处理原图
        return applyImageProcessing(url, config || null, effectiveRuleKey || undefined);
      }
    }
    
    return proxiedUrl;
  }
  
  // 非代理/非处理场景直接返回原图
  return url;
}

/**
 * 将远程资源地址转换为本地 Blob URL，以隐藏真实地址
 * 对于 Zonerama 图片：优先直连，失败时使用代理
 */
/**
 * 安全获取 AbortSignal.timeout，兼容旧版本浏览器
 */
function getTimeoutSignal(ms: number) {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}


/**
 * 获取视频代理加速后的 URL
 */
export function getVideoProxyUrl(url: string | null | undefined, config?: StorageConfig | null): string {
  if (!url) return '';
  if (!config?.enable_video_proxy || !config?.video_proxy_url) return url;

  const proxyBase = config.video_proxy_url;
  const secret = config.video_proxy_secret;
  
  // Build the proxied URL
  let proxiedUrl = url;
  const encodedUrl = encodeURIComponent(url);
  
  try {
    const separator = proxyBase.includes('?') ? '&' : '?';
    // 统一使用 url= 参数
    proxiedUrl = `${proxyBase}${separator}url=${encodedUrl}`;
    
    if (secret) {
      proxiedUrl += `&secret=${encodeURIComponent(secret)}`;
    }
  } catch (e) {
    console.error('[getVideoProxyUrl] 代理拼接失败:', e);
    proxiedUrl = url;
  }
  
  return proxiedUrl;
}

export async function getProtectedUrl(
  url: string | null | undefined, 
  useWebp = true,
  options: { 
    enableBlob?: boolean, 
    enableCache?: boolean, 
    version?: string,
    width?: number,
    height?: number,
    quality?: number,
    priority?: boolean,
    config?: StorageConfig | null
  } = { enableBlob: true, enableCache: false }
): Promise<string> {
  if (!url) return '';
  const normalizedUrl = optimizeXiaohongshuUrl(url);
  if (normalizedUrl.startsWith('blob:')) return normalizedUrl;
  if (normalizedUrl.startsWith('data:')) return normalizedUrl;

  const { enableBlob = true, enableCache = false, version, width, height, quality, priority = false, config: providedConfig } = options;
  const config = providedConfig || await initStorageConfig();

  // 0. 记录原始 URL 是否为 Zonerama
  const photoIdOriginal = extractZoneramaPhotoId(normalizedUrl);
  const isZoneramaOriginal = photoIdOriginal !== '' || (normalizedUrl?.includes('zonerama.com/photos') ?? false);

  // 1. 应用 Zonerama 图片接口配置
  let processedUrl = await applyZoneramaPhotoApi(normalizedUrl);

  // 检查是否为视频
  const isVideo = processedUrl.toLowerCase().includes('.mp4') || processedUrl.toLowerCase().includes('.mov') || processedUrl.toLowerCase().includes('.webm') || processedUrl.toLowerCase().includes('.avi');
  const isHLS = processedUrl.toLowerCase().includes('.m3u8');
  const isImage = !isVideo && !isHLS;

  // 如果是视频且开启了视频代理，应用视频代理加速
  if (isVideo && config?.enable_video_proxy) {
    processedUrl = getVideoProxyUrl(processedUrl, config);
  }
  
  // 对于 HLS 视频，即使开启了 Blob 模式也不转换，因为 Blob URL 无法处理分片索引
  // 普通视频（mp4等）允许转换，但在移动端可能存在加载延迟
  
  // 检查是否为 Zonerama 图片 (综合原始 URL 和处理后的 URL 判定)
  const isZonerama = isZoneramaOriginal || extractZoneramaPhotoId(processedUrl) !== '' || processedUrl.includes('zonerama.com/photos');
  
  // 检查是否为聚合图床（imgdb.cn 或 superbed.cn）
  const isSuperbed = processedUrl.includes('imgdb.cn') || processedUrl.includes('superbed.cn');
  
  // 如果是 Zonerama 图片，优先使用直连/当前处理后的地址
  let targetUrl = processedUrl;
  
  // 缩略图模式性能优化：如果是缩略图且没有启用强制缓存，则跳过并发队列直接返回，利用浏览器原生加载
  const isThumbnailMode = !!(width || height || (quality && quality < 90));
  if (isThumbnailMode && !enableCache && !enableBlob) {
    return getImageUrl(processedUrl, true, { 
      thumbnail_width: width, 
      thumbnail_height: height, 
      thumbnail_quality: quality || 40,
    } as any);
  }

  if (!isZonerama) {
    // 非 Zonerama 图片，按原有逻辑处理
    // 只有明确指定了宽高或质量，才认为是缩略图模式
    const isThumbnailMode = !!(width || height || (quality && quality < 90));
    const needsOptimization = isImage && (isThumbnailMode || useWebp);
    
    targetUrl = needsOptimization ? getImageUrl(processedUrl, isThumbnailMode, { 
      thumbnail_width: width, 
      thumbnail_height: height, 
      thumbnail_quality: quality || 40,
      thumbnail_params: version ? `&v=${version}` : undefined
    } as any) : processedUrl;
  }

  if (blobCache.has(targetUrl)) {
    if (enableCache) recordCacheHit('media_cache', true);
    return blobCache.get(targetUrl)!;
  }

  // 检查是否有正在进行的相同 URL 请求
  if (pendingRequests.has(targetUrl)) {
    return pendingRequests.get(targetUrl)!;
  }

  // 如果不启用 Blob 功能，或者是 HLS 视频，直接返回原地址
  if (!enableBlob || isHLS) {
    return targetUrl;
  }

  const fetchPromise = mediaRequestQueue.add(async () => {
    // 3. 优先使用 ImageCache 本地持久化缓存
    if (enableCache && isImage) {
      try {
        const isThumbnailMode = !!(width || height || (quality && quality < 90));
        const timeout = isSuperbed || !isThumbnailMode ? 30000 : 15000;
        const bUrl = await ImageCache.getOrFetch(targetUrl, { timeout });
        if (bUrl && bUrl.startsWith('blob:')) {
          putInBlobCache(targetUrl, bUrl);
          recordCacheHit('media_cache', true);
          return bUrl;
        }
      } catch (e) {
        console.warn('[ProtectedMedia] ImageCache failed, falling back to direct fetch', e);
      }
    }

    // 4. 直接请求并降级处理 (作为 ImageCache 失败或禁用的兜底)
    try {
      const isThumbnailMode = !!(width || height || (quality && quality < 90));
      const timeout = isSuperbed || !isThumbnailMode ? 30000 : 10000;
      
      const initialUrl = targetUrl;
      
      let response = await fetch(initialUrl, { 
        mode: 'cors',
        referrerPolicy: 'no-referrer',
        signal: getTimeoutSignal(timeout)
      }).catch(err => {
        console.error(`[ProtectedMedia] Fetch error for ${initialUrl}:`, err);
        throw err;
      });
    
    // 记录代理命中
    if (response.ok && initialUrl.includes('image-proxy')) {
      getMD5(processedUrl).then(key => {
        const isHit = response.headers.get('x-proxy-cache') === 'HIT' || response.headers.get('cf-cache-status') === 'HIT';
        const size = Number(response.headers.get('content-length')) || undefined;
        recordCacheHit('proxy_' + key, isHit, processedUrl, size);
      });
    }

    // 如果是 429 Too Many Requests 
    if (response.status === 429) {
      if (initialUrl !== processedUrl) {
        console.warn(`[ProtectedMedia] 请求限流 (429)，尝试回退到原始地址: ${processedUrl}`);
        response = await fetch(processedUrl, {
          mode: 'cors',
          referrerPolicy: 'no-referrer',
          signal: getTimeoutSignal(timeout)
        }).catch(err => {
          console.error(`[ProtectedMedia] Fallback fetch error for ${processedUrl}:`, err);
          throw err;
        });
      }
    }
    
    // 检查 Zonerama 响应头中的 zonerama-status
    if (isZonerama) {
      const zoneramaStatus = response.headers.get('zonerama-status');
      if (zoneramaStatus === 'ERROR') {
        console.warn(`[ProtectedMedia] Zonerama 直连返回 ERROR 状态，切换到代理`);
        throw new Error('Zonerama status: ERROR');
      }
    }
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const blob = await response.blob().catch(err => {
      console.error("[ProtectedMedia] Error reading blob:", err);
      throw err;
    });
    const blobUrl = URL.createObjectURL(blob);
    putInBlobCache(targetUrl, blobUrl);
    
    if (enableCache) {
      recordCacheHit('media_cache', false);
    }
    
    return blobUrl;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    
    // 如果是因为 429 报错，且还没试过原始地址，可以在这里最后挣扎一下直接返回 processedUrl 或原始 url
    if (errorMsg.includes('429')) {
      return processedUrl || url || '';
    }

    console.warn(`[ProtectedMedia] 直连失败: ${targetUrl}`, errorMsg);
    
    // 如果是聚合图床（imgdb.cn/superbed.cn）且遇到 CORS 或超时错误，使用代理
    if (isSuperbed && (errorMsg.includes('CORS') || errorMsg.includes('timeout') || errorMsg.includes('504') || errorMsg.includes('Failed to fetch'))) {
      try {
        console.log(`[ProtectedMedia] 聚合图床使用 CORS 代理: ${targetUrl}`);
        const proxyUrl = `${(supabase as any).supabaseUrl}/functions/v1/image-cors-proxy?url=${encodeURIComponent(targetUrl)}`;
        
        const proxyResponse = await fetch(proxyUrl, {
          headers: {
            'Authorization': `Bearer ${(supabase as any).supabaseKey}`
          },
          signal: getTimeoutSignal(30000) // 30秒超时
        }).catch(err => {
          console.error(`[ProtectedMedia] Proxy fetch error for ${proxyUrl}:`, err);
          throw err;
        });
        
        if (!proxyResponse.ok) throw new Error(`Proxy HTTP ${proxyResponse.status}`);
        
        const blob = await proxyResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        putInBlobCache(targetUrl, blobUrl);
        
        if (enableCache) {
          recordCacheHit('media_cache', false);
        }
        
        return blobUrl;
      } catch (proxyErr) {
        console.error(`[ProtectedMedia] CORS 代理也失败:`, proxyErr);
        // 最终降级：返回原图 URL
        return url;
      }
    }
    
    // 如果是 Zonerama 图片且直连失败，尝试使用代理
    if (isZonerama) {
      try {
        const proxyUrl = getZoneramaProxyUrl(url);
        console.log(`[ProtectedMedia] 使用代理: ${proxyUrl}`);
        
        const proxyResponse = await fetch(proxyUrl, {
          mode: 'cors',
          signal: getTimeoutSignal(15000) // 代理给更长的超时时间
        }).catch(err => {
          console.error(`[ProtectedMedia] Zonerama proxy fetch error for ${proxyUrl}:`, err);
          throw err;
        });
        
        if (!proxyResponse.ok) throw new Error(`Proxy HTTP ${proxyResponse.status}`);
        
        const blob = await proxyResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        putInBlobCache(targetUrl, blobUrl);
        
        if (enableCache) {
          recordCacheHit('media_cache', false);
        }
        
        return blobUrl;
      } catch (proxyErr) {
        console.error(`[ProtectedMedia] Zonerama 代理也失败:`, proxyErr);
        return processedUrl || url || '';
      }
    }
    
    if (enableCache) recordCacheHit('media_cache', false);
    
    // 非 Zonerama 图片，直接返回原图
    return url; 
  } finally {
    pendingRequests.delete(targetUrl);
  }
  }, priority);

pendingRequests.set(targetUrl, fetchPromise);
return fetchPromise;
}

/**
 * 客户端图片压缩 (纯前端 Canvas 实现)
 * 适配 w, h, quality 参数
 */
export async function compressImageLocally(url: string, options: { w?: number; h?: number; quality?: number } = {}): Promise<string> {
  const { w: maxWidth, h: maxHeight, quality = 0.8 } = options;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        // 计算缩放比例
        if (maxWidth && targetWidth > maxWidth) {
          const ratio = maxWidth / targetWidth;
          targetWidth = maxWidth;
          targetHeight = targetHeight * ratio;
        }
        
        if (maxHeight && targetHeight > maxHeight) {
          const ratio = maxHeight / targetHeight;
          targetHeight = maxHeight;
          targetWidth = targetWidth * ratio;
        }
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context not available");
        
        // 渲染并压缩
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        // 输出压缩后的图片 (DataURL)
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => reject(new Error("Image load failed for client-side compression"));
    
    // 如果 URL 是相对路径或代理 URL，可能需要处理 CORS 问题
    img.src = url;
  });
}

/**
 * 提取视频指定时间的帧作为缩略图
 */
export async function extractVideoFrame(source: string | File | Blob, time: number = 2.0): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous'; // 允许跨域
    (video as any).referrerPolicy = 'no-referrer';
    
    let url: string;
    if (source instanceof File || source instanceof Blob) {
      url = URL.createObjectURL(source);
    } else {
      url = source;
    }
    
    video.src = url;

    const cleanup = () => {
      if (source instanceof File || source instanceof Blob) {
        URL.revokeObjectURL(url);
      }
      video.remove();
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('提取帧超时'));
    }, 10000);

    video.onloadedmetadata = () => {
      const captureTime = video.duration > time ? time : video.duration / 2;
      video.currentTime = captureTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      try {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          throw new Error('视频尺寸无效');
        }
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          cleanup();
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('生成图片失败'));
          }
        }, 'image/jpeg', 0.8);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('视频加载失败'));
    };

    video.load();
  });
}
