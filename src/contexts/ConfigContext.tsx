import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { api } from '@/db/api';
import type { StorageConfig } from '@/types';
import { Loader2, MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cache } from '@/lib/cache';
import { initZoneramaPhotoApi } from '@/lib/media';
import { APP_VERSION } from '@/constants/version';


interface ConfigContextType {
  config: StorageConfig | null;
  securityConfig: {
    mode: 'original' | 'blob' | 'blob_slice' | 'canvas_slice' | 'canvas';
    slice_count: number;
    signed_expiry: number;
    enable_webp: boolean;
    prefetch_count: number;
  } | null;
  debugSettings: {
    is_enabled: boolean;
    retention_minutes: number;
  } | null;
  loading: boolean;
  isWeChatEnv: boolean;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  securityConfig: null,
  debugSettings: null,
  loading: true,
  isWeChatEnv: false,
  refreshConfig: async () => {},
});

// 全局缓存，避免内存中重复请求
let globalConfigCache: StorageConfig | null = null;
let globalSecurityCache: any = null;
let globalDebugCache: any = null;

// 合并环境变量配置与数据库配置 (环境变量优先)
const mergeEnvConfig = (dbConfig: Partial<StorageConfig>): StorageConfig => {
  const env = import.meta.env;
  
  const toBool = (val: any) => val === 'true' || val === true;
  const toNum = (val: any) => (val !== undefined && val !== '' && val !== null) ? Number(val) : undefined;

  const merged = {
    ...dbConfig,
    site_title: env.VITE_SITE_TITLE || dbConfig.site_title || '图片视频赏析',
    site_logo: env.VITE_SITE_LOGO || dbConfig.site_logo,
    site_description: env.VITE_SITE_DESCRIPTION || dbConfig.site_description,
    wechat_only: env.VITE_WECHAT_ONLY !== undefined ? toBool(env.VITE_WECHAT_ONLY) : (dbConfig.wechat_only ?? false),
    wechat_forbidden: env.VITE_WECHAT_FORBIDDEN !== undefined ? toBool(env.VITE_WECHAT_FORBIDDEN) : (dbConfig.wechat_forbidden ?? false),
    enable_blob: env.VITE_ENABLE_BLOB !== undefined ? toBool(env.VITE_ENABLE_BLOB) : (dbConfig.enable_blob ?? true),
    enable_image_cache: env.VITE_ENABLE_IMAGE_CACHE !== undefined ? toBool(env.VITE_ENABLE_IMAGE_CACHE) : (dbConfig.enable_image_cache ?? true),
    force_login: env.VITE_FORCE_LOGIN !== undefined ? toBool(env.VITE_FORCE_LOGIN) : (dbConfig.force_login ?? false),
    ms_optimization_enabled: env.VITE_MS_OPTIMIZATION_ENABLED !== undefined ? toBool(env.VITE_MS_OPTIMIZATION_ENABLED) : (dbConfig.ms_optimization_enabled ?? false),
    register_mode: (env.VITE_REGISTER_MODE as any) || dbConfig.register_mode || 'public',
    watermark_enabled: env.VITE_WATERMARK_ENABLED !== undefined ? toBool(env.VITE_WATERMARK_ENABLED) : (dbConfig.watermark_enabled ?? false),
    check_in_points: toNum(env.VITE_CHECK_IN_POINTS) ?? dbConfig.check_in_points ?? 0,
    anonymous_view_limit: toNum(env.VITE_ANONYMOUS_VIEW_LIMIT) ?? dbConfig.anonymous_view_limit ?? 0,
  } as StorageConfig;

  return merged;
};

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StorageConfig | null>(globalConfigCache);
  const [securityConfig, setSecurityConfig] = useState<any>(globalSecurityCache);
  const [debugSettings, setDebugSettings] = useState<any>(globalDebugCache);
  const [loading, setLoading] = useState(!globalConfigCache);
  const [isWeChatEnv, setIsWeChatEnv] = useState(false);
  const cacheStatsRef = useRef({ hits: 0, misses: 0, lastReport: Date.now() });

  useEffect(() => {
    const isWX = /micromessenger/i.test(navigator.userAgent.toLowerCase());
    setIsWeChatEnv(isWX);

    // 如果没有缓存，立即获取
    if (!globalConfigCache) {
      fetchConfig();
    }
  }, []);

  const fetchConfig = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 在刷新配置前清除本地内存缓存，确保获取的是最新 DB 数据
      cache.clear();
      
      // 预加载 Zonerama 图片接口配置
      initZoneramaPhotoApi();
      
      const [{ data: sData }, { data: mData }, { data: dData }, { data: vData }] = await Promise.all([
        api.getStorageConfig(),
        api.getSystemConfig('media_security_config'),
        api.getDebugLogSettings(),
        api.getSystemConfig('app_version')
      ]);

      // 检测版本更新
      const serverVersion = vData?.value;
      if (serverVersion && serverVersion !== APP_VERSION) {
        console.log(`[ConfigProvider] 检测到新版本: ${serverVersion}, 当前版本: ${APP_VERSION}. 准备更新...`);
        // 存储标记，避免无限重刷
        const lastUpdate = localStorage.getItem('last_version_update');
        const now = Date.now();
        if (!lastUpdate || (now - Number(lastUpdate) > 60000)) { // 1分钟内不重复重刷
          localStorage.setItem('last_version_update', String(now));
          toast.info('检测到系统有新版本，正在自动为您刷新页面...', { duration: 3000 });
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
      }
      
      const rawConfig = (sData || {
        site_title: '图片视频赏析',
        force_login: false,
        wechat_only: false,
        wechat_forbidden: false
      }) as Partial<StorageConfig>;

      const mergedConfig = mergeEnvConfig(rawConfig);
      setConfig(mergedConfig);
      globalConfigCache = mergedConfig;
      
      const secConfig = mData?.value || {
        mode: 'canvas',
        slice_count: 4,
        signed_expiry: 300,
        enable_webp: true,
        prefetch_count: 5
      };
      setSecurityConfig(secConfig);
      globalSecurityCache = secConfig;

      const debugConfig = dData || {
        is_enabled: false,
        retention_minutes: 5
      };
      setDebugSettings(debugConfig);
      globalDebugCache = debugConfig;
      
      if (mergedConfig.site_title) {
        document.title = mergedConfig.site_title;
      }
      
      if (mergedConfig.site_logo) {
        const link = (document.querySelector("link[rel*='icon']") || document.createElement('link')) as HTMLLinkElement;
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = mergedConfig.site_logo;
        document.getElementsByTagName('head')[0].appendChild(link);
      }
    } catch (error) {
      console.error('[ConfigProvider] 获取配置失败:', error);
      if (!config) {
        const fallback = mergeEnvConfig({});
        setConfig(fallback);
        globalConfigCache = fallback;
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };


  return (
    <ConfigContext.Provider value={{ config, securityConfig, debugSettings, loading, isWeChatEnv, refreshConfig: () => fetchConfig(true) }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
