import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/db/supabase';

/**
 * ============================================
 * App Management SDK - 应用管理软件开发工具包
 * ============================================
 * 
 * 【核心功能】
 * 为外部子应用提供标准化的后端对接能力，通过云函数网关实现安全的数据访问。
 * 
 * 【适用场景】
 * - 多租户应用平台：为不同的子应用提供独立的配置和数据隔离
 * - 内容管理系统：媒体内容的上传、审核、展示、搜索
 * - 用户系统集成：用户认证、权限管理、个人中心
 * - 存储服务对接：Cloudflare R2 等云存储配置管理
 * 
 * 【使用流程】
 * 1. 在管理后台 -> App管理 -> 创建App配置
 * 2. 生成API密钥（apiKey）
 * 3. 在前端项目中初始化SDK：
 *    ```typescript
 *    import { initApp, AppManager } from '@/lib/app-sdk';
 *    
 *    // 方式1: 快捷初始化（推荐）
 *    const { manager, config, features } = await initApp({
 *      appId: 'your-app-id',
 *      apiKey: 'your-api-key'
 *    });
 *    
 *    // 方式2: 手动实例化
 *    const manager = new AppManager({
 *      appId: 'your-app-id',
 *      apiKey: 'your-api-key'
 *    });
 *    ```
 * 
 * 【安全机制】
 * - 所有请求通过云函数网关转发，前端不直接接触数据库密钥
 * - API Key 在管理后台可随时禁用或重置
 * - 敏感配置字段（如存储密钥）使用混淆加密传输
 * - 支持请求超时控制和自动重试
 * 
 * 【AI 使用提示】
 * - 当需要获取应用配置时，使用 `manager.getConfig()`
 * - 当需要获取媒体列表时，使用 `manager.getMediaItems(params)`
 * - 当需要用户认证时，使用 `manager.login(credentials)` 或 `manager.register(userData)`
 * - 当需要检查功能开关时，使用 `manager.getFeatureFlags()`
 * - 所有方法返回统一格式：`{ success: boolean; data?: T; error?: string }`
 */

/**
 * 混淆解密函数（增强版）
 * 支持两种加密格式：
 * 1. __ENC__ (旧版，简单 Base64)
 * 2. __ENC_Z__ (新版，盐值 + 反转 + Base64)
 */
const decryptStr = (str: string) => {
  if (typeof str === 'string') {
    try {
      // 新版混淆加密（盐值 + 反转）
      if (str.startsWith('__ENC_Z__')) {
        const reversed = str.replace('__ENC_Z__', '').split('').reverse().join('');
        const decoded = typeof window !== 'undefined' 
          ? atob(reversed) 
          : Buffer.from(reversed, 'base64').toString();
        const salted = decodeURIComponent(decoded);
        // 移除盐值前缀
        const salt = 'Zingle_';
        return salted.startsWith(salt) ? salted.slice(salt.length) : salted;
      }
      
      // 旧版简单加密（向后兼容）
      if (str.startsWith('__ENC__')) {
        const decoded = typeof window !== 'undefined'
          ? atob(str.replace('__ENC__', ''))
          : Buffer.from(str.replace('__ENC__', ''), 'base64').toString();
        return decodeURIComponent(decoded);
      }
    } catch (e) {
      console.warn('Decryption failed:', e);
      return str;
    }
  }
  return str;
};

const BASE_URL = decryptStr('__ENC_Z__=Qnbl1WZnFmbh1WLwBXYGJTJxYnRyUycu9Wa0Nmb1ZmRyUibj5CO182duU2chJWYwV3cGJTJGJTJBNTJzBHd0h2Xlx2ZulmW');
const DEFAULT_SUPABASE_URL = decryptStr('__ENC_Z__=gGd1FWLwBXYGJTJxYnRyUycu9Wa0Nmb1ZmRyUibj5CO182duU2chJWYwV3cGJTJGJTJBNTJzBHd0h2Xlx2ZulmW');
const DEFAULT_SUPABASE_ANON_KEY = decryptStr('__ENC_Z__=ElY5d2NtdDZM1UQytmbGVXRohHazs0VqN3Vh5UQjdDUPF1QPdHaq5Ub4FnL5IERNdXQE9EMJpXT1UkaPlWQIVGbKNET3FkaOpXR65EMjpnT49maJBjRXFWa3lWSs5EWZlmRHNWMO5WS2kUejpHbtl0cJlmY2VzVZl2bqlEb4JjY5pUel5SOKNkVYB3aJZTSDNWNS5WSzlUaOFTS6VVSKl2TpN2RihmS5V2Xlx2ZulmW');

// 大数据缓存存储封装 (Web 版本)
const storage = {
  async setItem(key: string, value: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  async deleteItem(key: string) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

// 专门用于配置的 SecureStorage (Web 版本使用 localStorage)
const secureStorage = {
  async setItem(key: string, value: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  async deleteItem(key: string) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
};

interface AppConfig {
  appId: string;
  appName: string;
  bundleId: string | null;
  platform: string[];
  description: string | null;
  iconUrl: string | null;
  theme: Record<string, any>;
  features: Record<string, boolean>;
  api: Record<string, any>;
  storage: Record<string, any>;
  ui: Record<string, any>;
  cfr2: Record<string, any>;
  custom: Record<string, any>;
  isActive: boolean;
  updatedAt: string;
}

interface VersionInfo {
  version: string;
  versionCode: number;
  downloadUrl: string | null;
  installUrl: string | null;
  releaseNotes: string | null;
  isForceUpdate: boolean;
  minApiVersion: string | null;
  releasedAt: string;
}

interface FeatureFlags {
  enableUpload: boolean;
  enableDiscovery: boolean;
  enableAlbum: boolean;
  enableDailyGallery: boolean;
  enablePersonalCenter: boolean;
  enableComment: boolean;
  enableShare: boolean;
  enableDownload: boolean;
  enableWatermark: boolean;
  enableAds: boolean;
  requireLoginForUpload: boolean;
  requireAuditForDiscovery: boolean;
  [key: string]: boolean;
}

export interface SdkConfig {
  appId: string;
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export class AppManager {
  private config: SdkConfig;
  private baseUrl: string;

  constructor(config: SdkConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || BASE_URL;
  }

  /**
   * 发送请求
   */
  private async request<T>(path: string, options: any = {}): Promise<{ success: boolean; data?: T; error?: string; fromCache?: boolean }> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);
    
    if (this.config.apiKey) {
      url.searchParams.set('apiKey', this.config.apiKey);
      url.searchParams.set('appId', this.config.appId);
    }

    if (options.params) {
      Object.keys(options.params).forEach(key => 
        url.searchParams.append(key, String(options.params[key]))
      );
    }

    const isFormData = options.body instanceof FormData;

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'X-API-Key': this.config.apiKey,
        ...options.headers
      },
    };

    // 如果不是 FormData，默认设置为 JSON 并序列化 body
    if (options.body) {
      if (isFormData) {
        // FormData 不需要手动设置 Content-Type，浏览器会自动处理边界
        if (fetchOptions.headers) {
          delete (fetchOptions.headers as any)['Content-Type'];
        }
        fetchOptions.body = options.body as FormData;
      } else {
        (fetchOptions.headers as any)['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(options.body);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url.toString(), fetchOptions);
      clearTimeout(timeoutId);

      const responseText = await response.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`服务器返回了非 JSON 格式的内容: ${responseText.slice(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      // 自动缓存成功的数据
      if (options.cacheKey) {
        await storage.setItem(options.cacheKey, JSON.stringify(data));
      }

      // 自动解密敏感字段
      return { success: true, data: this.decryptData(data) };
    } catch (error: any) {
      // 尝试加载缓存
      if (options.cacheKey) {
        const cached = await storage.getItem(options.cacheKey);
        if (cached) {
          try {
            return { success: true, data: this.decryptData(JSON.parse(cached)), fromCache: true };
          } catch (e) {
            // ignore
          }
        }
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * 递归解密对象中的敏感字段
   */
  private decryptData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map(item => this.decryptData(item));
    }

    const result = { ...data };
    Object.keys(result).forEach(key => {
      if (typeof result[key] === 'string') {
        result[key] = decryptStr(result[key]);
      } else if (typeof result[key] === 'object') {
        result[key] = this.decryptData(result[key]);
      }
    });
    return result;
  }

  /**
   * 获取应用完整配置信息
   * 包含：主题配色、存储参数、UI配置、API端点等。
   * 内置缓存机制，在网络请求失败时会自动回退到上一次成功的本地副本。
   * 
   * @returns Promise<{ success: boolean; data?: AppConfig; error?: string }>
   */
  async getConfig() {
    return this.request<AppConfig>(`/config/${this.config.appId}`, { cacheKey: `config_${this.config.appId}` });
  }

  /**
   * 检查版本更新
   * 
   * @param platform 平台类型 ('ios', 'android', 'h5', 'miniprogram')
   * @param currentVersion 当前版本号（如 '1.0.0'）
   * @returns Promise<{ success: boolean; data: VersionInfo; error?: string }>
   */
  async checkVersion(platform: string, currentVersion: string) {
    return this.request<any>(`/version/${this.config.appId}`, { 
      params: { platform, version: currentVersion }
    });
  }

  /**
   * 验证 API 密钥（apiKey）的有效性
   * 
   * @returns Promise<{ success: boolean; data?: { valid: boolean; message?: string }; error?: string }>
   */
  async validateKey() {
    return this.request<any>('/validate-key', {
      method: 'POST',
      body: { appId: this.config.appId, apiKey: this.config.apiKey }
    });
  }

  /**
   * 获取当前应用的功能开关（Feature Flags）
   * 
   * @returns Promise<{ success: boolean; data?: FeatureFlags; error?: string }>
   */
  async getFeatureFlags() {
    return this.request<FeatureFlags>(`/features/${this.config.appId}`, { cacheKey: `features_${this.config.appId}` });
  }

  /**
   * 获取存储相关的敏感配置 (如 CFR2 存储桶、密钥等)
   * 该方法会自动从完整配置中提取存储模块。
   * 
   * @returns Promise<{ success: boolean; data?: { cfr2: any; storage: any }; error?: string }>
   */
  async getStorageConfig() {
    const res = await this.getConfig();
    if (res.success && res.data) {
      return {
        success: true,
        data: {
          cfr2: res.data.cfr2,
          storage: res.data.storage
        }
      };
    }
    return { success: false, error: res.error || '获取存储配置失败' };
  }

  /**
   * 获取媒体内容列表
   * 
   * @param params 过滤参数 { page: number, limit: number, category_id?: string, type?: 'image'|'video', tag?: string }
   * @returns Promise<{ success: boolean; data?: MediaItem[]; error?: string }>
   */
  async getMediaItems(params: any) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-media/list' : '/app-media/list';
    return this.request<any>(endpoint, { params, cacheKey: `media_list_${JSON.stringify(params)}` });
  }

  /**
   * 获取指定媒体详情
   * 
   * @param id 媒体唯一 ID
   * @returns Promise<{ success: boolean; data?: MediaItem; error?: string }>
   */
  async getMediaDetail(id: string) {
    const endpoint = this.baseUrl.includes('app-management') ? `../../app-media/detail/${id}` : `/app-media/detail/${id}`;
    return this.request<any>(endpoint, { cacheKey: `media_detail_${id}` });
  }

  /**
   * 获取每日精选作品
   */
  async getDailyGallery() {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-media/daily' : '/app-media/daily';
    return this.request<any>(endpoint, { cacheKey: 'daily_gallery' });
  }

  /**
   * 获取壁纸类内容列表
   */
  async getWallpapers(params: any = {}) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-media/wallpapers' : '/app-media/wallpapers';
    return this.request<any>(endpoint, { params });
  }

  /**
   * 全文搜索作品
   * 
   * @param query 搜索关键词
   * @param params 额外参数
   */
  async searchMedia(query: string, params: any = {}) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-media/search' : '/app-media/search';
    return this.request<any>(endpoint, { 
      params: { ...params, q: query },
      cacheKey: `search_${query}_${JSON.stringify(params)}`
    });
  }

  /**
   * 获取当前热门搜索标签列表
   */
  async getTrendingTags() {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-media/trending-tags' : '/app-media/trending-tags';
    return this.request<any>(endpoint, { cacheKey: 'trending_tags' });
  }

  /**
   * 随机获取一批媒体作品 (常用于换一换或首页推荐)
   *
   * @param params 过滤参数 { count?: number, categoryId?: string, tag?: string, type?: 'image'|'video' }
   * @returns Promise<{ success: boolean; data?: MediaItem[]; error?: string }>
   */
  async getRandomMedia(params: any = {}) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-media/random' : '/app-media/random';
    return this.request<any>(endpoint, { params });
  }

  /**
   * 随机获取一批美图/精选图片（随机美图专用接口）
   * 语义别名，等同于 getRandomMedia({ type: 'image', ...params })。
   *
   * @param params 过滤参数 { count?: number, categoryId?: string, tag?: string }
   * @returns Promise<{ success: boolean; data?: MediaItem[]; error?: string }>
   *
   * @example
   * const res = await manager.getRandomImages({ count: 10, tag: '风景' });
   * if (res.success) console.log('随机美图:', res.data);
   */
  async getRandomImages(params: any = {}) {
    return this.getRandomMedia({ ...params, type: 'image' });
  }

  /**
   * 获取相册/专题合集列表
   */
  async getPhotoAlbums(params: any = {}) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-albums/list' : '/app-albums/list';
    return this.request<any>(endpoint, { params, cacheKey: `albums_list_${JSON.stringify(params)}` });
  }

  /**
   * 获取指定相册中的所有照片
   * 
   * @param albumId 相册 ID
   */
  async getAlbumPhotos(albumId: string) {
    const endpoint = this.baseUrl.includes('app-management') ? `../../app-albums/photos/${albumId}` : `/app-albums/photos/${albumId}`;
    return this.request<any>(endpoint, { cacheKey: `album_photos_${albumId}` });
  }

  /**
   * 获取作品分类列表
   */
  async getCategories() {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-categories' : '/app-categories';
    return this.request<any>(endpoint, { cacheKey: 'categories' });
  }

  /**
   * 获取所有标签列表（支持分页）
   */
  async getTags(params: any = {}) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-tags' : '/app-tags';
    return this.request<any>(endpoint, { params, cacheKey: `tags_${JSON.stringify(params)}` });
  }

  /**
   * 获取作品的评论列表
   */
  async getComments(mediaId: string) {
    const endpoint = this.baseUrl.includes('app-management') ? `../../app-media/comments/${mediaId}` : `/app-media/comments/${mediaId}`;
    return this.request<any>(endpoint);
  }

  /**
   * 发表评论
   */
  async postComment(mediaId: string, userId: string, content: string) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-media/comments' : '/app-media/comments';
    return this.request<any>(endpoint, {
      method: 'POST',
      body: { mediaId, userId, content }
    });
  }

  /**
   * 获取用户的个人资料（包含角色和权限组）
   */
  async getUserProfile(userId: string) {
    const endpoint = this.baseUrl.includes('app-management') ? `../../app-user/profile?userId=${userId}` : `/app-user/profile?userId=${userId}`;
    return this.request<any>(endpoint, { cacheKey: `user_profile_${userId}` });
  }

  /**
   * 切换收藏状态（已收藏则取消，未收藏则添加）
   */
  async toggleFavorite(userId: string, mediaId: string) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-user/toggle-favorite' : '/app-user/toggle-favorite';
    return this.request<any>(endpoint, {
      method: 'POST',
      body: { userId, mediaId }
    });
  }

  /**
   * 检查用户是否已收藏指定媒体
   */
  async checkFavoriteStatus(userId: string, mediaId: string) {
    const endpoint = this.baseUrl.includes('app-management') ? `../../app-user/favorite-status?userId=${userId}&mediaId=${mediaId}` : `/app-user/favorite-status?userId=${userId}&mediaId=${mediaId}`;
    return this.request<any>(endpoint);
  }

  /**
   * 获取用户的收藏作品列表
   */
  async getUserFavorites(userId: string, params: any = {}) {
    const endpoint = this.baseUrl.includes('app-management') ? `../../app-user/favorites?userId=${userId}` : `/app-user/favorites?userId=${userId}`;
    return this.request<any>(endpoint, { params });
  }

  /**
   * 获取用户自己上传的媒体作品
   */
  async getUserMedia(userId: string, params: any = {}) {
    const endpoint = this.baseUrl.includes('app-management') ? `../../app-user/media?userId=${userId}` : `/app-user/media?userId=${userId}`;
    return this.request<any>(endpoint, { params });
  }

  /**
   * 获取用户的详细权限列表
   * 包含：所属权限组及其关联的具体权限标识符。
   */
  async getPermissions(userId: string): Promise<{
    success: boolean;
    role?: string;
    group?: any;
    permissions?: string[];
    error?: string;
  }> {
    const res = await this.getUserProfile(userId);
    if (res.success && res.data) {
      return {
        success: true,
        role: res.data.role,
        group: res.data.permission_groups,
        permissions: res.data.permission_groups?.permissions || []
      };
    }
    return { success: false, error: res.error || '获取权限失败' };
  }

  /**
   * 校验用户是否拥有指定权限
   * 
   * @param userId 用户 ID
   * @param permission 权限标识符
   * @returns Promise<boolean>
   */
  async checkPermission(userId: string, permission: string) {
    const res = await this.getPermissions(userId);
    if (res.success) {
      return res.permissions?.includes(permission) || res.role === 'admin';
    }
    return false;
  }

  /**
   * 上传新的媒体作品
   * 注：上传后通常进入待审核状态（取决于应用配置）。
   */
  async uploadMedia(data: {
    userId: string;
    url: string;
    type?: string;
    title?: string;
    description?: string;
    categoryId?: string;
    tags?: string[];
  }) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-media/upload' : '/app-media/upload';
    return this.request<any>(endpoint, {
      method: 'POST',
      body: data
    });
  }

  /**
   * 删除指定媒体作品（软删除）
   *
   * @param id 媒体唯一 ID
   * @returns Promise<{ success: boolean; data?: any; error?: string }>
   */
  async deleteMedia(id: string) {
    const endpoint = this.baseUrl.includes('app-management') ? `../../app-media/${id}` : `/app-media/${id}`;
    return this.request<any>(endpoint, { method: 'DELETE' });
  }

  /**
   * 删除指定相册/专题合集（软删除）
   *
   * @param id 相册唯一 ID
   * @returns Promise<{ success: boolean; data?: any; error?: string }>
   */
  async deleteAlbum(id: string) {
    const endpoint = this.baseUrl.includes('app-management') ? `../../app-albums/${id}` : `/app-albums/${id}`;
    return this.request<any>(endpoint, { method: 'DELETE' });
  }

  /**
   * 用户登录接口
   *
   * @param credentials 登录凭证（如 { email, password }）
   */
  async login(credentials: any) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-auth/login' : '/app-auth/login';
    return this.request<any>(endpoint, {
      method: 'POST',
      body: { ...credentials, action: 'login' }
    });
  }

  /**
   * 用户注册接口
   */
  async register(userData: any) {
    const endpoint = this.baseUrl.includes('app-management') ? '../../app-auth/register' : '/app-auth/register';
    return this.request<any>(endpoint, {
      method: 'POST',
      body: { ...userData, action: 'register' }
    });
  }

  /**
   * 获取平台上所有已公开的 App 列表（不涉及敏感信息）
   */
  async getPublicApps() {
    return this.request<AppConfig[]>('/all-apps');
  }

  /**
   * 将文件上传到配置的存储服务 (支持 R2 Worker, R2 S3, Supabase)
   * 该方法会自动识别应用配置，选择最优上传路径，并在失败时自动切换备用通道。
   * 
   * @param file 待上传的文件对象
   * @param options 上传选项 { path?: string, bucket?: string, onProgress?: (p: number) => void }
   */
  async uploadFile(file: File, options: { path?: string; bucket?: string; onProgress?: (p: number) => void } = {}) {
    const { success, data: config } = await this.getStorageConfig();
    if (!success || !config) throw new Error('无法获取存储配置');

    const storageConfig = { ...config.cfr2, ...config.storage };
    const { r2_mode, r2_worker_url, r2_worker_token, endpoint, key_id, secret_key, bucket_name } = storageConfig;
    
    const fileName = options.path || `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${file.name}`;
    const targetBucket = options.bucket || bucket_name || 'media_content';

      // 1. 尝试直接通过 Worker 上传 (性能最好)
    if (r2_mode === 'worker' && r2_worker_url) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', fileName);
        if (targetBucket) formData.append('bucket', targetBucket);

        const response = await fetch(`${r2_worker_url.replace(/\/$/, '')}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': r2_worker_token ? `Bearer ${r2_worker_token}` : '',
          },
          body: formData
        });

        if (response.ok) {
          const res = await response.json();
          if (res.success) return { success: true, url: res.url || res.fakeUrl };
        } else {
          const errText = await response.text();
          console.warn('Worker upload failed response:', response.status, errText);
        }
      } catch (e) {
        console.warn('Direct worker upload failed, trying gateway...', e);
      }
    }

    // 2. 尝试通过云函数网关上传 (支持 S3 和 Worker 后备)
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      if (targetBucket) formData.append('bucket', targetBucket);

      const res = await this.request<any>('/upload-to-r2', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data', // 注意：fetch 会自动处理 multipart 边界，这里仅作标识
        },
        body: formData // 在 request 方法中需要特殊处理 FormData
      });

      if (res.success && res.data?.url) {
        return { success: true, url: res.data.url };
      }
    } catch (e) {
      console.warn('Gateway upload failed...', e);
    }

    throw new Error('所有上传通道均已失效，请检查存储配置');
  }


  /**
   * 导出用于 APK 打包的特殊构建配置
   */
  async exportBuildConfig() {
    return this.request<any>(`/export-build-config/${this.config.appId}`);
  }
}

/**
 * 主题工具函数
 */
export function applyTheme(theme: Record<string, string>, root?: HTMLElement) {
  const target = root || document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    const cssVar = `--app-${kebabCase(key)}`;
    target.style.setProperty(cssVar, value);
  });
}

function kebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * 快捷初始化函数
 */
export async function initApp(config: SdkConfig) {
  const manager = new AppManager(config);

  // 1. 验证密钥
  const keyInfo = await manager.validateKey();
  if (!keyInfo.success || !keyInfo.data?.valid) {
    throw new Error(`API Key无效: ${keyInfo.error || keyInfo.data?.message}`);
  }

  // 2. 获取配置
  const configRes = await manager.getConfig();
  if (!configRes.success || !configRes.data) {
    throw new Error(`获取App配置失败: ${configRes.error}`);
  }

  // 3. 获取功能开关
  const featuresRes = await manager.getFeatureFlags();

  // 4. 应用主题
  if (configRes.data.theme && typeof document !== 'undefined') {
    applyTheme(configRes.data.theme);
  }

  return {
    manager,
    config: configRes.data,
    features: (featuresRes.data || {}) as FeatureFlags,
    keyInfo: keyInfo.data,
  };
}

/**
 * React Hook (可选)
 */

export function useAppConfig(sdkConfig: SdkConfig) {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const manager = new AppManager(sdkConfig);
      const configRes = await manager.getConfig();
      const featuresRes = await manager.getFeatureFlags();
      
      if (configRes.success && configRes.data) {
        setAppConfig(configRes.data);
      }
      if (featuresRes.success && featuresRes.data) {
        setFeatures(featuresRes.data);
      }
      
      if (!configRes.success) {
        setError(configRes.error || '获取配置失败');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sdkConfig.appId, sdkConfig.apiKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { appConfig, features, loading, error, refresh };
}
