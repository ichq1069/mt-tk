# Zonerama 图片视频集成文档

## 目录
- [概述](#概述)
- [架构设计](#架构设计)
- [上传流程](#上传流程)
- [图片加载策略](#图片加载策略)
- [视频处理](#视频处理)
- [配置管理](#配置管理)
- [错误处理](#错误处理)
- [常见问题](#常见问题)

---

## 概述

本系统集成了 Zonerama 图床服务，支持图片和视频的上传、存储、加载和展示。Zonerama 提供了稳定的图片视频托管服务，系统通过代理和直连相结合的方式，确保资源加载的稳定性和速度。

### 核心功能
- ✅ 图片/视频上传到 Zonerama 相册
- ✅ 智能加载策略（优先直连，失败时自动降级到代理）
- ✅ 视频缩略图自动生成
- ✅ 响应头状态检测（`zonerama-status: ERROR`）
- ✅ 批量上传（最多 6 个并发）
- ✅ 上传进度跟踪
- ✅ 自动提取图片尺寸信息

---

## 架构设计

### 1. 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                        前端应用                              │
├─────────────────────────────────────────────────────────────┤
│  Upload.tsx          │  上传页面，处理文件上传逻辑           │
│  media.ts            │  图片加载策略，代理 URL 生成          │
│  ProtectedMedia.tsx  │  受保护的媒体组件，Blob URL 转换     │
│  MediaPreview.tsx    │  媒体预览组件，视频播放器            │
│  StorageSection.tsx  │  后台配置页面，Zonerama 参数设置     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Zonerama 代理服务                         │
│              https://zonerama.wo58.cn/                       │
├─────────────────────────────────────────────────────────────┤
│  - 接收上传请求并转发到 Zonerama                             │
│  - 提供图片代理加速服务                                      │
│  - 处理认证和相册 ID                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Zonerama 官方服务                         │
│         https://us.zonerama.com/                          │
│         https://us.zonerama.com/                             │
├─────────────────────────────────────────────────────────────┤
│  - 图片存储：us.zonerama.com/photos/{id}_{w}x{h}_0.jpg  │
│  - 视频播放：us.zonerama.com/VideoPlayer/{id}              │
│  - 视频缩略图：us.zonerama.com/photos/{id}_2000x2000_0.jpg│
└─────────────────────────────────────────────────────────────┘
```

### 2. URL 格式规范

#### 图片 URL
```
直连格式：
https://us.zonerama.com/photos/{photoId}_{width}x{height}_0.jpg

示例：
https://us.zonerama.com/photos/607625557_2000x2000_0.jpg
https://us.zonerama.com/photos/607625557_1920x1080_0.jpg
```

#### 视频 URL
```
播放器格式：
https://us.zonerama.com/VideoPlayer/{photoId}

示例：
https://us.zonerama.com/VideoPlayer/607625557
```

#### 视频缩略图 URL
```
缩略图格式：
https://us.zonerama.com/photos/{photoId}_2000x2000_0.jpg

规则：
- 视频 ID 与视频 URL 中的 ID 相同
- 固定使用 2000x2000 尺寸
- 自动生成，无需手动创建
```

#### 代理 URL
```
代理格式：
https://zonerama.wo58.cn/?img={完整图片URL}&auth={认证URL}&albumId={相册ID}

示例：
https://zonerama.wo58.cn/?img=https://us.zonerama.com/photos/607625557_2000x2000_0.jpg

参数说明：
- img: 必需，完整的图片 URL（需 URL 编码）
- auth: 可选，认证 URL
- albumId: 可选，相册 ID
- 注意：Worker 不支持 width/height/quality 参数
```

---

## 上传流程

### 1. 上传接口

**接口地址**
```
POST https://zonerama.wo58.cn/upload?albumId={相册ID}&session={会话ID}
```

**请求参数**
```javascript
const formData = new FormData();
formData.append('name', file.name);           // 文件名
formData.append('chunk', '0');                // 分块索引（从 0 开始）
formData.append('chunks', '1');               // 总分块数（1 表示不分块）
formData.append('offset', '0');               // 偏移量
formData.append('fileSize', file.size.toString()); // 文件大小（字节）
formData.append('file', file);                // 文件对象
```

**URL 参数**
- `albumId`: 必需，Zonerama 相册 ID（在后台配置）
- `session`: 可选，Zonerama 会话 ID（用于认证）

### 2. 响应格式

**成功响应**
```json
{
  "id": "607625557",
  "photoId": "607625557",
  "imageUrl": "https://us.zonerama.com/photos/607625557_2000x2000_0.jpg",
  "ImagePattern": "https://us.zonerama.com/photos/607625557_{width}x{height}_0.jpg",
  "Error": null
}
```

**错误响应**
```json
{
  "Error": "E_ZONERAMA_INVALIDPARAMS",
  "id": null,
  "imageUrl": null
}
```

### 3. 上传流程图

```
┌──────────────┐
│ 用户选择文件  │
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│ 检查配置（相册 ID）   │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ 构建 FormData        │
│ - name, chunk, etc.  │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ 发送 POST 请求       │
│ 并发限制：6 个       │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ 解析响应数据         │
│ - 提取 photoId       │
│ - 提取尺寸信息       │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ 构建最终 URL         │
│ - 图片：us.zonerama.com/photos/{id}_{w}x{h}_0.jpg │
│ - 视频：us.zonerama.com/VideoPlayer/{id}            │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ 生成缩略图（视频）   │
│ - 自动生成缩略图 URL │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ 保存到数据库         │
│ - 批量插入（性能优化）│
└──────────────────────┘
```

### 4. 代码实现

**位置**: `src/pages/Upload.tsx` → `handleAdminZoneramaUpload`

```typescript
const handleAdminZoneramaUpload = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // 1. 检查配置
  if (!adminZoneramaAlbumId) {
    return toast.error('未配置 Zonerama 相册 ID');
  }
  
  // 2. 并发上传（最多 6 个）
  await runWithLimit(6, adminZoneramaFiles, async (file, i) => {
    const isVideo = file.type.startsWith('video/');
    
    // 3. 构建 FormData
    const formData = new FormData();
    formData.append('name', file.name);
    formData.append('chunk', '0');
    formData.append('chunks', '1');
    formData.append('offset', '0');
    formData.append('fileSize', file.size.toString());
    formData.append('file', file);
    
    // 4. 发送请求
    let uploadUrl = `https://zonerama.wo58.cn/upload?albumId=${adminZoneramaAlbumId}`;
    if (adminZoneramaSession) {
      uploadUrl += `&session=${adminZoneramaSession}`;
    }
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    // 5. 解析响应
    const uploadResult = await uploadResponse.json();
    
    // 6. 提取 photoId 和尺寸信息
    let photoId = uploadResult.id || uploadResult.Id || uploadResult.photoId;
    const extractIdAndSize = (str: string) => {
      const match = str.match(/\/photos\/(?:public\/)?(\d+)_(\d+)x(\d+)_/);
      if (match) {
        return { id: match[1], width: parseInt(match[2]), height: parseInt(match[3]) };
      }
      const idMatch = str.match(/\/photos\/(?:public\/)?(\d+)_/);
      return idMatch ? { id: idMatch[1], width: null, height: null } : null;
    };
    
    let sizeInfo = extractIdAndSize(uploadResult.imageUrl) || 
                   extractIdAndSize(uploadResult.ImagePattern);
    
    if (!photoId && sizeInfo) {
      photoId = sizeInfo.id;
    }
    
    // 7. 构建最终 URL
    let finalImageUrl = '';
    if (isVideo) {
      // 视频：使用 VideoPlayer 链接
      finalImageUrl = `https://us.zonerama.com/VideoPlayer/${photoId}`;
    } else {
      // 图片：根据实际尺寸构造 URL
      if (sizeInfo && sizeInfo.width && sizeInfo.height) {
        finalImageUrl = `https://us.zonerama.com/photos/${photoId}_${sizeInfo.width}x${sizeInfo.height}_0.jpg`;
      } else {
        // 兜底：使用默认尺寸 2000x2000
        finalImageUrl = `https://us.zonerama.com/photos/${photoId}_2000x2000_0.jpg`;
      }
    }
    
    // 8. 生成缩略图（视频）
    let thumbnailUrl = '';
    if (isVideo && photoId) {
      thumbnailUrl = `https://us.zonerama.com/photos/${photoId}_2000x2000_0.jpg`;
    }
    
    // 9. 保存到数据库
    wallpaperItems.push({
      user_id: user!.id,
      url: finalImageUrl,
      thumbnail_url: thumbnailUrl || undefined,
      type: isVideo ? 'video' : 'image',
      status: 'approved',
      title: file.name.replace(/\.[^/.]+$/, ""),
      category_id: batchCategory === 'all' ? null : batchCategory,
      tags: batchTags.split(',').map(t => t.trim()).filter(Boolean)
    });
  });
  
  // 10. 批量插入数据库
  if (wallpaperItems.length > 0) {
    await api.batchUploadMedia(wallpaperItems);
  }
};
```

---

## 图片加载策略

### 1. 加载流程

系统采用**优先直连，失败时自动降级到代理**的策略，确保图片加载的稳定性和速度。

```
┌──────────────────────┐
│ 用户请求图片         │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ 检查是否为 Zonerama  │
│ 图片（us.zonerama.com）│
└──────┬───────────────┘
       │
       ↓ 是
┌──────────────────────┐
│ 尝试直连加载         │
│ 超时：5 秒           │
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│ 检查响应头           │
│ zonerama-status: ?   │
└──────┬───────────────┘
       │
       ├─→ ERROR ──────────┐
       │                   │
       ↓ 正常              ↓
┌──────────────────────┐  ┌──────────────────────┐
│ 返回 Blob URL        │  │ 切换到代理加载       │
└──────────────────────┘  │ 超时：10 秒          │
                          └──────┬───────────────┘
                                 │
                                 ↓
                          ┌──────────────────────┐
                          │ 返回 Blob URL        │
                          └──────────────────────┘
                                 │
                                 ↓ 失败
                          ┌──────────────────────┐
                          │ 返回原图 URL         │
                          │ （最终降级）         │
                          └──────────────────────┘
```

### 2. 代码实现

**位置**: `src/lib/media.ts` → `getProtectedUrl`

```typescript
export async function getProtectedUrl(
  url: string | null | undefined, 
  useWebp = true,
  options: { 
    width?: number; 
    height?: number; 
    quality?: number; 
    enableCache?: boolean;
  } = {}
): Promise<string> {
  if (!url) return '';
  
  const { width, height, quality, enableCache = true } = options;
  
  // 1. 检查缓存
  if (blobCache.has(url)) {
    if (enableCache) recordCacheHit('media_cache', true);
    return blobCache.get(url)!;
  }
  
  // 2. 检查是否为 Zonerama 图片
  const isZonerama = url.includes('us.zonerama.com/photos/');
  
  // 3. 尝试直连加载
  try {
    const timeout = 5000; // 5 秒超时
    
    const response = await fetch(url, { 
      mode: 'cors',
      signal: AbortSignal.timeout(timeout)
    });
    
    // 4. 检查 Zonerama 响应头中的 zonerama-status
    if (isZonerama) {
      const zoneramaStatus = response.headers.get('zonerama-status');
      if (zoneramaStatus === 'ERROR') {
        console.warn(`[ProtectedMedia] Zonerama 直连返回 ERROR 状态，切换到代理`);
        throw new Error('Zonerama status: ERROR');
      }
    }
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    // 5. 转换为 Blob URL
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    blobCache.set(url, blobUrl);
    
    if (enableCache) {
      recordCacheHit('media_cache', false);
    }
    
    return blobUrl;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[ProtectedMedia] 直连失败: ${url}`, errorMsg);
    
    // 6. 如果是 Zonerama 图片且直连失败，尝试使用代理
    if (isZonerama) {
      try {
        const proxyUrl = getZoneramaProxyUrl(url);
        console.log(`[ProtectedMedia] 使用代理: ${proxyUrl}`);
        
        const proxyResponse = await fetch(proxyUrl, {
          mode: 'cors',
          signal: AbortSignal.timeout(10000) // 代理给更长的超时时间
        });
        
        if (!proxyResponse.ok) throw new Error(`Proxy HTTP ${proxyResponse.status}`);
        
        const blob = await proxyResponse.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobCache.set(url, blobUrl);
        
        if (enableCache) {
          recordCacheHit('media_cache', false);
        }
        
        return blobUrl;
      } catch (proxyErr) {
        console.error(`[ProtectedMedia] 代理也失败:`, proxyErr);
        // 最终降级：返回原图 URL
        return url;
      }
    }
    
    if (enableCache) recordCacheHit('media_cache', false);
    
    // 非 Zonerama 图片，直接返回原图
    return url; 
  }
}
```

### 3. 代理 URL 生成

**位置**: `src/lib/media.ts` → `getZoneramaProxyUrl`

```typescript
export function getZoneramaProxyUrl(
  url: string | null | undefined, 
  authToken?: string | null, 
  albumId?: string | null,
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  if (!url) return '';
  const original = url.trim();
  
  // 如果已经是代理后的 URL，则不再处理
  if (original.includes('zonerama.wo58.cn')) {
    return url;
  }
  
  // 检测是否为 Zonerama 图片
  const isZonerama = (original.includes('zonerama.com')) && !original.includes('?img=');
  
  if (!isZonerama) {
    return url;
  }
  
  try {
    // 构建代理 URL
    const baseUrl = 'https://zonerama.wo58.cn/';
    const params = new URLSearchParams();
    
    // img 参数：传递完整 URL（Worker 会自动处理）
    params.append('img', original);
    
    // auth 参数（可选）
    if (authToken) {
      params.append('auth', authToken);
    }
    
    // albumId 参数（可选）
    if (albumId) {
      params.append('albumId', albumId);
    }
    
    // 注意：Worker 不支持 width/height/quality 参数
    // 如果需要调整尺寸，应该在原始 URL 中指定（如 _800x800_0.jpg）
    
    return `${baseUrl}?${params.toString()}`;
  } catch (err) {
    console.error('[getZoneramaProxyUrl] 构建代理 URL 失败:', err);
    return url;
  }
}
```

### 4. 响应头检测

系统会检查 Zonerama 响应头中的 `zonerama-status` 字段：

```typescript
// 检查 Zonerama 响应头中的 zonerama-status
if (isZonerama) {
  const zoneramaStatus = response.headers.get('zonerama-status');
  if (zoneramaStatus === 'ERROR') {
    console.warn(`[ProtectedMedia] Zonerama 直连返回 ERROR 状态，切换到代理`);
    throw new Error('Zonerama status: ERROR');
  }
}
```

**响应头示例**
```
HTTP/1.1 200 OK
Content-Type: image/jpeg
zonerama-status: ERROR
```

当检测到 `zonerama-status: ERROR` 时，系统会自动切换到代理加载。

---

## 视频处理

### 1. 视频播放

**视频 URL 格式**
```
https://us.zonerama.com/VideoPlayer/{photoId}
```

**iframe 嵌入**
```html
<iframe
  src="https://us.zonerama.com/VideoPlayer/607625557?autoplay=1&muted=0"
  allow="autoplay; fullscreen"
  allowFullScreen
  style="border: none"
/>
```

**自动播放参数**
- `autoplay=1`: 自动播放
- `muted=0`: 不静音

### 2. 视频缩略图

**自动生成规则**
```typescript
// 视频 URL
const videoUrl = 'https://us.zonerama.com/VideoPlayer/607625557';

// 提取视频 ID
const videoId = '607625557';

// 生成缩略图 URL
const thumbnailUrl = `https://us.zonerama.com/photos/${videoId}_2000x2000_0.jpg`;
// 结果: https://us.zonerama.com/photos/607625557_2000x2000_0.jpg
```

**代码实现**
```typescript
// 自动生成缩略图（如果是视频）
let thumbnailUrl = '';
if (isVideo && photoId) {
  thumbnailUrl = `https://us.zonerama.com/photos/${photoId}_2000x2000_0.jpg`;
  console.log('自动生成视频缩略图:', thumbnailUrl);
}
```

### 3. 视频预览优化

**问题**
1. 不能上下滑动切换资源
2. 打开初始化黑屏
3. 不能自动播放

**解决方案**

**位置**: `src/components/MediaPreview.tsx`

```typescript
// 1. 添加缩略图背景（解决黑屏问题）
<div className="relative w-full h-full">
  {/* 缩略图背景 */}
  {item.thumbnail_url && (
    <img
      src={item.thumbnail_url}
      alt={item.title || ''}
      className="absolute inset-0 w-full h-full object-contain blur-sm opacity-50"
    />
  )}
  
  {/* 视频 iframe */}
  <iframe
    src={`${item.url}${isActive ? '?autoplay=1&muted=0' : ''}`}
    className="relative w-full h-full"
    allow="autoplay; fullscreen"
    allowFullScreen
    style={{ border: 'none', pointerEvents: 'none' }}
  />
  
  {/* 透明覆盖层（解决滑动切换问题） */}
  <div 
    className="absolute inset-0 z-10"
    style={{ pointerEvents: 'auto' }}
    onClick={(e) => {
      // 点击时允许事件穿透到 iframe
      const target = e.currentTarget;
      target.style.pointerEvents = 'none';
      setTimeout(() => {
        if (target && target.style) {
          target.style.pointerEvents = 'auto';
        }
      }, 100);
    }}
  />
</div>

// 2. 添加滚轮事件监听（解决滑动切换问题）
useEffect(() => {
  if (!emblaApi) return;
  
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    if (e.deltaY > 0) {
      // 向下滚动，切换到下一个
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      }
    } else if (e.deltaY < 0) {
      // 向上滚动，切换到上一个
      if (emblaApi.canScrollPrev()) {
        emblaApi.scrollPrev();
      }
    }
  };
  
  window.addEventListener('wheel', handleWheel, { passive: false });
  
  return () => {
    window.removeEventListener('wheel', handleWheel);
  };
}, [emblaApi]);

// 3. 添加键盘事件监听（支持方向键切换）
useEffect(() => {
  if (!emblaApi) return;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (emblaApi.canScrollPrev()) {
        emblaApi.scrollPrev();
      }
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}, [emblaApi]);
```

---

## 配置管理

### 1. 后台配置

**位置**: 后台管理 → 系统参数设置 → 存储管理 → 专享上传

**配置项**
- **Zonerama 相册 ID**: 必需，上传图片将保存到此相册中
- **Zonerama Session**: 可选，用于认证
- **图片接口**: 可选，配置后所有 Zonerama 图片 URL 将自动拼接此接口前缀

**配置存储**
```typescript
// 配置对象
const zoneramaConfig = {
  album_id: '12345678',
  session: 'optional_session_token',
  photo_api: 'https://zomphoto.wo58.cn/?url='
};

// 保存配置
await api.updateSystemConfig('zonerama_upload_config', zoneramaConfig);

// 读取配置
const { data } = await api.getSystemConfig('zonerama_upload_config');
```

### 2. 图片接口功能

**功能说明**

图片接口功能允许管理员配置一个接口前缀，前端所有包含 `zonerama.com/photos` 的图片 URL 都会自动拼接这个接口前缀。

**使用场景**
- 使用第三方图片代理服务加速图片加载
- 统一图片访问入口，便于监控和管理
- 实现图片访问控制和权限验证

**配置示例**

在后台管理 → 系统参数设置 → 存储管理 → 专享上传 → 图片接口中填写：
```
https://zomphoto.wo58.cn/?url=
```

**效果**

配置后，前端图片 URL 会自动转换：

```
原始 URL：
https://us.zonerama.com/photos/1019401782_690x1226_18.jpg

转换后 URL：
https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_690x1226_18.jpg
```

**实现原理**

**位置**: `src/lib/media.ts` → `applyZoneramaPhotoApi`

```typescript
/**
 * 应用 Zonerama 图片接口配置
 * 如果 URL 包含 zonerama.com/photos，则在前面拼接配置的接口前缀
 * @param url 原始图片 URL
 * @returns 应用接口后的 URL
 */
export async function applyZoneramaPhotoApi(url: string | null | undefined): Promise<string> {
  if (!url) return '';
  
  // 检查是否为 Zonerama 图片
  const isZoneramaPhoto = url.includes('zonerama.com/photos');
  if (!isZoneramaPhoto) {
    return url;
  }
  
  // 获取配置的图片接口
  const photoApi = await getZoneramaPhotoApi();
  if (!photoApi) {
    return url;
  }
  
  // 如果 URL 已经包含接口前缀，则不再重复拼接
  if (url.startsWith(photoApi)) {
    return url;
  }
  
  // 拼接接口前缀
  return `${photoApi}${url}`;
}
```

**缓存机制**

为了提高性能，图片接口配置会被缓存 1 分钟：

```typescript
// 缓存 Zonerama 图片接口配置
let cachedPhotoApi: string | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 分钟缓存

/**
 * 获取 Zonerama 图片接口配置
 */
async function getZoneramaPhotoApi(): Promise<string> {
  const now = Date.now();
  
  // 如果缓存有效，直接返回
  if (cachedPhotoApi !== null && now - lastFetchTime < CACHE_DURATION) {
    return cachedPhotoApi;
  }
  
  try {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'zonerama_upload_config')
      .single();
    
    if (data?.value?.photo_api) {
      cachedPhotoApi = data.value.photo_api;
      lastFetchTime = now;
      return cachedPhotoApi;
    }
  } catch (err) {
    console.warn('[getZoneramaPhotoApi] 获取配置失败:', err);
  }
  
  cachedPhotoApi = '';
  lastFetchTime = now;
  return '';
}
```

**应用位置**

图片接口配置会在 `getProtectedUrl` 函数中自动应用：

```typescript
export async function getProtectedUrl(
  url: string | null | undefined, 
  useWebp = true,
  options: { ... } = { enableBlob: true, enableCache: false }
): Promise<string> {
  if (!url) return '';
  if (url.startsWith('blob:')) return url;
  if (url.startsWith('data:')) return url;

  // 1. 应用 Zonerama 图片接口配置
  const processedUrl = await applyZoneramaPhotoApi(url);

  // 2. 后续处理...
  // ...
}
```

### 3. 前端读取配置

**位置**: `src/pages/Upload.tsx`

```typescript
const [adminZoneramaAlbumId, setAdminZoneramaAlbumId] = useState('');
const [adminZoneramaSession, setAdminZoneramaSession] = useState('');

useEffect(() => {
  const loadZoneramaConfig = async () => {
    try {
      const { data } = await api.getSystemConfig('zonerama_upload_config');
      if (data?.value) {
        setAdminZoneramaAlbumId(data.value.album_id || '');
        setAdminZoneramaSession(data.value.session || '');
      }
    } catch (err) {
      console.error('加载 Zonerama 配置失败:', err);
    }
  };
  
  loadZoneramaConfig();
}, []);
```

---

## 错误处理

### 1. 常见错误

#### E_ZONERAMA_INVALIDPARAMS

**错误信息**
```json
{
  "Error": "E_ZONERAMA_INVALIDPARAMS",
  "id": null,
  "imageUrl": null
}
```

**原因**
- 相册 ID 无效或不存在
- Session 认证失败
- 文件格式不支持
- 文件大小超限

**解决方案**
1. 检查后台配置的相册 ID 是否正确
2. 确认 Session 是否有效（如果使用）
3. 确认文件格式是否支持（JPEG、PNG、GIF、MP4、MOV 等）
4. 确认文件大小是否在限制范围内

#### 网络请求失败

**错误信息**
```
网络请求失败: Failed to fetch
```

**原因**
- 网络连接中断
- 代理服务器不可用
- CORS 跨域问题

**解决方案**
1. 检查网络连接
2. 检查代理服务器状态（https://zonerama.wo58.cn/）
3. 检查浏览器控制台是否有 CORS 错误

#### 上传超时

**错误信息**
```
上传失败 (408): Request Timeout
```

**原因**
- 文件过大
- 网络速度慢
- 服务器响应慢

**解决方案**
1. 减小文件大小
2. 检查网络速度
3. 重试上传

### 2. 错误处理代码

```typescript
try {
  // 上传逻辑
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    body: formData
  }).catch(err => {
    console.error('网络请求失败:', err);
    throw new Error(`网络请求失败: ${err.message}`);
  });
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('上传响应错误:', uploadResponse.status, errorText);
    throw new Error(`上传失败 (${uploadResponse.status}): ${errorText || '服务器错误'}`);
  }
  
  const uploadResult = await uploadResponse.json();
  
  if (uploadResult.Error) {
    throw new Error(uploadResult.Error);
  }
  
  // 处理成功响应
  // ...
} catch (fileErr: any) {
  console.error(`File ${file.name} upload failed:`, fileErr);
  toast.error(`${file.name} 上传失败: ${fileErr.message}`, { duration: 5000 });
  failCount++;
}
```

### 3. 日志记录

系统会记录详细的日志信息，便于排查问题：

```typescript
console.log(`上传文件: ${file.name}, 类型: ${file.type}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB, 是否视频: ${isVideo}`);
console.log('上传结果:', uploadResult);
console.log('提取的 photoId 和尺寸:', { photoId, sizeInfo });
console.log('视频链接:', finalImageUrl);
console.log('自动生成视频缩略图:', thumbnailUrl);
console.log(`文件 ${file.name} 上传成功，URL: ${finalImageUrl}`);
```

---

## 常见问题

### Q1: 为什么上传后显示 "E_ZONERAMA_INVALIDPARAMS" 错误？

**A**: 这个错误通常是因为：
1. **相册 ID 未配置或无效**：请前往后台管理 → 系统参数设置 → 存储管理 → 专享上传，检查相册 ID 是否正确。
2. **Session 认证失败**：如果配置了 Session，请确认 Session 是否有效。
3. **文件格式不支持**：确认文件格式是否为支持的格式（JPEG、PNG、GIF、MP4、MOV 等）。

### Q2: 为什么图片加载很慢或加载失败？

**A**: 系统采用优先直连的策略，如果直连失败会自动降级到代理。可能的原因：
1. **网络问题**：检查网络连接是否正常。
2. **Zonerama 服务器响应慢**：系统会自动切换到代理加载。
3. **响应头返回 ERROR**：系统会自动检测 `zonerama-status` 响应头，如果为 ERROR 则切换到代理。

### Q3: 为什么视频不能自动播放？

**A**: 视频自动播放需要满足以下条件：
1. **iframe src 包含 autoplay 参数**：确认 URL 中包含 `?autoplay=1&muted=0`。
2. **浏览器允许自动播放**：某些浏览器默认禁止自动播放，需要用户交互后才能播放。
3. **视频处于激活状态**：只有当前激活的视频才会自动播放。

### Q4: 为什么视频缩略图不显示？

**A**: 视频缩略图是自动生成的，规则如下：
1. **提取视频 ID**：从视频 URL 中提取 photoId。
2. **生成缩略图 URL**：`https://us.zonerama.com/photos/{photoId}_2000x2000_0.jpg`。
3. **检查缩略图是否存在**：如果缩略图不存在，可能是 Zonerama 还未生成，请稍后再试。

### Q5: 如何批量上传图片？

**A**: 系统支持批量上传，最多 6 个并发：
1. **选择多个文件**：在上传页面选择多个文件。
2. **自动并发上传**：系统会自动并发上传，最多 6 个。
3. **查看上传进度**：每个文件都有独立的上传进度条。
4. **批量保存到数据库**：上传完成后，系统会批量保存到数据库，性能优化。

### Q6: 如何配置 Zonerama 相册 ID？

**A**: 请按以下步骤配置：
1. 登录后台管理系统。
2. 进入 **系统参数设置** → **存储管理** → **专享上传**。
3. 填写 **Zonerama 相册 ID**（必需）。
4. 填写 **Zonerama Session**（可选，用于认证）。
5. 点击 **保存配置**。

### Q7: 如何获取 Zonerama 相册 ID？

**A**: 请联系 Zonerama 服务提供商获取相册 ID。

### Q8: 代理服务器地址是什么？

**A**: 代理服务器地址为：`https://zonerama.wo58.cn/`

### Q9: 如何查看上传日志？

**A**: 打开浏览器控制台（F12），查看 Console 标签页，系统会输出详细的上传日志。

### Q10: 如何优化上传速度？

**A**: 可以尝试以下方法：
1. **减小文件大小**：压缩图片或视频。
2. **减少并发数量**：系统默认 6 个并发，可以根据网络情况调整。
3. **使用更快的网络**：切换到更快的网络环境。

---

## 附录

### A. 相关文件列表

```
src/
├── pages/
│   ├── Upload.tsx                          # 上传页面
│   ├── Home.tsx                            # 首页（视频播放）
│   └── admin/
│       └── components/
│           └── StorageSection.tsx          # 后台配置页面
├── components/
│   ├── MediaPreview.tsx                    # 媒体预览组件
│   └── common/
│       └── ProtectedMedia.tsx              # 受保护的媒体组件
├── lib/
│   └── media.ts                            # 图片加载策略
└── db/
    └── api.ts                              # API 接口
```

### B. API 接口列表

```typescript
// 系统配置
api.getSystemConfig('zonerama_upload_config')
api.updateSystemConfig('zonerama_upload_config', config)

// 批量上传
api.batchUploadMedia(items)
api.batchUpsertAlbumPhotos(photos)
```

### C. 环境变量

无需配置环境变量，所有配置通过后台管理系统完成。

### D. 依赖库

```json
{
  "dependencies": {
    "spark-md5": "^3.0.2",        // MD5 计算
    "tesseract.js": "^5.0.0",     // OCR 识别
    "sonner": "^1.0.0"            // Toast 通知
  }
}
```

---

## 更新日志

### v1.1.0 (2026-04-02)
- ✅ 新增图片接口功能
  - 后台可配置图片接口前缀
  - 所有 Zonerama 图片 URL 自动拼接接口前缀
  - 支持第三方图片代理服务
  - 1 分钟缓存机制，提高性能
- ✅ 统一 Zonerama 域名为 us.zonerama.com
  - 将 cache.zonerama.com 改为 us.zonerama.com
  - 将 eu.zonerama.com 改为 us.zonerama.com
  - 简化配置，提升全球访问速度

### v1.0.0 (2026-04-02)
- ✅ 初始版本
- ✅ 支持图片/视频上传到 Zonerama
- ✅ 智能加载策略（优先直连，失败时自动降级到代理）
- ✅ 视频缩略图自动生成
- ✅ 响应头状态检测（`zonerama-status: ERROR`）
- ✅ 批量上传（最多 6 个并发）
- ✅ 上传进度跟踪
- ✅ 自动提取图片尺寸信息
- ✅ 视频预览优化（滑动切换、黑屏、自动播放）
- ✅ 透明覆盖层点击事件空指针修复

---

## 联系方式

如有问题或建议，请联系开发团队。

---

**文档版本**: v1.1.0  
**最后更新**: 2026-04-02  
**作者**: 研发工程师智能体
