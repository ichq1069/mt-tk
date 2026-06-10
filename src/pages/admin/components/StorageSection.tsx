import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { MediaItem, Profile, StorageConfig, AppNotification, UserFieldConfig, Report, ReportStatus, PermissionGroup, Ad, RedemptionCode, SuperbedConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { rbacApi } from "@/db/rbac";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { extractZoneramaAlbumId } from '@/lib/media';

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAdminLogger, useAdminLoggerManager } from '@/hooks/useAdminLogger';
import { DbOptimize } from './DbOptimize';
import { UploadSection } from './UploadSection';
import { 
  LayoutDashboard, FileCheck, Users as UsersIcon, Settings, Heart, ThumbsDown, Loader2, X, Edit2, Trash, 
  Archive, CircleArrowUp, CheckSquare, Square, CirclePlay, Video, Search, Edit3, Ban, UserCheck, Zap,
  Mail, Calendar, Cloud, Save, LogOut, Share, Download, Database as DatabaseIcon, Monitor, 
  Image as ImageIcon, Filter, RefreshCcw, ListFilter, CircleCheckBig, Circle, MousePointer2, Trash2, 
  Bug,

  ArrowUp, ArrowDown, BarChart3, PieChart as PieChartIcon, TrendingUp, Activity, Users2, ShieldAlert, 
  Trophy, Crown, Flame, FileCode2, Server, Globe, Database, Key, Shield, Rocket, Terminal, 
  ExternalLink, Settings2, Info, TriangleAlert, Play, Bell, Eye, CalendarCheck, Hash, Star, UserPlus,
  Lock as LockIcon, QrCode, Link, Box, Plus, Music, Layers, Upload
} from "lucide-react";
import { uploadToStorage } from '@/lib/upload';
import { ImageGridSlicer } from './SliceTool';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";

import { useConfig } from '@/contexts/ConfigContext';


import { APP_VERSION } from '@/constants/version';


/**
 * 生成 Cloudflare Worker 标准代码
 */
const generateWorkerCode = (config: any) => {
  return `/**
 * Cloudflare Worker - R2 存储处理脚本 (标准版)
 * 功能：R2 资源访问、Bearer 认证上传/删除
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);
    
    // 环境变量
    const AUTH_TOKEN = env.AUTH_TOKEN || "${config.r2_worker_token || 'your_bearer_token'}";
    const BUCKET = env.BUCKET || env.MY_BUCKET;
    
    // CORS 头部
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-bucket-name, x-used-filter",
      "Access-Control-Max-Age": "86400"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 处理 GET 请求
    if (request.method === "GET") {
      if (path === "" || path === "manage-list") {
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== \`Bearer \${AUTH_TOKEN}\`) {
          return new Response('Unauthorized', { status: 401, headers: corsHeaders });
        }
        const list = await BUCKET.list({ limit: 1000 });
        return new Response(JSON.stringify(list.objects), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const object = await BUCKET.get(path);
      if (object === null) {
        return new Response("Object Not Found", { status: 404, headers: corsHeaders });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

      return new Response(object.body, { headers });
    }

    // 处理 POST/PUT 请求
    if (request.method === "POST" || request.method === "PUT") {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== \`Bearer \${AUTH_TOKEN}\`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      const contentType = request.headers.get("Content-Type") || "";
      let fileName = path;
      let fileBody = request.body;

      if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("file");
        const customFileName = formData.get("fileName");
        if (!file) return new Response("No file uploaded", { status: 400, headers: corsHeaders });
        
        fileName = customFileName || file.name || \`upload_\${Date.now()}\`;
        fileBody = file.stream ? file.stream() : file;
      }

      if (!fileName) return new Response("No file name provided", { status: 400, headers: corsHeaders });

      await BUCKET.put(fileName, fileBody, {
        httpMetadata: { contentType: contentType || "application/octet-stream" },
      });

      const returnUrl = \`\${url.origin}/\${fileName}\`;
      return new Response(JSON.stringify({ success: true, url: returnUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 处理 DELETE 请求
    if (request.method === "DELETE") {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== \`Bearer \${AUTH_TOKEN}\`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      await BUCKET.delete(path);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }
};`;
};

const sanitizeFileName = (name: string) => {
  return name.replace(/[^\w.-]/g, '_');
};

export function StorageSection({ defaultTab = 'basic' }: { defaultTab?: string }) {
  const navigate = useNavigate();
  const { tab } = useParams();
  const { refreshConfig } = useConfig();
  const { logAction, logError } = useAdminLogger('storage');
  const { logs, enabled: loggerEnabled, setEnabled: setLoggerEnabled, clearLogs } = useAdminLoggerManager();
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [testEmail, setTestEmail] = useState('');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [config, setConfig] = useState<Partial<StorageConfig>>({
    user_id: '',
    key_id: '',
    secret_key: '',
    endpoint: '',
    bucket_name: '',
    custom_domain: '',
    enable_link_import: true,
    site_title: '视觉赏析',
    site_logo: '',
    site_description: '全站最美的视觉内容聚合平台',
    wechat_only: false,
    enable_blob: true,
    enable_image_cache: false,
    anonymous_view_limit: 0,
    image_path_prefix: 'image',
    video_path_prefix: 'video',
    watermark_enabled: false,
    watermark_text: '',
    watermark_position: 'bottom-right',
    watermark_opacity: 0.5,
    watermark_layout: 'single',
    watermark_size: 20,
    enable_download: false,
    download_mode: 'both',
    wallpaper_price: 1,
    album_price: 10,
    mp_domain_identifier: 'md-miaoda',
    min_download_role: 'user',
    smtp_enabled: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    bg_music_url: '',
    bg_music_title: '轻音乐模式',
    bg_music_volume: 0.5,
    bg_music_list: [],
    image_proxy_url: '',
    image_proxy_secret: '',
    image_proxy_exclude_domains: '',
    enable_image_proxy: false,
    storage_priority: 'r2_first',
    hotlink_enabled: false,
    hotlink_allowed_domains: '',
  });

  // 审核与查重配置
  const [auditConfig, setAuditConfig] = useState({
    global_audit_enabled: true,
    bypass_audit_with_permission: true
  });
  const [dedupeConfig, setDedupeConfig] = useState({
    similarity_threshold: 5,
    trigger_mode: 'on_upload',
    auto_clean: false
  });

  const [securityConfig, setSecurityConfig] = useState({
    mode: 'blob',
    slice_count: 4,
    signed_expiry: 300,
    enable_webp: true,
    prefetch_count: 5
  });

  const [cacheStats, setCacheStats] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState<string | null>(null);
  const musicInputRef = React.useRef<HTMLInputElement>(null);
  const [superbedConfig, setSuperbedConfig] = useState<SuperbedConfig>({
    id: '',
    superbed_id: '',
    superbed_token: '',
    is_enabled: false,
    is_upload_page_enabled: false,
    allowed_groups: [],
    thumbnail_params: '?w=300',
    updated_at: ''
  });
  const [debugSettings, setDebugSettings] = useState({
    is_enabled: false,
    retention_minutes: 5
  });
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  
  // 专享上传配置
  const [zoneramaConfig, setZoneramaConfig] = useState({
    album_id: '',
    session: '',
    photo_api: '',
    album_photo_api: '',
    url_mode: 'id' as 'id' | 'url'
  });
  const [draftConfig, setDraftConfig] = useState<any>({
    big_multi: {
      first_image: '',
      nth_image: { n: 2, url: '' },
      last_image: '',
      enabled: false
    }
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingMusic) return;

    try {
      setSaving(true);
      const fileName = `bg-music-${Date.now()}-${sanitizeFileName(file.name)}`;
      const res = await uploadToStorage({
        file,
        path: `music/${fileName}`,
        storageConfig: config as any
      });

      if (res?.url) {
        const newList = [...(config.bg_music_list || [])];
        const index = newList.findIndex(m => m.id === uploadingMusic);
        if (index !== -1) {
          newList[index].url = res.url;
          if (!newList[index].title) newList[index].title = file.name.replace(/\.[^/.]+$/, "");
          setConfig({ ...config, bg_music_list: newList });
          toast.success('音乐上传成功');
        }
      }
    } catch (err: any) {
      toast.error('上传失败: ' + err.message);
    } finally {
      setSaving(false);
      setUploadingMusic(null);
      if (musicInputRef.current) musicInputRef.current.value = '';
    }
  };

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      // 获取存储配置
      const { data: storageData } = await api.getStorageConfig();
      if (storageData) setConfig(storageData);

      // 获取审核配置
      const { data: auditData } = await api.getSystemConfig('audit_config');
      if (auditData?.value) setAuditConfig(prev => ({ ...prev, ...auditData.value }));

      // 获取查重配置
      const { data: dedupeData } = await api.getSystemConfig('dedupe_config');
      if (dedupeData?.value) setDedupeConfig(prev => ({ ...prev, ...dedupeData.value }));

      // 获取安全与加载配置
      const { data: secData } = await api.getSystemConfig('media_security_config');
      if (secData?.value) {
        setSecurityConfig(prev => ({ ...prev, ...secData.value }));
        // 自动同步老配置中的 enable_blob
        const mode = secData.value.mode;
        if (mode === 'original' || mode === 'canvas' || mode === 'canvas_slice') {
          setConfig(prev => ({ ...prev, enable_blob: false }));
        } else if (mode === 'blob' || mode === 'blob_slice') {
          setConfig(prev => ({ ...prev, enable_blob: true }));
        }
      }

      // 获取缓存统计
      const { data: statsData } = await supabase
        .from('cache_stats')
        .select('*')
        .order('hit_count', { ascending: false })
        .limit(20);

      // 获取聚合图床配置
      const { data: superbedData } = await api.getSuperbedConfig();
      if (superbedData) setSuperbedConfig(superbedData);

      // 获取调试配置
      const { data: debugData } = await api.getDebugLogSettings();
      if (debugData) setDebugSettings(debugData);

      // 获取微信草稿大多图配置
      const { data: draftData } = await api.getSystemConfig('wechat_draft_config');
      if (draftData?.value) setDraftConfig((prev: any) => ({ ...prev, ...draftData.value }));

      // 获取权限组用于选择
      const { data: groupsData } = await rbacApi.getPermissionGroups();
      if (groupsData) setPermissionGroups(groupsData);
      
      // 获取专享上传配置
      const { data: zoneramaData } = await api.getSystemConfig('zonerama_upload_config');
      if (zoneramaData?.value) setZoneramaConfig((prev: any) => ({ ...prev, ...zoneramaData.value }));

      if (statsData) setCacheStats(statsData);
    } catch (error: any) {
      toast.error(`获取配置失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfigs = async () => {
    setSaving(true);
    try {
      // 确保老配置中的 enable_blob 与新模式保持同步
    // 确保老配置中的 enable_blob 与新模式保持同步
    const updatedConfig = { 
      ...config, 
      enable_blob: (securityConfig.mode === 'blob' || securityConfig.mode === 'blob_slice') 
    };

      // 并行执行所有保存操作，极大缩短等待时间并提高响应即时性
      console.log('Saving all configurations in parallel...');
      const results = await Promise.all([
        api.upsertStorageConfig(updatedConfig),
        api.updateSystemConfig('audit_config', auditConfig),
        api.updateSystemConfig('dedupe_config', dedupeConfig),
        api.updateSystemConfig('media_security_config', securityConfig),
        api.upsertSuperbedConfig(superbedConfig),
        api.upsertDebugLogSettings(debugSettings),
        api.updateSystemConfig('zonerama_upload_config', zoneramaConfig),
        api.updateSystemConfig('wechat_draft_config', draftConfig),
        api.updateSystemConfig('app_version', APP_VERSION)
      ]);

      // 检查是否有任何错误
      const error = results.find(r => r.error)?.error;
      if (error) throw error;

      toast.success('所有配置已成功保存并即时生效');
      logAction('保存全站系统配置', { config: updatedConfig, auditConfig, dedupeConfig, securityConfig });
      
      // 重新加载配置并强制刷新全局上下文
      await fetchConfigs();
      await refreshConfig();
      // 切换时间戳参数，确保多页应用刷新的感觉并重载数据
      toast.success('所有配置已成功保存并即时生效');
      navigate(`/admin/pc/${tab || 'storage'}?t=${Date.now()}`, { replace: true });
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
      logError('保存系统配置失败', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUploadConfig = async (uploadConfig: Partial<StorageConfig>) => {
    setSaving(true);
    try {
      // 合并配置，确保缩略图等状态被正确传递
      const fullConfig = { ...config, ...uploadConfig };
      console.log('[StorageSection] Saving full upload config:', fullConfig);
      
      const { data, error } = await api.upsertStorageConfig(fullConfig);
      if (error) throw error;
      
      // 更新状态并强制刷新
      if (data) {
        setConfig(data as any);
      } else {
        setConfig(fullConfig);
      }
      
      toast.success('上传设置已保存并即时生效');
      logAction('修改上传页设置', uploadConfig);
      
      // 重新加载配置
      await fetchConfigs();
      await refreshConfig();
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
      console.error('[StorageSection] Error saving upload settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.endpoint || !config.key_id || !config.secret_key || !config.bucket_name) {
      return toast.error('请填写完整的配置信息后再进行测试');
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-r2-connection', {
        body: {
          endpoint: config.endpoint,
          key_id: config.key_id,
          secret_key: config.secret_key,
          bucket_name: config.bucket_name
        }
      });

      if (error) {
        const errorMsg = typeof error?.context?.text === 'function' ? await error.context.text() : error?.message;
        throw new Error(errorMsg || error.message);
      }

      if (data?.success) {
        toast.success('连接检测成功！配置正确。');
      } else {
        throw new Error(data?.error || '连接失败');
      }
    } catch (error: any) {
      toast.error(`连接检测失败: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleTestWorkerConnection = async () => {
    if (!config.r2_worker_url || !config.r2_worker_token) {
      return toast.error('请填写完整的 Worker 配置信息后再进行测试');
    }

    setTesting(true);
    try {
      // 尝试调用 Worker 的列表接口（带 limit=1）来验证连通性
      const testUrl = `${config.r2_worker_url.replace(/\/$/, '')}/manage-list`;
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Bearer ${config.r2_worker_token}`,
          'X-Used-Filter': 'all',
          'x-bucket-name': config.bucket_name || ''
        }
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        toast.success('Worker 连接检测成功！配置正确。');
      } else {
        throw new Error('返回数据格式不正确');
      }
    } catch (error: any) {
      toast.error(`Worker 连接检测失败: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };


const handleTestSmtp = async () => {
  if (!testEmail || !testEmail.includes('@')) {
    toast.error('请输入有效的测试收件邮箱');
    return;
  }
  
  setIsTestingSmtp(true);
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { 
        to: testEmail, 
        subject: 'SMTP 测试邮件', 
        content: '这是一封来自管理后台的 SMTP 配置测试邮件。如果您收到此邮件，说明 SMTP 配置正确。' 
      }
    });
    
    if (error) {
      const errorMsg = typeof error?.context?.text === 'function' ? await error.context.text() : error?.message;
      throw new Error(errorMsg || error.message);
    }
    
    if (data?.error) throw new Error(data.error);
    
    toast.success('测试邮件已发出，请查收');
  } catch (err: any) {
    toast.error('发送失败: ' + (err.message || '未知错误'));
  } finally {
    setIsTestingSmtp(false);
  }
};

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveConfigs();
  };

  const handleExportConfig = () => {
    const r2Config = {
      user_id: config.user_id,
      endpoint: config.endpoint,
      key_id: config.key_id,
      secret_key: config.secret_key,
      bucket_name: config.bucket_name,
      custom_domain: config.custom_domain
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(r2Config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "r2_storage_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('配置已导出为 JSON 文件');
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        // 验证字段是否存在（至少有一个关键字段）
        const keys = ['user_id', 'endpoint', 'key_id', 'secret_key', 'bucket_name', 'custom_domain'];
        const hasSomeKey = keys.some(key => key in importedData);
        
        if (!hasSomeKey) {
          throw new Error('导入的文件不是有效的 R2 配置文件');
        }
        
        setConfig(prev => ({
          ...prev,
          user_id: importedData.user_id || prev.user_id,
          endpoint: importedData.endpoint || prev.endpoint,
          key_id: importedData.key_id || prev.key_id,
          secret_key: importedData.secret_key || prev.secret_key,
          bucket_name: importedData.bucket_name || prev.bucket_name,
          custom_domain: importedData.custom_domain || prev.custom_domain
        }));
        
        toast.success('R2 配置已成功导入，请记得点击“保存全站设置”生效');
        
        // 重置 input 以便下次能触发相同的选取
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error: any) {
        toast.error(`导入失败: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">正在加载全站配置...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      {/* 顶部固定保存栏 - 确保始终可见 */}
      <div className="sticky top-0 z-[100] -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-white border-b shadow-sm flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-black text-slate-900 truncate flex items-center gap-2">
            系统存储与配置
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] bg-primary/5 text-primary border-primary/20">V2.0</Badge>
          </h2>
          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 truncate flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            修改后点击右侧保存生效
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSaveConfigs} 
            disabled={saving} 
            className="rounded-xl font-black px-4 md:px-8 h-9 md:h-10 shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 transition-all hover:scale-105"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            保存
          </Button>
        </div>
      </div>

      {/* 移动端悬浮保存按钮 - 始终可见 */}
      <Button 
        onClick={handleSaveConfigs} 
        disabled={saving} 
        className="fixed bottom-28 right-6 z-[9999] md:hidden rounded-full w-14 h-14 shadow-2xl shadow-primary/50 p-0 flex items-center justify-center bg-primary text-primary-foreground hover:scale-110 active:scale-95 transition-all border-4 border-white"
      >
        {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
      </Button>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto w-full gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="basic" className="flex-1 min-w-[70px] text-[10px] md:text-xs rounded-xl py-2">基础</TabsTrigger>
          <TabsTrigger value="upload" className="flex-1 min-w-[70px] text-[10px] md:text-xs rounded-xl py-2">上传</TabsTrigger>
          <TabsTrigger value="storage" className="flex-1 min-w-[70px] text-[10px] md:text-xs rounded-xl py-2">存储</TabsTrigger>
          <TabsTrigger value="superbed" className="flex-1 min-w-[70px] text-[10px] md:text-xs rounded-xl py-2">图床</TabsTrigger>
          <TabsTrigger value="zonerama" className="flex-1 min-w-[70px] text-[10px] md:text-xs rounded-xl py-2">代理</TabsTrigger>
          <TabsTrigger value="access" className="flex-1 min-w-[70px] text-[10px] md:text-xs rounded-xl py-2">安全</TabsTrigger>
          <TabsTrigger value="music" className="flex-1 min-w-[70px] text-[10px] md:text-xs rounded-xl py-2">音乐</TabsTrigger>
          <TabsTrigger value="logs" className="flex-1 min-w-[70px] text-[10px] md:text-xs rounded-xl py-2">日志</TabsTrigger>
          <TabsTrigger value="db_optimize" className="flex-1 min-w-[70px] text-[10px] md:text-xs rounded-xl py-2">维护</TabsTrigger>
        </TabsList>

        <input 
          type="file" 
          ref={musicInputRef} 
          className="hidden" 
          accept="audio/*" 
          onChange={handleMusicUpload} 
        />

        <TabsContent value="basic" className="space-y-6 mt-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm rounded-3xl md:col-span-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Settings className="w-5 h-5" />
                  网站基本信息
                </CardTitle>
                <CardDescription>设置网站名称与 Logo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>网站标题</Label>
                      <Input value={config.site_title || ''} onChange={(e) => setConfig({ ...config, site_title: e.target.value })} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Logo URL</Label>
                      <Input value={config.site_logo || ''} onChange={(e) => setConfig({ ...config, site_logo: e.target.value })} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>网站简介</Label>
                      <Textarea value={config.site_description || ''} onChange={(e) => setConfig({ ...config, site_description: e.target.value })} className="rounded-xl h-[115px]" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl md:col-span-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Layers className="w-5 h-5" />
                  探索页布局配置
                </CardTitle>
                <CardDescription>控制前台探索页可用的布局模式</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { id: 'timeline', label: '时间线' },
                    { id: 'calendar', label: '日历' },
                    { id: 'folderTree', label: '文件夹' },
                    { id: 'stackedCards', label: '卡片' },
                    { id: 'freeform', label: '自由排版' },
                    { id: 'starrySky', label: '星空' },
                  ].map((layout) => (
                    <div key={layout.id} className="flex items-center space-x-2 p-3 bg-muted/20 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                      <Checkbox 
                        id={`layout-${layout.id}`} 
                        checked={(config.enabled_layouts || ['timeline', 'calendar', 'folderTree', 'stackedCards', 'freeform', 'starrySky']).includes(layout.id)} 
                        onCheckedChange={(checked) => {
                          const layouts = config.enabled_layouts || ['timeline', 'calendar', 'folderTree', 'stackedCards', 'freeform', 'starrySky'];
                          if (checked) {
                            setConfig({...config, enabled_layouts: [...new Set([...layouts, layout.id])]});
                          } else {
                            setConfig({...config, enabled_layouts: layouts.filter(l => l !== layout.id)});
                          }
                        }}
                      />
                      <label htmlFor={`layout-${layout.id}`} className="text-sm font-medium leading-none cursor-pointer">{layout.label}</label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="storage" className="space-y-6 mt-6 ">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm rounded-3xl md:col-span-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Database className="w-5 h-5" />
                  Cloudflare R2 存储配置 (S3 兼容)
                </CardTitle>
                <CardDescription>配置全站文件存储服务，所有上传资源将保存至此 R2 存储桶</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Hash className="w-4 h-4 text-primary" />
                        R2 Account ID
                      </Label>
                      <Input 
                        placeholder="Cloudflare 账户 ID" 
                        value={config.user_id || ''} 
                        onChange={(e) => setConfig({ ...config, user_id: e.target.value })} 
                        className="rounded-xl"
                      />
                      <p className="text-[10px] text-muted-foreground">账户 ID，可在 Cloudflare 控制台右侧查看</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Link className="w-4 h-4 text-primary" />
                        S3 Endpoint
                      </Label>
                      <Input 
                        placeholder="https://<ACCOUNT_ID>.r2.cloudflarestorage.com" 
                        value={config.endpoint || ''} 
                        onChange={(e) => setConfig({ ...config, endpoint: e.target.value })} 
                        className="rounded-xl"
                      />
                      <p className="text-[10px] text-muted-foreground italic mt-1">
                        S3 API 地址，格式如：https://xxxx.r2.cloudflarestorage.com
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Box className="w-4 h-4 text-primary" />
                        Bucket Name
                      </Label>
                      <Input 
                        placeholder="存储桶名称" 
                        value={config.bucket_name || ''} 
                        onChange={(e) => setConfig({ ...config, bucket_name: e.target.value })} 
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Key className="w-4 h-4 text-primary" />
                        Access Key ID
                      </Label>
                      <Input 
                        placeholder="Access Key ID" 
                        value={config.key_id || ''} 
                        onChange={(e) => setConfig({ ...config, key_id: e.target.value })} 
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <LockIcon className="w-4 h-4 text-primary" />
                        Secret Access Key
                      </Label>
                      <Input 
                        type="password"
                        placeholder="Secret Access Key" 
                        value={config.secret_key || ''} 
                        onChange={(e) => setConfig({ ...config, secret_key: e.target.value })} 
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        自定义访问域名 (Custom Domain)
                      </Label>
                      <Input 
                        placeholder="https://pub-xxxx.r2.dev 或自定义域名" 
                        value={config.custom_domain || ''} 
                        onChange={(e) => setConfig({ ...config, custom_domain: e.target.value })} 
                        className="rounded-xl"
                      />
                      <p className="text-[10px] text-muted-foreground italic mt-1">需带协议头，例如：https://img.yourdomain.com</p>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />
                
                <div className="space-y-4">
                  <Label className="text-base font-bold flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-orange-500" />
                    存储优先级控制
                  </Label>
                  <RadioGroup 
                    value={config.storage_priority || 'r2_first'} 
                    onValueChange={(v: any) => setConfig({ ...config, storage_priority: v })}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="r2_first" id="priority-r2" className="peer sr-only" />
                      <Label
                        htmlFor="priority-r2"
                        className="flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                      >
                        <Zap className="mb-3 h-6 w-6 text-blue-500" />
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-black leading-none">R2 / Worker 优先</p>
                          <p className="text-[10px] text-muted-foreground">优先使用云端存储，失败后回退到 Supabase</p>
                        </div>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="supabase_first" id="priority-supabase" className="peer sr-only" />
                      <Label
                        htmlFor="priority-supabase"
                        className="flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                      >
                        <Database className="mb-3 h-6 w-6 text-emerald-500" />
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-black leading-none">Supabase 优先</p>
                          <p className="text-[10px] text-muted-foreground">默认存入 Supabase，仅特定场景使用云端存储</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <Label className="text-base font-bold flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-orange-500" />
                    R2 对接模式
                  </Label>
                  <RadioGroup 
                    value={config.r2_mode || 'direct'} 
                    onValueChange={(v: any) => setConfig({ ...config, r2_mode: v })}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="direct" id="r2-direct" className="peer sr-only" />
                      <Label
                        htmlFor="r2-direct"
                        className="flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                      >
                        <Database className="mb-3 h-6 w-6 text-blue-500" />
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-black leading-none">直连对接 (S3 兼容)</p>
                          <p className="text-[10px] text-muted-foreground">通过 AWS S3 SDK 直接与 R2 通信，无需额外部署</p>
                        </div>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="worker" id="r2-worker" className="peer sr-only" />
                      <Label
                        htmlFor="r2-worker"
                        className="flex flex-col items-center justify-between rounded-2xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                      >
                        <Zap className="mb-3 h-6 w-6 text-orange-500" />
                        <div className="space-y-1 text-center">
                          <p className="text-sm font-black leading-none">Worker 对接 (推荐)</p>
                          <p className="text-[10px] text-muted-foreground">通过 Cloudflare Workers 中转，支持自定义域名与更强的访问控制</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {config.r2_mode === 'worker' && (
                  <div className="mt-4 p-4 bg-orange-500/5 rounded-3xl border border-orange-500/10 animate-in fade-in slide-in-from-top-2  w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 min-w-0 w-full">
                        <Label className="text-sm font-bold flex items-center gap-2">
                          <Globe className="w-4 h-4 text-orange-500" />
                          Worker 接口域名
                        </Label>
                        <Input 
                          placeholder="https://updl.wo58.cn" 
                          value={config.r2_worker_url || ''} 
                          onChange={(e) => setConfig({ ...config, r2_worker_url: e.target.value })} 
                          className="rounded-xl border-orange-200 h-10 text-sm w-full"
                        />
                        <p className="text-[10px] text-muted-foreground italic truncate">对接 Worker 的 API 基础路径</p>
                      </div>
                      <div className="space-y-2 min-w-0 w-full">
                        <Label className="text-sm font-bold flex items-center gap-2">
                          <Key className="w-4 h-4 text-orange-500" />
                          上传 / 删除密钥 (Bearer Token)
                        </Label>
                        <Input 
                          type="password"
                          placeholder="输入对接密钥" 
                          value={config.r2_worker_token || ''} 
                          onChange={(e) => setConfig({ ...config, r2_worker_token: e.target.value })} 
                          className="rounded-xl border-orange-200 h-10 text-sm w-full"
                        />
                        <p className="text-[10px] text-muted-foreground italic truncate">对应 Bearer Token</p>
                      </div>
                    </div>

                    {/* Worker 脚本生成器 - 仅在 Worker 模式下展示 */}
                    <div className="mt-6">
                      <div className="bg-slate-900 rounded-2xl p-6 text-slate-200 space-y-4 shadow-xl border border-slate-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/20 rounded-lg">
                              <Terminal className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm">Cloudflare Worker 代码生成</h4>
                              <p className="text-[10px] text-slate-400">基于当前配置自动生成标准的 Worker 处理脚本</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const workerCode = generateWorkerCode(config);
                              navigator.clipboard.writeText(workerCode);
                              toast.success('Worker 代码已复制到剪贴板');
                            }}
                            className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 gap-1.5"
                          >
                            <FileCode2 className="w-4 h-4" />
                            一键复制脚本
                          </Button>
                        </div>
                        
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900 pointer-events-none" />
                          <pre className="text-[10px] font-mono leading-relaxed h-[200px] overflow-hidden overflow-y-auto scrollbar-hide p-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
                            {generateWorkerCode(config)}
                          </pre>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-400 px-2 py-0">Bearer 认证已集成</Badge>
                          <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-400 px-2 py-0">CORS 已集成</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestWorkerConnection}
                        disabled={testing}
                        className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 gap-2 h-9"
                      >
                        {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        检查 Worker 连通性
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-muted/30 p-4 rounded-2xl space-y-2 border border-border/50">
                   <h4 className="text-sm font-bold flex items-center gap-2">
                     <Info className="w-4 h-4 text-primary" />
                     R2 配置建议
                   </h4>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     1. 推荐在 Cloudflare 控制台为 R2 Bucket 绑定自定义域名，以获得更好的访问速度和安全性。<br/>
                     2. 确保 API 令牌（Token）具有读写 R2 存储桶的权限。<br/>
                     3. CORS 设置：请确保存储桶已配置跨域允许（Allowed Origins 为 * 或您的域名）。
                   </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="superbed" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm rounded-3xl  md:col-span-2">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Cloud className="w-5 h-5" />
                  聚合图床存储配置 (superbed.cn)
                </CardTitle>
                <CardDescription>配置聚合图床存储服务，支持多种上传方式</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>启用聚合图床</Label>
                        <p className="text-xs text-muted-foreground">是否开启全站聚合图床存储功能</p>
                      </div>
                      <Switch 
                        checked={superbedConfig.is_enabled} 
                        onCheckedChange={(checked) => setSuperbedConfig({ ...superbedConfig, is_enabled: checked })} 
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>上传页展示</Label>
                        <p className="text-xs text-muted-foreground">是否在用户上传页面提供此存储选项</p>
                      </div>
                      <Switch 
                        checked={superbedConfig.is_upload_page_enabled} 
                        onCheckedChange={(checked) => setSuperbedConfig({ ...superbedConfig, is_upload_page_enabled: checked })} 
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>用户 ID (id)</Label>
                      <Input 
                        value={superbedConfig.superbed_id || ''} 
                        onChange={(e) => setSuperbedConfig({ ...superbedConfig, superbed_id: e.target.value })} 
                        placeholder="聚合图床用户ID"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Token</Label>
                      <Input 
                        type="password"
                        value={superbedConfig.superbed_token || ''} 
                        onChange={(e) => setSuperbedConfig({ ...superbedConfig, superbed_token: e.target.value })} 
                        placeholder="您的聚合图床Token"
                        className="rounded-xl"
                      />
                    </div>
                  </div>


                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>允许使用的权限组</Label>
                      <p className="text-xs text-muted-foreground mb-3">只有选中的权限组用户可以使用聚合图床上传（不选则对所有人开放）</p>
                      <ScrollArea className="h-[200px] border rounded-xl p-4">
                        <div className="grid grid-cols-1 gap-2">
                          {permissionGroups.map((group) => (
                            <div key={group.id} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`group-${group.id}`}
                                checked={superbedConfig.allowed_groups?.includes(group.name)}
                                onCheckedChange={(checked) => {
                                  const currentGroups = superbedConfig.allowed_groups || [];
                                  if (checked) {
                                    setSuperbedConfig({ ...superbedConfig, allowed_groups: [...currentGroups, group.name] });
                                  } else {
                                    setSuperbedConfig({ ...superbedConfig, allowed_groups: currentGroups.filter(name => name !== group.name) });
                                  }
                                }}
                              />
                              <label htmlFor={`group-${group.id}`} className="text-sm font-medium cursor-pointer">
                                {group.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-2xl space-y-2 border border-border/50">
                   <h4 className="text-sm font-bold flex items-center gap-2">
                     <Info className="w-4 h-4 text-primary" />
                     功能说明
                   </h4>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     1. 聚合图床支持文件、URL、Base64等多种上传方式。此配置生效后，全站所有第三方存储请求将通过 Supabase Edge Function 代理。<br/>
                     2. 临时验证码（id, ts, sign）将由系统自动计算并使用，无需您额外操作。<br/>
                     3. 您可以指定特定的权限组使用该存储，例如仅允许 VIP 或 SVIP 用户使用。<br/>
                     4. 接口地址为: https://api.superbed.cn/upload
                   </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="music" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm rounded-3xl ">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                背景音乐设置
              </CardTitle>
              <CardDescription>配置全站（特别是探索页）的背景音乐，提升用户沉浸感</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">音乐列表</Label>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        const newList = [...(config.bg_music_list || [])];
                        // 兼容所有浏览器的 UUID 生成
                        const generateUUID = () => {
                          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
                            return crypto.randomUUID();
                          }
                          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                            const r = Math.random() * 16 | 0;
                            const v = c === 'x' ? r : (r & 0x3 | 0x8);
                            return v.toString(16);
                          });
                        };
                        newList.push({ id: generateUUID(), url: '', title: '' });
                        setConfig({ ...config, bg_music_list: newList });
                      }}
                      className="rounded-xl gap-2"
                    >
                      <Plus className="w-4 h-4" /> 添加音乐
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {(config.bg_music_list || []).map((music, index) => (
                      <div key={music.id} className="p-4 bg-muted/20 rounded-2xl border border-border/50 space-y-3 relative group">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          onClick={() => {
                            const newList = (config.bg_music_list || []).filter(m => m.id !== music.id);
                            setConfig({ ...config, bg_music_list: newList });
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">标题</Label>
                            <Input 
                              placeholder="音乐标题"
                              value={music.title}
                              onChange={(e) => {
                                const newList = [...(config.bg_music_list || [])];
                                newList[index].title = e.target.value;
                                setConfig({ ...config, bg_music_list: newList });
                              }}
                              className="h-9 rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">直链 (MP3/WAV)</Label>
                            <div className="flex gap-2">
                              <Input 
                                placeholder="https://..."
                                value={music.url}
                                onChange={(e) => {
                                  const newList = [...(config.bg_music_list || [])];
                                  newList[index].url = e.target.value;
                                  setConfig({ ...config, bg_music_list: newList });
                                }}
                                className="h-9 rounded-xl text-sm"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0 rounded-xl"
                                onClick={() => {
                                  setUploadingMusic(music.id);
                                  musicInputRef.current?.click();
                                }}
                              >
                                <Upload className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-9 w-9 shrink-0 rounded-xl"
                                onClick={() => {
                                  if (!music.url) return toast.error('请输入链接');
                                  const audio = new Audio(music.url);
                                  audio.volume = config.bg_music_volume || 0.5;
                                  audio.play().catch(e => toast.error('播放失败: ' + e.message));
                                  setTimeout(() => audio.pause(), 5000);
                                  toast.info(`正在试听: ${music.title || '未命名'}...`);
                                }}
                              >
                                <Play className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(config.bg_music_list || []).length === 0 && (
                      <div className="py-8 text-center bg-muted/10 rounded-3xl border border-dashed border-border/50">
                        <Music className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">暂无音乐，点击右上角添加</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label>默认播放音量</Label>
                    <span className="text-sm font-bold text-primary">{Math.round((config.bg_music_volume || 0.5) * 100)}%</span>
                  </div>
                  <Slider
                    value={[(config.bg_music_volume || 0.5) * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(vals) => setConfig({ ...config, bg_music_volume: vals[0] / 100 })}
                    className="py-4"
                  />
                  <p className="text-xs text-muted-foreground">设置用户开启“轻音乐模式”时的默认初始音量。</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      播放方式
                      <Badge variant="secondary" className="text-[10px]">NEW</Badge>
                    </Label>
                    <RadioGroup 
                      value={config.bg_music_play_mode || 'sequential'} 
                      onValueChange={(val: 'sequential' | 'random') => setConfig({ ...config, bg_music_play_mode: val })}
                      className="flex gap-4 pt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sequential" id="mode-seq" />
                        <Label htmlFor="mode-seq" className="text-sm font-normal cursor-pointer">顺序播放</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="random" id="mode-rand" />
                        <Label htmlFor="mode-rand" className="text-sm font-normal cursor-pointer">随机播放</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      自定义图标 (Emoji 或 URL)
                      <Badge variant="secondary" className="text-[10px]">NEW</Badge>
                    </Label>
                    <Input 
                      placeholder="默认使用音乐图标，支持 Emoji 或图标 URL"
                      value={config.bg_music_icon_url || ''}
                      onChange={(e) => setConfig({ ...config, bg_music_icon_url: e.target.value })}
                      className="h-9 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-2xl space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    模式说明
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>轻音乐模式在探索页默认处于关闭状态，需用户点击手动开启。</li>
                    <li>由于浏览器安全策略，自动播放通常受限，必须由用户触发交互。</li>
                    <li>开启后，用户在滑动浏览图片时会听到背景音乐，减少视觉疲劳。</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveConfigs} 
                  disabled={saving}
                  className="rounded-xl px-8"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  保存音乐设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="access" className="space-y-6 mt-6">
          <div className="space-y-6">
            {/* 登录与注册设置 */}
            <Card className="border-none shadow-sm rounded-3xl ">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-primary flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  基本参数 - 登录与注册设置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-primary" />
                    登录方式选择 (多选)
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 p-3 bg-muted/20 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                      <Checkbox 
                        id="login-password" 
                        checked={(config.login_methods || ['password']).includes('password')} 
                        onCheckedChange={(checked) => {
                          const methods = config.login_methods || ['password'];
                          if (checked) {
                            setConfig({...config, login_methods: [...new Set([...methods, 'password'])]});
                          } else {
                            setConfig({...config, login_methods: methods.filter(m => m !== 'password')});
                          }
                        }}
                      />
                      <label htmlFor="login-password" className="text-sm font-medium leading-none cursor-pointer">账号密码登录</label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-muted/20 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                      <Checkbox 
                        id="login-wechat" 
                        checked={(config.login_methods || []).includes('wechat')} 
                        onCheckedChange={(checked) => {
                          const methods = config.login_methods || ['password'];
                          if (checked) {
                            setConfig({...config, login_methods: [...new Set([...methods, 'wechat'])], wechat_login_enabled: true});
                          } else {
                            setConfig({...config, login_methods: methods.filter(m => m !== 'wechat'), wechat_login_enabled: false});
                          }
                        }}
                      />
                      <label htmlFor="login-wechat" className="text-sm font-medium leading-none cursor-pointer">微信验证码登录</label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-muted/20 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                      <Checkbox 
                        id="login-miniprogram" 
                        checked={(config.login_methods || []).includes('miniprogram')} 
                        onCheckedChange={(checked) => {
                          const methods = config.login_methods || ['password'];
                          if (checked) {
                            setConfig({...config, login_methods: [...new Set([...methods, 'miniprogram'])], is_mp_login_enabled: true});
                          } else {
                            setConfig({...config, login_methods: methods.filter(m => m !== 'miniprogram'), is_mp_login_enabled: false});
                          }
                        }}
                      />
                      <label htmlFor="login-miniprogram" className="text-sm font-medium leading-none cursor-pointer">微信小程序登录</label>
                    </div>
                  </div>
                </div>

                <Separator className="border-dashed" />

                <div className="space-y-4">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    注册方式设置 (单选)
                  </Label>
                  <Select 
                    value={config.registration_mode || 'normal'} 
                    onValueChange={(val: any) => setConfig({...config, registration_mode: val})}
                  >
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue placeholder="选择注册方式" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="normal">普通注册 (所有人可直接注册)</SelectItem>
                      <SelectItem value="invite">邀请码注册 (需持有有效邀请码)</SelectItem>
                      <SelectItem value="disabled">关闭注册 (仅允许管理员创建用户)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="border-dashed" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40 hover:bg-muted/30 transition-all group">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-primary" />
                        单设备登录限制
                      </Label>
                      <p className="text-[10px] text-muted-foreground group-hover:text-primary/70 transition-colors">
                        开启后同一账户只能同时在一个端进行登录，新登录将踢出旧设备。
                      </p>
                    </div>
                    <Switch 
                      checked={config.single_device_login || false} 
                      onCheckedChange={(checked) => setConfig({ ...config, single_device_login: checked })} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl ">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-primary flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  访问策略与微信绑定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">强制全站登录</Label>
                    <p className="text-[10px] text-muted-foreground italic">开启后，未登录用户无法浏览任何资源</p>
                  </div>
                  <Switch checked={config.force_login === true} onCheckedChange={(val) => setConfig({...config, force_login: val})} />
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-200/50 dark:border-red-900/30 group">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
                      <TriangleAlert className="w-4 h-4" />
                      系统维护模式
                    </Label>
                    <p className="text-[10px] text-muted-foreground group-hover:text-red-500/70 transition-colors">
                      开启后，仅管理员可访问全站。普通用户将被引导至维护页面。
                    </p>
                  </div>
                  <Switch 
                    checked={config.is_maintenance_mode || false} 
                    onCheckedChange={(checked) => setConfig({ ...config, is_maintenance_mode: checked })} 
                  />
                </div>

                {config.is_maintenance_mode && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 p-4 bg-muted/30 rounded-2xl border border-border/50">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold">维护公告内容</Label>
                      <Textarea 
                        placeholder="请输入维护公告内容..."
                        value={config.maintenance_message || ''}
                        onChange={(e) => setConfig({ ...config, maintenance_message: e.target.value })}
                        className="rounded-xl resize-none h-20"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs font-bold">特殊放行页面</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { name: '首页', path: '/' },
                          { name: '发现页', path: '/discovery' },
                          { name: '每日图集', path: '/daily-gallery' },
                          { name: '相册列表', path: '/albums' },
                          { name: '随机美图', path: '/random-images' },
                          { name: '个人中心', path: '/profile' },
                          { name: '签到页面', path: '/signin' },
                          { name: '使用指南', path: '/usage-guide/*' },
                        ].map((page) => (
                          <div key={page.path} className="flex items-center space-x-2 p-2 bg-muted/20 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                            <Checkbox 
                              id={`page-${page.path}`}
                              checked={(config.maintenance_allowed_paths || []).includes(page.path)}
                              onCheckedChange={(checked) => {
                                const currentPaths = config.maintenance_allowed_paths || [];
                                if (checked) {
                                  setConfig({ ...config, maintenance_allowed_paths: [...new Set([...currentPaths, page.path])] });
                                } else {
                                  setConfig({ ...config, maintenance_allowed_paths: currentPaths.filter(p => p !== page.path) });
                                }
                              }}
                            />
                            <label htmlFor={`page-${page.path}`} className="text-[11px] font-medium leading-none cursor-pointer">{page.name}</label>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2">
                        <Label className="text-[10px] text-muted-foreground">自定义路径 (逗号分隔)</Label>
                        <Input 
                          placeholder="/custom-path, /another-one"
                          value={(config.maintenance_allowed_paths || []).filter(p => ![
                            '/', '/discovery', '/daily-gallery', '/albums', '/random-images', '/profile', '/signin', '/usage-guide/*'
                          ].includes(p)).join(', ')}
                          onChange={(e) => {
                            const customPaths = e.target.value.split(',').map(p => p.trim()).filter(Boolean);
                            const presetPaths = (config.maintenance_allowed_paths || []).filter(p => [
                              '/', '/discovery', '/daily-gallery', '/albums', '/random-images', '/profile', '/signin', '/usage-guide/*'
                            ].includes(p));
                            setConfig({ ...config, maintenance_allowed_paths: [...new Set([...presetPaths, ...customPaths])] });
                          }}
                          className="rounded-xl h-9 mt-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Separator className="border-dashed" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40 group">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        大多图组件自动配置
                      </Label>
                      <p className="text-[10px] text-muted-foreground group-hover:text-primary/70 transition-colors">
                        配置大多图组件生成时自动在指定位置插入固定内容（如广告或引导）。
                      </p>
                    </div>
                    <Switch 
                      checked={draftConfig.big_multi?.enabled || false} 
                      onCheckedChange={(checked) => setDraftConfig({ ...draftConfig, big_multi: { ...draftConfig.big_multi, enabled: checked } })} 
                    />
                  </div>

                  {draftConfig.big_multi?.enabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 p-4 bg-muted/30 rounded-2xl border border-border/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold">固定首张图片 URL</Label>
                          <Input 
                            placeholder="https://..."
                            value={draftConfig.big_multi?.first_image || ''}
                            onChange={(e) => setDraftConfig({ ...draftConfig, big_multi: { ...draftConfig.big_multi, first_image: e.target.value } })}
                            className="rounded-xl h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold">固定最后一张图片 URL</Label>
                          <Input 
                            placeholder="https://..."
                            value={draftConfig.big_multi?.last_image || ''}
                            onChange={(e) => setDraftConfig({ ...draftConfig, big_multi: { ...draftConfig.big_multi, last_image: e.target.value } })}
                            className="rounded-xl h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold">固定第 N 张图片位置 (n)</Label>
                          <Input 
                            type="number"
                            min="2"
                            value={draftConfig.big_multi?.nth_image?.n || 2}
                            onChange={(e) => setDraftConfig({ ...draftConfig, big_multi: { ...draftConfig.big_multi, nth_image: { ...draftConfig.big_multi.nth_image, n: parseInt(e.target.value) || 2 } } })}
                            className="rounded-xl h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold">固定第 N 张图片 URL</Label>
                          <Input 
                            placeholder="https://..."
                            value={draftConfig.big_multi?.nth_image?.url || ''}
                            onChange={(e) => setDraftConfig({ ...draftConfig, big_multi: { ...draftConfig.big_multi, nth_image: { ...draftConfig.big_multi.nth_image, url: e.target.value } } })}
                            className="rounded-xl h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40 group">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      未登录查看数量限制
                    </Label>
                    <p className="text-[10px] text-muted-foreground group-hover:text-primary/70 transition-colors">
                      设置未登录用户最多可查看的数据条数。设置为 0 或不填则代表不限制。
                    </p>
                  </div>
                  <div className="w-32">
                    <Input 
                      type="number" 
                      min="0"
                      value={config.anonymous_view_limit || ''} 
                      onChange={(e) => setConfig({ ...config, anonymous_view_limit: parseInt(e.target.value) || 0 })} 
                      className="rounded-xl h-9 text-center font-bold"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex flex-col p-4 bg-muted/20 rounded-2xl border border-border/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">允许在微信打开</Label>
                      <p className="text-[10px] text-muted-foreground italic">关闭后，微信内访问将显示受限页面</p>
                    </div>
                    <Switch 
                      checked={!config.wechat_forbidden} 
                      onCheckedChange={(val) => setConfig({...config, wechat_forbidden: !val})} 
                    />
                  </div>

                  {config.wechat_forbidden && (
                    <div className="space-y-4 pt-2 border-t border-dashed border-border/60">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold">受限页面显示模式</Label>
                        <Select 
                          value={config.wechat_forbidden_mode || 'template'} 
                          onValueChange={(val: any) => setConfig({...config, wechat_forbidden_mode: val})}
                        >
                          <SelectTrigger className="rounded-xl h-10 text-xs">
                            <SelectValue placeholder="选择显示模式" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="template">默认提示模板 (推荐在浏览器打开)</SelectItem>
                            <SelectItem value="custom">自定义 HTML 代码</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {config.wechat_forbidden_mode === 'custom' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Label className="text-xs font-bold">自定义 HTML 代码</Label>
                          <Textarea 
                            value={config.wechat_forbidden_html || ''} 
                            onChange={(e) => setConfig({...config, wechat_forbidden_html: e.target.value})}
                            placeholder="请输入自定义 HTML 代码..."
                            className="rounded-xl font-mono text-xs min-h-[120px]"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">启用微信公众号登录</Label>
                    <p className="text-[10px] text-muted-foreground italic">全局开关，需在登录方式中同时勾选生效</p>
                  </div>
                  <Switch checked={config.wechat_login_enabled !== false} onCheckedChange={(val) => {
                    const methods = config.login_methods || ['password'];
                    const newMethods = val 
                      ? [...new Set([...methods, 'wechat'])]
                      : methods.filter(m => m !== 'wechat');
                    setConfig({...config, wechat_login_enabled: val, login_methods: newMethods});
                  }} />
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">启用微信公众号绑定</Label>
                    <p className="text-[10px] text-muted-foreground italic">允许用户在个人中心绑定微信账号</p>
                  </div>
                  <Switch checked={config.wechat_binding_enabled !== false} onCheckedChange={(val) => setConfig({...config, wechat_binding_enabled: val})} />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-primary flex items-center gap-1">
                      <QrCode className="w-3 h-3" />
                      启用微信小程序登录
                    </Label>
                    <p className="text-[10px] text-muted-foreground italic">开启后，支持小程序一键登录及扫码登录</p>
                  </div>
                  <Switch 
                    checked={config.is_mp_login_enabled === true} 
                    onCheckedChange={(val) => {
                      const methods = config.login_methods || ['password'];
                      const newMethods = val 
                        ? [...new Set([...methods, 'miniprogram'])]
                        : methods.filter(m => m !== 'miniprogram');
                      setConfig({...config, is_mp_login_enabled: val, login_methods: newMethods});
                    }} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-primary flex items-center gap-1">
                      <QrCode className="w-3 h-3" />
                      启用微信小程序绑定
                    </Label>
                    <p className="text-[10px] text-muted-foreground italic">开启后，用户可在个人中心绑定小程序账号</p>
                  </div>
                  <Switch 
                    checked={config.is_mp_bind_enabled === true} 
                    onCheckedChange={(val) => setConfig({...config, is_mp_bind_enabled: val})} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm rounded-3xl ">
            <CardHeader className="bg-muted/30"><CardTitle>操作日志</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader><TableRow><TableHead>时间</TableHead><TableHead>模块</TableHead><TableHead>操作</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono">{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                        <TableCell>{log.module}</TableCell>
                        <TableCell className="text-xs">{log.action}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6 mt-6">
          <UploadSection 
            config={config} 
            onSave={handleSaveUploadConfig} 
            saving={saving} 
          />
        </TabsContent>

        <TabsContent value="smtp" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm rounded-3xl ">
            <CardHeader className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Mail className="w-5 h-5" />
                SMTP 邮件服务器配置
              </CardTitle>
              <CardDescription>配置自定义 SMTP 服务器，用于发送系统通知、验证码等邮件</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">启用自定义 SMTP 服务</Label>
                  <p className="text-xs text-muted-foreground">开启后，系统将使用下方配置的服务器发送邮件。若关闭，则可能回退到默认邮件服务。</p>
                </div>
                <Switch 
                  checked={config.smtp_enabled === true} 
                  onCheckedChange={(val) => setConfig({ ...config, smtp_enabled: val })} 
                />
              </div>

              {config.smtp_enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">SMTP 服务器地址 (Host)</Label>
                    <Input 
                      value={config.smtp_host || ''} 
                      onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })} 
                      placeholder="例如: smtp.qq.com"
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">端口 (Port)</Label>
                    <Input 
                      type="number"
                      value={config.smtp_port || 587} 
                      onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) || 587 })} 
                      placeholder="通常为 465 或 587"
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">SMTP 用户名 (User)</Label>
                    <Input 
                      value={config.smtp_user || ''} 
                      onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })} 
                      placeholder="您的邮箱账号"
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold">SMTP 密码 / 授权码 (Password)</Label>
                    <Input 
                      type="password"
                      value={config.smtp_pass || ''} 
                      onChange={(e) => setConfig({ ...config, smtp_pass: e.target.value })} 
                      placeholder="邮箱授权码或登录密码"
                      className="rounded-xl h-11"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-sm font-bold">发件人地址 (From Email)</Label>
                    <Input 
                      value={config.smtp_from || ''} 
                      onChange={(e) => setConfig({ ...config, smtp_from: e.target.value })} 
                      placeholder="留空则默认使用用户名"
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="md:col-span-2 p-4 bg-muted/30 rounded-2xl border border-dashed border-border/60">
                    <Label className="text-sm font-bold block mb-3">SMTP 服务测试</Label>
                    <div className="flex gap-3">
                      <Input 
                        value={testEmail} 
                        onChange={(e) => setTestEmail(e.target.value)} 
                        placeholder="输入收件人地址进行测试"
                        className="rounded-xl h-11 flex-1"
                      />
                      <Button 
                        onClick={handleTestSmtp} 
                        disabled={isTestingSmtp}
                        variant="secondary"
                        className="rounded-xl h-11 px-6 font-bold shrink-0"
                      >
                        {isTestingSmtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        发送测试邮件
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                      <strong>QQ 邮箱用户注意：</strong>465 端口在当前 SMTP 库中可能存在协议握手问题。<br />
                      <strong>推荐配置：</strong>改用 <code className="bg-muted px-1 py-0.5 rounded font-mono">587</code> 端口，可有效避免 "invalid cmd" 错误。<br />
                      授权码获取：QQ 邮箱设置 → 账户 → POP3/IMAP/SMTP 服务 → 生成授权码。
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4" />
                  <span className="text-xs font-bold">邮箱优先级说明</span>
                </div>
                <ul className="text-[10px] space-y-1 list-disc list-inside opacity-90">
                  <li><strong>Supabase 内置邮箱：</strong>用于身份验证 (Auth) 相关的邮件，如注册验证码、重置密码等。</li>
                  <li><strong>自定义 SMTP 邮箱：</strong>用于系统自定义通知、营销邮件及由 Edge Function 触发的第三方业务邮件。</li>
                  <li><strong>优先级：</strong>当本设置开启且配置正确时，系统自定义逻辑将优先使用 SMTP；Auth 身份验证邮件始终由 Supabase 控制面板中的 SMTP 设置决定。</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button 
                  onClick={handleSaveConfigs} 
                  disabled={saving}
                  className="rounded-xl h-12 px-8 font-bold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存 SMTP 配置
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground italic">
                  保存后立即全局生效
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 专享上传配置 */}
        <TabsContent value="zonerama" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm rounded-3xl ">
            <CardHeader className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Rocket className="w-5 h-5" />
                Zonerama 专享上传配置
              </CardTitle>
              <CardDescription>配置管理员专享上传功能的 Zonerama 相册参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4 p-6 bg-muted/20 rounded-2xl border border-border/50">
                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    Zonerama 相册 ID
                  </Label>
                  <Input
                    value={zoneramaConfig.album_id}
                    onChange={(e) => setZoneramaConfig({ ...zoneramaConfig, album_id: extractZoneramaAlbumId(e.target.value) })}
                    placeholder="例如：15019862"
                    className="rounded-xl h-12 bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    上传图片将保存到此 Zonerama 相册中
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    Zonerama Session（可选）
                  </Label>
                  <Textarea
                    value={zoneramaConfig.session}
                    onChange={(e) => setZoneramaConfig({ ...zoneramaConfig, session: e.target.value })}
                    placeholder="留空则使用默认认证"
                    className="rounded-xl min-h-[80px] bg-background font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    如需使用特定账号上传，请填写对应的 Session 令牌
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Link className="w-4 h-4 text-primary" />
                    Zonerama 链接模式
                  </Label>
                  <div className="flex items-center gap-3 p-4 bg-background rounded-xl border border-border/50">
                    <Badge variant="secondary" className="shrink-0">
                      自动识别
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      根据 Zonerama 图片 ID 自动判断：ID 为纯数字时使用 ID 模式（<code className="text-xs bg-muted px-1 py-0.5 rounded">?id=123456</code>），否则使用 URL 模式（<code className="text-xs bg-muted px-1 py-0.5 rounded">?url=...</code>）。
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Link className="w-4 h-4 text-primary" />
                    图片代理接口
                  </Label>
                  <Input
                    value={zoneramaConfig.photo_api || ''}
                    onChange={(e) => setZoneramaConfig({ ...zoneramaConfig, photo_api: e.target.value })}
                    placeholder="例如：https://zomphoto.wo58.cn/"
                    className="rounded-xl h-12 bg-background font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    配置后，Zonerama 图片链接将自动拼接此接口，并根据图片 ID 是纯数字还是完整 URL 自动选择追加 <code className="text-xs bg-muted px-1 py-0.5 rounded">?id=</code> 或 <code className="text-xs bg-muted px-1 py-0.5 rounded">?url=</code>。
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Link className="w-4 h-4 text-primary" />
                    图集内图片列表接口（可选）
                  </Label>
                  <Input
                    value={zoneramaConfig.album_photo_api || ''}
                    onChange={(e) => setZoneramaConfig({ ...zoneramaConfig, album_photo_api: e.target.value })}
                    placeholder="例如：https://zomphoto.wo58.cn/album?albumId="
                    className="rounded-xl h-12 bg-background font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    配置后，图集管理的「接口导入」功能将使用此接口获取图片列表。例如：<br />
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">https://zomphoto.wo58.cn/album?albumId=12345</code><br />
                    返回格式：<code className="text-xs bg-muted px-1 py-0.5 rounded">{`{"photos":[{"id":xxx,"url":"..."}]}`}</code>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button 
                  onClick={handleSaveConfigs} 
                  disabled={saving}
                  className="rounded-xl h-12 px-8 font-bold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存配置
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  保存后立即生效，上传页面将使用新配置
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="db_optimize" className="mt-6">
          <DbOptimize />
        </TabsContent>

        <TabsContent value="debug" className="space-y-6 mt-6">
          <Card className="border-none shadow-sm rounded-3xl ">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Bug className="w-5 h-5" />
                开发调试与日志管理
              </CardTitle>
              <CardDescription>配置前端开发调试日志策略（仅管理员可用）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-muted-foreground/10">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">启用开发调试日志</Label>
                  <p className="text-xs text-muted-foreground">开启后，管理员在浏览页面时会看到悬浮的调试日志按钮</p>
                </div>
                <Switch 
                  checked={debugSettings.is_enabled} 
                  onCheckedChange={(checked) => setDebugSettings({ ...debugSettings, is_enabled: checked })} 
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">日志保存时长 (分钟)</Label>
                  <Select 
                    value={String(debugSettings.retention_minutes)} 
                    onValueChange={(val) => setDebugSettings({ ...debugSettings, retention_minutes: parseInt(val) })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="选择时长" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="1">1 分钟</SelectItem>
                      <SelectItem value="5">5 分钟</SelectItem>
                      <SelectItem value="10">10 分钟</SelectItem>
                      <SelectItem value="30">30 分钟</SelectItem>
                      <SelectItem value="60">1 小时</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground italic">超过此时长的日志将被自动从数据库中清理（仅影响上报的日志）</p>
                </div>
              </div>

              <div className="bg-orange-500/5 rounded-2xl p-4 border border-orange-500/10">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">注意事项</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      开启调试日志会记录每一张图片的加载状态和 URL，虽然仅管理员可见，但在高流量环境下可能会产生较多临时数据。建议仅在排查问题时开启。
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="download" className="space-y-6 mt-6">
          <Card className="rounded-2xl border-border/50 shadow-sm  bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">媒体下载功能设置</CardTitle>
                    <CardDescription>配置壁纸和写真图集的下载权限及积分扣费规则</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Switch 
                     checked={config.enable_download} 
                     onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enable_download: checked }))} 
                   />
                   <span className="text-sm font-medium">{config.enable_download ? '已开启下载' : '已关闭下载'}</span>
                </div>
              </div>
            </CardHeader>
            <Separator className="opacity-50" />
            <CardContent className="space-y-8 pt-6">
              {config.enable_download && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          下载支持模式
                          <Badge variant="outline" className="text-[10px] font-normal py-0">Download Mode</Badge>
                        </Label>
                        <Select 
                          value={config.download_mode} 
                          onValueChange={(val: any) => setConfig(prev => ({ ...prev, download_mode: val }))}
                        >
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="选择下载支持模式" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="both">壁纸与写真图集均支持</SelectItem>
                            <SelectItem value="wallpaper">仅支持单张壁纸下载</SelectItem>
                            <SelectItem value="album">仅支持整个写真图集下载</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground leading-relaxed">指定本站开放下载的内容类型。写真图集下载通常包含该图集内的所有图片。</p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          最低下载权限角色
                          <Badge variant="outline" className="text-[10px] font-normal py-0">Role Restriction</Badge>
                        </Label>
                        <Select 
                          value={config.min_download_role} 
                          onValueChange={(val: any) => setConfig(prev => ({ ...prev, min_download_role: val }))}
                        >
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="选择最低权限角色" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="user">普通注册用户</SelectItem>
                            <SelectItem value="member">正式成员</SelectItem>
                            <SelectItem value="vip">VIP 会员</SelectItem>
                            <SelectItem value="svip">SVIP 超级会员</SelectItem>
                            <SelectItem value="admin">仅限管理员</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground leading-relaxed">只有达到指定角色的用户才能看到下载按钮。</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {(config.download_mode === 'both' || config.download_mode === 'wallpaper') && (
                        <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                          <Label className="text-sm font-bold flex items-center gap-2 text-primary">
                            <ImageIcon className="w-4 h-4" /> 单张壁纸下载价格
                          </Label>
                          <div className="flex items-center gap-3">
                            <Input 
                              type="number" 
                              min="0"
                              value={config.wallpaper_price}
                              onChange={(e) => setConfig(prev => ({ ...prev, wallpaper_price: parseInt(e.target.value) || 0 }))}
                              className="rounded-xl h-10 font-bold text-center"
                            />
                            <span className="text-sm font-medium text-muted-foreground">积分 / 张</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">同一张壁纸重复下载不会重复扣费。</p>
                        </div>
                      )}

                      {(config.download_mode === 'both' || config.download_mode === 'album') && (
                        <div className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                          <Label className="text-sm font-bold flex items-center gap-2 text-amber-600">
                            <DatabaseIcon className="w-4 h-4" /> 写真图集打包下载价格
                          </Label>
                          <div className="flex items-center gap-3">
                            <Input 
                              type="number" 
                              min="0"
                              value={config.album_price}
                              onChange={(e) => setConfig(prev => ({ ...prev, album_price: parseInt(e.target.value) || 0 }))}
                              className="rounded-xl h-10 font-bold text-center"
                            />
                            <span className="text-sm font-medium text-muted-foreground">积分 / 套</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">支持一次性打包下载整个写真图集的所有图片。</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {!config.enable_download && (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                    <Download className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">下载功能已禁用</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs">开启后，用户可以根据角色权限和积分余额下载壁纸或写真图集。</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveConfigs} 
                  disabled={saving}
                  className="rounded-xl h-11 px-8 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  保存全站下载设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
