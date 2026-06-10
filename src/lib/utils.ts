import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Params = Partial<
  Record<keyof URLSearchParams, string | number | null | undefined>
>;

export function createQueryString(
  params: Params,
  searchParams: URLSearchParams
) {
  const newSearchParams = new URLSearchParams(searchParams?.toString());

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      newSearchParams.delete(key);
    } else {
      newSearchParams.set(key, String(value));
    }
  }

  return newSearchParams.toString();
}

export function formatDate(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: opts.month ?? "long",
    day: opts.day ?? "numeric",
    year: opts.year ?? "numeric",
    ...opts,
  }).format(new Date(date));
}

/**
 * 格式化为北京时间 (UTC+8)，精确到秒
 */
export function formatBeijingTime(date?: Date | string | number | null): string {
  const d = date ? new Date(date) : (date === null ? null : new Date());
  if (!d) return '-';
  if (isNaN(d.getTime())) return '-';
  
  return new Intl.DateTimeFormat("zh-CN", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai'
  }).format(d).replace(/\//g, '-');
}

/**
 * 获取当前北京时间日期 (YYYY-MM-DD)
 */
export function getBeijingDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Shanghai'
  }).format(new Date());
}


/**
 * 清理文件名，保留中文字符、字母、数字、下划线、中划线和点
 */
export function sanitizeFileName(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '_');
  }
  
  const name = fileName.substring(0, lastDotIndex);
  const ext = fileName.substring(lastDotIndex + 1);
  
  const sanitizedName = name.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '_');
  const sanitizedExt = ext.replace(/[^a-zA-Z0-9]/g, '');
  
  return `${sanitizedName}.${sanitizedExt}`;
}

/**
 * 清洗和格式化标题
 */
export function cleanTitle(name: string | null | undefined, maxLength = 30): string {
  if (!name) return '未命名';
  
  // 移除文件后缀名
  let cleaned = name.replace(/\.[^/.]+$/, "");
  
  // 去除无效字段的规则
  const invalidPatterns = [
    /^[0-9]{8,}$/,                           // 纯数字（8位以上）
    /^[a-f0-9]{32}$/i,                       // MD5/SHA256 哈希（32位十六进制）
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i, // UUID
    /^[a-zA-Z0-9_-]{20,}$/,                  // 长随机字符串（20位以上）
    /^IMG_[0-9]+$/i,                         // IMG_数字格式
    /^DSC[0-9]+$/i,                          // DSC数字格式（相机默认）
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}$/, // 日期时间格式：2024-03-15_123456
    /^Screenshot_[0-9_-]+$/i,                // Screenshot_时间戳
    /^WechatIMG[0-9]+$/i,                    // 微信图片默认名
    /^QQ图片[0-9]+$/,                        // QQ图片默认名
  ];
  
  // 检查是否匹配无效模式
  for (const pattern of invalidPatterns) {
    if (pattern.test(cleaned)) {
      return '未命名';
    }
  }
  
  // 去除前后空格
  cleaned = cleaned.trim();
  
  // 如果清洗后为空，返回"未命名"
  if (!cleaned) return '未命名';
  
  // 限制长度
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength) + '...';
  }
  
  return cleaned;
}

/**
 * 移除文件后缀名
 */
export function stripExtension(name: string | null | undefined): string {
  if (!name) return '';
  return name.replace(/\.[^/.]+$/, "");
}

/**
 * 生成随机 UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 客户端图片压缩函数
 */
export async function compressImage(file: File): Promise<File | Blob> {
  // 非图片或大小小于 1MB 不压缩
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= 1024 * 1024) return file; 

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      const result = e.target?.result as string;
      if (!result) {
        resolve(file);
        return;
      }
      img.src = result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // 限制最大宽度为 1920
        const MAX_WIDTH = 1920;
        if (width > MAX_WIDTH) {
          height = (MAX_WIDTH / width) * height;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
            console.log(`Compressed image: ${file.size} -> ${newFile.size}`);
            resolve(newFile);
          } else {
            resolve(file);
          }
        }, 'image/webp', 0.8);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}




/**
 * 根据 ID 生成彩虹色配置
 */
export function getRainbowColor(id: string, isActive: boolean) {
  const rainbowColors = [
    { name: 'red', bg: 'bg-rainbow-red/10', text: 'text-rainbow-red', border: 'border-rainbow-red/20', active: 'bg-rainbow-red text-white' },
    { name: 'orange', bg: 'bg-rainbow-orange/10', text: 'text-rainbow-orange', border: 'border-rainbow-orange/20', active: 'bg-rainbow-orange text-white' },
    { name: 'amber', bg: 'bg-rainbow-amber/10', text: 'text-rainbow-amber', border: 'border-rainbow-amber/20', active: 'bg-rainbow-amber text-white' },
    { name: 'emerald', bg: 'bg-rainbow-emerald/10', text: 'text-rainbow-emerald', border: 'border-rainbow-emerald/20', active: 'bg-rainbow-emerald text-white' },
    { name: 'cyan', bg: 'bg-rainbow-cyan/10', text: 'text-rainbow-cyan', border: 'border-rainbow-cyan/20', active: 'bg-rainbow-cyan text-white' },
    { name: 'blue', bg: 'bg-rainbow-blue/10', text: 'text-rainbow-blue', border: 'border-rainbow-blue/20', active: 'bg-rainbow-blue text-white' },
    { name: 'indigo', bg: 'bg-rainbow-indigo/10', text: 'text-rainbow-indigo', border: 'border-rainbow-indigo/20', active: 'bg-rainbow-indigo text-white' },
    { name: 'violet', bg: 'bg-rainbow-violet/10', text: 'text-rainbow-violet', border: 'border-rainbow-violet/20', active: 'bg-rainbow-violet text-white' },
    { name: 'fuchsia', bg: 'bg-rainbow-fuchsia/10', text: 'text-rainbow-fuchsia', border: 'border-rainbow-fuchsia/20', active: 'bg-rainbow-fuchsia text-white' },
    { name: 'pink', bg: 'bg-rainbow-pink/10', text: 'text-rainbow-pink', border: 'border-rainbow-pink/20', active: 'bg-rainbow-pink text-white' },
  ];
  
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = rainbowColors[hash % rainbowColors.length];
  
  if (isActive) return color.active;
  return `${color.bg} ${color.text} ${color.border}`;
}

/**
 * 检查是否在微信浏览器中
 */
export function isWechat(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /micromessenger/.test(ua);
}



/**
 * 下载文件，自动处理跨域问题
 */
export async function downloadFile(url: string, fileName?: string): Promise<void> {
  if (!url) return;
  
  const finalFileName = fileName || url.split('/').pop()?.split('?')[0] || 'download.jpg';
  
  try {
    // 1. 尝试直接 fetch
    let response = await fetch(url).catch(() => null);
    
    // 2. 如果直接 fetch 失败（可能是 CORS），尝试通过代理 fetch
    if (!response || !response.ok) {
      console.log('Direct fetch failed, trying proxy for download:', url);
      
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const DOMAIN_CONFIG_MAP: Record<string, string> = {
        'wo58.com': 'https://backend.appmiaoda.com/projects/supabase290871706745094144',
        'appmiaoda.com': 'https://backend.appmiaoda.com/projects/supabase290871706745094144'
      };

      for (const domain in DOMAIN_CONFIG_MAP) {
        if (host.includes(domain)) {
          supabaseUrl = DOMAIN_CONFIG_MAP[domain];
          break;
        }
      }

      if (supabaseUrl) {
        // 构建代理 URL，注意这里包含 functions/v1
        const proxyUrl = `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
        response = await fetch(proxyUrl).catch(() => null);
      }
    }

    if (response && response.ok) {
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 200);
    } else {
      // 3. 兜底方案：新窗口打开 (用户感知会是打开了页面，但我们尽力了)
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('download', finalFileName);
      a.click();
    }
  } catch (error) {
    console.error('Download error:', error);
    window.open(url, '_blank');
  }
}
/**
 * 分发彩蛋点击事件
 */
export function dispatchEasterEggClick(eventName: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('easter-egg-click', {
    detail: { eventName }
  }));
}


/**
 * 分发彩蛋收藏增加事件
 */
export function dispatchEasterEggFavoriteAdded() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('easter-egg-favorite-added'));
}



/**
 * 格式化为相对时间 (例如: 1分钟前, 2小时前)
 */
export function formatTimeAgo(date?: Date | string | number | null): string {
  if (!date) return '未知时间';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '未知时间';
  
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}个月前`;
  return `${Math.floor(diff / 31536000)}年前`;
}

