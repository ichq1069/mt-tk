import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Save, CalendarCheck, Plus, Trash2, Info, Sparkles, CheckSquare, Square, Power, PowerOff, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SystemText } from '@/components/common/KeywordText';
import { useConfig } from '@/contexts/ConfigContext';

export function SigninManagementSection() {
  const { refreshConfig } = useConfig();
  const [configs, setConfigs] = useState<any[]>([]);
  const [globalConfig, setGlobalConfig] = useState<any>({
    wechat_checkin_enabled: true,
    wechat_checkin_separate_reward: false,
    wechat_points: 5,
    wechat_exp: 5,
    checkin_start_time: '00:00',
    checkin_end_time: '23:59'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const [{ data: signinData }, { data: globalData }] = await Promise.all([
        api.getSigninConfigs(),
        api.getSystemConfig('check_in_settings')
      ]);
      setConfigs((signinData || []).map((c: any) => ({ ...c, _tempId: Math.random().toString(36).substring(7) })));
      if (globalData?.value) {
        setGlobalConfig((prev: any) => ({
          ...prev,
          ...globalData.value
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    setSaving(true);
    try {
      // 移除临时 ID
      const configsToSave = configs.map(({ _tempId, ...rest }) => rest);
      const { error: signinError } = await api.updateSigninConfigs(configsToSave);
      if (signinError) throw signinError;
      
      const { error: globalError } = await api.updateSystemConfig('check_in_settings', globalConfig);
      if (globalError) throw globalError;

      await refreshConfig();
      toast.success('✅ 签到配置已更新');
      setTimeout(() => {
        window.location.reload();
      }, 800);
      fetchConfigs();
    } catch (error: any) {
      toast.error(`更新失败: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDay = () => {
    const nextDay = configs.length > 0 ? Math.max(...configs.map(c => c.day_number)) + 1 : 2;
    setConfigs([...configs, {
      _tempId: Math.random().toString(36).substring(7),
      day_number: nextDay,
      min_points: 10,
      max_points: 10,
      exp_reward: 10,
      is_bonus: false,
      bonus_note: '',
      is_active: true
    }]);
  };

  const handleDeleteDay = async (id: string, tempId: string, day: number) => {
    if (day === 1) {
      toast.error('❌ 每日基础奖励不可删除');
      return;
    }
    
    if (!id) {
      setConfigs(prev => prev.filter(c => c._tempId !== tempId));
      return;
    }
    
    const confirmed = await confirmAsync(`确定要删除第 ${day} 天的配置吗？`, { variant: 'destructive' });
    if (!confirmed) return;
    
    try {
      const { error } = await api.deleteSigninConfig(id);
      if (error) throw error;
      toast.success('✅ 已删除');
      fetchConfigs();
    } catch (e: any) {
      toast.error('删除失败: ' + e.message);
    }
  };

  const handleFieldChange = (tempId: string, field: string, value: any) => {
    setConfigs(prev => prev.map(c => c._tempId === tempId ? { ...c, [field]: value } : c));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">加载中...</p>
      </div>
    );
  }

  const dailyConfig = configs.find(c => c.day_number === 1);
  const gradientConfigs = configs.filter(c => c.day_number > 1).sort((a, b) => a.day_number - b.day_number);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">签到奖励规则配置</h2>
          <p className="text-sm text-muted-foreground mt-1">设置每日固定奖励与连续签到梯度奖励，支持自定义天数、积分区间、经验值及连续性奖励</p>
        </div>
        <Button onClick={handleUpdateConfig} disabled={saving} className="rounded-xl font-bold shadow-lg shadow-primary/20">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          保存全部配置
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="daily" className="rounded-lg px-6 font-bold">每日固定奖励</TabsTrigger>
          <TabsTrigger value="gradient" className="rounded-lg px-6 font-bold">
            <SystemText>连续签到</SystemText>梯度奖励
          </TabsTrigger>
          <TabsTrigger value="global" className="rounded-lg px-6 font-bold">全局与公众号设置</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="pt-6 space-y-6">
          <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-50/50 to-indigo-100/50 dark:from-indigo-950/10 dark:to-indigo-900/10">
            <CardHeader>
              <CardTitle className="text-lg font-black flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                <Power className="w-5 h-5" />
                签到时间设置
              </CardTitle>
              <CardDescription>控制签到功能的开放时间</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold">签到开启时间</Label>
                <Input 
                  type="time" 
                  value={globalConfig.checkin_start_time || '00:00'} 
                  onChange={e => setGlobalConfig({ ...globalConfig, checkin_start_time: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold">签到截止时间</Label>
                <Input 
                  type="time" 
                  value={globalConfig.checkin_end_time || '23:59'} 
                  onChange={e => setGlobalConfig({ ...globalConfig, checkin_end_time: e.target.value })}
                  className="rounded-xl h-12"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-gradient-to-br from-green-50/50 to-green-100/50 dark:from-green-950/10 dark:to-green-900/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-black flex items-center gap-2 text-green-700 dark:text-green-400">
                  <QrCode className="w-5 h-5" />
                  微信公众号签到设置
                </CardTitle>
                <CardDescription>开启后，用户在公众号内回复特定关键词即可签到</CardDescription>
              </div>
              <Switch 
                checked={globalConfig.wechat_checkin_enabled}
                onCheckedChange={val => setGlobalConfig({ ...globalConfig, wechat_checkin_enabled: val })}
              />
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-black/20 rounded-2xl border border-green-200/50 dark:border-green-800/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">公众号签到单独奖励</Label>
                  <p className="text-xs text-muted-foreground">开启后，通过公众号签到将使用以下独立奖励值，不再累加到常规奖励</p>
                </div>
                <Switch 
                  checked={globalConfig.wechat_checkin_separate_reward}
                  onCheckedChange={val => setGlobalConfig({ ...globalConfig, wechat_checkin_separate_reward: val })}
                />
              </div>

              {globalConfig.wechat_checkin_separate_reward && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-green-600 dark:text-green-400">公众号签到积分奖励</Label>
                    <Input 
                      type="number" 
                      value={globalConfig.wechat_points} 
                      onChange={e => setGlobalConfig({ ...globalConfig, wechat_points: parseInt(e.target.value) || 0 })}
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-green-600 dark:text-green-400">公众号签到经验值奖励</Label>
                    <Input 
                      type="number" 
                      value={globalConfig.wechat_exp} 
                      onChange={e => setGlobalConfig({ ...globalConfig, wechat_exp: parseInt(e.target.value) || 0 })}
                      className="rounded-xl h-12"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="pt-6">
          {!dailyConfig ? (
            <Card className="border-2 border-dashed border-muted/50 rounded-3xl">
              <CardContent className="p-12 text-center">
                <CalendarCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">尚未配置每日基础签到奖励</p>
                <Button onClick={() => {
                  setConfigs([...configs, {
                    day_number: 1,
                    min_points: 5,
                    max_points: 10,
                    exp_reward: 5,
                    is_bonus: false,
                    bonus_note: '',
                    is_active: true
                  }]);
                }} className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  创建每日基础奖励
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-md rounded-3xl overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="bg-primary/10 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                      <CalendarCheck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-black">每日基础签到奖励</CardTitle>
                      <CardDescription className="text-xs mt-0.5">用户每天签到时的默认奖励（不受连续天数影响）</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold text-muted-foreground">启用状态</Label>
                    <Switch 
                      checked={dailyConfig.is_active !== false} 
                      onCheckedChange={val => handleFieldChange(dailyConfig._tempId, 'is_active', val)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      最小积分奖励
                    </Label>
                    <Input 
                      type="number" 
                      value={dailyConfig.min_points} 
                      onChange={e => handleFieldChange(dailyConfig._tempId, 'min_points', parseInt(e.target.value) || 0)}
                      className="rounded-xl h-12 border-2 focus-visible:ring-primary font-bold text-lg"
                    />
                    <p className="text-[10px] text-muted-foreground ml-1">固定奖励时，最小值=最大值</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      最大积分奖励
                    </Label>
                    <Input 
                      type="number" 
                      value={dailyConfig.max_points} 
                      onChange={e => handleFieldChange(dailyConfig._tempId, 'max_points', parseInt(e.target.value) || 0)}
                      className="rounded-xl h-12 border-2 focus-visible:ring-primary font-bold text-lg"
                    />
                    <p className="text-[10px] text-muted-foreground ml-1">区间奖励时，随机取值</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      经验值奖励 (EXP)
                    </Label>
                    <Input 
                      type="number" 
                      value={dailyConfig.exp_reward} 
                      onChange={e => handleFieldChange(dailyConfig._tempId, 'exp_reward', parseInt(e.target.value) || 0)}
                      className="rounded-xl h-12 border-2 focus-visible:ring-primary font-bold text-lg"
                    />
                  </div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-bold mb-1">奖励说明</p>
                      <ul className="space-y-1 text-xs">
                        <li>• 固定奖励：设置最小值=最大值，每次签到获得相同积分</li>
                        <li>• 区间奖励：设置最小值&lt;最大值，每次签到随机获得区间内的积分</li>
                        <li>• 经验值：用于用户等级提升，独立于积分系统</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="gradient" className="pt-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black">
                <SystemText>连续签到</SystemText>梯度奖励
              </h3>
              <p className="text-xs text-muted-foreground mt-1">为<SystemText>连续签到</SystemText>的用户设置额外奖励，激励用户持续活跃</p>
            </div>
            <Button variant="outline" onClick={handleAddDay} className="rounded-xl font-bold border-2">
              <Plus className="w-4 h-4 mr-2" />
              新增梯度天数
            </Button>
          </div>

          {gradientConfigs.length === 0 && (
            <Card className="border-2 border-dashed border-muted/50 rounded-3xl">
              <CardContent className="p-20 text-center">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">暂无连续签到梯度奖励配置</p>
                <p className="text-xs text-muted-foreground mb-6">点击“新增梯度天数”开始配置连续签到奖励</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4">
            {gradientConfigs.map((config) => (
              <Card key={config._tempId || config.id} className={cn(
                "border-none shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all",
                config.is_bonus && "ring-2 ring-amber-500/30",
                !config.is_active && "opacity-50"
              )}>
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex flex-row md:flex-col items-center justify-between md:justify-center gap-4 shrink-0 px-2">
                      <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex flex-col items-center justify-center text-primary relative">
                        <span className="text-[10px] font-black uppercase tracking-tighter leading-none mb-1 opacity-70">Day</span>
                        <div className="flex items-center">
                          <Input 
                            type="number" 
                            value={config.day_number} 
                            onChange={e => handleFieldChange(config._tempId, 'day_number', parseInt(e.target.value) || 0)}
                            className="w-10 h-7 text-center bg-transparent border-none text-2xl font-black p-0 focus-visible:ring-0"
                          />
                        </div>
                        {config.is_bonus && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "transition-colors",
                            config.is_active ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                          onClick={() => handleFieldChange(config._tempId, 'is_active', !config.is_active)}
                          title={config.is_active ? "点击禁用" : "点击启用"}
                        >
                          {config.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteDay(config.id, config._tempId, config.day_number)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            最小积分奖励
                          </Label>
                          <Input 
                            type="number" 
                            value={config.min_points} 
                            onChange={e => handleFieldChange(config._tempId, 'min_points', parseInt(e.target.value) || 0)}
                            className="rounded-xl h-11 border-2 focus-visible:ring-primary font-bold"
                            disabled={!config.is_active}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            最大积分奖励
                          </Label>
                          <Input 
                            type="number" 
                            value={config.max_points} 
                            onChange={e => handleFieldChange(config._tempId, 'max_points', parseInt(e.target.value) || 0)}
                            className="rounded-xl h-11 border-2 focus-visible:ring-primary font-bold"
                            disabled={!config.is_active}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1.5 ml-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            经验值奖励 (EXP)
                          </Label>
                          <Input 
                            type="number" 
                            value={config.exp_reward} 
                            onChange={e => handleFieldChange(config._tempId, 'exp_reward', parseInt(e.target.value) || 0)}
                            className="rounded-xl h-11 border-2 focus-visible:ring-primary font-bold"
                            disabled={!config.is_active}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 p-4 bg-muted/30 rounded-2xl border border-border/40">
                        <div className="flex items-center gap-3 shrink-0">
                          <Switch 
                            checked={config.is_bonus} 
                            onCheckedChange={val => handleFieldChange(config._tempId, 'is_bonus', val)}
                            disabled={!config.is_active}
                          />
                          <Label className="font-bold text-sm cursor-pointer">设为特殊连续奖励日</Label>
                        </div>
                        {config.is_bonus && (
                          <div className="flex-1 space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1 ml-1">
                              奖励备注 / 提示语
                            </Label>
                            <Input 
                              placeholder="例如：连签满 7 天大奖！" 
                              value={config.bonus_note || ''}
                              onChange={e => handleFieldChange(config._tempId, 'bonus_note', e.target.value)}
                              disabled={!config.is_active}
                              className="rounded-xl h-10 border-amber-500/20 bg-amber-500/5 focus-visible:ring-amber-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
