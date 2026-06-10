import React, { useState, useEffect } from 'react';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Hash, Shuffle, X, Plus, Ban, FileCode2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useConfig } from '@/contexts/ConfigContext';

export function DigitalIdConfigSection() {
  const { refreshConfig } = useConfig();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    id_length: 6,
    start_value: 100000,
    is_random_mode: false
  });
  const [digitalIdSettings, setDigitalIdSettings] = useState({
    is_enabled: true,
    is_shop_enabled: true
  });

  const [excludedIds, setExcludedIds] = useState<any[]>([]);
  const [newExcludedId, setNewExcludedId] = useState('');
  const [newExcludedReason, setNewExcludedReason] = useState('');

  const [patterns, setPatterns] = useState<any[]>([]);
  const [newPattern, setNewPattern] = useState('');
  const [newPatternDesc, setNewPatternDesc] = useState('');

  useEffect(() => {
    fetchConfig();
    fetchExclusions();
    fetchPatterns();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await api.getDigitalIdConfig();
      if (data) setConfig(data);

      const { data: digitalIdData } = await api.getSystemConfig('digital_id_settings');
      if (digitalIdData?.value) setDigitalIdSettings(prev => ({ ...prev, ...digitalIdData.value }));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchExclusions = async () => {
    try {
      const { data } = await api.getExcludedDigitalIds();
      if (data) setExcludedIds(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPatterns = async () => {
    try {
      const { data } = await api.getDigitalIdPatterns();
      if (data) setPatterns(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await api.updateDigitalIdConfig(config);
      if (error) throw error;
      
      const { error: settingsError } = await api.updateSystemConfig('digital_id_settings', digitalIdSettings);
      if (settingsError) throw settingsError;

      await refreshConfig();
      toast.success('ID 分配规则及系统设置已保存并即时生效');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddExclusion = async () => {
    if (!newExcludedId) return;
    try {
      const { error } = await api.addExcludedDigitalId(newExcludedId, newExcludedReason);
      if (error) throw error;
      toast.success('已加入排除列表');
      setNewExcludedId('');
      setNewExcludedReason('');
      fetchExclusions();
    } catch (error: any) {
      toast.error(`添加失败: ${error.message}`);
    }
  };

  const handleDeleteExclusion = async (id: string) => {
    try {
      await api.deleteExcludedDigitalId(id);
      fetchExclusions();
      toast.success('已从排除列表移除');
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const handleAddPattern = async () => {
    if (!newPattern) return;
    try {
      const { error } = await api.addDigitalIdPattern(newPattern, newPatternDesc);
      if (error) throw error;
      toast.success('模式已添加');
      setNewPattern('');
      setNewPatternDesc('');
      fetchPatterns();
    } catch (error: any) {
      toast.error(`添加失败: ${error.message}`);
    }
  };

  const handleDeletePattern = async (id: string) => {
    try {
      await api.deleteDigitalIdPattern(id);
      fetchPatterns();
      toast.success('模式已删除');
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const handleTogglePattern = async (item: any) => {
    try {
      await api.updateDigitalIdPattern(item.id, { is_active: !item.is_active });
      fetchPatterns();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">正在加载 ID 配置...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">ID 分配规则</h2>
          <p className="text-sm text-muted-foreground mt-1">控制新注册用户自动获取的数字 ID 规则</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl font-bold shadow-lg shadow-primary/20">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          保存规则设置
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden h-fit md:col-span-2">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-primary flex items-center gap-2">
              <Hash className="w-5 h-5" />
              数字ID与商店功能开关
            </CardTitle>
            <CardDescription>控制全站数字 ID 功能及商店功能的全局开关</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40 hover:bg-primary/5 transition-all group">
                <div className="space-y-1">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary" />
                    启用数字 ID 功能
                  </Label>
                  <p className="text-[10px] text-muted-foreground group-hover:text-primary/70 transition-colors">
                    用户注册后自动分配唯一数字 ID。
                  </p>
                </div>
                <Switch 
                  checked={digitalIdSettings.is_enabled} 
                  onCheckedChange={(checked) => setDigitalIdSettings({ ...digitalIdSettings, is_enabled: checked })} 
                />
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40 hover:bg-primary/5 transition-all group">
                <div className="space-y-1">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    启用数字 ID 商店 (靓号铺子)
                  </Label>
                  <p className="text-[10px] text-muted-foreground group-hover:text-primary/70 transition-colors">
                    允许用户通过积分或其他方式兑换特定的“靓号” ID。
                  </p>
                </div>
                <Switch 
                  checked={digitalIdSettings.is_shop_enabled} 
                  onCheckedChange={(checked) => setDigitalIdSettings({ ...digitalIdSettings, is_shop_enabled: checked })} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              生成长度与起始值
            </CardTitle>
            <CardDescription>设置生成的 ID 长度及序列起始值</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label className="font-bold">ID 位数长度</Label>
              <Input 
                type="number" 
                value={config.id_length} 
                onChange={(e) => setConfig({ ...config, id_length: parseInt(e.target.value) || 6 })}
                className="rounded-xl h-11"
              />
              <p className="text-[10px] text-muted-foreground">通常为 6-10 位，影响随机生成的范围</p>
            </div>
            <div className="space-y-2">
              <Label className="font-bold">下一个分配的起始值</Label>
              <Input 
                type="number" 
                value={config.start_value} 
                onChange={(e) => setConfig({ ...config, start_value: parseInt(e.target.value) || 100000 })}
                className="rounded-xl h-11"
              />
              <p className="text-[10px] text-muted-foreground">在顺序模式下，新用户将以此值递增分配 ID</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-indigo-500/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-indigo-600" />
              分配模式选择
            </CardTitle>
            <CardDescription>选择系统如何产生下一个可用 ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">启用随机分配模式</Label>
                <p className="text-[10px] text-muted-foreground">开启后将从指定位数的号码池中随机抽取</p>
              </div>
              <Switch 
                checked={config.is_random_mode} 
                onCheckedChange={(checked) => setConfig({ ...config, is_random_mode: checked })}
              />
            </div>
            
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                <strong>提示：</strong> 如果关闭随机模式，系统将采用“起始值 + 自增”的方式进行分配。修改起始值后，仅对下一个新注册的用户生效。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 排除 ID 管理 */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden md:col-span-1">
          <CardHeader className="bg-red-500/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              特定 ID 排除列表
            </CardTitle>
            <CardDescription>系统分配 ID 时将自动跳过这些被排除的 ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input 
                  placeholder="输入要排除的 ID" 
                  value={newExcludedId}
                  onChange={(e) => setNewExcludedId(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="flex-[1.5] space-y-1">
                <Input 
                  placeholder="原因 (可选)" 
                  value={newExcludedReason}
                  onChange={(e) => setNewExcludedReason(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button onClick={handleAddExclusion} className="rounded-xl px-3 bg-red-600 hover:bg-red-700 text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {excludedIds.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs bg-muted/10 rounded-2xl border border-dashed">
                  暂无排除 ID
                </div>
              ) : (
                excludedIds.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl group border border-transparent hover:border-red-200 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-sm text-red-600">{item.digital_id}</span>
                      {item.reason && <span className="text-[10px] text-muted-foreground">{item.reason}</span>}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteExclusion(item.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 模式排除管理 */}
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden md:col-span-1">
          <CardHeader className="bg-orange-500/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-orange-600" />
              ID 规律模式排除
            </CardTitle>
            <CardDescription>通过正则表达式定义需要排除的 ID 规律 (如 AA, AAAABBBB 等)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input 
                  placeholder="正则模式, 如 (\\d)\\1" 
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  className="rounded-xl font-mono"
                />
              </div>
              <div className="flex-[1.2] space-y-1">
                <Input 
                  placeholder="描述" 
                  value={newPatternDesc}
                  onChange={(e) => setNewPatternDesc(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button onClick={handleAddPattern} className="rounded-xl px-3 bg-orange-600 hover:bg-orange-700 text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {patterns.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl group border border-transparent hover:border-orange-200 transition-colors">
                  <div className="flex flex-col flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-bold bg-muted p-1 rounded text-orange-700">{item.pattern}</code>
                      <Switch 
                        checked={item.is_active} 
                        onCheckedChange={() => handleTogglePattern(item)}
                        className="scale-75"
                      />
                    </div>
                    {item.description && <span className="text-[10px] text-muted-foreground truncate">{item.description}</span>}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeletePattern(item.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
