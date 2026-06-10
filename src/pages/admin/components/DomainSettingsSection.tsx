import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Globe, Plus, Trash2, Save, Loader2, CircleAlert, 
  CircleCheckBig, ShieldCheck, Link2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DomainConfig {
  id: string;
  domain_url: string;
  identifier: string;
  is_active: boolean;
  created_at: string;
}

export function DomainSettingsSection() {
  const [domains, setDomains] = useState<DomainConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newDomain, setNewDomain] = useState({ domain_url: '', identifier: '' });

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setLoading(true);
    const { data, error } = await api.getDomainConfigs();
    
    if (error) {
      toast.error('获取域名配置失败: ' + error.message);
    } else {
      setDomains(data || []);
    }
    setLoading(false);
  };

  const handleAddDomain = async () => {
    if (!newDomain.domain_url || !newDomain.identifier) {
      return toast.error('请填写完整域名和标识');
    }

    // 格式校验
    if (!newDomain.domain_url.startsWith('http')) {
      return toast.error('域名必须以 http:// 或 https:// 开头');
    }

    setSaving(true);
    const { data, error } = await api.addDomainConfig(newDomain);

    if (error) {
      toast.error('添加失败: ' + error.message);
    } else {
      if (data) {
        setDomains([...domains, data]);
        setNewDomain({ domain_url: '', identifier: '' });
        toast.success('域名配置已添加');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    }
    setSaving(false);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error, data } = await api.updateDomainConfig(id, { is_active: !currentStatus });

    if (error) {
      toast.error('更新失败: ' + error.message);
    } else {
      setDomains(domains.map(d => d.id === id ? { ...d, is_active: !currentStatus } : d));
      toast.success(currentStatus ? '配置已停用' : '配置已启用');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    const confirmed = await confirmAsync('确定要删除此域名配置吗？', { variant: 'destructive' });
    if (!confirmed) return;

    const { error } = await api.deleteDomainConfig(id);

    if (error) {
      toast.error('删除失败: ' + error.message);
    } else {
      setDomains(domains.filter(d => d.id !== id));
      toast.success('域名配置已删除');
      setTimeout(() => {
        window.location.reload();
      }, 500);
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            多域名映射配置
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            为系统配置多个访问域名，支持微信登录回调地址根据来源域名动态适配。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-sm overflow-hidden rounded-3xl">
          <CardHeader className="bg-slate-50/50 pb-4">
            <CardTitle className="text-lg font-black">已配置域名列表</CardTitle>
            <CardDescription>当前系统支持的所有有效访问域名</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {domains.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Link2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  暂无域名配置，请在右侧添加。
                </div>
              ) : (
                domains.map((domain) => (
                  <div key={domain.id} className="p-6 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm",
                        domain.is_active ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                      )}>
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{domain.domain_url}</span>
                          <Badge variant="secondary" className="rounded-md font-mono text-[10px] h-5 px-1.5">
                            {domain.identifier}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          ID: {domain.id}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${domain.id}`} className="text-xs text-muted-foreground">启用</Label>
                        <Switch 
                          id={`active-${domain.id}`}
                          checked={domain.is_active}
                          onCheckedChange={() => handleToggleActive(domain.id, domain.is_active)}
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        onClick={() => handleDeleteDomain(domain.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl h-fit">
          <CardHeader>
            <CardTitle className="text-lg font-black">新增域名映射</CardTitle>
            <CardDescription>添加新的访问域名并指定唯一标识</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">域名地址 (Site URL)</Label>
              <Input 
                placeholder="https://your-domain.com"
                value={newDomain.domain_url}
                onChange={(e) => setNewDomain({ ...newDomain, domain_url: e.target.value })}
                className="rounded-xl border-slate-200"
              />
              <p className="text-[10px] text-muted-foreground ml-1">
                注意：请包含协议 (http/https)，末尾不要加斜杠。
              </p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">域名标识 (Identifier)</Label>
              <Input 
                placeholder="如 site_a"
                value={newDomain.identifier}
                onChange={(e) => setNewDomain({ ...newDomain, identifier: e.target.value })}
                className="rounded-xl border-slate-200"
              />
              <p className="text-[10px] text-muted-foreground ml-1">
                用于在数据库中区分不同域名的业务记录。
              </p>
            </div>

            <Button 
              className="w-full rounded-2xl font-bold gap-2 mt-4" 
              onClick={handleAddDomain}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              添加映射配置
            </Button>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 mt-4">
              <CircleAlert className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-[11px] text-amber-700 leading-relaxed">
                <p className="font-bold mb-1">提示信息</p>
                多域名适配逻辑会自动根据用户访问的域名匹配此处配置。如果用户访问的域名未在此处配置，系统将尝试匹配第一个已启用的域名作为默认值。
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-3xl bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-black text-slate-800">开发者说明</h4>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                本系统采用动态域名适配方案。当用户发起微信登录或其它需要回调地址的操作时，前端会自动提取 <code className="bg-slate-100 px-1 rounded text-primary">window.location.host</code> 传回后台。
                后台 Edge Function 会优先匹配此处配置的 <code className="bg-slate-100 px-1 rounded text-primary">domain_url</code>，并据此生成正确的回调链接。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <CircleCheckBig className="w-4 h-4 text-emerald-500" />
                  支持微信回调地址动态指向
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <CircleCheckBig className="w-4 h-4 text-emerald-500" />
                  支持多域名共享 Supabase 后端
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <CircleCheckBig className="w-4 h-4 text-emerald-500" />
                  自动识别并拦截非法请求域名
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <CircleCheckBig className="w-4 h-4 text-emerald-500" />
                  业务记录关联域名标识存储
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
