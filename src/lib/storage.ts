/**
 * 统一本地存储管理工具
 */

export const STORAGE_KEYS = {
  VIDEO_MUTED: 'video_muted',
  VIEW_LAYOUT: 'home_view_layout',
  VIEW_MODE: 'home_view_mode',
  MEDIA_TYPE: 'home_media_type',
  CATEGORY_ID: 'home_category_id',
  AUTH_TOKEN: 'supabase.auth.token',
  USER_PREFERENCES: 'user_preferences',
  CACHE_CATEGORIES: 'cache_categories',
  CACHE_CONFIGS: 'cache_system_configs',
  SPLASH_SHOWN: (id: string) => `splash_shown_${id}`,
  POPUP_SHOWN: (id: string) => `popup_shown_${id}`,
};

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      return JSON.parse(value) as T;
    } catch (e) {
      console.warn(`Failed to parse storage key "${key}":`, e);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to set storage key "${key}":`, e);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    localStorage.clear();
  },

  // Session storage for session-only data
  session: {
    get<T>(key: string, defaultValue: T): T {
      try {
        const value = sessionStorage.getItem(key);
        if (value === null) return defaultValue;
        return JSON.parse(value) as T;
      } catch (e) {
        return defaultValue;
      }
    },
    set<T>(key: string, value: T): void {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Failed to set session storage key "${key}":`, e);
      }
    },
    remove(key: string): void {
      sessionStorage.removeItem(key);
    }
  }
};
