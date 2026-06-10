import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Shield, ShieldCheck, Link as LinkIcon, Lock, Trash2, Plus, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn, formatTimeAgo } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { routes } from '@/routes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function RandomBeautySection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>({
    openid_required: false,
    encrypt_openid: true,
    group_limits: {}
  });
  const [groups, setGroups] = useState<any[]>([]);
  const [randomBeautyLogs, setRandomBeautyLogs] = useState<any[]>([]);
  const [loadingRandomBeauty, setLoadingRandomBeauty] = useState(false);
  const [randomBeautyPage, setRandomBeautyPage] = useState(0);
  const [totalRandomBeauty, setTotalRandomBeauty] = useState(0);

  useEffect(() => {
    fetchData();
    loadRandomBeautyLogs(0);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, groupsRes] = await Promise.all([
        api.getRandomBeautyConfigs(),
        api.getPermissionGroups()
      ]);
      
      if (configRes.data) {
        setConfig(configRes.data);
      }
      if (groupsRes.data) {
        setGroups(groupsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch random beauty data:', error);
      toast.error('数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  const loadRandomBeautyLogs = async (page = 0) => {
    setLoadingRandomBeauty(true);
    try {
      const { data, total } = await api.getRandomBeautyAccessList(page, 20);
      setRandomBeautyLogs(data || []);
      setTotalRandomBeauty(total || 0);
    } catch (error) {
      console.error('Failed to load random beauty logs:', error);
    } finally {
      setLoadingRandomBeauty(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await api.updateRandomBeautyConfigs(config);
      if (error) throw error;
      toast.success('配置已保存');
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateLimit = (groupId: string, limit: string) => {
    const val = parseInt(limit);
    setConfig({
      ...config,
      group_limits: {
        ...config.group_limits,
        [groupId]: isNaN(val) ? 0 : val
      }
    });
  };

  const handleToggle = (key: string, value: boolean) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="config" className="space-y-6">
      <TabsList className="w-full md:w-auto">
        <TabsTrigger value="config">配置管理</TabsTrigger>
        <TabsTrigger value="logs">访问记录</TabsTrigger>
      </TabsList>

      <TabsContent value="config" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">随机美图控制</h2>
          <p className="text-slate-500 text-sm">管理随机美图的访问权限、每日限制及安全设置</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl shadow-lg shadow-primary/20">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          保存配置
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white/50 backdrop-blur-md">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              访问安全
            </CardTitle>
            <CardDescription>控制谁可以访问随机美图页面</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">不需要登录即可访问</Label>
                <p className="text-xs text-slate-500">开启后，访客也可以查看随机美图，受默认次数限制</p>
              </div>
              <Switch 
                checked={config.allow_guest_access ?? true} 
                onCheckedChange={(checked) => handleToggle('allow_guest_access', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">强制携带 OpenID 访问</Label>
                <p className="text-xs text-slate-500">开启后，URL 中必须包含有效的 openid 参数才能访问</p>
              </div>
              <Switch 
                checked={config.openid_required} 
                onCheckedChange={(checked) => setConfig({...config, openid_required: checked})}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">对 OpenID 进行加密</Label>
                <p className="text-xs text-slate-500">开启后，生成的链接将使用混淆后的 OpenID，防止泄漏</p>
              </div>
              <Switch 
                checked={config.encrypt_openid} 
                onCheckedChange={(checked) => setConfig({...config, encrypt_openid: checked})}
              />
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-blue-700">安全提示</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  若开启强制 OpenID，建议同步开启加密，以保护用户隐私。系统会自动识别加密和非加密格式的 OpenID。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white/50 backdrop-blur-md">
          <CardHeader className="bg-gradient-to-r from-purple-500/10 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-500" />
              每日额度限制
            </CardTitle>
            <CardDescription>按权限组设置用户每日可查看的随机图片数量</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-3">
              {groups.map(group => (
                <div key={group.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      group.role === 'admin' ? "bg-red-100 text-red-600" : "bg-purple-100 text-purple-600"
                    )}>
                      {group.name.substring(0, 1)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-700">{group.name}</div>
                      <div className="text-[10px] text-slate-400">ID: {group.id.substring(0, 8)}...</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      className="w-20 h-8 rounded-lg text-center font-bold"
                      value={config.group_limits[group.id] ?? 0}
                      onChange={(e) => updateLimit(group.id, e.target.value)}
                    />
                    <span className="text-[10px] font-bold text-slate-400">次 / 天</span>
                  </div>
                </div>
              ))}
              
              {/* 新增：Role 基础额度配置 */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase px-1">基础角色额度 (Role-based)</p>
                {['admin', 'svip', 'vip', 'pt'].map(role => (
                  <div key={role} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase",
                        role === 'admin' ? "bg-red-500 text-white" : 
                        role === 'svip' ? "bg-amber-500 text-white" :
                        role === 'vip' ? "bg-indigo-500 text-white" : "bg-slate-400 text-white"
                      )}>
                        {role.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-700 uppercase">{role}</div>
                        <div className="text-[10px] text-slate-400">系统内置角色</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input 
                        type="number" 
                        className="w-20 h-8 rounded-lg text-center font-bold bg-white"
                        value={config.group_limits[role] ?? 0}
                        onChange={(e) => updateLimit(role, e.target.value)}
                      />
                      <span className="text-[10px] font-bold text-slate-400">次 / 天</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-amber-500 shrink-0" />
                    <Label className="text-xs font-bold text-amber-700">未匹配分组时的默认限额</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      className="w-20 h-8 rounded-lg text-center font-bold bg-white"
                      value={config.default_limit ?? 8}
                      onChange={(e) => setConfig({...config, default_limit: parseInt(e.target.value) || 0})}
                    />
                    <span className="text-[10px] font-bold text-amber-500">次 / 天</span>
                  </div>
                </div>
                <p className="text-xs text-amber-600 leading-relaxed">
                  设置为 0 表示无限制。系统优先匹配<b>权限组</b>，其次匹配<b>角色(Role)</b>，最后匹配<b>默认限额</b>。
                  如果您发现修改不生效，请检查用户是否属于某个已设置了额度的角色或分组（如访客默认属于 pt 角色）。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white/50 backdrop-blur-md md:col-span-2">
          <CardHeader className="bg-gradient-to-r from-amber-500/10 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-amber-500" />
              限额后跳转
            </CardTitle>
            <CardDescription>当用户达到每日查看限额后的交互配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold">跳转按钮文字</Label>
              <Input 
                placeholder="例如：返回首页、开通会员..." 
                value={config.after_quota_button_text || ''}
                onChange={(e) => setConfig({...config, after_quota_button_text: e.target.value})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold">跳转链接 (URL)</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select 
                  value={routes.some(r => r.path === config.after_quota_redirect_url) ? config.after_quota_redirect_url : 'custom'}
                  onValueChange={(val) => {
                    if (val !== 'custom') {
                      setConfig({...config, after_quota_redirect_url: val});
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl flex-1">
                    <SelectValue placeholder="选择预设页面" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.filter(r => r.path !== '*' && r.path !== '/').map(r => (
                      <SelectItem key={r.path} value={r.path}>{r.label || r.path}</SelectItem>
                    ))}
                    <SelectItem value="/">首页 (探索)</SelectItem>
                    <SelectItem value="custom">-- 自定义链接 --</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  placeholder="手动输入或自定义 URL..." 
                  value={config.after_quota_redirect_url || ''}
                  onChange={(e) => setConfig({...config, after_quota_redirect_url: e.target.value})}
                  className="rounded-xl flex-[1.5]"
                />
              </div>
              <p className="text-[10px] text-slate-400">用户点击限额提示页面的按钮将跳转到此链接。支持选择预设页面或手动输入。</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold">限额提示文案</Label>
              <Input 
                placeholder="自定义限额已满时的提示文字..." 
                value={config.quota_full_message || ''}
                onChange={(e) => setConfig({...config, quota_full_message: e.target.value})}
                className="rounded-xl"
              />
              <p className="text-[10px] text-slate-400">留空则使用默认文案</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white/50 backdrop-blur-md mt-6">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-blue-500" />
            链接生成与测试
          </CardTitle>
          <CardDescription>生成带参数的测试链接，用于公众号关键词回复配置</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">测试 OpenID</Label>
                <Input 
                  placeholder="输入测试 OpenID..." 
                  defaultValue="o_test_user_123"
                  className="rounded-xl"
                  id="test_openid"
                />
              </div>
              <Button 
                variant="outline" 
                className="w-full rounded-xl border-dashed"
                onClick={() => {
                  const id = (document.getElementById('test_openid') as HTMLInputElement).value;
                  if (!id) return toast.error('请输入 OpenID');
                  // 这里的逻辑通常由后端短代码处理器完成，前端仅展示示意
                  const baseUrl = window.location.origin + '/refresh-image';
                  const finalId = config.encrypt_openid ? 'ENCRYPTED_ID' : id;
                  toast.info(`模拟生成的链接: ${baseUrl}?openid=${finalId}`);
                }}
              >
                生成预览链接
              </Button>
            </div>

            <div className="p-4 bg-slate-900 rounded-2xl text-slate-300 font-mono text-[10px] leading-relaxed relative group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-primary font-bold">公众号短代码示例</span>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-slate-500 hover:text-white"
                    onClick={() => {
                      navigator.clipboard.writeText('{{random.beauty_url}}?openid={{openid}}');
                      toast.success('已复制链接代码');
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p># 在微信公众号回复内容中使用：</p>
              <p className="text-white mt-1">{"<a href=\"{{random.beauty_url}}?openid={{openid}}\">点击进入随机美图</a>"}</p>
              <p className="mt-2 text-slate-400">今日已看：{"{{random.beauty_count}}"}</p>
              <p className="mt-4 text-slate-500 font-sans text-[9px]">提示：系统会自动将 {"{{openid}}"} 替换为粉丝ID，{"{{random.beauty_count}}"} 替换为今日已看次数。</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="logs">
        <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-blue-500/10 to-transparent">
            <div>
              <CardTitle className="text-sm font-bold">随机美图访问记录</CardTitle>
              <CardDescription>查看用户访问随机美图的统计数据</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="w-8 h-8 rounded-lg"
                disabled={randomBeautyPage === 0 || loadingRandomBeauty}
                onClick={() => {
                  const newPage = randomBeautyPage - 1;
                  setRandomBeautyPage(newPage);
                  loadRandomBeautyLogs(newPage);
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium">第 {randomBeautyPage + 1} 页</span>
              <Button 
                variant="outline" 
                size="icon" 
                className="w-8 h-8 rounded-lg"
                disabled={(randomBeautyPage + 1) * 20 >= totalRandomBeauty || loadingRandomBeauty}
                onClick={() => {
                  const newPage = randomBeautyPage + 1;
                  setRandomBeautyPage(newPage);
                  loadRandomBeautyLogs(newPage);
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase whitespace-nowrap">用户名</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase whitespace-nowrap">OpenID / ID</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-600 text-xs uppercase whitespace-nowrap">查看日期</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 text-xs uppercase whitespace-nowrap">查看数量</th>
                      <th className="px-4 py-3 text-right font-bold text-slate-600 text-xs uppercase whitespace-nowrap">最后更新</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loadingRandomBeauty ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                          加载中...
                        </td>
                      </tr>
                    ) : randomBeautyLogs.length > 0 ? (
                      randomBeautyLogs.map((log, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-700">{log.username}</td>
                          <td className="px-4 py-3 font-mono text-[10px] text-slate-400 truncate max-w-[150px]">{log.openid}</td>
                          <td className="px-4 py-3 text-slate-500">{log.visit_date}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black">
                              {log.count}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-400">{formatTimeAgo(log.updated_at || log.created_at)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">暂无记录</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
