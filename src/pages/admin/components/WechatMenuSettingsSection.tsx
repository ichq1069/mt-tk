import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Loader2, Plus, Trash2, Settings2, Info, Menu, Save, RefreshCw, Send, TriangleAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminLogger } from '@/hooks/useAdminLogger';
const PATH_OPTIONS = [
  { label: "首页 / 探索", value: "/" },
  { label: "每日图集", value: "/daily-gallery" },
  { label: "文档中心 (使用手册)", value: "/usage-guide" },
  { label: "登录页", value: "/login" },
  { label: "用户个人中心", value: "/profile" },
  { label: "发布作品", value: "/upload" },
  { label: "消息通知", value: "/notifications" },
  { label: "图集写真", value: "/albums" },
  { label: "我的勋章", value: "/badges" },
  { label: "签到中心", value: "/check-in" },
  { label: "积分明细", value: "/points" },
  { label: "极速整理", value: "/fast-organize" },
  { label: "PC 管理总台", value: "/admin/pc" },
  { label: "移动端审核页", value: "/admin/audit" },
  { label: "移动端用户管理", value: "/admin/users" },
];


export function WechatMenuSettingsSection() {
  const { logAction } = useAdminLogger('wechat-menu');
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [menuConfig, setMenuConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const selectedConfig = configs.find(c => c.id === selectedConfigId);
  const isUnauthAccount = selectedConfig?.type === 'subscription_unauth';

  // 菜单数据结构
  const [buttons, setButtons] = useState<any[]>([]);

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (selectedConfigId) {
      fetchMenu();
    }
  }, [selectedConfigId]);

  const fetchConfigs = async () => {
    try {
      const { data } = await api.getWechatConfigs();
      setConfigs(data || []);
      if (data && data.length > 0) {
        setSelectedConfigId(data[0].id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const { data } = await api.getWechatMenu(selectedConfigId);
      if (data) {
        setMenuConfig(data);
        setButtons(data.menu_data?.button || []);
      } else {
        setMenuConfig(null);
        setButtons([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const menuData = { button: buttons };
      const { data, error } = await api.upsertWechatMenu({
        config_id: selectedConfigId,
        menu_data: menuData,
        is_active: true
      });
      if (error) throw error;
      setMenuConfig(data);
      toast.success('菜单配置已保存到本地库');
      logAction('保存微信菜单配置', { configId: selectedConfigId, menuData });
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToWechat = async () => {
    if (!buttons || buttons.length === 0) {
      return toast.error('请先配置菜单内容');
    }
    
    setSyncing(true);
    try {
      const { data, error } = await api.callWechatApi(selectedConfigId, 'create_menu', { 
        menuData: { button: buttons } 
      });
      
      if (error) throw error;
      if (data?.data?.errcode === 0) {
        toast.success('菜单已成功同步至微信服务器！内容将在 24 小时内对用户生效。');
        logAction('同步菜单至微信', { configId: selectedConfigId });
      } else {
        const errmsg = data?.data?.errmsg || '微信接口返回异常';
        if (errmsg.includes('api unauthorized')) {
          throw new Error('同步失败: 该公众号类型（未认证订阅号）没有权限使用自定义菜单 API。请尝试在微信公众平台后台直接配置菜单。');
        }
        throw new Error(errmsg);
      }
    } catch (error: any) {
      toast.error(`同步失败: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const addButton = () => {
    if (buttons.length >= 3) return toast.error('一级菜单最多只能有 3 个');
    setButtons([...buttons, { name: '新菜单', type: 'view', url: 'https://' }]);
  };

  const removeButton = (index: number) => {
    const newButtons = [...buttons];
    newButtons.splice(index, 1);
    setButtons(newButtons);
  };

  const updateButton = (index: number, field: string, value: any) => {
    const newButtons = [...buttons];
    newButtons[index][field] = value;
    setButtons(newButtons);
  };

  const addSubButton = (parentIndex: number) => {
    const newButtons = [...buttons];
    if (!newButtons[parentIndex].sub_button) newButtons[parentIndex].sub_button = [];
    if (newButtons[parentIndex].sub_button.length >= 5) return toast.error('二级菜单最多只能有 5 个');
    
    // 如果有了子菜单，父菜单就不能有 type 和 url/key
    delete newButtons[parentIndex].type;
    delete newButtons[parentIndex].url;
    delete newButtons[parentIndex].key;
    
    newButtons[parentIndex].sub_button.push({ name: '新子菜单', type: 'view', url: 'https://' });
    setButtons(newButtons);
  };

  const removeSubButton = (parentIndex: number, subIndex: number) => {
    const newButtons = [...buttons];
    newButtons[parentIndex].sub_button.splice(subIndex, 1);
    if (newButtons[parentIndex].sub_button.length === 0) {
      delete newButtons[parentIndex].sub_button;
      newButtons[parentIndex].type = 'view';
      newButtons[parentIndex].url = 'https://';
    }
    setButtons(newButtons);
  };

  const updateSubButton = (parentIndex: number, subIndex: number, field: string, value: any) => {
    const newButtons = [...buttons];
    newButtons[parentIndex].sub_button[subIndex][field] = value;
    setButtons(newButtons);
  };

  if (loading && configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">载入中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">自定义菜单设置</h2>
          <p className="text-muted-foreground mt-1">可视化编辑公众号底部菜单，并一键同步到微信官方后台</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="w-[200px] rounded-xl font-bold">
              <SelectValue placeholder="选择公众号" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {configs.map(config => (
                <SelectItem key={config.id} value={config.id} className="rounded-lg">
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            variant="outline"
            className="rounded-xl font-bold"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            保存草稿
          </Button>
          <Button 
            onClick={handleSyncToWechat} 
            disabled={syncing || loading || isUnauthAccount}
            className="rounded-xl font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            {isUnauthAccount ? '当前帐号类型不支持同步' : '同步至微信服务器'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* 左侧：手机预览 */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest pl-2 mb-4">效果预览</h3>
            <div className="border border-muted/30 rounded-[3rem] bg-slate-900 p-2 shadow-2xl aspect-[9/18.5] relative overflow-hidden w-full max-w-[300px] mx-auto border-[8px] border-slate-800">
               <div className="absolute top-0 left-0 right-0 h-[60px] bg-slate-800 flex items-end justify-center pb-2">
                 <div className="w-16 h-1 bg-slate-700 rounded-full" />
               </div>
               
               <div className="h-full bg-slate-50 relative">
                 <div className="absolute top-[60px] left-0 right-0 h-10 bg-slate-100 flex items-center px-4 border-b border-muted/20">
                    <span className="text-[10px] font-bold text-slate-500">公众号名称</span>
                 </div>
                 
                 <div className="absolute bottom-0 left-0 right-0 h-12 bg-white border-t border-muted/20 flex items-center">
                    <div className="w-12 h-12 flex items-center justify-center border-r border-muted/10 shrink-0">
                      <Menu className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 flex h-full">
                      {buttons.map((btn, idx) => (
                        <div key={idx} className="flex-1 border-r border-muted/10 last:border-none relative">
                           <button className="w-full h-full flex items-center justify-center text-[11px] font-bold text-slate-600 hover:bg-slate-50">
                             {btn.name}
                           </button>
                           {/* 子菜单预览 */}
                           {btn.sub_button && btn.sub_button.length > 0 && (
                             <div className="absolute bottom-[52px] left-1/2 -translate-x-1/2 w-[120%] bg-white border border-muted/20 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                               {btn.sub_button.map((sub: any, sIdx: number) => (
                                 <div key={sIdx} className="px-2 py-2 text-[10px] text-slate-600 border-b border-muted/10 last:border-none text-center">
                                   {sub.name}
                                 </div>
                               ))}
                               <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-muted/20 rotate-45" />
                             </div>
                           )}
                        </div>
                      ))}
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* 右侧：编辑区域 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-amber-500/10 p-4 rounded-2xl flex gap-3 text-amber-600 mb-4">
            <TriangleAlert className="w-5 h-5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <p className="font-bold mb-1">同步须知：</p>
              {isUnauthAccount && (
                <p className="text-red-600 font-black border-b border-red-200 pb-1 mb-2">
                  警告：当前选择的公众号类型（未认证订阅号）没有权限调用微信菜单同步接口。请在微信公众平台后台直接配置菜单。
                </p>
              )}
              <p>1. 每次同步会覆盖原有菜单。同步后，微信服务器可能需要 24 小时生效。</p>
              <p>2. 一级菜单最多 3 个，每个二级菜单最多 5 个。</p>
              <p>3. 链接地址必须以 http:// 或 https:// 开头。</p>
            </div>
          </div>

          <div className="space-y-4">
            {buttons.map((btn, btnIdx) => (
              <Card key={btnIdx} className="rounded-3xl border-2 border-muted/20 shadow-none overflow-hidden">
                <CardHeader className="bg-muted/30 py-4 flex flex-row items-center justify-between">
                   <div className="flex items-center gap-3">
                     <Badge className="bg-primary h-6 w-6 rounded-lg flex items-center justify-center p-0">{btnIdx + 1}</Badge>
                     <Input 
                       value={btn.name} 
                       onChange={e => updateButton(btnIdx, 'name', e.target.value)}
                       className="bg-transparent border-none font-black text-lg h-8 focus-visible:ring-0 p-0 w-[150px]"
                     />
                   </div>
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     onClick={() => removeButton(btnIdx)}
                     className="rounded-full text-destructive hover:bg-destructive/10 h-8 w-8"
                   >
                     <Trash2 className="w-4 h-4" />
                   </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* 一级菜单配置（如果没有子菜单） */}
                  {!btn.sub_button || btn.sub_button.length === 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold">响应类型</Label>
                        <Select value={btn.type} onValueChange={v => updateButton(btnIdx, 'type', v)}>
                          <SelectTrigger className="rounded-xl h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="view">跳转网页</SelectItem>
                            <SelectItem value="click">点击触发关键词</SelectItem>
                            <SelectItem value="miniprogram">小程序</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold">
                            {btn.type === 'view' ? '链接 URL' : btn.type === 'click' ? '触发关键词' : '其他配置'}
                          </Label>
                          {btn.type === 'view' && (
                            <Select 
                              onValueChange={v => updateButton(btnIdx, 'url', `${window.location.origin}${v}`)}
                            >
                              <SelectTrigger className="h-6 w-24 rounded-lg text-[9px] border-none bg-primary/10 text-primary">
                                <SelectValue placeholder="内置路径" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {PATH_OPTIONS.map(p => (
                                  <SelectItem key={p.value} value={p.value} className="text-[10px]">
                                    {p.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <Input 
                          value={btn.type === 'view' ? btn.url : btn.key} 
                          onChange={e => updateButton(btnIdx, btn.type === 'view' ? 'url' : 'key', e.target.value)}
                          className="rounded-xl h-10 text-xs font-mono"
                          placeholder={btn.type === 'view' ? "https://..." : "输入关键词"}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* 二级菜单列表 */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                       二级子菜单
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => addSubButton(btnIdx)}
                         className="h-6 rounded-lg text-primary text-[10px] font-black"
                       >
                         <Plus className="w-3 h-3 mr-1" /> 添加子菜单
                       </Button>
                    </Label>
                    
                    {btn.sub_button && btn.sub_button.map((sub: any, subIdx: number) => (
                      <div key={subIdx} className="bg-slate-50 p-4 rounded-2xl border border-muted/10 space-y-4">
                         <div className="flex items-center justify-between">
                            <Input 
                              value={sub.name} 
                              onChange={e => updateSubButton(btnIdx, subIdx, 'name', e.target.value)}
                              className="bg-transparent border-none font-bold text-sm h-7 focus-visible:ring-0 p-0 w-[120px]"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeSubButton(btnIdx, subIdx)}
                              className="h-6 w-6 rounded-full text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                         </div>
                         <div className="grid grid-cols-1 gap-4">
                            <Select value={sub.type} onValueChange={v => updateSubButton(btnIdx, subIdx, 'type', v)}>
                              <SelectTrigger className="rounded-lg h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                <SelectItem value="view">跳转网页</SelectItem>
                                <SelectItem value="click">关键词触发</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="space-y-2">
                              {sub.type === 'view' && (
                                <Select 
                                  onValueChange={v => updateSubButton(btnIdx, subIdx, 'url', `${window.location.origin}${v}`)}
                                >
                                  <SelectTrigger className="h-6 w-full rounded-lg text-[9px] border-none bg-primary/10 text-primary px-3">
                                    <SelectValue placeholder="快捷选择内置路径" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                    {PATH_OPTIONS.map(p => (
                                      <SelectItem key={p.value} value={p.value} className="text-[10px]">
                                        {p.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <Input 
                                value={sub.type === 'view' ? sub.url : sub.key} 
                                onChange={e => updateSubButton(btnIdx, subIdx, sub.type === 'view' ? 'url' : 'key', e.target.value)}
                                className="rounded-lg h-9 text-xs"
                                placeholder={sub.type === 'view' ? "https://..." : "输入回复关键词"}
                              />
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {buttons.length < 3 && (
              <Button 
                variant="outline" 
                onClick={addButton} 
                className="w-full h-16 border-dashed border-2 rounded-3xl text-muted-foreground hover:text-primary hover:border-primary/50 transition-all flex flex-col gap-1"
              >
                <Plus className="w-6 h-6" />
                <span className="font-bold text-xs uppercase tracking-widest">添加一级菜单项</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
