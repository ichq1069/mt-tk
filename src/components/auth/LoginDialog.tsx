import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/db/api';
import { supabase } from '@/db/supabase';
import type { UserFieldConfig, StorageConfig } from '@/types';
import { CustomFieldRenderer } from '@/pages/admin/components/UserFieldsSection';

import { 
  Loader2, Phone, ShieldCheck, UserPlus, Link, AlertCircle, ChevronRight, Info, QrCode, ArrowRight, Lock, Image as ImageIcon, X, Mail, RefreshCw
} from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { getCurrentDomain } from '@/lib/domain';

export function LoginDialog() {
  const { 
    isLoginDialogOpen, 
    closeLoginDialog, 
    loginDialogTab,
    signInWithUsername,
    signUpWithUsername,
    user
  } = useAuth();

  const [searchParams] = useSearchParams();
  const urlOpenid = searchParams.get('openid');

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'wechat' | 'miniprogram'>(loginDialogTab === 'register' ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 微信相关
  const [wechatConfigs, setWechatConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [bindCode, setBindCode] = useState('');
  const [qrCodeOpen, setQrCodeOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<any>(null);
  const [wechatVerifiedData, setWechatVerifiedData] = useState<any>(null);
  const [isAccountSelectionOpen, setIsAccountSelectionOpen] = useState(false);
  const [accountAction, setAccountAction] = useState<'bind' | 'create' | null>(null);

  const handleBindAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error('请输入账户名和密码');
    
    setLoading(true);
    try {
      // 1. 先登录
      const { error: loginError } = await signInWithUsername(username, password);
      if (loginError) throw loginError;
      
      // 2. 获取当前用户 ID (AuthContext 会异步更新，这里我们直接从 supabase 获取更稳妥)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('登录成功但无法获取用户信息');

      // 3. 执行绑定
      if (wechatVerifiedData?.type === 'miniprogram') {
        const { data, error } = await supabase.functions.invoke('wechat-miniprogram', {
          body: { 
            action: 'mp_bind', 
            openid: wechatVerifiedData.openid, 
            userId: user.id,
            ticket: ticket // 如果是扫码登录
          }
        });
        if (error || !data?.success) throw new Error(data?.message || '绑定失败');
      } else {
        // 公众号绑定
        const { data, error } = await supabase.functions.invoke('auth-sms/bind', {
          body: { 
            openid: wechatVerifiedData?.openid, 
            userId: user.id,
            configId: selectedConfigId
          }
        });
        if (error || !data?.success) throw new Error(data?.message || '绑定失败');
      }

      toast.success('绑定并登录成功');
      closeLoginDialog();
    } catch (e: any) {
      toast.error(`操作失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndLogin = async () => {
    // 切换到注册标签并带入 openid 逻辑
    // 实际上通常可以直接调用注册接口，然后在 metadata 里带上 openid，由数据库触发器或 Edge Function 处理绑定
    setActiveTab('register');
    setIsAccountSelectionOpen(false);
    setAccountAction(null);
    toast.info('请填写注册信息，注册后将自动为您绑定微信');
    // 在 customData 中存入 openid 以便后续使用 (如果有的话)
    if (wechatVerifiedData?.openid) {
      setCustomData(prev => ({ ...prev, bind_openid: wechatVerifiedData.openid, bind_type: wechatVerifiedData.type }));
    }
  };

  const [registerFields, setRegisterFields] = useState<UserFieldConfig[]>([]);
  const [customData, setCustomData] = useState<Record<string, any>>({});
  const [inviteCode, setInviteCode] = useState('');
  const [sysConfig, setSysConfig] = useState<Partial<StorageConfig> | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [loginSettings, setLoginSettings] = useState<{wechat: boolean, email: boolean, phone: boolean}>({ wechat: true, email: true, phone: false });

  const [mpConfig, setMpConfig] = useState<any>(null);
  const [mpQrData, setMpQrData] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [mpQrScene, setMpQrScene] = useState<string | null>(null);
  const [mpQrPage, setMpQrPage] = useState<string | null>(null);
  const [mpDebugConfig, setMpDebugConfig] = useState<any>(null);


  useEffect(() => {
    if (isLoginDialogOpen) {
      setActiveTab(loginDialogTab === 'register' ? 'register' : 'login');
      fetchRegisterFields();
      fetchSysConfig();
      fetchWechatConfigs();
      fetchMpConfig();
    }
  }, [isLoginDialogOpen, loginDialogTab]);

  const fetchMpConfig = async () => {
    try {
      const { data } = await api.getMiniProgramConfig();
      setMpConfig(data);
    } catch (e) {
      console.error('Fetch MP config error:', e);
    }
  };

  const handleMpLoginTab = async () => {
    setActiveTab('miniprogram' as any);
    if (!mpQrData) {
      generateMpLoginQr();
    }
  };

  const generateMpLoginQr = async () => {
    setMpQrData(null); // 重置二维码，显示加载状态
    try {
      const newTicket = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setTicket(newTicket);
      
      // 创建 login_ticket 记录
      await (supabase.from('login_tickets') as any).insert({
        ticket: newTicket,
        status: 'pending'
      });

      const mpIdentifier = sysConfig?.mp_domain_identifier || 'miaoda';
      const { data, error } = await api.generateMiniProgramQr(newTicket, 'login', undefined, mpIdentifier);
      if (error) throw error;
      
      if (data && data.success) {
        setMpQrData(data.qr_data);
        setMpQrScene(data.scene);
        setMpQrPage(data.page);
        startPollingTicket(newTicket);
        // 获取调试配置
        if (!mpDebugConfig) {
          const { data: config } = await api.getPublicMiniProgramConfig();
          setMpDebugConfig(config);
        }
      } else {
        throw new Error(data?.message || '生成二维码失败');
      }
    } catch (e: any) {
      console.error('Generate MP login QR error:', e);
      toast.error('生成小程序码失败: ' + (e.message || '请检查后台配置'));
    }
  };

  const startPollingTicket = (t: string) => {
    if (pollInterval) clearInterval(pollInterval);
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('login_tickets')
        .select('*, profiles(*)')
        .eq('ticket', t)
        .maybeSingle();
      
      if (data && (data as any).status === 'fulfilled' && (data as any).user_id) {
        clearInterval(interval);
        setPollInterval(null);
        handleTicketLogin((data as any).user_id);
      } else if (data && (data as any).status === 'fulfilled' && (data as any).openid) {
        // 如果只有 openid，说明是新用户且未自动注册
        clearInterval(interval);
        setPollInterval(null);
        setWechatVerifiedData({ openid: (data as any).openid, type: 'miniprogram' });
        setIsAccountSelectionOpen(true);
      }
    }, 3000);
    setPollInterval(interval);
  };

  const handleTicketLogin = async (userId: string) => {
    setLoading(true);
    try {
      // 获取用户 profiles 并模拟登录
      // 这里的逻辑通常是通过一个一次性 Token 或者是直接设置 Session
      // 由于 Supabase auth.setSession 需要 AccessToken
      // 我们需要在 Edge Function 中生成一个 AccessToken 并返回给 H5
      // 简化版：这里可以通过 rpc 或特殊的 api 获得一个临时登录链接
      
      // 我们在 login_tickets 中已经有了 user_id
      // 理想方案是在 Edge Function 中生成签名并让 H5 调用 supabase.auth.setSession
      
      // 暂时用 toast 提示，实际应用中这里需要完善安全登录链路
      toast.success('扫码成功，正在为您登录...');
      // 重新获取 session 以触发 AuthContext 的状态变化
      // 如果后端支持根据 userId 签发 JWT
      const { data, error } = await supabase.functions.invoke('wechat-miniprogram', {
        body: { action: 'get_login_token', userId }
      });
      
      if (data?.access_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        toast.success('登录成功');
        closeLoginDialog();
      } else if (data?.token_hash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'magiclink'
        });
        if (otpError) throw otpError;
        toast.success('登录成功');
        closeLoginDialog();
      } else {
        throw new Error(data?.message || '获取登录凭证失败');
      }
    } catch (e: any) {
      toast.error('登录失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  // 如果用户已登录，自动关闭弹窗
  useEffect(() => {
    if (user && isLoginDialogOpen) {
      closeLoginDialog();
    }
  }, [user, isLoginDialogOpen]);

  const fetchWechatConfigs = async () => {
    const { data } = await api.getWechatConfigs();
    setWechatConfigs(data || []);
    if (data && data.length > 0) {
      setSelectedConfigId(data[0].id);
    }
  };

  const fetchSysConfig = async () => {
    const [configRes, settingsRes] = await Promise.all([
      api.getStorageConfig(),
      api.getLoginSettings()
    ]);
    setSysConfig(configRes.data);
    if (settingsRes.data) setLoginSettings(settingsRes.data);
  };

  const fetchRegisterFields = async () => {
    try {
      const { data } = await api.getUserFieldConfigs();
      setRegisterFields(data?.filter((f: any) => f.is_active && f.show_in_register) || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error('请输入用户名和密码');
    
    setLoading(true);
    try {
      const { error } = await signInWithUsername(username, password);
      if (error) throw error;
      toast.success('登录成功');
      closeLoginDialog();
    } catch (e: any) {
      toast.error(`登录失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error('请输入用户名和密码');
    if (username.length < 3) return toast.error('用户名至少3个字符');
    if (password.length < 6) return toast.error('密码至少6个字符');

    if ((sysConfig?.registration_mode === 'invite' || sysConfig?.register_mode === 'invite') && !inviteCode) {
      return toast.error('当前开启了邀请制注册，请输入有效的邀请码');
    }

    if (!agreed) {
      return toast.error('请先勾选同意用户服务协议与隐私政策');
    }

    setLoading(true);
    
    // 获取 URL 中的 ref 参数用于绑定推荐人，如果 URL 没有，则从 sessionStorage 获取
    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get('ref') || sessionStorage.getItem('miaoda_ref') || undefined;

    const { error, data } = await signUpWithUsername(username, password, customData, inviteCode, email, referrerId);
    setLoading(false);

    if (error) {
      toast.error(`注册失败: ${error.message}`);
    } else if (data?.session) {
      const finalUserId = data.session.user.id;
      
      // 处理微信公众号/小程序绑定
      if (customData?.bind_openid) {
        if (customData.bind_type === 'miniprogram') {
          // 小程序绑定已经由后端 handle_new_user 触发器处理 (更新 profiles.mp_openid)
          // 额外确认下，如果需要也可以再前端更新一次
          await (supabase as any)
            .from('profiles')
            .update({ mp_openid: customData.bind_openid })
            .eq('id', finalUserId);
        } else if (customData.bind_type === 'wechat' || wechatVerifiedData?.openid) {
          // 公众号绑定
          const targetOpenid = customData.bind_openid || wechatVerifiedData?.openid;
          const configId = customData.configId || selectedConfigId;
          
          if (targetOpenid) {
            await (supabase as any)
              .from('wechat_users')
              .upsert({
                openid: targetOpenid,
                user_id: finalUserId,
                subscribe_status: true,
                config_id: configId
              });
          }
        }
      } else if (urlOpenid) {
        // 4. 处理来自 URL openid 的场景 (每日图集跳转等)
        await (supabase as any)
          .from('profiles')
          .update({ mp_openid: urlOpenid })
          .eq('id', finalUserId);
      }

      toast.success('注册成功并已自动登录');
      closeLoginDialog();
    } else {
      toast.success('注册成功，请登录');
      setActiveTab('login');
    }
  };

  const handleWechatVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bindCode || !selectedConfigId) return toast.error('请输入验证码并选择公众号');

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-sms/verify', {
        body: { code: bindCode, configId: selectedConfigId, domainUrl: getCurrentDomain() }
      });

      if (error) {
        const errorMsg = typeof error?.context?.text === "function" ? await error.context.text() : error?.message;
        throw new Error(errorMsg || error.message);
      }
      
      if (!data?.success) throw new Error(data?.message || '验证失败');

      if (data.exists || data.is_bound) {
        toast.success(data.is_bound ? '已成功绑定现有账号' : '验证成功，正在登录...');
        window.location.href = data.loginLink || `${window.location.origin}/login?username=${encodeURIComponent(username)}`;
      } else {
        setWechatVerifiedData(data);
        setIsAccountSelectionOpen(true);
      }
    } catch (e: any) {
      toast.error(`验证失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showMiniProgram = (sysConfig?.login_methods || []).includes('miniprogram');
  const showWechat = (sysConfig?.login_methods || ['password']).includes('wechat');
  const isRegistrationDisabled = sysConfig?.registration_mode === 'disabled' && !wechatVerifiedData && !urlOpenid;

  return (
    <Dialog open={isLoginDialogOpen} onOpenChange={(open) => !open && closeLoginDialog()}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-gradient-to-br from-background via-background to-primary/5 backdrop-blur-xl focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none">
        <div className="relative p-6 sm:p-8">

          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4 shadow-lg">
              <ImageIcon className="w-7 h-7 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {activeTab === 'login' ? '欢迎回来' : activeTab === 'register' ? '创建账户' : activeTab === 'miniprogram' ? '小程序登录' : '微信登录'}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm">
              {activeTab === 'login' ? '请使用您的用户名和密码登录' : activeTab === 'register' ? '加入我们，探索更多精彩内容' : activeTab === 'miniprogram' ? '使用微信扫码 快速登录' : '使用微信扫码或验证码登录'}
            </DialogDescription>
          </div>

          {!isAccountSelectionOpen ? (
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
              <TabsList className={cn(
                "grid w-full rounded-2xl bg-muted/50 p-1 mb-6 h-12 shadow-inner", 
                (() => {
                  let cols = 1;
                  if (!isRegistrationDisabled) cols++;
                  if (showWechat) cols++;
                  if (showMiniProgram) cols++;
                  return `grid-cols-${cols}`;
                })()
              )}>
                <TabsTrigger value="login" className="rounded-xl font-bold text-xs transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">登 录</TabsTrigger>
                {!isRegistrationDisabled && (
                  <TabsTrigger value="register" className="rounded-xl font-bold text-xs transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">注 册</TabsTrigger>
                )}
                {showWechat && (
                  <TabsTrigger value="wechat" className="rounded-xl font-bold text-xs transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">微 信</TabsTrigger>
                )}
                {showMiniProgram && (
                  <TabsTrigger value="miniprogram" onClick={handleMpLoginTab} className="rounded-xl font-bold text-xs transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">小程序</TabsTrigger>
                )}
              </TabsList>

            <TabsContent value="login" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">用户名</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="请输入用户名" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value.trim())}
                      className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground ml-1">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="password"
                      placeholder="请输入密码" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pl-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20 transition-all"
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20 mt-2" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
                  立即登录
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0 space-y-4 max-h-[50vh] overflow-y-auto px-1 custom-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-300">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase ml-1">用户名 *</Label>
                  <Input 
                    placeholder="3-20个字符" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase ml-1">邮箱 (建议填写)</Label>
                  <Input 
                    type="email"
                    placeholder="用于找回密码和接收通知" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase ml-1">密码 *</Label>
                  <Input 
                    type="password" 
                    placeholder="至少6个字符" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20"
                    required
                  />
                </div>

                {(sysConfig?.registration_mode === 'invite' || sysConfig?.register_mode === 'invite') && (
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase ml-1">邀请码 *</Label>
                    <Input 
                      placeholder="请输入注册邀请码" 
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 font-mono uppercase"
                      required
                    />
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-xl">
                  <input 
                    type="checkbox" 
                    id="diag-agreement" 
                    checked={agreed} 
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 w-3.5 h-3.5 rounded border-none"
                  />
                  <Label htmlFor="diag-agreement" className="text-[10px] text-muted-foreground leading-relaxed cursor-pointer">
                    我已阅读并同意《用户服务协议与隐私政策》
                  </Label>
                </div>

                <Button type="submit" className="w-full h-11 rounded-xl font-black mt-2" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {customData.bind_openid ? '注册并自动绑定' : '立即注册'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="wechat" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase ml-1">选择公众号</Label>
                  <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                    <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-none">
                      <SelectValue placeholder="请选择公众号" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {wechatConfigs.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase ml-1">验证码</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="输入 6 位验证码" 
                      value={bindCode}
                      onChange={(e) => setBindCode(e.target.value.trim())}
                      className="h-11 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 text-center font-bold tracking-widest"
                      maxLength={6}
                    />
                    <Button 
                      variant="outline" 
                      className="h-11 px-4 rounded-xl border-none bg-primary/10 text-primary font-bold hover:bg-primary/20"
                      onClick={handleWechatVerify}
                      disabled={loading}
                    >
                      验证
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-muted/40 rounded-2xl text-center space-y-3">
                  <p className="text-[10px] text-muted-foreground">如果您还没有验证码，请扫码关注获取</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 rounded-lg text-[10px] text-primary hover:bg-primary/10 font-bold"
                    onClick={() => toast.info('请在微信搜索对应公众号并回复“登录”')}
                  >
                    如何获取验证码？
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="miniprogram" className="mt-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-full h-auto min-h-[192px] bg-muted rounded-3xl flex flex-col items-center justify-center overflow-hidden border-2 border-dashed border-primary/20 p-2 relative">
                  {mpQrData ? (
                    <div className="flex flex-col items-center w-full">
                      <img src={mpQrData} alt="Login QR" className="w-48 h-48 object-contain" />
                      {mpDebugConfig?.is_debug_enabled && (
                        <div className="w-full space-y-2 mt-4 px-4 pb-4">
                          <div className="flex flex-col gap-1 p-2 bg-background rounded-xl text-[10px] break-all border border-border/40">
                            <div className="flex justify-between items-center text-muted-foreground border-b border-border/20 pb-1 mb-1">
                              <span>页面路径</span>
                              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(mpQrPage || mpDebugConfig?.login_page_path || 'pages/user/wxlogin');
                                toast.success('路径已复制');
                              }}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="font-mono text-foreground/80">{mpQrPage || mpDebugConfig?.login_page_path || 'pages/user/wxlogin'}</div>
                          </div>
                          
                          <div className="flex flex-col gap-1 p-2 bg-background rounded-xl text-[10px] break-all border border-border/40">
                            <div className="flex justify-between items-center text-muted-foreground border-b border-border/20 pb-1 mb-1">
                              <span>Scene 参数</span>
                              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(mpQrScene || '');
                                toast.success('参数已复制');
                              }}>
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="font-mono text-foreground/80">{mpQrScene || '无参数'}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  )}
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-sm font-bold">微信扫码 快速登录</p>
                  <p className="text-[10px] text-muted-foreground px-4 leading-relaxed italic">
                    使用微信扫描上方小程序码，并在小程序内点击“允许”登录，即可完成 PC 网页同步登录。
                  </p>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="rounded-xl text-[10px]" 
                  onClick={generateMpLoginQr}
                  disabled={loading}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  刷新小程序码
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="p-4 bg-primary/5 rounded-3xl border border-primary/10 text-center space-y-2">
                <div className="flex justify-center mb-1">
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    微信验证成功
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground px-2 leading-relaxed">
                  系统识别到您是通过 {wechatVerifiedData?.type === 'miniprogram' ? '小程序' : '公众号'} 验证。该微信目前尚未关联账号，请选择下一步操作：
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Button
                  variant="outline"
                  className="h-24 rounded-[2rem] border-2 border-primary/5 hover:border-primary/20 hover:bg-primary/5 group transition-all p-0 overflow-hidden relative"
                  onClick={() => setAccountAction('bind')}
                >
                  <div className="flex items-center gap-4 w-full h-full px-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm">
                      <Link className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black text-sm text-foreground">关联已有账号</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">将此微信绑定到我现有的用户名</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  {accountAction === 'bind' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />}
                </Button>

                <Button
                  variant="outline"
                  className="h-24 rounded-[2rem] border-2 border-green-500/5 hover:border-green-500/20 hover:bg-green-500/5 group transition-all p-0 overflow-hidden relative"
                  onClick={handleCreateAndLogin}
                >
                  <div className="flex items-center gap-4 w-full h-full px-6">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-sm">
                      <UserPlus className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-black text-sm text-foreground">我是新用户</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">直接使用微信信息创建新账户</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </Button>
              </div>

              {accountAction === 'bind' && (
                <form onSubmit={handleBindAndLogin} className="space-y-4 pt-4 border-t border-border/50 animate-in slide-in-from-top-4 duration-500">
                  <div className="px-1 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">用户名</Label>
                      <Input
                        placeholder="请输入已有用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.trim())}
                        className="h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">密码</Label>
                      <Input
                        type="password"
                        placeholder="请输入账户密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20"
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link className="w-4 h-4 mr-2" />}
                    确认绑定并登录
                  </Button>
                </form>
              )}

              <Button
                variant="ghost"
                className="w-full h-10 rounded-xl text-[10px] text-muted-foreground hover:bg-muted/50 font-bold"
                onClick={() => {
                  setIsAccountSelectionOpen(false);
                  setAccountAction(null);
                }}
              >
                返回登录方式选择
              </Button>
            </div>
          )}
          <p className="text-center text-[10px] text-muted-foreground mt-6">
            © 2026 {sysConfig?.site_title || '视觉赏析'}官方站点
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
