import React, { useState, useEffect } from 'react';
import { confirmAsync } from '@/components/ui/confirm-dialog';
import { api } from '@/db/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { 
  Loader2, Plus, Trash2, Settings2, Info, CircleCheckBig, CircleX, 
  RefreshCw, Copy, TestTube, CircleAlert, Clock, Zap, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminLogger } from '@/hooks/useAdminLogger';
import { cn } from '@/lib/utils';
import { useConfig } from '@/contexts/ConfigContext';

// 生成随机 Token（32位）
const generateToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 32;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 生成随机 EncodingAESKey（43位）
const generateAESKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 43;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export function WechatManagementSection() {
  const { refreshConfig } = useConfig();
  const { logAction } = useAdminLogger('wechat');
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [serverIp, setServerIp] = useState('');
  const [loadingIp, setLoadingIp] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'service_auth',
    appid: '',
    appsecret: '',
    qr_code_url: '',
    token: '',
    aes_key: '',
    is_active: true,
    unsubscribe_notif_enabled: false
  });
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingQr(true);
    try {
      const { data: url, error } = await api.uploadFile('media', `wechat/qr_${Date.now()}_${file.name}`, file);
      if (error) throw error;
      setForm(prev => ({ ...prev, qr_code_url: url }));
      toast.success('二维码上传成功');
    } catch (error: any) {
      toast.error(`上传失败: ${error.message}`);
    } finally {
      setUploadingQr(false);
    }
  };
  const [serverConfig, setServerConfig] = useState<{
    type: 'miaoda' | 'supabase' | 'custom';
    baseUrl: string;
  }>({
    type: 'miaoda',
    baseUrl: 'https://backend.appmiaoda.com/projects/supabase290871706745094144'
  });
  const [savingServer, setSavingServer] = useState(false);

  useEffect(() => {
    fetchData();
    fetchServerIp();
    fetchServerConfig();
  }, []);

  const fetchServerConfig = async () => {
    try {
      const { data } = await api.getSystemConfig('wechat_server_config');
      if (data?.value) {
        setServerConfig(data.value);
      }
    } catch (error) {
      console.error('获取服务器配置失败:', error);
    }
  };

  const handleSaveServerConfig = async () => {
    setSavingServer(true);
    try {
      const { error } = await api.updateSystemConfig('wechat_server_config', serverConfig);
      if (error) throw error;
      await refreshConfig();
      toast.success('服务器配置已保存');
      logAction('更新微信服务器配置', serverConfig);
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    } finally {
      setSavingServer(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: configsData }, { data: serverConfigData }] = await Promise.all([
        api.getWechatConfigs(),
        api.getSystemConfig('wechat_server_config')
      ]);

      setConfigs(configsData || []);
      if (configsData && configsData.length > 0 && !selectedConfig) {
        setSelectedConfig(configsData[0]);
      }

      if (serverConfigData?.value) {
        setServerConfig(serverConfigData.value);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServerIp = async () => {
    setLoadingIp(true);
    try {
      const { data } = await api.supabase.functions.invoke('get-server-ip');
      if (data?.ip) {
        setServerIp(data.ip);
      }
    } catch (error) {
      console.error('获取服务器 IP 失败:', error);
    } finally {
      setLoadingIp(false);
    }
  };

  const handleOpenAdd = () => {
    setForm({
      name: '',
      type: 'service_auth',
      appid: '',
      appsecret: '',
      qr_code_url: '',
      token: generateToken(),
      aes_key: generateAESKey(),
      is_active: true,
      unsubscribe_notif_enabled: false
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (config: any) => {
    setEditingId(config.id);
    setForm({
      name: config.name,
      type: config.type,
      appid: config.appid,
      appsecret: config.appsecret,
      qr_code_url: config.qr_code_url || '',
      token: config.token || '',
      aes_key: config.aes_key || '',
      is_active: config.is_active,
      unsubscribe_notif_enabled: config.unsubscribe_notif_enabled || false
    });
    setIsEditOpen(true);
  };

  const handleSave = async (isNew: boolean) => {
    if (!form.name || !form.appid || !form.appsecret) {
      return toast.error('请填写完整信息');
    }
    
    if (!form.appid.startsWith('wx') || form.appid.length < 10) {
      return toast.error('AppID 格式不正确，应以 wx 开头');
    }
    
    setSaving(true);
    try {
      let error, data;
      if (isNew) {
        const result = await api.createWechatConfig(form);
        error = result.error;
        data = result.data;
        if (!error) {
          toast.success('配置已添加');
          logAction('添加微信配置', form);
          setIsAddOpen(false);
        }
      } else if (editingId) {
        const result = await api.updateWechatConfig(editingId, form);
        error = result.error;
        data = result.data;
        if (!error) {
          toast.success('配置已更新');
          logAction('更新微信配置', { id: editingId, ...form });
          setIsEditOpen(false);
          setEditingId(null);
        }
      }
      
      if (error) {
        console.error('保存微信配置失败:', error);
        throw new Error(error.message || '保存失败');
      }
      
      fetchData();
    } catch (error: any) {
      console.error('保存微信配置异常:', error);
      toast.error(`保存失败: ${error.message || '未知错误'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAsync('确定删除此微信配置？', { variant: 'destructive' });
    if (!confirmed) return;
    try {
      const { error } = await api.deleteWechatConfig(id);
      if (error) throw error;
      toast.success('配置已删除');
      if (selectedConfig?.id === id) {
        setSelectedConfig(null);
      }
      fetchData();
      logAction('删除微信配置', { id });
    } catch (error: any) {
      toast.error(`删除失败: ${error.message}`);
    }
  };

  const handleTestConnection = async (config: any) => {
    if (!config.token) {
      return toast.error('请先生成并保存 Token');
    }

    console.log('Testing connection for config:', config.id);
    setTesting(true);
    try {
      const { data, error } = await api.testWechatConnection(config.id);
      
      if (error) {
        console.error('Edge Function invoke error:', error);
        let errorMsg = error.message;
        if (error.context && typeof error.context.text === 'function') {
          try {
            errorMsg = typeof error?.context?.text === 'function' ? await error.context.text() : error?.message;
          } catch (e) {
            console.error('Failed to get error context text:', e);
          }
        }
        console.error('连通性测试失败详情:', errorMsg);
        await api.updateWechatTestStatus(config.id, 'failed', errorMsg);
        throw new Error(errorMsg || '测试失败');
      }

      if (data?.success) {
        toast.success(data.message || '连通性测试成功！');
        await api.updateWechatTestStatus(config.id, 'success', '连接成功');
        logAction('测试微信连通性', { configId: config.id, success: true });
      } else {
        toast.error(data?.message || '连通性测试失败');
        await api.updateWechatTestStatus(config.id, 'failed', data?.message || '连接失败');
        console.error('测试详情:', data?.details);
      }
      
      fetchData();
    } catch (error: any) {
      console.error('测试连通性异常:', error);
      toast.error(`测试失败: ${error.message || '未知错误'}`);
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('已复制到剪贴板');
  };

  const getCallbackUrl = (configId: string) => {
    const baseUrl = serverConfig.baseUrl || 'https://backend.appmiaoda.com/projects/supabase290871706745094144';
    // 确保没有多余的斜杠
    const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${sanitizedBaseUrl}/functions/v1/wechat-callback?config_id=${configId}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '/');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">载入微信配置...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">微信公众号配置</h2>
          <p className="text-muted-foreground mt-1">管理微信公众号的 AppID 和 AppSecret 配置</p>
        </div>
        <Button 
          onClick={handleOpenAdd} 
          disabled={configs.length >= 2}
          className="rounded-xl font-bold bg-green-500 hover:bg-green-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增配置
        </Button>
      </div>

      {/* 服务器 URL 配置区域 */}
      <Card className="rounded-3xl border-none shadow-sm bg-primary/5 border border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-black flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            微信服务器地址配置
          </CardTitle>
          <CardDescription>
            选择或输入当前使用的 Supabase/秒哒服务器地址，确认后全站回调路径将同步更新
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">服务器类型</Label>
              <Select 
                value={serverConfig.type} 
                onValueChange={(val: any) => {
                  let url = '';
                  if (val === 'miaoda') url = 'https://backend.appmiaoda.com/projects/supabase290871706745094144';
                  else if (val === 'supabase') url = import.meta.env.VITE_SUPABASE_URL || '';
                  else url = serverConfig.baseUrl;
                  setServerConfig({ type: val, baseUrl: url });
                }}
              >
                <SelectTrigger className="rounded-xl border-none bg-background shadow-none">
                  <SelectValue placeholder="选择服务器" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-xl">
                  <SelectItem value="miaoda">秒哒服务器 (推荐)</SelectItem>
                  <SelectItem value="supabase">Supabase 官方服务器</SelectItem>
                  <SelectItem value="custom">手动输入地址</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-60">服务器基础地址 (Base URL)</Label>
              <div className="flex gap-2">
                <Input 
                  value={serverConfig.baseUrl}
                  onChange={(e) => setServerConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  disabled={serverConfig.type !== 'custom'}
                  placeholder="https://your-server.supabase.co"
                  className="rounded-xl border-none bg-background shadow-none flex-1 font-mono text-sm"
                />
                <Button 
                  onClick={handleSaveServerConfig}
                  disabled={savingServer}
                  className="rounded-xl px-6 font-bold"
                >
                  {savingServer ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  确认生效
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-xs text-primary/80 leading-relaxed">
              <p className="font-bold mb-1">提示：回调地址会自动拼接云函数路径</p>
              <p>当前生成的回调示例：<code className="bg-primary/20 px-1 rounded font-mono">{getCallbackUrl('config_id_here')}</code></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 配置列表表格 */}
      <Card className="rounded-3xl border-none shadow-sm">
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-black">配置名称</TableHead>
                <TableHead className="font-black">AppID</TableHead>
                <TableHead className="font-black">状态</TableHead>
                <TableHead className="font-black">测试状态</TableHead>
                <TableHead className="font-black">最后测试时间</TableHead>
                <TableHead className="font-black text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.length > 0 ? configs.map((config) => (
                <TableRow 
                  key={config.id}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedConfig?.id === config.id && "bg-primary/5"
                  )}
                  onClick={() => setSelectedConfig(config)}
                >
                  <TableCell className="font-bold">{config.name}</TableCell>
                  <TableCell className="font-mono text-xs">{config.appid}</TableCell>
                  <TableCell>
                    {config.is_active ? (
                      <Badge className="bg-green-500/10 text-green-600 border-none">启用</Badge>
                    ) : (
                      <Badge variant="outline">禁用</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {config.test_status === 'success' ? (
                      <Badge className="bg-green-500/10 text-green-600 border-none flex items-center gap-1 w-fit">
                        <CircleCheckBig className="w-3 h-3" />
                        连接成功
                      </Badge>
                    ) : config.test_status === 'failed' ? (
                      <Badge className="bg-red-500/10 text-red-600 border-none flex items-center gap-1 w-fit">
                        <CircleX className="w-3 h-3" />
                        连接失败
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Clock className="w-3 h-3" />
                        未测试
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(config.last_test_time)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(config);
                        }}
                        disabled={testing}
                        className="rounded-xl h-8 text-xs"
                      >
                        {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(config);
                        }}
                        className="rounded-xl h-8 text-xs"
                      >
                        <Settings2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(config.id);
                        }}
                        className="rounded-xl h-8 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <p className="font-bold">暂无配置</p>
                    <p className="text-xs mt-1">点击右上方按钮添加微信公众号配置</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 微信服务器配置 */}
      {selectedConfig && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">微信服务器配置</CardTitle>
                <CardDescription>将以下信息配置到微信公众平台的"服务器配置"中</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-bold">{selectedConfig.name}</Badge>
                {selectedConfig.is_active && (
                  <Badge className="bg-green-500/10 text-green-600 border-none font-bold">当前启用</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 服务器 URL */}
            <div className="space-y-2">
              <Label className="font-black text-sm flex items-center justify-between">
                服务器 URL
                <Badge variant="outline" className="text-[10px] font-bold text-primary">重要：必须完整复制</Badge>
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={getCallbackUrl(selectedConfig.id)} 
                  readOnly
                  className="rounded-2xl h-12 bg-muted/30 font-mono text-xs overflow-x-auto"
                  title={getCallbackUrl(selectedConfig.id)}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-12 w-12 rounded-2xl shrink-0"
                  onClick={() => copyToClipboard(getCallbackUrl(selectedConfig.id))}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 text-xs text-blue-700">
                <p className="font-bold mb-1">这是 Supabase Edge Function 的完整访问地址。必须完整复制此 URL（包含 config_id 参数）到微信公众平台。支持 80 端口和 443 端口。</p>
                <p className="text-[11px]">提示：浏览器直接访问此 URL 会显示"Missing parameters"或"页面未找到"，这是正常的。微信服务器访问时会自动带上验证参数（signature、timestamp、nonce、echostr）。</p>
              </div>
            </div>

            {/* Token */}
            <div className="space-y-2">
              <Label className="font-black text-sm">Token</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={selectedConfig.token || '未配置'} 
                  readOnly
                  className="rounded-2xl h-12 bg-muted/30 font-mono"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-12 w-12 rounded-2xl shrink-0"
                  onClick={() => copyToClipboard(selectedConfig.token || '')}
                  disabled={!selectedConfig.token}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground ml-1">3-32 位字符，用于验证消息来源</p>
            </div>

            {/* EncodingAESKey */}
            <div className="space-y-2">
              <Label className="font-black text-sm">EncodingAESKey</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={selectedConfig.aes_key || '未配置'} 
                  readOnly
                  className="rounded-2xl h-12 bg-muted/30 font-mono text-xs"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-12 w-12 rounded-2xl shrink-0"
                  onClick={() => copyToClipboard(selectedConfig.aes_key || '')}
                  disabled={!selectedConfig.aes_key}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground ml-1">43 位字符，用于消息加密</p>
            </div>

            {/* 消息加密模式 */}
            <div className="space-y-2">
              <Label className="font-black text-sm">消息加密模式</Label>
              <div className="bg-muted/30 rounded-2xl p-4">
                <p className="text-sm font-bold">明文模式</p>
                <p className="text-xs text-muted-foreground mt-1">推荐使用安全模式，需要在微信公众平台配置 EncodingAESKey</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 服务器信息 */}
      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black">服务器信息</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchServerIp}
              disabled={loadingIp}
              className="rounded-xl h-8 text-xs"
            >
              {loadingIp ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <RefreshCw className="w-3 h-3 mr-1.5" />}
              刷新 IP
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-black text-sm">服务器出口 IP</Label>
            <div className="flex items-center gap-2">
              <Input 
                value={serverIp || '获取中...'} 
                readOnly
                className="rounded-2xl h-12 bg-muted/30 font-mono"
              />
              <Button 
                variant="outline" 
                size="icon"
                className="h-12 w-12 rounded-2xl shrink-0"
                onClick={() => copyToClipboard(serverIp)}
                disabled={!serverIp}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-xs text-amber-700">
              <p className="font-bold mb-1">在微信公众平台配置 IP 白名单时使用此 IP 地址。如果自动获取失败，可访问 ifconfig.me 手动查询。</p>
              <p className="text-[11px]">重要提示：如果微信服务器验证失败，请在微信公众平台的"开发" → "基本配置" → "IP白名单"中添加此 IP 地址。</p>
            </div>
          </div>

          <div className="bg-muted/30 rounded-2xl p-4 space-y-2">
            <p className="font-bold text-sm">常见错误码：</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 40013 (invalid appid)：AppID 错误，请在微信公众平台重新复制 AppID</li>
              <li>• 40001 (invalid credential)：AppSecret 错误，请检查或重置 AppSecret</li>
              <li>• 200302 (verify token fail)：Token 验证失败，检查 Token 是否一致、IP 是否在白名单</li>
              <li>• 40164 (invalid ip)：IP 未添加到白名单，请添加服务器 IP</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* 配置说明 */}
      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-black">配置说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="font-bold text-sm mb-2">第一步：基本配置</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>在微信公众平台获取 AppID 和 AppSecret</li>
                <li>点击"新增配置"添加微信公众号配置</li>
                <li>填写配置名称、AppID 和 AppSecret</li>
                <li>系统会自动生成 Token 和 EncodingAESKey</li>
              </ol>
            </div>

            <div>
              <p className="font-bold text-sm mb-2">第二步：测试连接</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside" start={5}>
                <li>保存配置后，点击"测试连接"验证 AppID 和 AppSecret 是否正确</li>
                <li>确保测试状态显示"连接成功"</li>
              </ol>
            </div>

            <div>
              <p className="font-bold text-sm mb-2">第三步：配置微信服务器</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside" start={7}>
                <li>复制"服务器 URL"、"Token"和"EncodingAESKey"</li>
                <li>登录微信公众平台，进入"开发" → "基本配置" → "服务器配置"</li>
                <li>粘贴 Token 时，确保完全一致，不能有多余空格</li>
                <li>选择对应的加密模式和数据格式（XML）</li>
                <li>点击"提交"完成配置</li>
              </ol>
            </div>

            <div>
              <p className="font-bold text-sm mb-2">第四步：配置 IP 白名单（重要）</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside" start={12}>
                <li>在"服务器信息"卡片中复制服务器出口 IP</li>
                <li>在微信公众平台，进入"开发" → "基本配置" → "IP白名单"</li>
                <li>点击"修改"，添加复制的 IP 地址</li>
                <li>保存后，微信服务器才能正常访问您的服务器</li>
              </ol>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <CircleAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 space-y-2">
                <p className="font-bold">注意事项</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>同一时间只能启用一个配置</li>
                  <li>Token 必须与系统中的完全一致（区分大小写）</li>
                  <li>Token 必须为 3-32 位字母或数字</li>
                  <li>EncodingAESKey 必须为 43 位字符</li>
                  <li>推荐使用安全模式进行消息加密</li>
                  <li>数据格式必须选择 XML</li>
                  <li>必须配置 IP 白名单，否则验证会失败</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 诊断与交互指南 */}
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-black flex items-center gap-2 text-indigo-600">
            <Zap className="w-5 h-5" />
            微信交互与诊断指南
          </CardTitle>
          <CardDescription>了解系统预设的指令及常见问题排查</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="font-bold text-sm">常用指令说明</p>
              <div className="space-y-2">
                <div className="p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-indigo-700">登录验证码</span>
                    <Badge className="bg-indigo-100 text-indigo-700 text-[9px] border-none font-bold px-2 py-0.5">指令: 登录 / dl</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">用户在公众号发送上述指令后，系统将返回 6 位数字验证码，用于 H5 端登录或绑定账号。</p>
                </div>
                <div className="p-3 rounded-2xl bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-green-700">系统指引</span>
                    <Badge className="bg-green-100 text-green-700 text-[9px] border-none font-bold px-2 py-0.5">指令: 帮助 / help / ?</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">系统将返回常用指令列表及操作指引，帮助用户了解公众号功能。</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-bold text-sm">常见问题排查</p>
              <div className="space-y-2 text-[11px] text-muted-foreground">
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <p><b>为什么粉丝没有昵称？</b><br/>只有认证过的服务号才有权限拉取用户昵称和头像。未认证账号或订阅号通常只能获取 OpenID，昵称将显示为“微信用户”。</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <p><b>为什么粉丝同步没有记录？</b><br/>请确保公众号账号类型设置正确。全量同步会拉取所有粉丝，同步完成后，系统会记录同步数量。如果粉丝列表为空，请检查 AppID 和 AppSecret 是否配置正确。</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  <p><b>用户收不到回复？</b><br/>请检查“服务器配置”是否已在微信后台<b>启用</b>。配置提交成功后，微信不会自动启用，需要管理员手动点击启用按钮。</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 添加/编辑对话框 */}
      <Dialog 
        open={isAddOpen || isEditOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setIsEditOpen(false);
            setEditingId(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{isAddOpen ? '新增配置' : '编辑配置'}</DialogTitle>
            <DialogDescription>请输入微信公众平台获取的开发者凭据</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs">配置名称</Label>
                <Input 
                  placeholder="例如: 官方订阅号" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="rounded-2xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs">账号类型</Label>
                <Select 
                  value={form.type} 
                  onValueChange={v => setForm({...form, type: v})}
                >
                  <SelectTrigger className="rounded-2xl h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="service_auth" className="rounded-xl">认证服务号</SelectItem>
                    <SelectItem value="subscription_unauth" className="rounded-xl">未认证订阅号</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-xs">AppID</Label>
              <Input 
                placeholder="wx1234567890abcdef" 
                value={form.appid} 
                onChange={e => setForm({...form, appid: e.target.value})}
                className="rounded-2xl h-11 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-xs">AppSecret</Label>
              <Input 
                type="text"
                placeholder="微信提供的 32 位密钥" 
                value={form.appsecret} 
                onChange={e => setForm({...form, appsecret: e.target.value})}
                className="rounded-2xl h-11 font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-xs">公众号二维码</Label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center overflow-hidden border border-border">
                  {form.qr_code_url ? (
                    <img referrerPolicy="no-referrer" src={form.qr_code_url} alt="QR" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-muted-foreground text-[10px] text-center px-1">未上传</div>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <Input 
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="h-9 rounded-xl text-xs"
                    disabled={uploadingQr}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {form.type === 'service_auth' ? '认证服务号可自动生成场景码，也可手动上传固定码作为备用' : '未认证订阅号必须上传固定二维码'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-xs">Token</Label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setForm({...form, token: generateToken()})}
                  className="h-7 rounded-xl text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  重新生成
                </Button>
              </div>
              <Input 
                value={form.token} 
                onChange={e => setForm({...form, token: e.target.value})}
                className="rounded-2xl h-11 font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-xs">EncodingAESKey</Label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setForm({...form, aes_key: generateAESKey()})}
                  className="h-7 rounded-xl text-xs"
                >
                  <Zap className="w-3 h-3 mr-1.5" />
                  重新生成
                </Button>
              </div>
              <Input 
                value={form.aes_key} 
                onChange={e => setForm({...form, aes_key: e.target.value})}
                className="rounded-2xl h-11 font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-2xl">
              <Label className="font-bold text-sm">启用配置</Label>
              <Switch 
                checked={form.is_active} 
                onCheckedChange={checked => setForm({...form, is_active: checked})}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-2xl">
              <Label className="font-bold text-sm flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-indigo-500" />
                取消关注提醒
              </Label>
              <Switch 
                checked={form.unsubscribe_notif_enabled} 
                onCheckedChange={checked => setForm({...form, unsubscribe_notif_enabled: checked})}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button 
              variant="ghost" 
              onClick={() => { setIsAddOpen(false); setIsEditOpen(false); }} 
              className="flex-1 rounded-xl h-11"
            >
              取消
            </Button>
            <Button 
              onClick={() => handleSave(isAddOpen)} 
              disabled={saving} 
              className="flex-1 rounded-xl h-11 bg-primary font-bold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isAddOpen ? '立即添加' : '保存修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
