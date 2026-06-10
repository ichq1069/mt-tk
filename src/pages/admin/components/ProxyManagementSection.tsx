import React, { useState, useEffect } from 'react';
import { cn, formatBeijingTime } from '@/lib/utils';
import { 
  RefreshCcw, Trash2, Search, Globe, Database, Clock, BarChart3, ExternalLink, 
  ChevronLeft, ChevronRight, Loader2, CheckSquare, Square, Settings, Shield,
  Plus, Check, X, ShieldAlert, Activity, Key, Globe2, Save, Image as ImageIcon,
  Wand2, Info, ListChecks, ArrowRightLeft, Sparkles, Zap, Flame, LayoutGrid,
  History, Bookmark, BookmarkPlus, ChevronDown, Rocket, Lock as LockIcon, ShieldCheck,
  Terminal, Eye, AlertCircle
} from 'lucide-react';
import { 
  BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart as RechartsBarChart, Bar, Legend,
  ResponsiveContainer as RechartsResponsiveContainer
} from "recharts";

import { supabase } from '@/db/supabase';
import { api } from '@/db/api';
import type { StorageConfig } from '@/types';
import { useConfig } from '@/contexts/ConfigContext';
import { applyImageProcessing } from '@/lib/media';
import { ImageGridSlicer } from './SliceTool';

function ParamHelper({ params }: { params: string }) {
  if (!params) return null;
  
  // 参数解析：支持 / 分隔（标准格式）和 , 分隔（兼容旧格式）
  const parts = params.replace(/,/g, '/').split('/').map(p => p.trim()).filter(Boolean);
  const descriptions: string[] = [];

  parts.forEach(part => {
    if (part.startsWith('rs:')) {
      const [_, mode, w, h] = part.split(':');
      const modeText = mode === 'fit' ? '等比缩放' : mode === 'fill' ? '居中裁剪' : mode;
      const sizeText = `${w || '自动'}x${h || '自动'}`;
      descriptions.push(`${modeText} (${sizeText})`);
    } else if (part.startsWith('q:')) {
      descriptions.push(`质量 ${part.split(':')[1]}%`);
    } else if (part.startsWith('blur:')) {
      descriptions.push(`模糊 ${part.split(':')[1]}`);
    } else if (part.startsWith('f:') || part.startsWith('format:')) {
      const format = part.includes(':') ? part.split(':')[1] : '';
      descriptions.push(`格式 ${format.toUpperCase()}`);
    } else if (part.startsWith('sharpen:')) {
      descriptions.push(`锐化 ${part.split(':')[1]}`);
    } else if (part.startsWith('bg:')) {
      descriptions.push(`背景色 #${part.split(':')[1]}`);
    } else if (part.startsWith('rot:')) {
      descriptions.push(`旋转 ${part.split(':')[1]}°`);
    }
  });

  if (descriptions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {descriptions.map((d, i) => (
        <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 bg-indigo-100 text-indigo-700 border-none font-medium">
          {d}
        </Badge>
      ))}
    </div>
  );
}

function QuickParamSelector({ onSelect }: { onSelect: (val: string) => void }) {
  const presets = [
    { label: '瀑布流', value: 'rs:fit:400:0/q:80', icon: ListChecks },
    { label: '图集', value: 'rs:fill:300:400/q:80', icon: LayoutGrid },
    { label: '高清', value: 'rs:fit:1200:0/q:75', icon: Sparkles },
    { label: '压缩', value: 'rs:fit:200:0/q:20/blur:1', icon: Zap },
    { label: '模糊', value: 'rs:fit:200:0/q:10/blur:20', icon: Flame },
    { label: 'WebP', value: 'f:webp', icon: Globe },
    { label: '毫秒级', value: 'rs:fit:1280:1280/q:70/f:webp', icon: Zap },
  ];

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => onSelect(p.value)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold border border-indigo-200/50 transition-colors"
        >
          <p.icon className="w-2.5 h-2.5" />
          {p.label}
        </button>
      ))}
    </div>
  );
}


export function ProxyManagementSection({ defaultTab = 'proxy' }: { defaultTab?: string }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // 当 defaultTab 变化时同步 activeTab，支持从侧边栏切换
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Partial<StorageConfig>>({});
  const { refreshConfig } = useConfig();

  // 缓存项状态
  const [cacheItems, setCacheItems] = useState<any[]>([]);
  const [cacheSearch, setCacheSearch] = useState('');
  const [cachePage, setCachePage] = useState(0);
  const [cacheTotal, setCacheTotal] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);

  // 排除域名状态
  const [excludeDomains, setExcludeDomains] = useState<any[]>([]);
  const [newDomain, setNewDomain] = useState('');

  // 安全与显示配置
  const [previewConfig, setPreviewConfig] = useState<{ isOpen: boolean; ruleKey: string; ruleLabel: string }>({ 
    isOpen: false, 
    ruleKey: '', 
    ruleLabel: '' 
  });
  const [newTestImageUrl, setNewTestImageUrl] = useState('');
  const [currentPreviewImageIndex, setCurrentPreviewImageIndex] = useState(0);
  const [validityTestRule, setValidityTestRule] = useState('首瀑');
  const [validityTestUrl, setValidityTestUrl] = useState('');
  const [validityResultUrl, setValidityResultUrl] = useState('');

  const [securityConfig, setSecurityConfig] = useState({
    mode: 'blob',
    slice_count: 4,
    signed_expiry: 300,
    enable_webp: true,
    prefetch_count: 5
  });


  useEffect(() => {
    fetchConfig();
    fetchExcludeDomains();
    fetchSecurityConfig();
    fetchShortcodes();
    fetchVideoNodes();
    fetchVideoStats();
  }, []);

  const [shortcodes, setShortcodes] = useState<any[]>([]);

  const fetchShortcodes = async () => {
    try {
      const { data } = await api.getShortcodes();
      if (data) setShortcodes(data.filter((s: any) => s.is_active));
    } catch (e) {
      console.error('Failed to fetch shortcodes:', e);
    }
  };

  const fetchSecurityConfig = async () => {
    const { data } = await api.getSystemConfig('media_security_config');
    if (data?.value) setSecurityConfig(prev => ({ ...prev, ...data.value }));
  };



  useEffect(() => {
    if (activeTab === 'domains_cache') {
      fetchCacheItems();
    }
  }, [activeTab, cachePage, cacheSearch]);

  const fetchConfig = async () => {
    const { data } = await api.getStorageConfig();
    if (data) setConfig(data);
  };

  const fetchExcludeDomains = async () => {
    const { data } = await api.getProxyExcludeDomains();
    if (data) setExcludeDomains(data);
  };

  const fetchCacheItems = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('proxy_cache_items')
        .select('*', { count: 'exact' });

      if (cacheSearch) {
        query = query.or(`key.ilike.%${cacheSearch}%,original_url.ilike.%${cacheSearch}%`);
      }

      const { data, count, error } = await query
        .order('last_accessed_at', { ascending: false })
        .range(cachePage * 20, (cachePage + 1) * 20 - 1);

      if (error) throw error;
      setCacheItems(data || []);
      setCacheTotal(count || 0);
    } catch (e: any) {
      toast.error('获取缓存列表失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const [testing, setTesting] = useState(false);

  const testProxyStatus = async () => {
    if (!config.image_proxy_url) {
      toast.error('请先配置代理地址');
      return;
    }
    setTesting(true);
    try {
      const baseUrl = config.image_proxy_url.split('?')[0].replace(/\/$/, '');
      const testUrl = `${baseUrl}/test-connection?secret=${config.image_proxy_secret || ''}`;
      const start = Date.now();
      const response = await fetch(testUrl, { mode: 'cors' });
      const duration = Date.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`代理服务正常 (响应时间: ${duration}ms)`);
        } else {
          toast.warning(`代理服务已响应但返回异常: ${data.error || '未知错误'}`);
        }
      } else {
        toast.error(`连接失败 (HTTP ${response.status})`);
      }
    } catch (e: any) {
      toast.error('连接超时或跨域被阻拦: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  const [videoTesting, setVideoTesting] = useState(false);
  const [videoNodes, setVideoNodes] = useState<any[]>([]);
  const [videoStats, setVideoStats] = useState<any[]>([]);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);

  const fetchVideoNodes = async () => {
    const { data } = await api.getVideoProxyConfigs();
    if (data) setVideoNodes(data);
  };

  const fetchVideoStats = async () => {
    const { data } = await api.getVideoProxyStats(7);
    if (data) {
      // 按天聚合统计数据
      const dailyStats: any = {};
      data.forEach((log: any) => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { date, traffic: 0, cost: 0, count: 0 };
        }
        dailyStats[date].traffic += (Number(log.bytes_transferred) || 0) / (1024 * 1024 * 1024); // GB
        dailyStats[date].cost += Number(log.estimated_cost) || 0;
        dailyStats[date].count += 1;
      });
      setVideoStats(Object.values(dailyStats).sort((a: any, b: any) => a.date.localeCompare(b.date)));
    }
  };

  const testVideoProxyStatus = async () => {
    if (!config.video_proxy_url) {
      toast.error('请先配置视频代理地址');
      return;
    }
    setVideoTesting(true);
    try {
      const baseUrl = config.video_proxy_url.split('?')[0].replace(/\/$/, '');
      const testUrl = `${baseUrl}/test-connection?secret=${config.video_proxy_secret || ''}`;
      const start = Date.now();
      const response = await fetch(testUrl, { mode: 'cors' });
      const duration = Date.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success(`视频代理服务正常 (响应时间: ${duration}ms)`);
        } else {
          toast.warning(`视频代理服务已响应但返回异常: ${data.error || '未知错误'}`);
        }
      } else {
        toast.error(`视频连接失败 (HTTP ${response.status})`);
      }
    } catch (e: any) {
      toast.error('视频连接超时或跨域被阻拦: ' + e.message);
    } finally {
      setVideoTesting(false);
    }
  };


  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      // 同时保存存储配置和媒体安全配置
      const results = await Promise.all([
        api.upsertStorageConfig(config),
        api.updateSystemConfig('media_security_config', securityConfig)
      ]);
      
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
      
      toast.success('配置已保存并即时生效');
      refreshConfig();
    } catch (e: any) {
      toast.error('保存失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async () => {
    console.log('[ProxyManagement] Adding domain:', newDomain);
    if (!newDomain.trim()) {
      toast.warning('请输入域名');
      return;
    }
    try {
      const { error } = await api.addProxyExcludeDomain(newDomain);
      if (error) throw error;
      toast.success('域名已添加');
      setNewDomain('');
      fetchExcludeDomains();
    } catch (e: any) {
      console.error('[ProxyManagement] Add domain error:', e);
      toast.error('添加失败: ' + e.message);
    }
  };

  const toggleDomainStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await api.updateProxyExcludeDomain(id, { is_enabled: !currentStatus });
      if (error) throw error;
      fetchExcludeDomains();
    } catch (e: any) {
      toast.error('操作失败: ' + e.message);
    }
  };

  const deleteDomain = async (id: string) => {
    if (!confirm('确定要删除此排除域名吗？')) return;
    try {
      const { error } = await api.deleteProxyExcludeDomain(id);
      if (error) throw error;
      toast.success('域名已删除');
      fetchExcludeDomains();
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const handleSyncWithWorker = async () => {
    if (!config.image_proxy_url || !config.image_proxy_secret) {
      toast.error('请先配置代理地址和密钥');
      return;
    }

    setSyncing(true);
    try {
      const baseUrl = config.image_proxy_url.split('?')[0].replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/list?secret=${config.image_proxy_secret}`);
      const data = await response.json();

      if (data.success && Array.isArray(data.list)) {
        const items = data.list.map((item: any) => ({
          key: item.key,
          size: item.size,
          upload_time: item.time,
          original_url: item.yuanurl || item.customMetadata?.yuanurl || null,
          last_accessed_at: new Date().toISOString()
        }));

        const batchSize = 100;
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const { error } = await supabase
            .from('proxy_cache_items')
            .upsert(batch, { onConflict: 'key' });
          if (error) throw error;
        }

        toast.success(`同步完成，共更新 ${data.list.length} 条记录`);
        fetchCacheItems();
      } else {
        throw new Error(data.error || 'Worker 接口返回异常');
      }
    } catch (e: any) {
      toast.error('同步失败: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const deleteCache = async (key: string) => {
    if (!confirm('确定要删除此缓存吗？')) return;
    try {
      if (config.image_proxy_url && config.image_proxy_secret) {
        const baseUrl = config.image_proxy_url.split('?')[0].replace(/\/$/, '');
        await fetch(`${baseUrl}/delete?secret=${config.image_proxy_secret}&key=${key}`).catch(console.warn);
      }
      const { error } = await supabase.from('proxy_cache_items').delete().eq('key', key);
      if (error) throw error;
      fetchCacheItems();
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">综合代理管理</h2>
          <p className="text-sm text-muted-foreground mt-1">全站图片代理、缓存策略及排除域名统一配置中心</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full max-w-4xl bg-muted/30 p-1 rounded-2xl h-auto">
          <TabsTrigger value="proxy" className="rounded-xl font-bold text-[10px] text-nowrap">图片代理</TabsTrigger>
          <TabsTrigger value="video_proxy" className="rounded-xl font-bold text-[10px] text-nowrap">视频代理</TabsTrigger>
          <TabsTrigger value="processing" className="rounded-xl font-bold text-[10px] text-nowrap">处理规则</TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl font-bold text-[10px] text-nowrap">安全策略</TabsTrigger>
          <TabsTrigger value="display" className="rounded-xl font-bold text-[10px] text-nowrap">缩略水印</TabsTrigger>
          <TabsTrigger value="domains_cache" className="rounded-xl font-bold text-[10px] text-nowrap">排除缓存</TabsTrigger>
          <TabsTrigger value="tools" className="rounded-xl font-bold text-[10px] text-nowrap">测试工具</TabsTrigger>
        </TabsList>

        <TabsContent value="proxy" className="space-y-4 mt-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <CardTitle>代理全局参数</CardTitle>
              </div>
              <CardDescription>控制全站图片是否通过代理服务器加载及其鉴权信息</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">启用图片代理加速</Label>
                  <p className="text-[10px] text-muted-foreground">开启后，缩略图将通过 Cloudflare Worker / R2 加速加载</p>
                </div>
                <Switch 
                  checked={config.enable_image_proxy || false} 
                  onCheckedChange={(val) => setConfig({ ...config, enable_image_proxy: val })} 
                />
              </div>

              <div className={cn("space-y-4", !(config.enable_image_proxy) && "opacity-50 pointer-events-none")}>
                <div className="space-y-2">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    代理服务地址 (Cloudflare Worker URL)
                  </Label>
                  <Input 
                    placeholder="例如: https://your-proxy.workers.dev/" 
                    value={config.image_proxy_url || ''} 
                    onChange={(e) => setConfig({ ...config, image_proxy_url: e.target.value })} 
                    className="rounded-xl bg-muted/30 border-none h-11"
                  />
                  <p className="text-[10px] text-muted-foreground px-1 italic">留空则使用内置 Edge Function 代理（不建议生产环境使用）</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Key className="w-4 h-4 text-primary" />
                    代理通讯密钥 (Secret)
                  </Label>
                  <Input 
                    type="password"
                    placeholder="用于与 Worker 通讯的密钥" 
                    value={config.image_proxy_secret || ''} 
                    onChange={(e) => setConfig({ ...config, image_proxy_secret: e.target.value })} 
                    className="rounded-xl bg-muted/30 border-none h-11"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={testProxyStatus} 
                  disabled={testing || !config.image_proxy_url}
                  className="rounded-xl px-6"
                >
                  {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2 text-green-500" />}
                  检测连通性
                </Button>
                <Button onClick={handleSaveConfig} disabled={saving} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  保存基础配置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video_proxy" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-primary/5 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-primary" />
                    视频加速节点管理
                  </CardTitle>
                  <CardDescription>配置多个加速节点，系统将自动进行智能路由选择</CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setEditingNode({ node_name: '', node_url: '', priority: 0, cost_per_gb: 0, is_enabled: true });
                    setIsNodeDialogOpen(true);
                  }}
                  size="sm"
                  className="rounded-xl h-8 text-[10px] font-bold"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  添加节点
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>节点名称</TableHead>
                      <TableHead>优先级</TableHead>
                      <TableHead>成本 (元/GB)</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videoNodes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">暂无节点配置</TableCell>
                      </TableRow>
                    ) : (
                      videoNodes.map((node) => (
                        <TableRow key={node.id}>
                          <TableCell>
                            <div className="font-bold">{node.node_name}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{node.node_url}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-lg">{node.priority}</Badge>
                          </TableCell>
                          <TableCell>¥{node.cost_per_gb?.toFixed(4)}</TableCell>
                          <TableCell>
                            <Switch 
                              checked={node.is_enabled} 
                              onCheckedChange={async (val) => {
                                try {
                                  await api.upsertVideoProxyConfig({ ...node, is_enabled: val });
                                  fetchVideoNodes();
                                  toast.success('状态已更新');
                                } catch (e: any) {
                                  toast.error('更新失败: ' + e.message);
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingNode(node);
                                  setIsNodeDialogOpen(true);
                                }}
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-500"
                                onClick={async () => {
                                  if (!confirm('确定删除此节点？')) return;
                                  try {
                                    await api.deleteVideoProxyConfig(node.id);
                                    fetchVideoNodes();
                                    toast.success('已删除');
                                  } catch (e: any) {
                                    toast.error('删除失败: ' + e.message);
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-indigo-500/5">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    流量消耗统计 (近7日)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={videoStats}>
                      <defs>
                        <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }} 
                        tickFormatter={(val) => val.split('-').slice(1).join('/')}
                      />
                      <YAxis hide />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: number) => [`${val.toFixed(2)} GB`, '流量']}
                      />
                      <Area type="monotone" dataKey="traffic" stroke="#6366f1" fillOpacity={1} fill="url(#colorTraffic)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    累计成本预估
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <div className="text-3xl font-black text-emerald-600">
                    ¥{videoStats.reduce((acc, curr) => acc + curr.cost, 0).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">基于各节点流量单价计算的理论成本</p>
                  
                  <div className="mt-4 pt-4 border-t border-emerald-100 flex justify-between items-center text-xs">
                    <span className="text-emerald-700 font-bold">总计流量</span>
                    <span className="font-mono text-emerald-600 font-bold">
                      {videoStats.reduce((acc, curr) => acc + curr.traffic, 0).toFixed(2)} GB
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>


        <TabsContent value="processing" className="space-y-4 mt-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-indigo-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-600" />
                  <CardTitle>imgproxy 图片处理配置</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] font-bold text-muted-foreground">启用服务</Label>
                  <Switch 
                    checked={config.enable_image_processing !== false} 
                    onCheckedChange={(val) => setConfig({ ...config, enable_image_processing: val })} 
                  />
                </div>
              </div>
              <CardDescription>
                配置全局图片缩略、压缩及查重预处理参数。
                <span className="block mt-1 text-[10px] text-indigo-600 font-bold">
                  💡 管理员可在前端图片左上角看到 <Badge className="h-3.5 px-1 bg-blue-500 text-[8px] border-none inline-flex items-center">P</Badge> (代理) 和 <Badge className="h-3.5 px-1 bg-green-500 text-[8px] border-none inline-flex items-center">C</Badge> (处理) 标识，用于验证规则是否生效。
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-500" />
                        服务地址 (imgproxy URL)
                      </Label>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-indigo-600 font-bold"
                          onClick={() => {
                            if (!config.image_processing_url) {
                              toast.error('请先输入服务地址');
                              return;
                            }
                            const urls = [...(config.saved_imgproxy_urls || [])];
                            if (urls.includes(config.image_processing_url)) {
                              toast.info('该地址已在收藏夹中');
                              return;
                            }
                            const newUrls = [config.image_processing_url, ...urls].slice(0, 10);
                            setConfig({ ...config, saved_imgproxy_urls: newUrls });
                            toast.success('已添加到常用地址');
                          }}
                        >
                          <BookmarkPlus className="w-3 h-3 mr-1" />
                          收藏当前
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-indigo-600 font-bold">
                              <History className="w-3 h-3 mr-1" />
                              常用地址
                              <ChevronDown className="w-3 h-3 ml-0.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64 rounded-xl">
                            <DropdownMenuLabel className="text-xs">已保存的地址</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {(!config.saved_imgproxy_urls || config.saved_imgproxy_urls.length === 0) ? (
                              <div className="p-4 text-center text-[10px] text-muted-foreground">暂无收藏地址</div>
                            ) : (
                              config.saved_imgproxy_urls.map((url, i) => (
                                <DropdownMenuItem 
                                  key={i} 
                                  className="text-[10px] flex items-center justify-between group"
                                  onClick={() => setConfig({ ...config, image_processing_url: url })}
                                >
                                  <span className="truncate flex-1 mr-2">{url}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newUrls = config.saved_imgproxy_urls?.filter((_, idx) => idx !== i);
                                      setConfig({ ...config, saved_imgproxy_urls: newUrls });
                                    }}
                                  >
                                    <X className="w-2 h-2" />
                                  </Button>
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <Input 
                      placeholder="例如: https://mt-imgproxy.wo58.cn" 
                      value={config.image_processing_url || ''} 
                      onChange={(e) => setConfig({ ...config, image_processing_url: e.target.value })} 
                      className="rounded-xl bg-muted/30 border-none h-11"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold flex items-center gap-1.5 text-indigo-700">
                        第三方外链同步处理 (关键)
                        <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-indigo-200 text-indigo-500 font-bold bg-indigo-50">推荐开启</Badge>
                      </Label>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">开启后，微信/小红书/微博等外链图片也将应用缩略规则。如关闭，外链图片将直连/代理原图，导致瀑布流加载极慢且处理规则无效。</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] text-muted-foreground">参与代理同步</Label>
                        <Switch 
                          checked={config.enable_proxy_image_processing || false} 
                          onCheckedChange={(val) => setConfig({ ...config, enable_proxy_image_processing: val })} 
                        />
                      </div>
                      {!config.enable_proxy_image_processing && config.enable_image_proxy && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 animate-pulse mt-1">
                          <ShieldAlert className="w-2.5 h-2.5 text-red-500" />
                          <span className="text-[8px] text-red-600 font-black">处理对代理图片无效（必须开启）</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-200/50 space-y-3">
                  <h4 className="text-xs font-black text-indigo-700 uppercase flex items-center gap-2">
                    <Info className="w-3 h-3" /> 全站图片架构说明
                  </h4>
                  <div className="text-[10px] text-indigo-800/80 leading-relaxed space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    <div className="space-y-1">
                      <p className="font-bold flex items-center gap-1"><Globe2 className="w-3 h-3 text-indigo-600" /> 1. CORS 代理加速</p>
                      <p>解决外链图片跨域限制。系统自动转发至代理服务器，并支持 Redis 高速缓存，解决 H5 查重扫描等跨域阻碍。代理后的 URL 特征为：[代理URL]?url=[源URL]。</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold flex items-center gap-1"><ImageIcon className="w-3 h-3 text-indigo-600" /> 2. imgproxy 实时处理</p>
                      <p>高性能实时图片处理。支持缩放、裁剪、WebP 转换。显著降低移动端首屏加载体积，节省流量。路径：[imgproxy地址]/unsafe/[参数串]/plain/[源URL]。</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold flex items-center gap-1"><ArrowRightLeft className="w-3 h-3 text-indigo-600" /> 3. 代理同步处理</p>
                      <p><b>开启后：</b>外链图也能享受缩略优化。请求链路：[浏览器] → [imgproxy] → [CORS 代理] → [源站]。</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold flex items-center gap-1"><Shield className="w-3 h-3 text-indigo-600" /> 4. 管理员状态标识</p>
                      <p>管理员预览时，图片左上角会出现标识：<b>P</b> (已走代理)、<b>C</b> (已走处理)。如果没有标识，说明图片为直连加载或配置未生效。</p>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-indigo-200/50">
                      <p className="font-bold text-indigo-900 flex items-center gap-1"><Zap className="w-3 h-3 text-indigo-600" /> 5. 快速配置技巧</p>
                      <ul className="list-disc list-inside space-y-0.5 opacity-80 pl-1">
                        <li>使用“参数快速选择”一键填充标准参数。</li>
                        <li>参数组必须用 <code>/</code> 分隔，如 <code>rs:fit:400:0/q:80</code>。</li>
                        <li>常用 imgproxy 地址可点击标题旁图标快速保存和切换。</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-border/40" />

              <div className="space-y-4">
                <h3 className="text-sm font-black flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-indigo-500" />
                  场景预设规则 (imgproxy 参数组)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: '首瀑', label: '首页瀑布流 (首瀑)', placeholder: 'rs:fill:300:400/q:80' },
                    { key: '大图', label: '大图预览 (大图)', placeholder: 'rs:fit:2560:2560/q:90' },
                    { key: '抖音', label: '抖音Feed (抖音)', placeholder: 'rs:fit:1080:1920/q:85' },
                    { key: '写-封', label: '写真封面 (写-封)', placeholder: 'rs:fill:300:400/q:80' },
                    { key: '写-网', label: '写真网格 (写-网)', placeholder: 'rs:fill:300:300/q:80' },
                    { key: '写book', label: '写真电子书 (写book)', placeholder: 'rs:fit:1920:1920/q:90' },
                    { key: '每日', label: '每日图集 (每日)', placeholder: 'rs:fill:300:300/q:80' },
                    { key: '审核', label: '审核页面 (审核)', placeholder: 'rs:fit:300:300/q:70' },
                    { key: '后', label: '后台通用 (后)', placeholder: 'rs:fit:400:400/q:75' },
                    { key: '毫秒级优化', label: '毫秒级优化 (毫秒级优化)', placeholder: 'rs:fit:1280:1280/q:70/f:webp' }
                  ].map((rule) => (
                    <div key={rule.key} className="space-y-1.5 p-4 bg-muted/20 rounded-2xl border border-border/40">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-muted-foreground">{rule.label}</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-1.5 text-[10px] text-indigo-600 hover:bg-indigo-50 font-bold transition-all hover:scale-105"
                          onClick={() => setPreviewConfig({ ruleKey: rule.key, ruleLabel: rule.label, isOpen: true })}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          预览效果
                        </Button>
                      </div>
                      <Input 
                        placeholder={rule.placeholder} 
                        value={config.image_processing_rules?.[rule.key] || ''} 
                        onChange={(e) => {
                          const rules = { ...(config.image_processing_rules || {}) };
                          rules[rule.key] = e.target.value;
                          setConfig({ ...config, image_processing_rules: rules });
                        }}
                        className="rounded-xl bg-white border-none h-10 text-xs font-mono"
                      />
                      <div className="flex flex-col">
                        <ParamHelper params={config.image_processing_rules?.[rule.key] || ''} />
                        <QuickParamSelector 
                          onSelect={(val) => {
                            const rules = { ...(config.image_processing_rules || {}) };
                            const current = rules[rule.key] || '';
                            
                            // 智能合并：参数间用 / 分隔（imgproxy 标准格式）
                            if (!current) {
                              rules[rule.key] = val;
                            } else {
                              // 解析当前所有参数
                              const currentParts = current.replace(/,/g, '/').split('/').filter(Boolean);
                              const newParts = val.replace(/,/g, '/').split('/').filter(Boolean);
                              
                              // 提取参数前缀（如 'q:', 'blur:', 'rs:'）
                              const getPrefix = (p: string) => {
                                if (p.startsWith('rs:')) return 'rs:';
                                if (p.startsWith('f:')) return 'f:';
                                return p.split(':')[0] + ':';
                              };

                              // 合并逻辑：新参数覆盖同前缀的旧参数
                              let mergedParts = [...currentParts];
                              newParts.forEach(newP => {
                                const prefix = getPrefix(newP);
                                const existingIndex = mergedParts.findIndex(p => getPrefix(p) === prefix);
                                if (existingIndex >= 0) {
                                  mergedParts[existingIndex] = newP;
                                } else {
                                  mergedParts.push(newP);
                                }
                              });
                              
                              rules[rule.key] = mergedParts.join('/');
                            }
                            setConfig({ ...config, image_processing_rules: rules });
                          }} 
                        />
                      </div>
                    </div>
                  ))}
              </div>
                </div>


              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveConfig} disabled={saving} className="rounded-xl px-8 shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  保存处理配置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-2 text-primary">
                <ShieldCheck className="w-5 h-5" />
                资源保护与加载策略
              </CardTitle>
              <CardDescription>配置前端资源地址保护、预加载及 WebP 优化</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <LockIcon className="w-4 h-4 text-primary" />
                    全站资源地址保护模式 (切片/加密)
                  </Label>
                  <Select 
                    value={securityConfig.mode || 'blob'} 
                    onValueChange={(val: any) => setSecurityConfig({ ...securityConfig, mode: val })}
                  >
                    <SelectTrigger className="w-[180px] rounded-xl font-bold">
                      <SelectValue placeholder="选择保护模式" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="original">不保护 (原始 URL)</SelectItem>
                      <SelectItem value="blob">Blob 保护 (完整图，本地流转换)</SelectItem>
                      <SelectItem value="canvas">Canvas 渲染 (完整图，防止右键)</SelectItem>
                      <SelectItem value="blob_slice">Blob 切片 (2x2 虚拟切片 + Blob)</SelectItem>
                      <SelectItem value="canvas_slice">Canvas 切片 (2x2 虚拟切片，快速)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-[10px] text-muted-foreground px-1 bg-primary/5 p-2 rounded-lg border border-primary/10">
                  {securityConfig.mode === 'original' && "⚠️ 原始模式：资源地址不隐藏。"}
                  {securityConfig.mode === 'blob' && "💧 Blob 保护：二进制流加载，隐藏真实 CDN 地址。"}
                  {securityConfig.mode === 'canvas' && "🎨 Canvas 保护：虚拟渲染至 Canvas，防止右键另存。"}
                  {securityConfig.mode === 'blob_slice' && "🧩 Blob 切片：Blob 加载 + 2x2 虚拟切片。安全极高。"}
                  {securityConfig.mode === 'canvas_slice' && "🧩 Canvas 切片：2x2 虚拟切片拼接。加载快且防盗图。"}
                </div>
              </div>

                  {/* 简化后的 Imgproxy 状态说明 */}
                  <div className="space-y-4 p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-black flex items-center gap-2 text-indigo-700">
                          <ShieldCheck className="w-4 h-4" />
                          Imgproxy 简化保护模式 (域名白名单)
                        </Label>
                        <p className="text-[10px] text-muted-foreground">当前已启用简化的 unsafe 处理模式。无需配置复杂的密钥，依靠域名白名单实现防盗链。</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/40 rounded-xl border border-indigo-100">
                      <div className="flex gap-2">
                        <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-[10px] text-indigo-700 font-bold">部署建议：</p>
                          <div className="text-[10px] text-indigo-600/80 leading-relaxed space-y-1">
                            <p>1. <b>服务器环境变量</b>：请确保 Imgproxy 服务器已设置 <code className="bg-indigo-100 px-1 rounded">IMGPROXY_ALLOW_BASIC_URLS=true</code> 以允许处理链接。</p>
                            <p>2. <b>域名白名单</b>：务必设置 <code className="bg-indigo-100 px-1 rounded">IMGPROXY_ALLOWED_ORIGINS</code> 包含本站域名，这是此模式下的核心防盗手段。</p>
                            <p>3. <b>安全提示</b>：在此模式下，依靠域名白名单实现核心防御，建议配合前端 <b>Blob 切片</b> 模式以达到最佳安全效果。</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

              {(securityConfig.mode === 'blob_slice' || securityConfig.mode === 'canvas_slice') && (
                <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">{securityConfig.mode === 'blob_slice' ? '🧩 Blob' : '🧩 Canvas'} 切片模式说明</Label>
                    <p className="text-[10px] text-muted-foreground">
                      通过前端 JS 将图片实时切分为 2x2 网格渲染。用户右键只能获取 1/4 画面，有效防止盗图。
                    </p>
                  </div>
                </div>
              )}

              <Separator className="border-dashed" />

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40 hover:bg-muted/30 transition-all group">
                <div className="space-y-1">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-primary" />
                    WebP 图片优化
                  </Label>
                  <p className="text-[10px] text-muted-foreground group-hover:text-primary/70 transition-colors">
                    根据浏览器支持情况自动压缩并转为 WebP 格式，节省流量并加速加载。
                  </p>
                </div>
                <Switch 
                  checked={securityConfig.enable_webp} 
                  onCheckedChange={(checked) => setSecurityConfig({ ...securityConfig, enable_webp: checked })} 
                />
              </div>



              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-black">智能预加载数量: {securityConfig.prefetch_count || 5}</Label>
                  <span className="text-[10px] text-muted-foreground">控制预先拉取的后续图片数量</span>
                </div>
                <Slider 
                  value={[securityConfig.prefetch_count || 5]} 
                  min={0} 
                  max={20} 
                  step={1} 
                  onValueChange={([val]) => setSecurityConfig({ ...securityConfig, prefetch_count: val })}
                  className="py-2"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveConfig} disabled={saving} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  保存安全配置
                </Button>
              </div>
            </CardContent>
          </Card>


        </TabsContent>

        <TabsContent value="tools" className="mt-6 space-y-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-indigo-500/5">
              <CardTitle className="text-sm font-black flex items-center gap-2 text-indigo-700">
                <ImageIcon className="w-4 h-4" />
                效果预览测试图库
              </CardTitle>
              <CardDescription className="text-[10px]">
                手动添加图片地址（最多5张），用于在“处理规则”选项卡中预览 imgproxy 的实时处理效果。
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="手动输入测试图片 URL (如: https://example.com/image.jpg)" 
                  value={newTestImageUrl}
                  onChange={(e) => setNewTestImageUrl(e.target.value)}
                  className="rounded-xl bg-muted/30 border-none h-11 text-[11px]"
                />
                <Button 
                  size="sm"
                  disabled={!newTestImageUrl}
                  onClick={() => {
                    if (!newTestImageUrl) return;
                    const current = config.preview_test_images || [];
                    if (current.includes(newTestImageUrl)) {
                      toast.info('该图片已在测试库中');
                      return;
                    }
                    if (current.length >= 5) {
                      toast.warning('测试库已满，请先删除旧图片');
                      return;
                    }
                    setConfig({ ...config, preview_test_images: [newTestImageUrl, ...current] });
                    setNewTestImageUrl('');
                    toast.success('已添加到测试库');
                  }}
                  className="rounded-xl h-11 bg-indigo-600 hover:bg-indigo-700 px-6 shrink-0"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  保存地址
                </Button>
              </div>
              
              {(!config.preview_test_images || config.preview_test_images.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border/60">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/30 mb-3" />
                  <span className="text-xs text-muted-foreground font-bold">暂无测试图，请添加图片地址</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {config.preview_test_images.map((url, i) => (
                    <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-border/40 bg-white shadow-sm transition-all hover:ring-2 hover:ring-indigo-500/50">
                      <img referrerPolicy="no-referrer" src={url} className="w-full h-full object-cover" alt={`test-${i}`} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => {
                            const next = config.preview_test_images?.filter((_, idx) => idx !== i);
                            setConfig({ ...config, preview_test_images: next });
                            toast.info('已从测试库移除');
                          }}
                          className="bg-white/20 hover:bg-red-500 backdrop-blur-md text-white rounded-full p-2 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2">
                         <p className="text-[8px] text-white/80 font-black truncate">{url}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="pt-4 border-t border-dashed border-border/60">
            <h3 className="text-sm font-black flex items-center gap-2 mb-4 px-1">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Imgproxy 签名与加密有效性检查
            </h3>
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-muted/20">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase">测试图片地址</Label>
                      <Input 
                        placeholder="输入需要测试的图片原图地址..." 
                        value={validityTestUrl || config.preview_test_images?.[0] || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb'}
                        onChange={(e) => setValidityTestUrl(e.target.value)}
                        className="rounded-xl bg-white h-11 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase">测试处理规则</Label>
                      <Select value={validityTestRule} onValueChange={setValidityTestRule}>
                        <SelectTrigger className="rounded-xl bg-white h-11 text-xs">
                          <SelectValue placeholder="选择规则" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="首瀑">首瀑 (rs:fill:300:400)</SelectItem>
                          <SelectItem value="大图">大图 (rs:fit:1920:1920)</SelectItem>
                          <SelectItem value="预览">预览 (rs:fit:1200:1200)</SelectItem>
                          <SelectItem value="毫秒级优化">毫秒级优化 (rs:fit:1280:1280)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={() => {
                      const url = validityTestUrl || config.preview_test_images?.[0] || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb';
                      const signedUrl = applyImageProcessing(url, config as any, validityTestRule);
                      setValidityResultUrl(signedUrl);
                      toast.success('已生成处理链接');
                    }}
                    className="w-full rounded-xl h-11 bg-green-600 hover:bg-green-700 px-6"
                  >
                    生成处理链接 (Unsafe 模式)
                  </Button>

                  <div className="flex flex-col gap-2">
                    <Label className="text-[11px] font-bold text-muted-foreground uppercase">生成的处理链接</Label>
                    <textarea 
                      value={validityResultUrl}
                      readOnly
                      className="w-full h-24 p-3 rounded-xl bg-zinc-950 text-green-400 font-mono text-[10px] border-none resize-none"
                      placeholder="生成的链接将显示在这里..."
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (validityResultUrl) {
                            navigator.clipboard.writeText(validityResultUrl);
                            toast.success('已复制到剪贴板');
                          }
                        }}
                        className="rounded-xl h-9 text-[10px] flex-1"
                      >
                        复制链接
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (validityResultUrl) window.open(validityResultUrl, '_blank');
                        }}
                        className="rounded-xl h-9 text-[10px] flex-1"
                      >
                        在新窗口打开
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
                    <div className="flex gap-3">
                      <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[11px] text-yellow-700 font-bold">检查步骤：</p>
                        <p className="text-[10px] text-yellow-600 leading-relaxed">
                          1. 点击“在新窗口打开”，如果能看到处理后的图片，说明 Imgproxy 已开启 <code className="bg-yellow-200 px-1 rounded">IMGPROXY_ALLOW_BASIC_URLS=true</code>。<br/>
                          2. 此时源地址使用 Base64 编码，虽然不可读但可轻易解码，核心防御在于 <b>域名白名单 (ALLOWED_ORIGINS)</b>。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="pt-4 border-t border-dashed border-border/60">
            <h3 className="text-sm font-black flex items-center gap-2 mb-4 px-1">
              <Wand2 className="w-4 h-4 text-indigo-500" />
              图片切片工具 (本地引擎)
            </h3>
            <ImageGridSlicer />
          </div>
        </TabsContent>
        
        <TabsContent value="display" className="space-y-4 mt-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-blue-500/5">
              <CardTitle className="flex items-center gap-2 text-primary">
                <ImageIcon className="w-5 h-5" />
                全局缩略图与画质
              </CardTitle>
              <CardDescription>控制全站图片的默认缩略规格与压缩质量</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">默认宽度 (px)</Label>
                  <Input 
                    type="number"
                    placeholder="不限" 
                    value={config.thumbnail_width || ''} 
                    onChange={(e) => setConfig({ ...config, thumbnail_width: parseInt(e.target.value) || undefined })} 
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">默认高度 (px)</Label>
                  <Input 
                    type="number"
                    placeholder="不限" 
                    value={config.thumbnail_height || ''} 
                    onChange={(e) => setConfig({ ...config, thumbnail_height: parseInt(e.target.value) || undefined })} 
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">默认画质 (%)</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      value={[config.thumbnail_quality || 80]} 
                      min={10} 
                      max={100} 
                      step={5} 
                      onValueChange={(val) => setConfig({ ...config, thumbnail_quality: val[0] })}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-8">{config.thumbnail_quality || 80}%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-bold">兼容性处理参数 (thumbnail_params)</Label>
                <Input 
                  placeholder="例如: ?w=300" 
                  value={config.thumbnail_params || ''} 
                  onChange={(e) => setConfig({ ...config, thumbnail_params: e.target.value })} 
                  className="rounded-xl"
                />
                <p className="text-[10px] text-muted-foreground italic">适用于非 imgproxy 模式或特定的第三方加速场景。</p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveConfig} disabled={saving} className="rounded-xl px-8 shadow-lg shadow-primary/20">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  保存缩略配置
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden mt-6">
            <CardHeader className="bg-purple-500/5">
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <ImageIcon className="w-5 h-5" />
                图片水印设置
              </CardTitle>
              <CardDescription>配置图片防盗链水印，支持文字平铺或居中</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">启用图片水印</Label>
                  <p className="text-[10px] text-muted-foreground text-nowrap">开启后，所有在预览时显示的图片将自动添加水印</p>
                </div>
                <Switch 
                  checked={config.watermark_enabled || false} 
                  onCheckedChange={(checked) => setConfig({ ...config, watermark_enabled: checked })} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">水印文字内容</Label>
                  <Input 
                    placeholder="例如: {username} | {digital_id}" 
                    value={config.watermark_text || ''} 
                    onChange={(e) => setConfig({ ...config, watermark_text: e.target.value })} 
                    className="rounded-xl" 
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {shortcodes.map((s) => (
                      <Badge 
                        key={s.id} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[10px] py-0 px-2"
                        onClick={() => {
                          const current = config.watermark_text || '';
                          const separator = current && !current.endsWith(' ') ? ' ' : '';
                          setConfig({ ...config, watermark_text: `${current}${separator}{${s.code}}` });
                        }}
                      >
                        {s.name} ({s.code})
                      </Badge>
                    ))}
                    {/* 内置系统短代码 */}
                    {['username', 'digital_id', 'nickname', 'site_title'].map((code) => (
                      <Badge 
                        key={code} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[10px] py-0 px-2 border-dashed"
                        onClick={() => {
                          const current = config.watermark_text || '';
                          const separator = current && !current.endsWith(' ') ? ' ' : '';
                          setConfig({ ...config, watermark_text: `${current}${separator}{${code}}` });
                        }}
                      >
                        {code === 'username' ? '用户名' : code === 'digital_id' ? 'ID' : code === 'nickname' ? '昵称' : '站点名'}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold">显示位置</Label>
                  <Select 
                    value={config.watermark_position || 'bottom-right'} 
                    onValueChange={(val: any) => setConfig({ ...config, watermark_position: val })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="选择位置" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="top-left">左上角</SelectItem>
                      <SelectItem value="top-right">右上角</SelectItem>
                      <SelectItem value="bottom-left">左下角</SelectItem>
                      <SelectItem value="bottom-right">右下角</SelectItem>
                      <SelectItem value="center">居中</SelectItem>
                      <SelectItem value="tile">全屏铺满 (平铺)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-bold">水印透明度</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      value={[config.watermark_opacity ? config.watermark_opacity * 100 : 50]} 
                      min={0} 
                      max={100} 
                      step={5} 
                      onValueChange={(val) => setConfig({ ...config, watermark_opacity: val[0] / 100 })}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-8">{Math.round((config.watermark_opacity || 0.5) * 100)}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-bold">水印大小 (px)</Label>
                    <Input 
                    type="number"
                    value={config.watermark_size || 20} 
                    onChange={(e) => setConfig({ ...config, watermark_size: parseInt(e.target.value) || 20 })} 
                    className="rounded-xl"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold">排版方式</Label>
                <Select 
                  value={config.watermark_layout || 'single'} 
                  onValueChange={(val: any) => setConfig({ ...config, watermark_layout: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="选择排版方式" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="single">单水印模式 (根据位置显示)</SelectItem>
                    <SelectItem value="grid">网格铺满模式 (强制平铺)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4">

                <Button onClick={handleSaveConfig} disabled={saving} className="rounded-xl px-8 shadow-lg shadow-purple-500/20 bg-purple-600 hover:bg-purple-700">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  保存水印设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains_cache" className="space-y-4 mt-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-orange-500/5">
              <div className="flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-orange-600" />
                <CardTitle>排除域名管理</CardTitle>
              </div>
              <CardDescription>配置不通过代理加速的域名，支持直接输入链接自动提取域名</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    placeholder="输入域名或完整 URL (如 example.com)..." 
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="rounded-xl bg-muted/30 border-none h-11 pl-4 pr-12"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                  />
                </div>
                <Button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddDomain();
                  }} 
                  className="rounded-xl px-6"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  添加记录
                </Button>
              </div>

              <div className="border rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>排除域名</TableHead>
                      <TableHead className="w-[100px]">状态</TableHead>
                      <TableHead className="w-[150px]">添加时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excludeDomains.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">暂无排除域名</TableCell>
                      </TableRow>
                    ) : excludeDomains.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold text-sm font-mono">{item.domain}</TableCell>
                        <TableCell>
                          <Switch 
                            checked={item.is_enabled} 
                            onCheckedChange={() => toggleDomainStatus(item.id, item.is_enabled)}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatBeijingTime(item.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => deleteDomain(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black flex items-center gap-2 text-primary">
                  <Database className="w-4 h-4" />
                  代理加速缓存列表
                </h3>
                <p className="text-[10px] text-muted-foreground">管理存储在代理端与本地数据库中的加速资源索引</p>
              </div>
              <div className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="搜索 Key 或 原始地址..." 
                    className="pl-9 h-9 rounded-xl bg-white border-border/50 text-xs"
                    value={cacheSearch}
                    onChange={(e) => {
                      setCacheSearch(e.target.value);
                      setCachePage(0);
                    }}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleSyncWithWorker} disabled={syncing} className="rounded-xl h-9 text-xs">
                  {syncing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCcw className="w-3 h-3 mr-2" />}
                  同步列表
                </Button>
              </div>
            </div>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[150px] text-xs">Key</TableHead>
                    <TableHead className="text-xs">大小</TableHead>
                    <TableHead className="max-w-[300px] text-xs">原始地址</TableHead>
                    <TableHead className="text-xs">最后访问</TableHead>
                    <TableHead className="text-right text-xs">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : cacheItems.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-xs">暂无缓存记录</TableCell></TableRow>
                  ) : cacheItems.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell className="text-[10px] font-mono font-bold truncate max-w-[150px]" title={item.key}>{item.key}</TableCell>
                      <TableCell className="text-xs">{formatSize(item.size)}</TableCell>
                      <TableCell className="text-[10px] truncate max-w-[300px] text-primary hover:underline">
                        <a href={item.original_url} target="_blank" rel="noreferrer">{item.original_url}</a>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {item.last_accessed_at ? formatBeijingTime(item.last_accessed_at) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteCache(item.key)} className="text-red-500 hover:text-red-600 h-8 w-8">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {cacheTotal > 20 && (
                <div className="p-4 flex items-center justify-between border-t bg-muted/5">
                  <p className="text-xs text-muted-foreground">共 {cacheTotal} 条记录</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs"
                      disabled={cachePage === 0} 
                      onClick={() => setCachePage(p => p - 1)}
                    >
                      上一页
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs"
                      disabled={(cachePage + 1) * 20 >= cacheTotal} 
                      onClick={() => setCachePage(p => p + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingNode?.id ? '编辑加速节点' : '添加加速节点'}</DialogTitle>
            <DialogDescription>配置视频代理节点的详细信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>节点名称</Label>
              <Input 
                value={editingNode?.node_name || ''} 
                onChange={(e) => setEditingNode({ ...editingNode, node_name: e.target.value })}
                placeholder="例如: 香港高级专线"
              />
            </div>
            <div className="space-y-2">
              <Label>节点 URL</Label>
              <Input 
                value={editingNode?.node_url || ''} 
                onChange={(e) => setEditingNode({ ...editingNode, node_url: e.target.value })}
                placeholder="例如: https://hk-proxy.com/?url={url}"
              />
              <p className="text-[10px] text-muted-foreground italic">支持 {'{url}'} 占位符</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>优先级 (越大越优)</Label>
                <Input 
                  type="number"
                  value={editingNode?.priority || 0} 
                  onChange={(e) => setEditingNode({ ...editingNode, priority: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>成本 (元/GB)</Label>
                <Input 
                  type="number"
                  step="0.0001"
                  value={editingNode?.cost_per_gb || 0} 
                  onChange={(e) => setEditingNode({ ...editingNode, cost_per_gb: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNodeDialogOpen(false)}>取消</Button>
            <Button 
              onClick={async () => {
                if (!editingNode?.node_name || !editingNode?.node_url) {
                  toast.error('请填写必要信息');
                  return;
                }
                try {
                  await api.upsertVideoProxyConfig(editingNode);
                  setIsNodeDialogOpen(false);
                  fetchVideoNodes();
                  toast.success('节点已保存');
                } catch (e: any) {
                  toast.error('保存失败: ' + e.message);
                }
              }}
            >
              确认保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 规则预览弹窗 */}
      <Dialog 
        open={previewConfig.isOpen} 
        onOpenChange={(open) => setPreviewConfig(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent className="max-w-4xl w-[95vw] rounded-3xl p-0 overflow-hidden border-none bg-zinc-950 text-white shadow-2xl">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-xl font-black flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  规则效果预览: {previewConfig.ruleLabel}
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-xs font-medium">
                  参数组: <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300 ml-1">{config.image_processing_rules?.[previewConfig.ruleKey] || '未配置'}</code>
                </DialogDescription>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setPreviewConfig(prev => ({ ...prev, isOpen: false }))}
                className="rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" /> 原始图片 (Original)
                </p>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 relative group">
                  {config.preview_test_images?.[currentPreviewImageIndex] ? (
                    <img referrerPolicy="no-referrer" 
                      src={config.preview_test_images[currentPreviewImageIndex]} 
                      className="w-full h-full object-contain"
                      alt="original"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                      <span className="text-xs">暂无测试图</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" /> 处理后 (Processed)
                </p>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 border border-indigo-500/20 relative">
                  {config.preview_test_images?.[currentPreviewImageIndex] ? (
                    <img referrerPolicy="no-referrer" 
                      src={applyImageProcessing(
                        config.preview_test_images[currentPreviewImageIndex], 
                        config as any, 
                        previewConfig.ruleKey
                      )} 
                      className="w-full h-full object-contain"
                      alt="processed"
                      key={`${previewConfig.ruleKey}-${currentPreviewImageIndex}-${config.image_processing_rules?.[previewConfig.ruleKey]}`}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                      <span className="text-xs">请先添加测试图</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-indigo-600 text-[8px] font-bold border-none h-4 px-1.5">
                      {previewConfig.ruleKey}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">切换测试图 (最多5张)</p>
              <div className="flex gap-2">
                {(!config.preview_test_images || config.preview_test_images.length === 0) ? (
                  <p className="text-[10px] text-zinc-600 italic">请在下方配置中添加测试图片地址</p>
                ) : (
                  config.preview_test_images.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPreviewImageIndex(i)}
                      className={cn(
                        "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all",
                        currentPreviewImageIndex === i ? "border-indigo-500 scale-110 shadow-lg shadow-indigo-500/20" : "border-transparent opacity-50 hover:opacity-100"
                      )}
                    >
                      <img referrerPolicy="no-referrer" src={url} className="w-full h-full object-cover" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white/5 p-4 border-t border-white/5">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <Info className="w-3 h-3" />
                <span>实时预览 imgproxy 规则生成的渲染结果</span>
              </div>
              <Button 
                onClick={() => setPreviewConfig(prev => ({ ...prev, isOpen: false }))}
                className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-6 h-9"
              >
                关闭预览
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
