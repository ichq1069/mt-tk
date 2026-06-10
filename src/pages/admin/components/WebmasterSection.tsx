import React, { useState, useEffect } from 'react';
import { cn, formatBeijingTime } from '@/lib/utils';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from "sonner";
import {
  Copy, ExternalLink, Hash, Layout, FileText, Smartphone, Globe, Info, 
  Code, Plus, Trash2, Edit2, Save, X, Search, CheckCircle2, Zap, Loader2,
  AlertCircle, ArrowRightLeft
} from "lucide-react";
import { DataSyncSection } from './DataSyncSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ParsingImportSection } from './ParsingImportSection';

import { useKeywordReplacement } from '@/contexts/KeywordReplacementContext';
import { useConfig } from '@/contexts/ConfigContext';

export function WebmasterSection({ defaultTab = 'paths' }: { defaultTab?: string }) {
  const { config, refreshConfig } = useConfig();
  const { refresh: refreshReplacements } = useKeywordReplacement();
  const [siteUrl, setSiteUrl] = useState('');
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  
  // 短代码相关状态
  const [shortcodes, setShortcodes] = useState<any[]>([]);
  const [loadingShortcodes, setLoadingShortcodes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentShortcode, setCurrentShortcode] = useState<any>({
    key: '',
    value: '',
    description: '',
    is_active: true
  });

  // 关键词替换相关状态
  const [replacements, setReplacements] = useState<any[]>([]);
  const [loadingReplacements, setLoadingReplacements] = useState(false);
  const [isReplacementDialogOpen, setIsReplacementDialogOpen] = useState(false);
  const [currentReplacement, setCurrentReplacement] = useState<any>({
    original_word: '',
    replacement_word: '',
    type: 'system',
    is_active: true
  });

  // 全站资源相关状态
  const [globalAssets, setGlobalAssets] = useState({
    global_head: '',
    statistics_code: '',
    custom_js: '',
    custom_css: ''
  });
  const [loadingGlobalAssets, setLoadingGlobalAssets] = useState(false);
  const [savingGlobalAssets, setSavingGlobalAssets] = useState(false);

  // 统计代码配置向导状态
  const [wizardStep, setWizardStep] = useState(1);
  const [basePixelUrl, setBasePixelUrl] = useState('');
  const [pixelUrlValid, setPixelUrlValid] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedUserFields, setSelectedUserFields] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<Array<{name: string, key: string}>>([]);
  const [respectDNT, setRespectDNT] = useState(true);
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);


  useEffect(() => {
    setSiteUrl(window.location.origin);
    fetchShortcodes();
    fetchReplacements();
    fetchGlobalAssets();
  }, []);

  const fetchGlobalAssets = async () => {
    setLoadingGlobalAssets(true);
    try {
      const { data, error } = await api.getSystemConfig('global_assets');
      if (error) throw error;
      if (data && data.value) {
        setGlobalAssets(data.value);
      }
    } catch (error: any) {
      toast.error('加载全站资源失败: ' + error.message);
    } finally {
      setLoadingGlobalAssets(false);
    }
  };

  const handleSaveGlobalAssets = async () => {
    setSavingGlobalAssets(true);
    try {
      const { error } = await api.updateSystemConfig('global_assets', globalAssets);
      if (error) throw error;
      await refreshConfig();
      toast.success('全站设置已保存并即时生效');
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    } finally {
      setSavingGlobalAssets(false);
    }
  };

  const validatePixelUrl = (url: string) => {
    // 放宽限制，只要不为空即可。支持 URL 或完整的 script 标签。
    const isValid = url.trim().length > 0;
    setPixelUrlValid(isValid);
    if (isValid && wizardStep === 1) {
      setWizardStep(2);
    }
    return isValid;
  };

  const generatePixelCode = () => {
    // 自动识别 basePixelUrl 是否是完整的 script 标签，如果是，尝试提取 src
    let finalUrl = basePixelUrl.trim();
    if (finalUrl.includes('<script') && finalUrl.includes('src=')) {
      const match = finalUrl.match(/src=["']([^"']+)["']/);
      if (match && match[1]) {
        finalUrl = match[1];
      }
    }

    // 1. 处理用户信息与自定义字段 (data-custom-parameters)
    const params: any = {};
    selectedUserFields.forEach(field => {
      params[field] = `{{user.${field}}}`;
    });
    customFields.forEach(cf => {
      params[cf.key] = `{{${cf.key}}}`;
    });

    const hasParams = Object.keys(params).length > 0;
    const paramsAttr = hasParams ? ` data-custom-parameters='${JSON.stringify(params)}'` : '';
    
    // 2. 处理目标跟踪 (data-goals)
    const goalsAttr = selectedGoals.length > 0 ? ` data-goals='${JSON.stringify(selectedGoals)}'` : '';

    // 3. 处理隐私设置 (data-respect-dnt)
    const dntAttr = respectDNT ? ' data-respect-dnt="true"' : '';
    
    // 4. 合并为单个 script 标签 (带 defer, onload, onerror)
    const attrs = [
      'defer',
      `src="${finalUrl}"`,
      paramsAttr.trim(),
      goalsAttr.trim(),
      dntAttr.trim(),
      'onload="console.log(\'统计脚本加载成功，自定义字段/事件已配置\')"',
      'onerror="console.error(\'统计脚本加载失败，请检查IP是否被拦截/域名是否可访问\')"'
    ].filter(Boolean);

    const code = `<script\n  ${attrs.join('\n  ')}\n></script>`;

    setGeneratedCode(code);
    setWizardStep(5);
  };

  const copyGeneratedCode = () => {
    copyToClipboard(generatedCode, '代码已复制到剪贴板！');
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 3000);
  };

  const fetchShortcodes = async () => {
    setLoadingShortcodes(true);
    try {
      const { data, error } = await api.getShortcodes();
      if (error) throw error;
      setShortcodes(data || []);
    } catch (error: any) {
      toast.error('加载短代码失败: ' + error.message);
    } finally {
      setLoadingShortcodes(false);
    }
  };

  const handleSaveShortcode = async () => {
    if (!currentShortcode.key || !currentShortcode.value) {
      toast.error('代码名称和替换值不能为空');
      return;
    }
    
    // 校验 key 格式 (仅限字母、数字、点、下划线)
    if (!/^[a-zA-Z0-9._-]+$/.test(currentShortcode.key)) {
      toast.error('代码名称格式不正确，仅支持字母、数字、点、下划线');
      return;
    }

    try {
      const { error } = await api.upsertShortcode(currentShortcode);
      if (error) throw error;
      toast.success(currentShortcode.id ? '短代码已更新' : '短代码已创建');
      setIsDialogOpen(false);
      fetchShortcodes();
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    }
  };

  const fetchReplacements = async () => {
    setLoadingReplacements(true);
    try {
      const { data, error } = await api.getKeywordReplacements();
      if (error) throw error;
      setReplacements(data || []);
    } catch (error: any) {
      toast.error('加载关键词替换失败: ' + error.message);
    } finally {
      setLoadingReplacements(false);
    }
  };

  const handleSaveReplacement = async () => {
    if (!currentReplacement.original_word || !currentReplacement.replacement_word) {
      toast.error('原词和目标替换词不能为空');
      return;
    }

    try {
      const { error } = await api.upsertKeywordReplacement(currentReplacement);
      if (error) throw error;
      toast.success(currentReplacement.id ? '替换规则已更新' : '替换规则已创建');
      setIsReplacementDialogOpen(false);
      fetchReplacements();
      refreshReplacements();
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    }
  };

  const handleDeleteReplacement = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除这个替换规则吗？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteKeywordReplacement(id);
      if (error) throw error;
      toast.success('替换规则已删除');
      fetchReplacements();
      refreshReplacements();
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };


  const handleDeleteShortcode = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除这个短代码吗？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteShortcode(id);
      if (error) throw error;
      toast.success('短代码已删除');
      fetchShortcodes();
    } catch (error: any) {
      toast.error('删除失败: ' + error.message);
    }
  };

  const copyToClipboard = (text: string, msg = '已复制') => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  const pathGroups = [
    {
      title: "核心页面",
      icon: <Layout className="w-4 h-4" />,
      paths: [
        { name: "首页 / 探索", path: "/" },
        { name: "登录页", path: "/login" },
        { name: "用户个人中心", path: "/profile" },
        { name: "发布作品", path: "/upload" },
        { name: "消息通知", path: "/notifications" },
      ]
    },
    {
      title: "拼接路径与详情页",
      icon: <Hash className="w-4 h-4" />,
      paths: [
        { name: "媒体详情页", path: "/media/:id" },
        { name: "分类详情页", path: "/category/:id" },
        { name: "标签聚合页", path: "/tag/:id" },
        { name: "用户主页 (外部可见)", path: "/u/:id" },
      ]
    },
    {
      title: "功能中心",
      icon: <FileText className="w-4 h-4" />,
      paths: [
        { name: "签到中心", path: "/check-in" },
        { name: "积分明细", path: "/points" },
        { name: "极速整理", path: "/fast-organize" },
        { name: "每日图集", path: "/daily-gallery" },
        { name: "文档管理 / 帮助中心", path: "/guides" },
      ]
    },
    {
      title: "管理后台与文档 (管理员)",
      icon: <Smartphone className="w-4 h-4" />,
      paths: [
        { name: "PC 管理总台", path: "/admin/pc" },
        { name: "API 交互文档 (Swagger)", path: "/api/docs" },
        { name: "移动端审核页", path: "/admin/audit" },
        { name: "移动端用户管理", path: "/admin/users" },
      ]
    }
  ];

  const filteredShortcodes = shortcodes.filter(sc => 
    sc.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sc.description && sc.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const [msOptEnabled, setMsOptEnabled] = useState(false);
  
  useEffect(() => {
    if (config?.ms_optimization_enabled !== undefined) {
      setMsOptEnabled(config.ms_optimization_enabled);
    }
  }, [config?.ms_optimization_enabled]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-foreground">站长工具</h1>
            <p className="text-muted-foreground mt-1">管理全站路径信息与动态短代码配置</p>
          </div>
          
          <TabsList className="bg-muted/50 p-1 rounded-2xl flex flex-wrap md:grid md:grid-cols-4 lg:grid-cols-8 w-full md:w-auto h-auto">
            <TabsTrigger value="paths" className="rounded-xl px-4 text-xs flex-1 md:flex-none">路径管理</TabsTrigger>
            <TabsTrigger value="shortcodes" className="rounded-xl px-4 text-xs flex-1 md:flex-none">短代码</TabsTrigger>
            <TabsTrigger value="replacements" className="rounded-xl px-4 text-xs flex-1 md:flex-none">替换</TabsTrigger>
            <TabsTrigger value="global_assets" className="rounded-xl px-4 text-xs flex-1 md:flex-none">全站资源</TabsTrigger>
            <TabsTrigger value="pixel_config" className="rounded-xl px-4 text-xs flex-1 md:flex-none">代码工具</TabsTrigger>
            <TabsTrigger value="performance" className="rounded-xl px-4 text-xs flex-1 md:flex-none font-bold text-orange-600">性能优化</TabsTrigger>
            <TabsTrigger value="parse_import" className="rounded-xl px-4 text-xs flex-1 md:flex-none">解析导入</TabsTrigger>
            <TabsTrigger value="data_sync" className="rounded-xl px-4 text-xs flex-1 md:flex-none">配置同步</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="paths" className="mt-0">
          <div className="mb-6 p-4 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-orange-500" />
              <p className="text-sm font-black text-orange-600">新功能上线：一键毫秒级加载优化，极致提升弱网体验</p>
            </div>
            <Button size="sm" variant="outline" className="rounded-full border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white" onClick={() => setActiveTab('performance')}>立即查看</Button>
          </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {pathGroups.map((group, idx) => (
              <Card key={idx} className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
                <CardHeader className="bg-muted/30 border-b border-border/40">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    {group.icon}
                    {group.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  {group.paths.map((p, pIdx) => (
                    <div key={pIdx} className="group p-3 bg-muted/20 rounded-2xl border border-border/40 hover:bg-muted/40 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground/70">{p.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg"
                            onClick={() => copyToClipboard(p.path, '相对路径已复制')}
                            title="复制相对路径"
                          >
                            <Hash className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg text-primary"
                            onClick={() => copyToClipboard(`${siteUrl}${p.path}`, '完整链接已复制')}
                            title="复制完整链接"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" asChild>
                            <a href={p.path} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        </div>
                      </div>
                      <code className="text-[10px] font-mono bg-card px-2 py-1 rounded-md border border-border/40 block break-all">
                        {p.path}
                      </code>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-primary/5 border border-primary/10">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  路径使用规范
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-4">
                <div className="p-3 bg-card/50 rounded-2xl border border-border/40">
                  <span className="font-black text-foreground block mb-1 uppercase tracking-wider text-[10px]">1. 相对路径</span>
                  <p>用于系统内部跳转，如“底部导航栏”或“侧边栏”设置。使用相对路径可确保在域名更换时链接依然有效。</p>
                </div>
                <div className="p-3 bg-card/50 rounded-2xl border border-border/40">
                  <span className="font-black text-foreground block mb-1 uppercase tracking-wider text-[10px]">2. 完整链接</span>
                  <p>用于外部分享（如微信、小红书推广）或发送邮件/通知中的跳转。包含协议头和域名。</p>
                </div>
                <div className="p-3 bg-card/50 rounded-2xl border border-border/40">
                  <span className="font-black text-foreground block mb-1 uppercase tracking-wider text-[10px]">3. 参数替换</span>
                  <p>带有 <code className="text-primary font-bold">:id</code> 的路径表示需要替换为真实的 ID。例如 <code className="text-primary">/media/123</code>。</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-orange-500/5 border border-orange-500/10">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  快捷技巧
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-3">
                <p>点击路径旁边的 <Hash className="w-3 h-3 inline" /> 复制相对路径。</p>
                <p>点击路径旁边的 <Copy className="w-3 h-3 inline" /> 复制包含域名的完整 URL。</p>
                <p>所有管理后台页面建议仅对管理员开放，请谨慎分享链接。</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="shortcodes" className="mt-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="搜索短代码名称或描述..." 
              className="pl-10 rounded-2xl bg-muted/30 border-none h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            className="rounded-2xl h-11 px-6 font-bold shadow-lg shadow-primary/20"
            onClick={() => {
              setCurrentShortcode({ key: '', value: '', description: '', is_active: true });
              setIsDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> 新增短代码
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShortcodes.map((sc) => (
            <Card key={sc.id} className="border-none shadow-sm rounded-3xl overflow-hidden bg-card border border-border/40 hover:border-primary/30 transition-all group">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={sc.category === 'system' ? 'default' : 'secondary'} className="rounded-lg text-[10px] uppercase font-black px-1.5 py-0">
                      {sc.category === 'system' ? '系统' : '自定义'}
                    </Badge>
                    {!sc.is_active && (
                      <Badge variant="outline" className="rounded-lg text-[10px] border-red-500 text-red-500 font-bold px-1.5 py-0">已禁用</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-black text-foreground">
                    {"{{"}{sc.key}{"}}"}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl"
                    onClick={() => copyToClipboard("{{" + sc.key + "}}", '短代码已复制到剪贴板')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl text-primary"
                    onClick={() => {
                      setCurrentShortcode(sc);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  {sc.category !== 'system' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-xl text-destructive"
                      onClick={() => handleDeleteShortcode(sc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1 block">替换值为</Label>
                  <div className="bg-muted/30 p-2 rounded-xl border border-border/40 text-xs font-mono break-all line-clamp-2 min-h-[3rem]">
                    {sc.value}
                  </div>
                </div>
                {sc.description && (
                  <p className="text-xs text-muted-foreground italic">“{sc.description}”</p>
                )}
              </CardContent>
              <CardFooter className="pt-0 pb-4 flex justify-between items-center text-[10px] text-muted-foreground">
                <span>更新于 {formatBeijingTime(sc.updated_at)}</span>
                {sc.category === 'system' && <span className="flex items-center gap-1 text-primary/70"><CheckCircle2 className="w-3 h-3" /> 内置规则</span>}
              </CardFooter>
            </Card>
          ))}
          
          {filteredShortcodes.length === 0 && (
            <div className="col-span-full py-20 text-center bg-muted/20 rounded-3xl border border-dashed border-border/60">
              <Code className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-muted-foreground">未找到短代码</h3>
              <p className="text-sm text-muted-foreground/60">尝试更换搜索词或创建一个新的短代码</p>
            </div>
          )}
        </div>
      </TabsContent>

      {/* 新增/编辑短代码弹窗 */}

      <TabsContent value="replacements" className="mt-0 focus-visible:outline-none">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-2xl border border-border/40 w-full md:flex-1">
            <div className="flex items-center gap-2 font-bold text-foreground mb-1">
              <Info className="w-4 h-4 text-primary" />
              替换规则说明
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li><span className="font-bold text-blue-500">系统词库替换</span>：仅对系统固定输出（如“成长值”等）生效。</li>
              <li><span className="font-bold text-orange-500">用户内容替换</span>：对用户发表的评论、简介等内容生效。</li>
            </ul>
          </div>
          <Button 
            className="rounded-2xl h-11 px-6 font-bold shadow-lg shadow-primary/20 w-full md:w-auto"
            onClick={() => {
              setCurrentReplacement({ original_word: '', replacement_word: '', type: 'system', is_active: true });
              setIsReplacementDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> 新增规则
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {replacements.map((rule) => (
            <Card key={rule.id} className="border-none shadow-sm rounded-3xl overflow-hidden bg-card border border-border/40 hover:border-primary/30 transition-all group">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.type === 'system' ? 'default' : 'secondary'} className={cn(
                      "rounded-lg text-[10px] uppercase font-black px-1.5 py-0",
                      rule.type === 'system' ? "bg-blue-500 hover:bg-blue-600" : "bg-orange-500 hover:bg-orange-600 text-white"
                    )}>
                      {rule.type === 'system' ? '系统词库' : '用户内容'}
                    </Badge>
                    {!rule.is_active && (
                      <Badge variant="outline" className="rounded-lg text-[10px] border-red-500 text-red-500 font-bold px-1.5 py-0">已禁用</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-black text-foreground flex items-center gap-2">
                    <span className="truncate max-w-[100px] font-mono">{rule.original_word}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-primary truncate max-w-[100px] font-mono">{rule.replacement_word}</span>
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl text-primary"
                    onClick={() => {
                      setCurrentReplacement(rule);
                      setIsReplacementDialogOpen(true);
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-xl text-destructive"
                    onClick={() => handleDeleteReplacement(rule.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardFooter className="bg-muted/30 py-2 px-6 flex justify-between">
                 <span className="text-[10px] text-muted-foreground">创建时间: {formatBeijingTime(rule.created_at)}</span>
                 <Switch 
                   checked={rule.is_active} 
                   onCheckedChange={async (val) => {
                     const { error } = await api.upsertKeywordReplacement({ ...rule, is_active: val });
                     if (!error) {
                       fetchReplacements();
                       refreshReplacements();
                     }
                   }}
                 />
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {replacements.length === 0 && !loadingReplacements && (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-3xl border border-dashed border-border/60">
            <Search className="w-12 h-12 mb-2 opacity-20" />
            <p>暂无关键词替换规则</p>
          </div>
        )}
      </TabsContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md border-none shadow-2xl overflow-hidden p-0">
          <DialogHeader className="p-6 bg-primary/5 border-b border-border/40">
            <DialogTitle className="text-xl font-black">{currentShortcode.id ? '编辑短代码' : '新增自定义短代码'}</DialogTitle>
            <DialogDescription>
              设置一个唯一的键名，在配置中通过 {"{{"}键名{"}}"} 进行动态替换。
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold">短代码键名 (Key)</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-black">{"{{"}</span>
                <Input 
                  placeholder="如 site.motto" 
                  value={currentShortcode.key}
                  onChange={(e) => setCurrentShortcode({...currentShortcode, key: e.target.value})}
                  disabled={currentShortcode.category === 'system'}
                  className="rounded-xl bg-muted/30 border-none h-11"
                />
                <span className="text-muted-foreground font-black">{"}}"}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">仅支持字母、数字、点、下划线，用于识别标记。</p>
            </div>

            <div className="space-y-2">
              <Label className="font-bold">替换内容 (Value)</Label>
              <Textarea 
                placeholder="在此输入短代码将被替换成的真实内容..." 
                value={currentShortcode.value}
                onChange={(e) => setCurrentShortcode({...currentShortcode, value: e.target.value})}
                className="rounded-2xl bg-muted/30 border-none min-h-[100px] focus-visible:ring-1"
                disabled={currentShortcode.category === 'system' && currentShortcode.key.startsWith('user.')}
              />
              {currentShortcode.category === 'system' && (
                <p className="text-[10px] text-primary italic font-bold">系统内置代码由程序动态解析，此处仅为示例显示。</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="font-bold">用途描述 (可选)</Label>
              <Input 
                placeholder="简短描述该代码的用途..." 
                value={currentShortcode.description || ''}
                onChange={(e) => setCurrentShortcode({...currentShortcode, description: e.target.value})}
                className="rounded-xl bg-muted/30 border-none h-11"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
              <div className="space-y-0.5">
                <Label className="font-bold">启用状态</Label>
                <p className="text-[10px] text-muted-foreground italic">禁用后，解析器将不再替换该代码</p>
              </div>
              <Switch 
                checked={currentShortcode.is_active}
                onCheckedChange={(checked) => setCurrentShortcode({...currentShortcode, is_active: checked})}
              />

        {/* 关键词替换规则编辑弹窗 */}
        <Dialog open={isReplacementDialogOpen} onOpenChange={setIsReplacementDialogOpen}>
          <DialogContent className="rounded-3xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">
                {currentReplacement.id ? '编辑替换规则' : '新增替换规则'}
              </DialogTitle>
              <DialogDescription>
                配置全局关键词自动替换规则。
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="font-bold">规则类型</Label>
                <Select 
                  value={currentReplacement.type} 
                  onValueChange={(val: string) => setCurrentReplacement({ ...currentReplacement, type: val })}
                >
                  <SelectTrigger className="rounded-xl h-11 border-none bg-muted/30 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="system">系统词库替换 (仅限程序输出)</SelectItem>
                    <SelectItem value="user">用户内容替换 (评论、简介等)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">原词 (Original)</Label>
                <Input 
                  placeholder="请输入需要被替换的关键词" 
                  className="rounded-xl h-11 bg-muted/30 border-none"
                  value={currentReplacement.original_word}
                  onChange={(e) => setCurrentReplacement({ ...currentReplacement, original_word: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold">目标替换词 (Replacement)</Label>
                <Input 
                  placeholder="请输入替换后的词汇" 
                  className="rounded-xl h-11 bg-muted/30 border-none"
                  value={currentReplacement.replacement_word}
                  onChange={(e) => setCurrentReplacement({ ...currentReplacement, replacement_word: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">是否启用</Label>
                  <p className="text-[10px] text-muted-foreground italic">禁用后该规则将不再生效</p>
                </div>
                <Switch 
                  checked={currentReplacement.is_active} 
                  onCheckedChange={(val) => setCurrentReplacement({ ...currentReplacement, is_active: val })} 
                />
              </div>
            </div>
            <DialogFooter className="p-6 bg-muted/30 rounded-b-3xl">
              <Button variant="ghost" onClick={() => setIsReplacementDialogOpen(false)} className="rounded-xl">取消</Button>
              <Button onClick={handleSaveReplacement} className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20">保存规则</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/5 border-t border-border/40 gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl flex-1 h-12">取消</Button>
            <Button onClick={handleSaveShortcode} className="rounded-xl flex-[2] h-12 font-bold shadow-lg shadow-primary/20">
              <Save className="w-4 h-4 mr-2" /> 保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 关键词替换规则编辑弹窗 */}
      <Dialog open={isReplacementDialogOpen} onOpenChange={setIsReplacementDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-primary/5 border-b border-border/40 text-left">
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              {currentReplacement.id ? '编辑替换规则' : '新增替换规则'}
            </DialogTitle>
            <DialogDescription>
              配置全局关键词自动替换规则。
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="font-bold">规则类型</Label>
              <Select 
                value={currentReplacement.type} 
                onValueChange={(val: string) => setCurrentReplacement({ ...currentReplacement, type: val })}
              >
                <SelectTrigger className="rounded-xl h-11 border-none bg-muted/30 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="system">系统词库替换 (仅限程序输出)</SelectItem>
                  <SelectItem value="user">用户内容替换 (评论、简介等)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-sm">原词 (Original)</Label>
              <Input 
                placeholder="请输入需要被替换的关键词" 
                className="rounded-xl h-11 bg-muted/30 border-none"
                value={currentReplacement.original_word}
                onChange={(e) => setCurrentReplacement({ ...currentReplacement, original_word: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-sm">目标替换词 (Replacement)</Label>
              <Input 
                placeholder="请输入替换后的词汇" 
                className="rounded-xl h-11 bg-muted/30 border-none"
                value={currentReplacement.replacement_word}
                onChange={(e) => setCurrentReplacement({ ...currentReplacement, replacement_word: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">是否启用</Label>
                <p className="text-[10px] text-muted-foreground italic">禁用后该规则将不再生效</p>
              </div>
              <Switch 
                checked={currentReplacement.is_active} 
                onCheckedChange={(val) => setCurrentReplacement({ ...currentReplacement, is_active: val })} 
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-muted/30 rounded-b-3xl flex flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsReplacementDialogOpen(false)} className="rounded-xl flex-1 h-12">取消</Button>
            <Button onClick={handleSaveReplacement} className="rounded-xl flex-[2] h-12 font-bold shadow-lg shadow-primary/20">保存规则</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TabsContent value="global_assets" className="mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
              <CardHeader className="bg-muted/30 border-b border-border/40">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Code className="w-5 h-5 text-primary" />
                  统计代码与自定义脚本
                </CardTitle>
                <CardDescription>在应用全局注入自定义代码，用于统计分析或样式调整</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-black">全局 Head 代码</Label>
                    <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0 h-5 border-orange-500/20 text-orange-500 bg-orange-500/5">Header</Badge>
                  </div>
                  <Textarea 
                    placeholder="在此输入需要插入到 <head> 标签中的代码（如验证标签、Meta 标签等）..." 
                    className="min-h-[120px] rounded-2xl bg-muted/20 border-none font-mono text-sm leading-relaxed p-4 resize-y"
                    value={globalAssets.global_head}
                    onChange={(e) => setGlobalAssets({ ...globalAssets, global_head: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
                    <Info className="w-3.5 h-3.5" />
                    代码将原样注入到页面 <code className="text-primary font-bold">{"<head>"}</code> 中。
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-black">第三方统计代码</Label>
                    <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0 h-5 border-primary/20 text-primary bg-primary/5">支持 HTML/Script</Badge>
                  </div>
                  <Textarea 
                    placeholder="在此输入第三方统计代码（如百度统计、Google Analytics 的完整 <script> 标签）..." 
                    className="min-h-[150px] rounded-2xl bg-muted/20 border-none font-mono text-sm leading-relaxed p-4 resize-y"
                    value={globalAssets.statistics_code}
                    onChange={(e) => setGlobalAssets({ ...globalAssets, statistics_code: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
                    <Info className="w-3.5 h-3.5" />
                    统计代码通常包含 <code className="text-primary font-bold">{"<script>"}</code> 标签，请完整复制粘贴。
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-black">自定义 JavaScript</Label>
                    <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0 h-5 border-blue-500/20 text-blue-500 bg-blue-500/5">Raw JS</Badge>
                  </div>
                  <Textarea 
                    placeholder="在此输入原始 JavaScript 代码（无需 <script> 标签）..." 
                    className="min-h-[150px] rounded-2xl bg-muted/20 border-none font-mono text-sm leading-relaxed p-4 resize-y"
                    value={globalAssets.custom_js}
                    onChange={(e) => setGlobalAssets({ ...globalAssets, custom_js: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
                    <Info className="w-3.5 h-3.5" />
                    此处填写的代码将直接执行，无需手动添加 <code className="text-primary font-bold">{"<script>"}</code>。
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-black">自定义 CSS 样式</Label>
                    <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0 h-5 border-pink-500/20 text-pink-500 bg-pink-500/5">Raw CSS</Badge>
                  </div>
                  <Textarea 
                    placeholder="在此输入原始 CSS 代码（无需 <style> 标签）..." 
                    className="min-h-[150px] rounded-2xl bg-muted/20 border-none font-mono text-sm leading-relaxed p-4 resize-y"
                    value={globalAssets.custom_css}
                    onChange={(e) => setGlobalAssets({ ...globalAssets, custom_css: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
                    <Info className="w-3.5 h-3.5" />
                    此处填写的样式将全局生效，无需手动添加 <code className="text-primary font-bold">{"<style>"}</code>。
                  </p>
                </div>
              </CardContent>
              <CardFooter className="p-8 bg-muted/30 border-t border-border/40">
                <Button 
                  onClick={handleSaveGlobalAssets} 
                  disabled={savingGlobalAssets}
                  className="w-full md:w-auto min-w-[160px] rounded-2xl h-12 font-black shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {savingGlobalAssets ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      正在保存配置...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存全站资源设置
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-primary/5 border border-primary/10">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  注意事项
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-4">
                <div className="p-3 bg-card/50 rounded-2xl border border-border/40">
                  <span className="font-black text-foreground block mb-1 uppercase tracking-wider text-[10px] text-red-500">安全警告</span>
                  <p>错误的代码可能导致页面白屏或功能异常，请在确认代码无误后再保存。</p>
                </div>
                <div className="p-3 bg-card/50 rounded-2xl border border-border/40">
                  <span className="font-black text-foreground block mb-1 uppercase tracking-wider text-[10px]">生效范围</span>
                  <p>此处填写的代码将应用于整个 Web 端应用，对移动端 H5 和 PC 端管理后台均生效。</p>
                </div>
                <div className="p-3 bg-card/50 rounded-2xl border border-border/40">
                  <span className="font-black text-foreground block mb-1 uppercase tracking-wider text-[10px]">生效时机</span>
                  <p>保存后，普通用户再次访问页面时会自动加载最新配置。已打开的页面需手动刷新生效。</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="pixel_config" className="mt-0">
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
          <div className="text-center space-y-2 mb-10">
            <h1 className="text-4xl font-black text-foreground tracking-tight">统计代码配置工具</h1>
            <p className="text-muted-foreground text-lg">3步搞定，不用懂代码</p>
          </div>

          {/* 步骤1: 输入代码 */}
          <Card className={cn(
            "border-none shadow-xl rounded-3xl overflow-hidden transition-all duration-500",
            wizardStep === 1 ? "ring-4 ring-primary/20 scale-100" : "opacity-50 grayscale scale-95 pointer-events-none"
          )}>
            <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-xl">1</div>
                <div>
                  <CardTitle className="text-xl font-black">粘贴统计代码</CardTitle>
                  <CardDescription>只需输入你的统计链接即可</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-bold">统计代码链接</Label>
                <Input 
                  placeholder="粘贴你的统计代码（如：https://tjfx.dhso.top/pixel/12345678910111213）"
                  value={basePixelUrl}
                  onChange={(e) => setBasePixelUrl(e.target.value)}
                  className="h-14 rounded-2xl bg-muted/30 border-none text-base px-6 focus-visible:ring-primary"
                />
                {!pixelUrlValid && basePixelUrl && (
                  <p className="text-red-500 text-sm font-bold flex items-center gap-1 mt-2">
                    <AlertCircle className="w-4 h-4" />
                    代码格式不对哦！请检查是否以 https://tjfx.dhso.top/pixel/ 开头
                  </p>
                )}
              </div>
              <Button 
                onClick={() => validatePixelUrl(basePixelUrl)} 
                className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                检测代码并进行下一步
              </Button>
            </CardContent>
          </Card>

          {/* 步骤2: 目标跟踪 */}
          <Card className={cn(
            "border-none shadow-xl rounded-3xl overflow-hidden transition-all duration-500",
            wizardStep === 2 ? "ring-4 ring-primary/20 scale-100" : wizardStep < 2 ? "opacity-0 translate-y-10" : "opacity-50 grayscale scale-95 pointer-events-none"
          )}>
            <CardHeader className="bg-blue-500/5 p-8 border-b border-blue-500/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-xl">2</div>
                <div>
                  <CardTitle className="text-xl font-black">配置目标跟踪</CardTitle>
                  <CardDescription>勾选你想统计的用户行为</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'home_view', label: '探索首页' },
                  { id: 'favorite', label: '作品收藏' },
                  { id: 'check_in', label: '每日签到' },
                  { id: 'upload_view', label: '发布作品页' },
                  { id: 'profile_view', label: '个人中心' },
                  { id: 'button_click', label: '按钮点击' },
                  { id: 'external_link', label: '外部链接点击' },
                  { id: 'file_download', label: '文件下载' }
                ].map(goal => (
                  <div 
                    key={goal.id} 
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                      selectedGoals.includes(goal.id) ? "border-blue-500 bg-blue-500/5 shadow-inner" : "border-border/40 hover:border-blue-500/30"
                    )}
                    onClick={() => {
                      if (selectedGoals.includes(goal.id)) {
                        setSelectedGoals(selectedGoals.filter(g => g !== goal.id));
                      } else {
                        setSelectedGoals([...selectedGoals, goal.id]);
                      }
                    }}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                      selectedGoals.includes(goal.id) ? "bg-blue-500 text-white" : "bg-muted"
                    )}>
                      {selectedGoals.includes(goal.id) && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <span className="font-bold text-lg">{goal.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-muted/30 rounded-2xl">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  配置完成后，勾选的行为会自动统计，无需理解代码
                </p>
              </div>
              <Button 
                onClick={() => setWizardStep(3)} 
                className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-blue-500/20 bg-blue-500 hover:bg-blue-600 mt-8"
              >
                下一步：配置用户信息
              </Button>
            </CardContent>
          </Card>

          {/* 步骤3: 用户信息 */}
          <Card className={cn(
            "border-none shadow-xl rounded-3xl overflow-hidden transition-all duration-500",
            wizardStep === 3 ? "ring-4 ring-primary/20 scale-100" : wizardStep < 3 ? "opacity-0 translate-y-10" : "opacity-50 grayscale scale-95 pointer-events-none"
          )}>
            <CardHeader className="bg-purple-500/5 p-8 border-b border-purple-500/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-black text-xl">3</div>
                <div>
                  <CardTitle className="text-xl font-black">配置用户信息</CardTitle>
                  <CardDescription>将当前用户信息自动关联到统计中</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'name', label: '用户昵称' },
                  { id: 'id', label: '用户ID' },
                  { id: 'email', label: '用户邮箱' },
                  { id: 'mobile', label: '手机号' },
                  { id: 'digital_id', label: '数字ID' }
                ].map(field => (
                  <div 
                    key={field.id} 
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                      selectedUserFields.includes(field.id) ? "border-purple-500 bg-purple-500/5 shadow-inner" : "border-border/40 hover:border-purple-500/30"
                    )}
                    onClick={() => {
                      if (selectedUserFields.includes(field.id)) {
                        setSelectedUserFields(selectedUserFields.filter(f => f !== field.id));
                      } else {
                        setSelectedUserFields([...selectedUserFields, field.id]);
                      }
                    }}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center transition-colors",
                      selectedUserFields.includes(field.id) ? "bg-purple-500 text-white" : "bg-muted"
                    )}>
                      {selectedUserFields.includes(field.id) && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <span className="font-bold text-lg">{field.label}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-black">自定义字段</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-purple-600 font-bold"
                    onClick={() => {
                      const name = prompt('输入字段名称（如：订单ID）');
                      if (name) {
                        setCustomFields([...customFields, { name, key: `field_${Date.now()}` }]);
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" /> 添加自定义字段
                  </Button>
                </div>
                {customFields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customFields.map((cf, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-dashed border-purple-500/30">
                        <span className="font-bold text-sm text-purple-700">{cf.name}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-400"
                          onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={() => setWizardStep(4)} 
                className="w-full h-14 rounded-2xl text-lg font-black shadow-lg shadow-purple-500/20 bg-purple-500 hover:bg-purple-600 mt-4"
              >
                下一步：隐私设置
              </Button>
            </CardContent>
          </Card>

          {/* 步骤4: 隐私设置 */}
          <Card className={cn(
            "border-none shadow-xl rounded-3xl overflow-hidden transition-all duration-500",
            wizardStep === 4 ? "ring-4 ring-primary/20 scale-100" : wizardStep < 4 ? "opacity-0 translate-y-10" : "opacity-50 grayscale scale-95 pointer-events-none"
          )}>
            <CardHeader className="bg-green-500/5 p-8 border-b border-green-500/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-black text-xl">4</div>
                <div>
                  <CardTitle className="text-xl font-black">隐私偏好配置</CardTitle>
                  <CardDescription>符合浏览器隐私保护标准</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center justify-between p-6 bg-muted/20 rounded-3xl border border-border/40">
                <div className="space-y-1">
                  <h4 className="font-bold text-lg">尊重“请勿跟踪”设置</h4>
                  <p className="text-sm text-muted-foreground italic">浏览器开启隐私模式时停止跟踪</p>
                </div>
                <Switch 
                  checked={respectDNT} 
                  onCheckedChange={setRespectDNT}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>

              <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                <h4 className="text-sm font-bold text-orange-600 mb-1">退出跟踪说明</h4>
                <p className="text-xs text-orange-700/70">用户可通过网址后加 ?pixel_optout=true 停止被跟踪</p>
              </div>

              <Button 
                onClick={generatePixelCode} 
                className="w-full h-16 rounded-2xl text-xl font-black shadow-xl shadow-green-500/20 bg-green-600 hover:bg-green-700 mt-4"
              >
                生成最终统计代码
              </Button>
            </CardContent>
          </Card>

          {/* 结果显示 */}
          {wizardStep === 5 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700 fill-mode-both">
              <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-card/80 backdrop-blur-xl border border-primary/20">
                <CardHeader className="p-10 text-center space-y-2">
                  <div className="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-500/30">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <CardTitle className="text-3xl font-black">配置完成！</CardTitle>
                  <CardDescription className="text-lg">代码已准备就绪，复制到你的网站即可使用</CardDescription>
                </CardHeader>
                <CardContent className="px-10 pb-10 space-y-6">
                  <div className="relative group">
                    <pre className="bg-muted p-8 rounded-3xl font-mono text-sm overflow-x-auto border-2 border-border/40 text-foreground/80 leading-relaxed min-h-[200px]">
                      {generatedCode}
                    </pre>
                    <div className="absolute inset-0 bg-gradient-to-t from-muted via-transparent to-transparent pointer-events-none opacity-20" />
                  </div>

                  <div className="flex flex-col gap-4">
                    <Button 
                      onClick={copyGeneratedCode} 
                      className={cn(
                        "w-full h-20 rounded-[2rem] text-2xl font-black transition-all transform active:scale-95 shadow-2xl",
                        codeCopied ? "bg-green-500 hover:bg-green-600" : "bg-primary hover:bg-primary/90"
                      )}
                    >
                      {codeCopied ? (
                        <>
                          <CheckCircle2 className="w-8 h-8 mr-3" />
                          已复制成功！
                        </>
                      ) : (
                        <>
                          <Copy className="w-8 h-8 mr-3" />
                          复制代码
                        </>
                      )}
                    </Button>
                    <p className="text-center text-muted-foreground text-sm font-medium">
                      所有配置已生效，无需额外操作
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setWizardStep(1)} 
                  className="text-muted-foreground hover:text-foreground font-bold rounded-2xl"
                >
                  重新配置
                </Button>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="performance" className="mt-0">
        <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-background/50 backdrop-blur-sm">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black">性能优化</CardTitle>
                <CardDescription>针对移动端弱网环境进行的毫秒级加载优化</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-6">
            <div className="flex items-center justify-between p-6 rounded-3xl border-2 border-orange-500/10 bg-orange-500/5">
              <div className="space-y-1">
                <Label className="text-lg font-bold">毫秒级优化 (Ms-Optimization)</Label>
                <p className="text-sm text-muted-foreground">开启后，系统将强制优化大图加载参数，确保首屏及列表加载速度尽量低于 1000ms。</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
                    推荐开启
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                    WebP 强制转换
                  </Badge>
                </div>
              </div>
              <Switch 
                checked={msOptEnabled}
                onCheckedChange={async (val) => {
                  setMsOptEnabled(val); // 立即更新 UI
                  try {
                    await api.upsertStorageConfig({
                      ...config,
                      ms_optimization_enabled: val
                    });
                    toast.success(val ? "已开启毫秒级优化" : "已关闭毫秒级优化");
                    await refreshConfig();
                  } catch (error) {
                    setMsOptEnabled(!val); // 失败时回滚
                    toast.error("操作失败");
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border/40 bg-muted/30 rounded-2xl overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Hash className="w-4 h-4 text-orange-500" />
                    优化规则详情
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-xs space-y-2 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>最大宽度:</span>
                      <span className="font-mono text-foreground">1280px</span>
                    </div>
                    <div className="flex justify-between">
                      <span>质量压缩:</span>
                      <span className="font-mono text-foreground">70%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>输出格式:</span>
                      <span className="font-mono text-foreground">webp</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40 bg-muted/30 rounded-2xl overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    生效范围
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <li>全站瀑布流列表 (Waterfall)</li>
                    <li>详情页大图预览 (Large Preview)</li>
                    <li>所有未指定处理规则的原始链接</li>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 p-6 flex justify-between items-center">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              开启此项可能会略微降低高分屏下的图片清晰度，但能显著提升响应速度。
            </div>
          </CardFooter>
        </Card>
      </TabsContent>


        <TabsContent value="parse_import" className="mt-0">
          <ParsingImportSection />
        </TabsContent>

        <TabsContent value="data_sync" className="mt-0">
          <DataSyncSection />
        </TabsContent>

    </Tabs>
  </div>
);
}
export default WebmasterSection;
