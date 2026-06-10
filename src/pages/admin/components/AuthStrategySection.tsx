import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Users, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { api } from '@/db/api';

export function AuthStrategySection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    strategy: 'supabase' as 'supabase' | 'custom' | 'hybrid',
    sync_to_auth: true
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data } = await api.getLoginStrategyConfig();
      if (data) {
        setConfig(data);
      }
    } catch (e: any) {
      toast.error('获取认证策略配置失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await api.updateLoginStrategyConfig(config);
      if (error) throw error;
      toast.success('认证策略配置已保存');
    } catch (e: any) {
      toast.error('保存失败: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" /> 认证与登录策略
          </CardTitle>
          <CardDescription>
            控制全站用户的注册与登录方式。您可以选择使用 Supabase 官方认证，或者使用本地用户表存储的直接登录方式。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-8">
          <div className="space-y-4">
            <Label className="text-base font-bold">登录与注册策略</Label>
            <RadioGroup 
              value={config.strategy} 
              onValueChange={(val: any) => setConfig({ ...config, strategy: val })}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              <div className="relative">
                <RadioGroupItem value="supabase" id="strat-supabase" className="peer sr-only" />
                <Label
                  htmlFor="strat-supabase"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all text-center h-full"
                >
                  <Users className="w-6 h-6 mb-2 text-primary" />
                  <span className="font-bold">Supabase Auth</span>
                  <p className="text-[10px] text-muted-foreground mt-1">使用 Supabase 官方 Auth 服务，安全可靠但受网络或配置影响</p>
                </Label>
              </div>

              <div className="relative">
                <RadioGroupItem value="hybrid" id="strat-hybrid" className="peer sr-only" />
                <Label
                  htmlFor="strat-hybrid"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all text-center h-full"
                >
                  <LinkIcon className="w-6 h-6 mb-2 text-primary" />
                  <span className="font-bold">混合模式 (推荐)</span>
                  <p className="text-[10px] text-muted-foreground mt-1">优先使用 Supabase，失败时回退到本地表验证，确保登录始终可用</p>
                </Label>
              </div>

              <div className="relative">
                <RadioGroupItem value="custom" id="strat-custom" className="peer sr-only" />
                <Label
                  htmlFor="strat-custom"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all text-center h-full"
                >
                  <ShieldCheck className="w-6 h-6 mb-2 text-primary" />
                  <span className="font-bold">本地表直登</span>
                  <p className="text-[10px] text-muted-foreground mt-1">完全绕过 Supabase Auth，仅使用本地 profiles 表存储加密密码</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-4 p-4 rounded-2xl bg-amber-50 border border-amber-100">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 p-2 rounded-lg mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <Label className="font-bold text-amber-900">数据互通与自动同步</Label>
                  <p className="text-xs text-amber-700 mt-0.5">开启后，本地注册将自动尝试在 Supabase Auth 同步创建账号，反之亦然。</p>
                </div>
              </div>
              <Switch 
                checked={config.sync_to_auth} 
                onCheckedChange={(val) => setConfig({ ...config, sync_to_auth: val })}
              />
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
            <div className="text-xs text-muted-foreground leading-relaxed">
              <p className="font-bold text-primary mb-1">提示：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>切换策略后对新登录或注册即时生效。</li>
                <li>本地直登模式使用本地数据库加密存储，支持设置简单密码。</li>
                <li>混合模式能有效应对 Supabase Auth 服务暂时不可用或邮件系统故障的情况。</li>
              </ul>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 p-4 border-t flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-xl bg-primary hover:bg-primary/90 px-8"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            保存策略设置
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
