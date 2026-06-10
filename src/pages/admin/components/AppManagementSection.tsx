import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Loader2, Plus, Smartphone, Globe, Key, Code, Copy, Check,
  Trash2, Edit3, RefreshCw, ExternalLink, Package, Shield,
  Terminal, Download, Eye, EyeOff, ChevronRight, Layers, Settings,
  Palette, Database, Zap, Info, Save, Hammer, FileArchive, Wrench
} from 'lucide-react';

interface AppConfig {
  id: string;
  app_name: string;
  app_id: string;
  bundle_id: string | null;
  platform: string[];
  description: string | null;
  icon_url: string | null;
  theme_config: Record<string, any>;
  feature_flags: Record<string, any>;
  api_config: Record<string, any>;
  storage_config: Record<string, any>;
  ui_config: Record<string, any>;
  cfr2_config: Record<string, any>;
  custom_config: Record<string, any>;
  apk_config: Record<string, any>;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface AppVersion {
  id: string;
  app_id: string;
  version: string;
  version_code: number;
  platform: string;
  download_url: string | null;
  install_url: string | null;
  release_notes: string | null;
  is_force_update: boolean;
  min_api_version: string | null;
  status: 'draft' | 'published' | 'deprecated';
  created_at: string;
  updated_at: string;
}

interface AppApiKey {
  id: string;
  app_id: string;
  key_name: string;
  api_key: string;
  secret_key: string;
  permissions: string[];
  rate_limit: number;
  allowed_origins: string[];
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_THEME = {
  primaryColor: '#6366f1',
  secondaryColor: '#a855f7',
  backgroundColor: '#ffffff',
  darkModeBackground: '#0f172a',
  fontFamily: 'system-ui',
  borderRadius: '16px'
};

const DEFAULT_FEATURES = {
  enableUpload: true,
  enableDiscovery: true,
  enableAlbum: true,
  enableDailyGallery: true,
  enablePersonalCenter: true,
  enableComment: false,
  enableShare: true,
  enableDownload: true,
  enableWatermark: true,
  enableAds: false,
  requireLoginForUpload: true,
  requireAuditForDiscovery: true
};

const DEFAULT_API_CONFIG = {
  baseUrl: 'https://supabase.wo58.cn',
  supabaseUrl: 'https://supabase.wo58.cn',
  supabaseAnonKey: '',
  secureStorage: true,
  timeout: 30000,
  retryCount: 3,
  cdnDomain: '',
  imageParams: 'rs:fit:800:0/q:85',
  thumbnailParams: 'rs:fit:300:0/q:60'
};

const DEFAULT_CFR2 = {
  enabled: false,
  useSiteSettings: false,
  userId: '',
  keyId: '',
  secretKey: '',
  endpoint: '',
  customDomain: '',
  bucketName: 'app-media',
  region: 'auto'
};

const FEATURE_LABELS: Record<string, string> = {
  enableUpload: '上传功能',
  enableDiscovery: '探索页',
  enableAlbum: '写真集',
  enableDailyGallery: '每日图集',
  enablePersonalCenter: '个人中心',
  enableComment: '评论功能',
  enableShare: '分享功能',
  enableDownload: '下载功能',
  enableWatermark: '水印功能',
  enableAds: '广告功能',
  requireLoginForUpload: '上传需登录',
  requireAuditForDiscovery: '探索页需审核'
};

const DEFAULT_APK_CONFIG = {
  app_name: '图片视频赏析',
  package_name: 'com.example.picvideo',
  version_name: '1.0.0',
  version_code: 1,
  min_sdk: 21,
  target_sdk: 34,
  icon_url: '',
  splash_url: '',
  splash_bg_color: '#6366f1',
  webview_mode: 'fullscreen',
  orientation: 'portrait',
  enable_pull_refresh: true,
  enable_zoom: false,
  user_agent_suffix: '',
  allow_http: false,
  keep_screen_on: false,
  immersive_mode: true,
  permissions: ['INTERNET', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'CAMERA'],
  custom_headers: {},
  offline_cache: true,
  cache_size_mb: 100,
  js_bridge_enabled: true,
  deeplink_scheme: ''
};

export function AppManagementSection() {
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [apiKeys, setApiKeys] = useState<AppApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AppConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  // Form states
  const [formData, setFormData] = useState<Partial<AppConfig>>({
    app_name: '',
    app_id: '',
    bundle_id: '',
    platform: ['android', 'ios'],
    description: '',
    theme_config: { ...DEFAULT_THEME },
    feature_flags: { ...DEFAULT_FEATURES },
    api_config: { ...DEFAULT_API_CONFIG },
    cfr2_config: { ...DEFAULT_CFR2 },
    apk_config: { ...DEFAULT_APK_CONFIG },
    is_active: true,
    is_public: false
  });

  const [versionForm, setVersionForm] = useState<Partial<AppVersion>>({
    version: '',
    version_code: 1,
    platform: 'android',
    download_url: '',
    install_url: '',
    release_notes: '',
    is_force_update: false,
    status: 'draft'
  });

  const [keyForm, setKeyForm] = useState<Partial<AppApiKey>>({
    key_name: 'default',
    permissions: ['read', 'write'],
    rate_limit: 1000,
    is_active: true
  });

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('app_configs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setApps(data || []);
    } catch (e: any) {
      toast.error('获取App列表失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVersions = useCallback(async (appId: string) => {
    try {
      const { data, error } = await supabase.from('app_versions').select('*').eq('app_id', appId).order('version_code', { ascending: false });
      if (error) throw error;
      setVersions(data || []);
    } catch (e: any) {
      toast.error('获取版本列表失败: ' + e.message);
    }
  }, []);

  const fetchApiKeys = useCallback(async (appId: string) => {
    try {
      const { data, error } = await supabase.from('app_api_keys').select('*').eq('app_id', appId).order('created_at', { ascending: false });
      if (error) throw error;
      setApiKeys(data || []);
    } catch (e: any) {
      toast.error('获取API密钥失败: ' + e.message);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const handleSaveApp = async () => {
    if (!formData.app_name || !formData.app_id) {
      toast.error('App名称和AppID不能为空');
      return;
    }
    try {
      const api_config = { ...(formData.api_config || {}) };
      const cfr2_config = { ...(formData.cfr2_config || {}) };

      // 如果开启加密存储，对敏感字段进行混淆
      if (api_config.secureStorage) {
        if (api_config.supabaseAnonKey && !api_config.supabaseAnonKey.startsWith('__ENC__')) {
          api_config.supabaseAnonKey = `__ENC__${btoa(encodeURIComponent(api_config.supabaseAnonKey))}`;
        }
        Object.keys(cfr2_config).forEach(key => {
          const val = (cfr2_config as any)[key];
          if ((key.toLowerCase().includes('secret') || key.toLowerCase().includes('key')) && val && !val.startsWith('__ENC__')) {
            (cfr2_config as any)[key] = `__ENC__${btoa(encodeURIComponent(val))}`;
          }
        });
      }

      const payload: any = {
        ...formData,
        api_config,
        cfr2_config,
        platform: Array.isArray(formData.platform) ? formData.platform : ['android', 'ios']
      };
      if (selectedApp) {
        const { error } = await ((supabase as any).from('app_configs').update(payload).eq('id', selectedApp.id));
        if (error) throw error;
        toast.success('App配置已更新');
      } else {
        const { error } = await ((supabase as any).from('app_configs').insert(payload));
        if (error) throw error;
        toast.success('App已创建');
      }
      setDialogOpen(false);
      fetchApps();
    } catch (e: any) {
      toast.error('保存失败: ' + e.message);
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!window.confirm('确定删除此App配置？关联的版本和密钥也将被删除。')) return;
    try {
      const { error } = await ((supabase as any).from('app_configs').delete().eq('id', id));
      if (error) throw error;
      toast.success('App已删除');
      fetchApps();
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const handleSaveVersion = async () => {
    if (!selectedApp || !versionForm.version) return;
    try {
      const payload: any = { ...versionForm, app_id: selectedApp.app_id };
      const { error } = await ((supabase as any).from('app_versions').insert(payload));
      if (error) throw error;
      toast.success('版本已发布');
      setVersionDialogOpen(false);
      fetchVersions(selectedApp.app_id);
    } catch (e: any) {
      toast.error('发布失败: ' + e.message);
    }
  };

  const handleGenerateKey = async () => {
    if (!selectedApp) return;
    try {
      const payload: any = { ...keyForm, app_id: selectedApp.app_id };
      const { data, error } = await ((supabase as any).from('app_api_keys').insert(payload).select().single());
      if (error) throw error;
      toast.success('API密钥已生成');
      setKeyDialogOpen(false);
      fetchApiKeys(selectedApp.app_id);
    } catch (e: any) {
      toast.error('生成失败: ' + e.message);
    }
  };

  const handleDeleteVersion = async (id: string) => {
    if (!window.confirm('确定删除此版本？')) return;
    try {
      const { error } = await ((supabase as any).from('app_versions').delete().eq('id', id));
      if (error) throw error;
      toast.success('版本已删除');
      if (selectedApp) fetchVersions(selectedApp.app_id);
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm('确定删除此API密钥？')) return;
    try {
      const { error } = await ((supabase as any).from('app_api_keys').delete().eq('id', id));
      if (error) throw error;
      toast.success('密钥已删除');
      if (selectedApp) fetchApiKeys(selectedApp.app_id);
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const openEditDialog = (app: AppConfig) => {
    // 还原加密字段以便编辑
    const api_config = { ...DEFAULT_API_CONFIG, ...app.api_config };
    const cfr2_config = { ...DEFAULT_CFR2, ...app.cfr2_config };

    const decrypt = (val: any) => {
      if (typeof val === 'string' && val.startsWith('__ENC__')) {
        try {
          return decodeURIComponent(atob(val.replace('__ENC__', '')));
        } catch (e) {
          return val;
        }
      }
      return val;
    };

    if (api_config.supabaseAnonKey) {
      api_config.supabaseAnonKey = decrypt(api_config.supabaseAnonKey);
    }
    Object.keys(cfr2_config).forEach(key => {
      (cfr2_config as any)[key] = decrypt((cfr2_config as any)[key]);
    });

    setSelectedApp(app);
    setFormData({
      app_name: app.app_name,
      app_id: app.app_id,
      bundle_id: app.bundle_id || '',
      platform: app.platform || ['android', 'ios'],
      description: app.description || '',
      theme_config: { ...DEFAULT_THEME, ...app.theme_config },
      feature_flags: { ...DEFAULT_FEATURES, ...app.feature_flags },
      api_config,
      cfr2_config,
      apk_config: { ...DEFAULT_APK_CONFIG, ...app.apk_config },
      custom_config: app.custom_config || {},
      is_active: app.is_active,
      is_public: app.is_public
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setSelectedApp(null);
    setFormData({
      app_name: '',
      app_id: '',
      bundle_id: '',
      platform: ['android', 'ios'],
      description: '',
      theme_config: { ...DEFAULT_THEME },
      feature_flags: { ...DEFAULT_FEATURES },
      api_config: { ...DEFAULT_API_CONFIG },
      cfr2_config: { ...DEFAULT_CFR2 },
      apk_config: { ...DEFAULT_APK_CONFIG },
      is_active: true,
      is_public: false
    });
    setDialogOpen(true);
  };

  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...(prev[parent as keyof typeof prev] as any || {}), [field]: value }
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const generateSdkCode = (app: AppConfig) => {
    const keys = apiKeys.filter(k => k.app_id === app.app_id && k.is_active);
    // 1. 初始化配置
    const activeKey = keys[0];
    return `// ===== App SDK 对接示例 =====
// 平台: ${app.platform.join(', ')}
// AppID: ${app.app_id}

import { createClient } from '@supabase/supabase-js';

// 1. 初始化配置
const APP_CONFIG = {
  appId: '${app.app_id}',
  baseUrl: '${app.api_config?.baseUrl || 'https://supabase.wo58.cn'}',
  apiKey: '${activeKey ? activeKey.api_key : 'YOUR_API_KEY'}',
  supabaseUrl: '${app.api_config?.supabaseUrl || 'https://supabase.wo58.cn'}',
  supabaseAnonKey: '${app.api_config?.supabaseAnonKey || ''}',
  timeout: ${app.api_config?.timeout || 30000},
  cdnDomain: '${app.api_config?.cdnDomain || ''}'
};

// 2. 初始化 Supabase 客户端 (仅限公开内容查询)
const supabase = createClient(
  APP_CONFIG.supabaseUrl,
  APP_CONFIG.supabaseAnonKey
);

// 3. App Management API 封装
class AppManager {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.baseUrl;
  }

  /**
   * 统一请求封装
   */
  async request(path, options = {}) {
    const url = new URL(\`\${this.baseUrl}\${path}\`);
    url.searchParams.set('apiKey', this.config.apiKey);
    url.searchParams.set('appId', this.config.appId);
    
    if (options.params) {
      Object.keys(options.params).forEach(k => url.searchParams.append(k, options.params[k]));
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      ...options.headers
    };

    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    return res.json();
  }

  // 获取App完整配置
  async getConfig() {
    return this.request(\`/functions/v1/app-management/config/\${this.config.appId}\`);
  }

  // 检查版本更新
  async checkVersion(platform, currentVersion) {
    return this.request(\`/functions/v1/app-management/version/\${this.config.appId}\`, {
      params: { platform, version: currentVersion }
    });
  }

  // 验证密钥有效性
  async validateKey() {
    return this.request(\`/functions/v1/app-management/validate-key\`, {
      method: 'POST',
      body: { appId: this.config.appId, apiKey: this.config.apiKey }
    });
  }

  // 获取功能开关
  async getFeatureFlags() {
    return this.request(\`/functions/v1/app-management/features/\${this.config.appId}\`);
  }

  // 用户登录
  async login(username, password) {
    return this.request(\`/functions/v1/app-auth/login\`, {
      method: 'POST',
      body: { username, password, action: 'login' }
    });
  }
}

// 4. 使用示例
const appManager = new AppManager(APP_CONFIG);

// 启动时获取配置
async function initApp() {
  const config = await appManager.getConfig();
  console.log('App配置:', config);

  // 检查更新
  const versionCheck = await appManager.checkVersion('android', '1.0.0');
  if (versionCheck.hasUpdate) {
    console.log('发现新版本:', versionCheck.latestVersion);
  }

  // 获取功能开关
  const features = await appManager.getFeatureFlags();
  if (features.enableDiscovery) {
    // 加载探索页
  }
}

initApp();
`;
  };

  // 获取APK配置
  const getApkConfig = (app: AppConfig) => ({ ...DEFAULT_APK_CONFIG, ...app.apk_config });

  // 生成MainActivity.kt
  const generateMainActivity = (app: AppConfig) => {
    const apk = getApkConfig(app);
    return `package ${apk.package_name}

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout

@SuppressLint("SetJavaScriptEnabled")
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout

    companion object {
        const val BASE_URL = "${app.api_config?.baseUrl || 'https://backend.appmiaoda.com'}"
        const val APP_ID = "${app.app_id}"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        swipeRefresh = findViewById(R.id.swipeRefresh)
        webView = findViewById(R.id.webView)

        setupWebView()
        setupPullToRefresh()
        loadApp()
    }

    private fun setupWebView() {
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                swipeRefresh.isRefreshing = false
            }
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(${apk.enable_zoom})
            builtInZoomControls = ${apk.enable_zoom}
            displayZoomControls = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            userAgentString = \`
                \${userAgentString} App/${apk.package_name}/${apk.version_name}
                ${apk.user_agent_suffix}
            \`.trimIndent()
        }

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
    }

    private fun setupPullToRefresh() {
        swipeRefresh.isEnabled = ${apk.enable_pull_refresh}
        swipeRefresh.setOnRefreshListener {
            webView.reload()
        }
    }

    private fun loadApp() {
        val apiKey = "${apiKeys.find(k => k.app_id === app.app_id && k.is_active)?.api_key || 'YOUR_API_KEY'}"
        val url = "\${BASE_URL}?appId=\${APP_ID}&apiKey=\${apiKey}"
        webView.loadUrl(url)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onResume() {
        super.onResume()
        ${apk.keep_screen_on ? 'window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)' : ''}
    }
}
`;
  };

  // 生成AndroidManifest.xml
  const generateAndroidManifest = (app: AppConfig) => {
    const apk = getApkConfig(app);
    const perms = (apk.permissions || []).map((p: string) => `    <uses-permission android:name="android.permission.${p}" />`).join('\n');
    return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${apk.package_name}">

${perms}
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="${apk.allow_http}">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:exported="true"
            android:screenOrientation="${apk.orientation === 'landscape' ? 'landscape' : 'portrait'}"
            android:theme="@style/SplashTheme">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            ${apk.deeplink_scheme ? `<intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${apk.deeplink_scheme}" />
            </intent-filter>` : ''}
        </activity>
    </application>
</manifest>
`;
  };

  // 生成build.gradle (app level)
  const generateBuildGradle = (app: AppConfig) => {
    const apk = getApkConfig(app);
    return `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace '${apk.package_name}'
    compileSdk ${apk.target_sdk}

    defaultConfig {
        applicationId "${apk.package_name}"
        minSdk ${apk.min_sdk}
        targetSdk ${apk.target_sdk}
        versionCode ${apk.version_code}
        versionName "${apk.version_name}"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = '1.8'
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'androidx.swiperefreshlayout:swiperefreshlayout:1.1.0'
}
`;
  };

  // 生成完整构建配置JSON
  const generateBuildConfig = (app: AppConfig) => {
    const apk = getApkConfig(app);
    const keys = apiKeys.filter(k => k.app_id === app.app_id && k.is_active);
    return {
      app: {
        name: app.app_name,
        appId: app.app_id,
        bundleId: app.bundle_id,
        description: app.description,
      },
      apk: apk,
      theme: app.theme_config,
      features: app.feature_flags,
      api: {
        ...app.api_config,
        appManagementEndpoint: `${app.api_config?.baseUrl || 'https://backend.appmiaoda.com'}/functions/v1/app-management`
      },
      keys: keys.map(k => ({
        keyName: k.key_name,
        apiKey: k.api_key,
        permissions: k.permissions
      })),
      buildFiles: {
        mainActivity: generateMainActivity(app),
        manifest: generateAndroidManifest(app),
        gradle: generateBuildGradle(app)
      }
    };
  };

  // 下载构建文件
  const downloadBuildFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`已下载 ${filename}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-primary" />
            App管理
          </h2>
          <p className="text-muted-foreground mt-1">管理App配置、版本发布、API密钥及前端对接</p>
        </div>
        <Button onClick={openCreateDialog} className="rounded-2xl bg-primary text-white">
          <Plus className="w-4 h-4 mr-2" /> 新建App
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-2xl bg-muted/50 p-1">
          <TabsTrigger value="list" className="rounded-xl data-[state=active]:bg-background">
            <Layers className="w-4 h-4 mr-2" /> App列表
          </TabsTrigger>
          <TabsTrigger value="config" className="rounded-xl data-[state=active]:bg-background" disabled={!selectedApp}>
            <Settings className="w-4 h-4 mr-2" /> 配置详情
          </TabsTrigger>
          <TabsTrigger value="versions" className="rounded-xl data-[state=active]:bg-background" disabled={!selectedApp}>
            <Package className="w-4 h-4 mr-2" /> 版本管理
          </TabsTrigger>
          <TabsTrigger value="keys" className="rounded-xl data-[state=active]:bg-background" disabled={!selectedApp}>
            <Key className="w-4 h-4 mr-2" /> API密钥
          </TabsTrigger>
          <TabsTrigger value="sdk" className="rounded-xl data-[state=active]:bg-background" disabled={!selectedApp}>
            <Code className="w-4 h-4 mr-2" /> 对接代码
          </TabsTrigger>
          <TabsTrigger value="build" className="rounded-xl data-[state=active]:bg-background" disabled={!selectedApp}>
            <Hammer className="w-4 h-4 mr-2" /> 打包中心
          </TabsTrigger>
        </TabsList>

        {/* App列表 */}
        <TabsContent value="list" className="mt-6">
          <Card className="rounded-3xl border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">App配置列表</CardTitle>
              <CardDescription>管理所有App的配置信息、对接密钥及版本发布</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>App名称</TableHead>
                      <TableHead>AppID</TableHead>
                      <TableHead>平台</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>公开</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apps.map(app => (
                      <TableRow key={app.id} className="cursor-pointer hover:bg-muted/30" onClick={() => {
                        setSelectedApp(app);
                        setActiveTab('config');
                        fetchVersions(app.app_id);
                        fetchApiKeys(app.app_id);
                      }}>
                        <TableCell className="font-medium">{app.app_name}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded-lg">{app.app_id}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {app.platform?.map(p => (
                              <Badge key={p} variant="outline" className="text-[10px] rounded-md capitalize">{p}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={app.is_active ? 'default' : 'secondary'} className="rounded-md text-[10px]">
                            {app.is_active ? '启用' : '停用'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={app.is_public ? 'default' : 'outline'} className="rounded-md text-[10px]">
                            {app.is_public ? '公开' : '私有'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString('zh-CN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 rounded-xl" onClick={(e) => { e.stopPropagation(); openEditDialog(app); }}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 rounded-xl text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteApp(app.id); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {apps.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Smartphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-medium">暂无App配置</p>
                    <p className="text-xs mt-1">点击上方按钮创建第一个App</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配置详情 */}
        <TabsContent value="config" className="mt-6 space-y-6">
          {selectedApp && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black">{selectedApp.app_name}</h3>
                  <code className="text-xs bg-muted px-2 py-1 rounded-lg">{selectedApp.app_id}</code>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setCodeDialogOpen(true)}>
                    <Code className="w-4 h-4 mr-2" /> 查看对接代码
                  </Button>
                  <Button size="sm" className="rounded-xl bg-primary text-white" onClick={() => openEditDialog(selectedApp)}>
                    <Edit3 className="w-4 h-4 mr-2" /> 编辑配置
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 基本信息 */}
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" /> 基本信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">App名称</Label>
                        <p className="text-sm font-medium mt-1">{selectedApp.app_name}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Bundle ID</Label>
                        <p className="text-sm font-medium mt-1">{selectedApp.bundle_id || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">平台</Label>
                        <div className="flex gap-1 mt-1">
                          {selectedApp.platform?.map(p => (
                            <Badge key={p} variant="outline" className="text-[10px] rounded-md capitalize">{p}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">状态</Label>
                        <Badge variant={selectedApp.is_active ? 'default' : 'secondary'} className="mt-1 rounded-md text-[10px]">
                          {selectedApp.is_active ? '启用' : '停用'}
                        </Badge>
                      </div>
                    </div>
                    {selectedApp.description && (
                      <div>
                        <Label className="text-xs text-muted-foreground">描述</Label>
                        <p className="text-sm mt-1">{selectedApp.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 主题配置 */}
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" /> 主题配置
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(selectedApp.theme_config || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground capitalize">{key}</span>
                        <div className="flex items-center gap-2">
                          {String(value).startsWith('#') && (
                            <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: String(value) }} />
                          )}
                          <code className="text-xs bg-muted px-2 py-1 rounded-lg">{String(value)}</code>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 功能开关 */}
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" /> 功能开关
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(selectedApp.feature_flags || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs">{FEATURE_LABELS[key] || key}</span>
                        <Badge variant={value ? 'default' : 'outline'} className="rounded-md text-[10px]">
                          {value ? '开启' : '关闭'}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* API配置 */}
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" /> API配置
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(selectedApp.api_config || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground capitalize">{key}</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded-lg">{String(value)}</code>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* CFR2配置 */}
                <Card className="rounded-3xl border-none shadow-sm lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" /> CFR2存储配置
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(selectedApp.cfr2_config || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground capitalize">{key}</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded-lg max-w-md truncate">{String(value) || '-'}</code>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* 版本管理 */}
        <TabsContent value="versions" className="mt-6 space-y-6">
          {selectedApp && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">{selectedApp.app_name} - 版本管理</h3>
                <Button size="sm" className="rounded-xl bg-primary text-white" onClick={() => {
                  setVersionForm({
                    version: '', version_code: 1, platform: 'android',
                    download_url: '', install_url: '', release_notes: '',
                    is_force_update: false, status: 'draft'
                  });
                  setVersionDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" /> 发布版本
                </Button>
              </div>
              <Card className="rounded-3xl border-none shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>版本号</TableHead>
                        <TableHead>平台</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>强制更新</TableHead>
                        <TableHead>发布时间</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versions.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.version} ({v.version_code})</TableCell>
                          <TableCell><Badge variant="outline" className="rounded-md text-[10px] capitalize">{v.platform}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={v.status === 'published' ? 'default' : v.status === 'draft' ? 'secondary' : 'outline'} className="rounded-md text-[10px]">
                              {v.status === 'published' ? '已发布' : v.status === 'draft' ? '草稿' : '已废弃'}
                            </Badge>
                          </TableCell>
                          <TableCell>{v.is_force_update ? '是' : '否'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString('zh-CN')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {v.download_url && (
                                <Button variant="ghost" size="sm" className="h-8 rounded-xl" onClick={() => window.open(v.download_url!, '_blank')}>
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-8 rounded-xl text-destructive" onClick={() => handleDeleteVersion(v.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {versions.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">暂无版本记录</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* API密钥 */}
        <TabsContent value="keys" className="mt-6 space-y-6">
          {selectedApp && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">{selectedApp.app_name} - API密钥</h3>
                <Button size="sm" className="rounded-xl bg-primary text-white" onClick={() => {
                  setKeyForm({ key_name: 'default', permissions: ['read', 'write'], rate_limit: 1000, is_active: true });
                  setKeyDialogOpen(true);
                }}>
                  <Key className="w-4 h-4 mr-2" /> 生成密钥
                </Button>
              </div>
              <Card className="rounded-3xl border-none shadow-sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead>Secret Key</TableHead>
                        <TableHead>权限</TableHead>
                        <TableHead>调用次数</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map(k => (
                        <TableRow key={k.id}>
                          <TableCell className="font-medium">{k.key_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded-lg truncate max-w-[120px]">{k.api_key}</code>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(k.api_key)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded-lg truncate max-w-[120px]">
                                {showSecret[k.id] ? k.secret_key : '••••••••••••'}
                              </code>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowSecret(prev => ({ ...prev, [k.id]: !prev[k.id] }))}>
                                {showSecret[k.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {k.permissions?.map(p => (
                                <Badge key={p} variant="outline" className="text-[10px] rounded-md">{p}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{k.usage_count}</TableCell>
                          <TableCell>
                            <Badge variant={k.is_active ? 'default' : 'secondary'} className="rounded-md text-[10px]">
                              {k.is_active ? '启用' : '停用'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8 rounded-xl text-destructive" onClick={() => handleDeleteKey(k.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {apiKeys.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Key className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="text-sm font-medium">暂无API密钥</p>
                      <p className="text-xs mt-1">生成密钥后方可进行前端对接</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 对接代码 */}
        <TabsContent value="sdk" className="mt-6 space-y-6">
          {selectedApp && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">{selectedApp.app_name} - 对接代码</h3>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => copyToClipboard(generateSdkCode(selectedApp))}>
                  <Copy className="w-4 h-4 mr-2" /> 复制全部代码
                </Button>
              </div>
              <Card className="rounded-3xl border-none shadow-sm">
                <CardContent className="p-6">
                  <ScrollArea className="h-[600px] rounded-2xl bg-slate-950 p-4">
                    <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {generateSdkCode(selectedApp)}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* 打包中心 */}
        <TabsContent value="build" className="mt-6 space-y-6">
          {selectedApp && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black">{selectedApp.app_name} - APK打包中心</h3>
                  <p className="text-sm text-muted-foreground mt-1">配置Android打包参数，一键生成WebView壳工程文件</p>
                </div>
                <Button size="sm" className="rounded-xl bg-primary text-white" onClick={() => openEditDialog(selectedApp)}>
                  <Edit3 className="w-4 h-4 mr-2" /> 编辑打包配置
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* APK基本信息 */}
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-primary" /> APK基本信息
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: '应用名称', key: 'app_name' },
                      { label: '包名', key: 'package_name' },
                      { label: '版本名称', key: 'version_name' },
                      { label: '版本代码', key: 'version_code' },
                      { label: '最低SDK', key: 'min_sdk' },
                      { label: '目标SDK', key: 'target_sdk' },
                      { label: '屏幕方向', key: 'orientation' },
                      { label: 'WebView模式', key: 'webview_mode' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded-lg">{String((selectedApp.apk_config as any)?.[item.key] || DEFAULT_APK_CONFIG[item.key as keyof typeof DEFAULT_APK_CONFIG])}</code>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 高级设置 */}
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-primary" /> 高级设置
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: '下拉刷新', key: 'enable_pull_refresh' },
                      { label: '允许缩放', key: 'enable_zoom' },
                      { label: '允许HTTP', key: 'allow_http' },
                      { label: '保持亮屏', key: 'keep_screen_on' },
                      { label: '沉浸式状态栏', key: 'immersive_mode' },
                      { label: '离线缓存', key: 'offline_cache' },
                      { label: 'JS桥接', key: 'js_bridge_enabled' },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-xs">{item.label}</span>
                        <Badge variant={((selectedApp.apk_config as any)?.[item.key] ?? DEFAULT_APK_CONFIG[item.key as keyof typeof DEFAULT_APK_CONFIG]) ? 'default' : 'outline'} className="rounded-md text-[10px]">
                          {((selectedApp.apk_config as any)?.[item.key] ?? DEFAULT_APK_CONFIG[item.key as keyof typeof DEFAULT_APK_CONFIG]) ? '开启' : '关闭'}
                        </Badge>
                      </div>
                    ))}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">缓存大小</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded-lg">{(selectedApp.apk_config as any)?.cache_size_mb || DEFAULT_APK_CONFIG.cache_size_mb} MB</code>
                    </div>
                  </CardContent>
                </Card>

                {/* 打包输出 */}
                <Card className="rounded-3xl border-none shadow-sm lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <FileArchive className="w-4 h-4 text-primary" /> 打包输出
                    </CardTitle>
                    <CardDescription>点击下方按钮下载打包配置文件，配合Android Studio构建APK</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button variant="outline" className="rounded-xl h-auto py-4 flex-col gap-2" onClick={() => downloadBuildFile('MainActivity.kt', generateMainActivity(selectedApp))}>
                        <Code className="w-5 h-5" />
                        <span className="text-xs font-medium">MainActivity.kt</span>
                      </Button>
                      <Button variant="outline" className="rounded-xl h-auto py-4 flex-col gap-2" onClick={() => downloadBuildFile('AndroidManifest.xml', generateAndroidManifest(selectedApp))}>
                        <FileArchive className="w-5 h-5" />
                        <span className="text-xs font-medium">AndroidManifest.xml</span>
                      </Button>
                      <Button variant="outline" className="rounded-xl h-auto py-4 flex-col gap-2" onClick={() => downloadBuildFile('build.gradle', generateBuildGradle(selectedApp))}>
                        <Settings className="w-5 h-5" />
                        <span className="text-xs font-medium">build.gradle</span>
                      </Button>
                    </div>
                    <div className="bg-slate-950 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-400 font-medium">打包配置预览 (JSON)</span>
                        <Button variant="ghost" size="sm" className="h-6 text-slate-400 hover:text-white" onClick={() => copyToClipboard(JSON.stringify(generateBuildConfig(selectedApp), null, 2))}>
                          <Copy className="w-3 h-3 mr-1" /> 复制
                        </Button>
                      </div>
                      <ScrollArea className="h-[300px]">
                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                          {JSON.stringify(generateBuildConfig(selectedApp), null, 2)}
                        </pre>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 创建/编辑App Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl rounded-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {selectedApp ? '编辑App配置' : '新建App'}
            </DialogTitle>
            <DialogDescription>
              {selectedApp ? '修改App的基础信息、主题、功能开关和存储配置' : '创建一个新的App配置，用于前端生成App时对接'}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="rounded-2xl bg-muted/50 p-1 w-full">
              <TabsTrigger value="basic" className="rounded-xl">基本信息</TabsTrigger>
              <TabsTrigger value="theme" className="rounded-xl">主题</TabsTrigger>
              <TabsTrigger value="features" className="rounded-xl">功能开关</TabsTrigger>
              <TabsTrigger value="api" className="rounded-xl">API配置</TabsTrigger>
              <TabsTrigger value="cfr2" className="rounded-xl">CFR2存储</TabsTrigger>
              <TabsTrigger value="apk" className="rounded-xl">APK打包</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>App名称</Label>
                  <Input value={formData.app_name} onChange={e => updateFormField('app_name', e.target.value)} placeholder="如：图片视频赏析App" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>AppID (唯一标识)</Label>
                  <Input value={formData.app_id} onChange={e => updateFormField('app_id', e.target.value)} placeholder="如：pic_video_app" disabled={!!selectedApp} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Bundle ID</Label>
                  <Input value={formData.bundle_id || ''} onChange={e => updateFormField('bundle_id', e.target.value)} placeholder="如：com.example.app" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>平台</Label>
                  <div className="flex gap-2 mt-2">
                    {['android', 'ios', 'web', 'mini_program'].map(p => (
                      <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(formData.platform || []).includes(p)}
                          onChange={e => {
                            const current = formData.platform || [];
                            updateFormField('platform', e.target.checked ? [...current, p] : current.filter(x => x !== p));
                          }}
                          className="rounded border-muted"
                        />
                        <span className="text-xs capitalize">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea value={formData.description || ''} onChange={e => updateFormField('description', e.target.value)} placeholder="App功能描述..." className="rounded-xl min-h-[80px]" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={!!formData.is_active} onCheckedChange={v => updateFormField('is_active', v)} />
                  <span className="text-sm">启用</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={!!formData.is_public} onCheckedChange={v => updateFormField('is_public', v)} />
                  <span className="text-sm">公开访问（无需鉴权即可获取配置）</span>
                </label>
              </div>
            </TabsContent>

            <TabsContent value="theme" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(DEFAULT_THEME).map(([key, defaultVal]) => (
                  <div key={key} className="space-y-2">
                    <Label className="capitalize">{key}</Label>
                    <div className="flex items-center gap-2">
                      {String(defaultVal).startsWith('#') && (
                        <input
                          type="color"
                          value={String((formData.theme_config as any)?.[key] || defaultVal)}
                          onChange={e => updateNestedField('theme_config', key, e.target.value)}
                          className="w-8 h-8 rounded-lg border-0 p-0 overflow-hidden"
                        />
                      )}
                      <Input
                        value={String((formData.theme_config as any)?.[key] || defaultVal)}
                        onChange={e => updateNestedField('theme_config', key, e.target.value)}
                        className="rounded-xl flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-3 mt-4">
              {Object.entries(DEFAULT_FEATURES).map(([key, defaultVal]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl">
                  <span className="text-sm">{FEATURE_LABELS[key] || key}</span>
                  <Switch
                    checked={!!((formData.feature_flags as any)?.[key] ?? defaultVal)}
                    onCheckedChange={v => updateNestedField('feature_flags', key, v)}
                  />
                </div>
              ))}
            </TabsContent>

            <TabsContent value="api" className="space-y-4 mt-4">
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-4">
                <p className="text-xs text-primary leading-relaxed">
                  <Globe className="w-3 h-3 inline mr-1" />
                  配置后端网关与 Supabase 连接信息。SDK 初始化后会自动获取这些配置，确保客户端认证功能正常运行。
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>API Base URL (后端网关)</Label>
                  <Input
                    value={(formData.api_config as any)?.baseUrl ?? DEFAULT_API_CONFIG.baseUrl}
                    onChange={e => updateNestedField('api_config', 'baseUrl', e.target.value)}
                    className="rounded-xl"
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supabase Project URL</Label>
                  <Input
                    value={(formData.api_config as any)?.supabaseUrl ?? DEFAULT_API_CONFIG.supabaseUrl}
                    onChange={e => updateNestedField('api_config', 'supabaseUrl', e.target.value)}
                    className="rounded-xl"
                    placeholder="https://xxx.supabase.co"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Supabase Anon Key</span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => setShowSecret(prev => ({ ...prev, anon: !prev.anon }))}
                    >
                      {showSecret.anon ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={() => copyToClipboard((formData.api_config as any)?.supabaseAnonKey ?? '')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </Label>
                <div className="relative group">
                  <Textarea
                    value={(formData.api_config as any)?.supabaseAnonKey ?? DEFAULT_API_CONFIG.supabaseAnonKey}
                    onChange={e => updateNestedField('api_config', 'supabaseAnonKey', e.target.value)}
                    className="rounded-xl min-h-[80px] font-mono text-xs pr-10"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                  {!showSecret.anon && (formData.api_config as any)?.supabaseAnonKey && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] rounded-xl flex items-center justify-center pointer-events-none select-none">
                      <span className="text-xs font-mono tracking-widest text-muted-foreground opacity-50">
                        ••••••••••••••••••••••••••••••••
                      </span>
                    </div>
                  )}
                  <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-2xl border border-primary/10">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">加密存储</span>
                    <span className="text-[10px] text-muted-foreground">混淆敏感配置</span>
                  </div>
                  <Switch 
                    checked={!!(formData.api_config as any)?.secureStorage} 
                    onCheckedChange={v => updateNestedField('api_config', 'secureStorage', v)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>请求超时 (ms)</Label>
                  <Input
                    type="number"
                    value={(formData.api_config as any)?.timeout ?? DEFAULT_API_CONFIG.timeout}
                    onChange={e => updateNestedField('api_config', 'timeout', parseInt(e.target.value) || 30000)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>重试次数</Label>
                  <Input
                    type="number"
                    value={(formData.api_config as any)?.retryCount ?? DEFAULT_API_CONFIG.retryCount}
                    onChange={e => updateNestedField('api_config', 'retryCount', parseInt(e.target.value) || 3)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>图片处理参数 (默认)</Label>
                  <Input
                    value={(formData.api_config as any)?.imageParams ?? DEFAULT_API_CONFIG.imageParams}
                    onChange={e => updateNestedField('api_config', 'imageParams', e.target.value)}
                    className="rounded-xl font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>缩略图参数 (默认)</Label>
                  <Input
                    value={(formData.api_config as any)?.thumbnailParams ?? DEFAULT_API_CONFIG.thumbnailParams}
                    onChange={e => updateNestedField('api_config', 'thumbnailParams', e.target.value)}
                    className="rounded-xl font-mono text-xs"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="cfr2" className="space-y-4 mt-4">
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 mb-4">
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  <Info className="w-3 h-3 inline mr-1" />
                  配置CFR2存储后，前端App可直接使用该配置进行文件上传。密钥信息仅存储在数据库中，通过API接口下发给已授权的App。
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold">复用站点配置</span>
                  <span className="text-[10px] text-muted-foreground">开启后将直接使用系统全局的存储配置，无需重复填写。</span>
                </div>
                <Switch 
                  checked={!!(formData.cfr2_config as any)?.useSiteSettings} 
                  onCheckedChange={v => updateNestedField('cfr2_config', 'useSiteSettings', v)}
                />
              </div>

              {((formData.cfr2_config as any)?.useSiteSettings) && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex items-start gap-3">
                  <Globe className="w-4 h-4 text-blue-500 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">已开启全局配置复用</p>
                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                      当前 App 将自动使用站点设置中的 Cloudflare R2 存储信息。您可以在“存储管理”页面统一维护这些信息。
                    </p>
                  </div>
                </div>
              )}

              {!((formData.cfr2_config as any)?.useSiteSettings) && Object.entries(DEFAULT_CFR2).map(([key, defaultVal]) => {
                if (key === 'useSiteSettings') return null;
                const isSecret = key.toLowerCase().includes('secret') || key.toLowerCase().includes('key');
                return (
                  <div key={key} className="space-y-2">
                    <Label className="flex items-center justify-between capitalize">
                      <span>{key}</span>
                      {isSecret && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => setShowSecret(prev => ({ ...prev, [key]: !prev[key] }))}
                        >
                          {showSecret[key] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        type={isSecret && !showSecret[key] ? 'password' : 'text'}
                        value={String((formData.cfr2_config as any)?.[key] ?? defaultVal)}
                        onChange={e => updateNestedField('cfr2_config', key, e.target.value)}
                        className="rounded-xl"
                        placeholder={isSecret ? '敏感信息，请妥善保管' : ''}
                      />
                      {isSecret && !showSecret[key] && (formData.cfr2_config as any)?.[key] && (
                        <div className="absolute inset-y-0 left-3 right-10 bg-background/50 backdrop-blur-[1px] flex items-center pointer-events-none select-none">
                          <span className="text-xs tracking-widest text-muted-foreground opacity-50">••••••••••••••••</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="apk" className="space-y-4 mt-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 mb-4">
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  <Info className="w-3 h-3 inline mr-1" />
                  配置APK打包参数后，可在"打包中心"Tab下载完整的Android工程文件，使用Android Studio直接构建APK。支持WebView壳模式打包。
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '应用名称', key: 'app_name', type: 'text' },
                  { label: '包名', key: 'package_name', type: 'text' },
                  { label: '版本名称', key: 'version_name', type: 'text' },
                  { label: '版本代码', key: 'version_code', type: 'number' },
                  { label: '最低SDK', key: 'min_sdk', type: 'number' },
                  { label: '目标SDK', key: 'target_sdk', type: 'number' },
                  { label: '图标URL', key: 'icon_url', type: 'text' },
                  { label: '启动页URL', key: 'splash_url', type: 'text' },
                  { label: '启动页背景色', key: 'splash_bg_color', type: 'text' },
                  { label: '自定义UA后缀', key: 'user_agent_suffix', type: 'text' },
                  { label: 'Deeplink Scheme', key: 'deeplink_scheme', type: 'text' },
                ].map(item => (
                  <div key={item.key} className="space-y-2">
                    <Label>{item.label}</Label>
                    <Input
                      type={item.type}
                      value={String((formData.apk_config as any)?.[item.key] ?? DEFAULT_APK_CONFIG[item.key as keyof typeof DEFAULT_APK_CONFIG])}
                      onChange={e => updateNestedField('apk_config', item.key, item.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label>WebView模式</Label>
                  <Select
                    value={String((formData.apk_config as any)?.webview_mode ?? DEFAULT_APK_CONFIG.webview_mode)}
                    onValueChange={v => updateNestedField('apk_config', 'webview_mode', v)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fullscreen">全屏</SelectItem>
                      <SelectItem value="fixed">固定尺寸</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>屏幕方向</Label>
                  <Select
                    value={String((formData.apk_config as any)?.orientation ?? DEFAULT_APK_CONFIG.orientation)}
                    onValueChange={v => updateNestedField('apk_config', 'orientation', v)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">竖屏</SelectItem>
                      <SelectItem value="landscape">横屏</SelectItem>
                      <SelectItem value="auto">自动</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '下拉刷新', key: 'enable_pull_refresh' },
                  { label: '允许缩放', key: 'enable_zoom' },
                  { label: '允许HTTP', key: 'allow_http' },
                  { label: '保持亮屏', key: 'keep_screen_on' },
                  { label: '沉浸式状态栏', key: 'immersive_mode' },
                  { label: '离线缓存', key: 'offline_cache' },
                  { label: 'JS桥接', key: 'js_bridge_enabled' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl">
                    <span className="text-sm">{item.label}</span>
                    <Switch
                      checked={!!((formData.apk_config as any)?.[item.key] ?? DEFAULT_APK_CONFIG[item.key as keyof typeof DEFAULT_APK_CONFIG])}
                      onCheckedChange={v => updateNestedField('apk_config', item.key, v)}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>缓存大小 (MB)</Label>
                <Input
                  type="number"
                  value={String((formData.apk_config as any)?.cache_size_mb ?? DEFAULT_APK_CONFIG.cache_size_mb)}
                  onChange={e => updateNestedField('apk_config', 'cache_size_mb', parseInt(e.target.value) || 0)}
                  className="rounded-xl"
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="rounded-xl">取消</Button>
            <Button onClick={handleSaveApp} className="rounded-xl bg-primary text-white">
              <Save className="w-4 h-4 mr-2" /> 保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 版本发布Dialog */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">发布新版本</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>版本号</Label>
                <Input value={versionForm.version} onChange={e => setVersionForm({ ...versionForm, version: e.target.value })} placeholder="1.0.0" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>版本代码</Label>
                <Input type="number" value={versionForm.version_code} onChange={e => setVersionForm({ ...versionForm, version_code: parseInt(e.target.value) || 1 })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>平台</Label>
              <Select value={versionForm.platform} onValueChange={v => setVersionForm({ ...versionForm, platform: v })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="android">Android</SelectItem>
                  <SelectItem value="ios">iOS</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="mini_program">小程序</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>下载地址</Label>
              <Input value={versionForm.download_url || ''} onChange={e => setVersionForm({ ...versionForm, download_url: e.target.value })} placeholder="https://..." className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>安装地址 (可选)</Label>
              <Input value={versionForm.install_url || ''} onChange={e => setVersionForm({ ...versionForm, install_url: e.target.value })} placeholder="https://..." className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>更新说明</Label>
              <Textarea value={versionForm.release_notes || ''} onChange={e => setVersionForm({ ...versionForm, release_notes: e.target.value })} placeholder="本次更新内容..." className="rounded-xl min-h-[80px]" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl">
              <span className="text-sm">强制更新</span>
              <Switch checked={!!versionForm.is_force_update} onCheckedChange={v => setVersionForm({ ...versionForm, is_force_update: v })} />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={versionForm.status} onValueChange={v => setVersionForm({ ...versionForm, status: v as any })}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="published">已发布</SelectItem>
                  <SelectItem value="deprecated">已废弃</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setVersionDialogOpen(false)} className="rounded-xl">取消</Button>
            <Button onClick={handleSaveVersion} className="rounded-xl bg-primary text-white">
              <Package className="w-4 h-4 mr-2" /> 发布版本
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API密钥Dialog */}
      <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">生成API密钥</DialogTitle>
            <DialogDescription>生成后请妥善保存，Secret Key 仅显示一次</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>密钥名称</Label>
              <Input value={keyForm.key_name} onChange={e => setKeyForm({ ...keyForm, key_name: e.target.value })} placeholder="default" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>权限</Label>
              <div className="flex gap-2 mt-2">
                {['read', 'write', 'delete', 'admin'].map(p => (
                  <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(keyForm.permissions || []).includes(p)}
                      onChange={e => {
                        const current = keyForm.permissions || [];
                        setKeyForm({ ...keyForm, permissions: e.target.checked ? [...current, p] : current.filter(x => x !== p) });
                      }}
                      className="rounded border-muted"
                    />
                    <span className="text-xs capitalize">{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>速率限制 (次/小时)</Label>
              <Input type="number" value={keyForm.rate_limit} onChange={e => setKeyForm({ ...keyForm, rate_limit: parseInt(e.target.value) || 1000 })} className="rounded-xl" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl">
              <span className="text-sm">启用</span>
              <Switch checked={!!keyForm.is_active} onCheckedChange={v => setKeyForm({ ...keyForm, is_active: v })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setKeyDialogOpen(false)} className="rounded-xl">取消</Button>
            <Button onClick={handleGenerateKey} className="rounded-xl bg-primary text-white">
              <Key className="w-4 h-4 mr-2" /> 生成密钥
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 对接代码Dialog */}
      <Dialog open={codeDialogOpen} onOpenChange={setCodeDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl rounded-3xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" /> SDK对接代码
            </DialogTitle>
            <DialogDescription>复制以下代码到您的前端App项目中使用</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] rounded-2xl bg-slate-950 p-4">
            <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
              {selectedApp ? generateSdkCode(selectedApp) : ''}
            </pre>
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCodeDialogOpen(false)} className="rounded-xl">关闭</Button>
            <Button onClick={() => { if (selectedApp) copyToClipboard(generateSdkCode(selectedApp)); }} className="rounded-xl bg-primary text-white">
              <Copy className="w-4 h-4 mr-2" /> 复制全部
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
