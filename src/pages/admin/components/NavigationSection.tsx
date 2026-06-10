import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from "sonner";
import { Badge } from '@/components/ui/badge';
import { 
  Home, Tag, CirclePlus, Zap, User, Search, Settings, 
  MessageSquare, Heart, Loader2, Save, Trash2, 
  Plus, LayoutGrid, Smartphone, Palette, MousePointer2 
} from "lucide-react";
import * as Icons from "lucide-react";
import type { StorageConfig } from '@/types';

const AVAILABLE_PATHS = [
  { label: "首页 / 探索", value: "/" },
  { label: "标签云", value: "/tags" },
  { label: "每日图集", value: "/daily-gallery" },
  { label: "随机美图", value: "/refresh-image" },
  { label: "文档中心 (使用手册)", value: "/usage-guide" },
  { label: "登录页", value: "/login" },
  { label: "用户个人中心", value: "/profile" },
  { label: "发布作品", value: "/upload" },
  { label: "消息通知", value: "/notifications" },
  { label: "媒体详情页 (需拼接ID)", value: "/media/" },
  { label: "分类详情页 (需拼接ID)", value: "/category/" },
  { label: "标签聚合页 (需拼接ID)", value: "/tag/" },
  { label: "图集写真", value: "/albums" },
  { label: "我的勋章", value: "/badges" },
  { label: "签到中心", value: "/check-in" },
  { label: "积分明细", value: "/points" },
  { label: "极速整理", value: "/fast-organize" },
  { label: "PC 管理总台", value: "/admin/pc" },
  { label: "移动端审核页", value: "/admin/audit" },
  { label: "移动端用户管理", value: "/admin/users" },
];

const LUCIDE_ICONS = [
  'Home', 'Tag', 'CirclePlus', 'Zap', 'User', 'Search', 'Settings', 
  'MessageSquare', 'Heart', 'LayoutGrid', 'Grid', 'Compass',
  'SquarePlus', 'Upload', 'FolderHeart', 'ShieldCheck', 'Users', 'Library', 'Bell'
];

export function NavigationSection() {
  const [config, setConfig] = useState<Partial<StorageConfig>>({});
  const [navType, setNavType] = useState<'user' | 'admin'>('user');
  const [userNav, setUserNav] = useState<any>({
    style: 'standard',
    items: [
      { id: 'home', label: '首页', icon: 'Home', path: '/' },
      { id: 'discovery', label: '发现', icon: 'Compass', path: '/discovery' },
      { id: 'upload', label: '上传', icon: 'Upload', path: '/upload', is_special: true },
      { id: 'albums', label: '写真', icon: 'FolderHeart', path: '/albums' },
      { id: 'profile', label: '我的', icon: 'User', path: '/profile' }
    ],
    active_color: 'var(--primary)',
    inactive_color: 'var(--muted-foreground)',
    animation: {
      type: 'none', // none, scale, jump, pulse, float
      duration: 0.3,
      tap_scale: 0.9,
      hover_scale: 1.1
    }
  });
  const [adminNav, setAdminNav] = useState<any>({
    style: 'standard',
    items: [
      { id: 'home', label: '首页', icon: 'Home', path: '/' },
      { id: 'audit', label: '审核', icon: 'ShieldCheck', path: '/admin/audit' },
      { id: 'upload', label: '上传', icon: 'Upload', path: '/upload', is_special: true },
      { id: 'users', label: '用户', icon: 'Users', path: '/admin/users' },
      { id: 'profile', label: '我的', icon: 'User', path: '/profile' }
    ],
    active_color: 'var(--primary)',
    inactive_color: 'var(--muted-foreground)',
    animation: {
      type: 'none',
      duration: 0.3,
      tap_scale: 0.9,
      hover_scale: 1.1
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const navConfig = navType === 'user' ? userNav : adminNav;
  const setNavConfig = navType === 'user' ? setUserNav : setAdminNav;

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await api.getStorageConfig();
      if (error) throw error;
      if (data) {
        setConfig(data);
        if (data.bottom_nav_config) {
          setUserNav(data.bottom_nav_config);
        }
        if ((data as any).admin_bottom_nav_config) {
          setAdminNav((data as any).admin_bottom_nav_config);
        }
      }
    } catch (error: any) {
      toast.error(`获取配置失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await api.upsertStorageConfig({
        ...config,
        bottom_nav_config: userNav,
        admin_bottom_nav_config: adminNav,
        homepage_path: config.homepage_path,
        standalone_paths: config.standalone_paths || []
      });
      if (error) throw error;
      toast.success('导航与页面配置已更新');
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleStandalone = (path: string) => {
    const currentPaths = config.standalone_paths || [];
    if (currentPaths.includes(path)) {
      setConfig({ ...config, standalone_paths: currentPaths.filter(p => p !== path) });
    } else {
      setConfig({ ...config, standalone_paths: [...currentPaths, path] });
    }
  };

  const updateItem = (index: number, key: string, value: any) => {
    const newItems = [...navConfig.items];
    newItems[index] = { ...newItems[index], [key]: value };
    setNavConfig({ ...navConfig, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = navConfig.items.filter((_: any, i: number) => i !== index);
    setNavConfig({ ...navConfig, items: newItems });
  };

  const addItem = () => {
    if (navConfig.items.length >= 5) {
      toast.error('导航项最多 5 个');
      return;
    }
    setNavConfig({
      ...navConfig,
      items: [...navConfig.items, { id: `item_${Date.now()}`, label: '新项', icon: 'Home', path: '/' }]
    });
  };

  const renderIcon = (iconName: string, className: string = "w-5 h-5", style?: any) => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className={className} style={style} />;
  };

  const resolveColor = (colorStr: string) => {
    if (!colorStr) return undefined;
    if (colorStr.includes('var(')) {
      return `hsl(${colorStr})`;
    }
    return colorStr;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">导航栏 DIY</h2>
          <p className="text-sm text-muted-foreground mt-1">定制底部导航栏样式与功能</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl font-bold px-8 h-11 shadow-lg shadow-primary/20">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          保存导航配置
        </Button>
      </div>

      <Tabs value={navType} onValueChange={(v: any) => setNavType(v)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl p-1 bg-muted/50 border border-border/40">
          <TabsTrigger value="user" className="rounded-xl font-bold text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            普通用户版
          </TabsTrigger>
          <TabsTrigger value="admin" className="rounded-xl font-bold text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
            管理员版
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <div className="lg:col-span-2 space-y-6">
          {/* 样式选择 */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                导航布局样式
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setNavConfig({ ...navConfig, style: 'standard' })}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                    navConfig.style === 'standard' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="w-full bg-muted/20 h-10 rounded-lg flex items-center justify-around px-4">
                    <div className="w-4 h-4 rounded-full bg-primary/40" />
                    <div className="w-4 h-4 rounded-full bg-muted/40" />
                    <div className="w-4 h-4 rounded-full bg-muted/40" />
                    <div className="w-4 h-4 rounded-full bg-muted/40" />
                    <div className="w-4 h-4 rounded-full bg-muted/40" />
                  </div>
                  <span className="text-sm font-bold">常规标签栏</span>
                </button>
                <button
                  onClick={() => setNavConfig({ ...navConfig, style: 'dock' })}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                    navConfig.style === 'dock' ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="w-full bg-muted/20 h-10 rounded-lg flex items-center justify-around px-4 relative">
                    <div className="w-4 h-4 rounded-full bg-muted/40" />
                    <div className="w-4 h-4 rounded-full bg-muted/40" />
                    <div className="w-6 h-6 rounded-full bg-primary/60 -top-1 relative shadow-lg shadow-primary/20" />
                    <div className="w-4 h-4 rounded-full bg-muted/40" />
                    <div className="w-4 h-4 rounded-full bg-muted/40" />
                  </div>
                  <span className="text-sm font-bold">悬浮中心 DOCK</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 动画配置 */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden mt-6">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Palette className="w-4 h-4" />
                按钮动画效果
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">动画类型</Label>
                  <Select 
                    value={navConfig.animation?.type || 'none'} 
                    onValueChange={(v: any) => setNavConfig({ 
                      ...navConfig, 
                      animation: { ...navConfig.animation, type: v } 
                    })}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none">无动画 (默认)</SelectItem>
                      <SelectItem value="scale">渐显缩放 (Scale)</SelectItem>
                      <SelectItem value="jump">趣味跳动 (Jump)</SelectItem>
                      <SelectItem value="pulse">柔和脉冲 (Pulse)</SelectItem>
                      <SelectItem value="float">悬浮漂移 (Float)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">动画持续时间 (秒)</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      value={[navConfig.animation?.duration || 0.3]} 
                      min={0.1} 
                      max={1} 
                      step={0.1}
                      onValueChange={([v]: number[]) => setNavConfig({ 
                        ...navConfig, 
                        animation: { ...navConfig.animation, duration: v } 
                      })}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10">{navConfig.animation?.duration || 0.3}s</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">按下缩放比例 (Tap Scale)</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      value={[navConfig.animation?.tap_scale || 0.9]} 
                      min={0.5} 
                      max={1.1} 
                      step={0.05}
                      onValueChange={([v]: number[]) => setNavConfig({ 
                        ...navConfig, 
                        animation: { ...navConfig.animation, tap_scale: v } 
                      })}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10">{navConfig.animation?.tap_scale || 0.9}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">预览/悬浮缩放 (Hover Scale)</Label>
                  <div className="flex items-center gap-4">
                    <Slider 
                      value={[navConfig.animation?.hover_scale || 1.1]} 
                      min={0.9} 
                      max={1.5} 
                      step={0.05}
                      onValueChange={([v]: number[]) => setNavConfig({ 
                        ...navConfig, 
                        animation: { ...navConfig.animation, hover_scale: v } 
                      })}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-10">{navConfig.animation?.hover_scale || 1.1}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 导航项配置 */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  导航项设置
                </CardTitle>
              </div>
              <Button size="sm" variant="outline" onClick={addItem} className="rounded-lg h-8 gap-1">
                <Plus className="w-3.5 h-3.5" />
                添加项
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {navConfig.items.map((item: any, index: number) => (
                <div key={item.id} className="p-4 bg-muted/20 rounded-2xl border border-border/40 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-primary">
                        {renderIcon(item.icon)}
                      </div>
                      <div className="space-y-1">
                        <Input 
                          value={item.label} 
                          onChange={(e) => updateItem(index, 'label', e.target.value)}
                          className="h-8 w-32 rounded-lg font-bold"
                          placeholder="显示名称"
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">图标</Label>
                      <Select 
                        value={item.icon} 
                        onValueChange={(v) => updateItem(index, 'icon', v)}
                      >
                        <SelectTrigger className="h-9 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LUCIDE_ICONS.map(icon => (
                            <SelectItem key={icon} value={icon}>
                              <div className="flex items-center gap-2">
                                {renderIcon(icon, "w-3.5 h-3.5")}
                                <span>{icon}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">路径 (Path)</Label>
                      <Select 
                        value={item.path} 
                        onValueChange={(v) => updateItem(index, 'path', v)}
                      >
                        <SelectTrigger className="h-9 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {AVAILABLE_PATHS.map(p => (
                            <SelectItem key={p.value} value={p.value} className="text-xs">
                              <div className="flex flex-col">
                                <span className="font-bold">{p.label}</span>
                                <span className="text-[10px] text-muted-foreground">{p.value}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {navConfig.style === 'dock' && (
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id={`special_${index}`}
                        checked={item.is_special || false}
                        onChange={(e) => {
                          // 中间只能有一个凸起
                          const newItems = navConfig.items.map((it: any, i: number) => ({
                            ...it,
                            is_special: i === index ? e.target.checked : false
                          }));
                          setNavConfig({ ...navConfig, items: newItems });
                        }}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <Label htmlFor={`special_${index}`} className="text-xs cursor-pointer">设为中间凸起按钮</Label>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* 全局页面配置 */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                全局页面配置
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">默认首页设置</Label>
                <CardDescription className="text-[10px] mb-2">设置网站访问 / 时默认进入的页面</CardDescription>
                <Select 
                  value={config.homepage_path || '/'} 
                  onValueChange={(v) => setConfig({ ...config, homepage_path: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl bg-muted/20 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {AVAILABLE_PATHS.map(p => (
                      <SelectItem key={p.value} value={p.value} className="text-xs">
                        {p.label} ({p.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <Label className="text-xs font-bold">单页显示 (Standalone) 配置</Label>
                <CardDescription className="text-[10px] mb-2">
                  开启后，该页面将不显示底部导航栏。非导航项页面默认建议开启。
                </CardDescription>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {AVAILABLE_PATHS.filter(p => p.value !== '/').map(p => {
                    const isInNav = navConfig.items.some((it: any) => it.path === p.value);
                    
                    // 默认值逻辑：
                    // 如果 config.standalone_paths 为空且从未设置，则非导航页即单页。
                    // 否则，完全听用户的。
                    let isStandalone = false;
                    if (config?.standalone_paths === undefined || config?.standalone_paths === null) {
                      isStandalone = !isInNav;
                    } else {
                      isStandalone = config.standalone_paths.includes(p.value);
                    }
                    
                    const togglePathStandalone = (path: string) => {
                      // 这里要初始化当前所有符合默认条件的路径，防止用户改了一个之后，其他默认状态的路径跟着导航项变化而变化
                      let currentPaths = config?.standalone_paths;
                      if (currentPaths === undefined || currentPaths === null) {
                        currentPaths = AVAILABLE_PATHS.filter(ap => !navConfig.items.some((it: any) => it.path === ap.value)).map(ap => ap.value);
                      }
                      
                      if (currentPaths.includes(path)) {
                        setConfig({ ...config, standalone_paths: currentPaths.filter(cp => cp !== path) });
                      } else {
                        setConfig({ ...config, standalone_paths: [...currentPaths, path] });
                      }
                    };
                    
                    return (
                      <div key={p.value} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{p.label}</span>
                          <span className="text-[10px] text-muted-foreground">{p.value}</span>
                          {isInNav && <Badge variant="secondary" className="w-fit h-4 text-[8px] mt-1 bg-primary/10 text-primary border-none">导航项</Badge>}
                        </div>
                        <div 
                          onClick={() => togglePathStandalone(p.value)}
                          className={cn(
                            "w-10 h-5 rounded-full p-1 cursor-pointer transition-colors duration-200",
                            isStandalone ? "bg-primary" : "bg-zinc-300"
                          )}
                        >
                          <div className={cn(
                            "w-3 h-3 bg-white rounded-full transition-transform duration-200",
                            isStandalone ? "translate-x-5" : "translate-x-0"
                          )} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 实时预览 (模拟器) */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden sticky top-6">
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Palette className="w-4 h-4" />
                主题色配置
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">选中状态颜色 (Active)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    value={navConfig.active_color} 
                    onChange={(e) => setNavConfig({ ...navConfig, active_color: e.target.value })}
                    className="w-12 h-10 p-1 rounded-lg"
                  />
                  <Input 
                    value={navConfig.active_color} 
                    onChange={(e) => setNavConfig({ ...navConfig, active_color: e.target.value })}
                    className="flex-1 h-10 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">未选中状态颜色 (Inactive)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color" 
                    value={navConfig.inactive_color} 
                    onChange={(e) => setNavConfig({ ...navConfig, inactive_color: e.target.value })}
                    className="w-12 h-10 p-1 rounded-lg"
                  />
                  <Input 
                    value={navConfig.inactive_color} 
                    onChange={(e) => setNavConfig({ ...navConfig, inactive_color: e.target.value })}
                    className="flex-1 h-10 rounded-lg"
                  />
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <Label className="text-xs font-bold text-muted-foreground uppercase">实时预览</Label>
                <div className="bg-zinc-100 rounded-[2rem] p-4 border-[6px] border-zinc-300 relative aspect-[9/16] max-w-[200px] mx-auto overflow-hidden">
                  <div className="absolute inset-0 bg-white" />
                  
                  {/* 模拟底部栏 */}
                  <div className={cn(
                    "absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-200 flex items-center px-2",
                    navConfig.style === 'dock' && "overflow-visible"
                  )}>
                    {navConfig.items.map((item: any, i: number) => {
                      const isActive = i === 0;
                      const isDock = navConfig.style === 'dock' && item.is_special;
                      
                      if (isDock) {
                        return (
                          <div key={item.id} className="flex-1 flex flex-col items-center justify-center relative -top-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-white"
                              style={{ backgroundColor: resolveColor(navConfig.active_color) }}
                            >
                              {renderIcon(item.icon, "w-5 h-5")}
                            </div>
                            <span className="text-[10px] font-bold mt-4" style={{ color: resolveColor(navConfig.active_color) }}>{item.label}</span>
                          </div>
                        );
                      }

                      return (
                        <div key={item.id} className="flex-1 flex flex-col items-center justify-center gap-0.5">
                          {renderIcon(item.icon, "w-5 h-5", { 
                            color: resolveColor(isActive ? navConfig.active_color : navConfig.inactive_color) 
                          })}
                          <span 
                            className="text-[10px] font-medium" 
                            style={{ color: resolveColor(isActive ? navConfig.active_color : navConfig.inactive_color) }}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={cn("h-[1px] bg-border w-full", className)} />;
}
