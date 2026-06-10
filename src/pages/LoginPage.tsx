import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, QrCode, LogIn, MessageCircle, ShieldCheck, RefreshCw, UserCheck, ChevronRight, UserPlus, Key, CircleCheckBig } from 'lucide-react';
import { api } from '@/db/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';
import { isWechat } from '@/lib/utils';


function Label({ children, htmlFor, className }: any) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
      {children}
    </label>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithUsername, signUpWithUsername, loading: authLoading, user } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [qq, setQq] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  
  // 微信公众号登录相关
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'wechat' | 'miniprogram'>('login');
  
  // 核心逻辑：确保 isRegistering 与 activeTab 同步
  useEffect(() => {
    setIsRegistering(activeTab === 'register');
  }, [activeTab]);
  const [wechatConfigs, setWechatConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [bindCode, setBindCode] = useState('');
  const [sysConfig, setSysConfig] = useState<any>(null);
  const [wechatVerifiedData, setWechatVerifiedData] = useState<any>(null);
  const [isAccountSelectionOpen, setIsAccountSelectionOpen] = useState(false);
  const [dynamicQrCode, setDynamicQrCode] = useState<string | null>(null);
  const [sceneStr, setSceneStr] = useState<string | null>(null);
  const [isDynamicQrLoading, setIsDynamicQrLoading] = useState(false);

  const [autoVerifyTried, setAutoVerifyTried] = useState(false);

  // 检查是否是从小程序注册跳转过来的，或者带有自动登录 Token
  const registerParam = searchParams.get('register');
  const sessionParam = searchParams.get('session');
  const tokenHash = searchParams.get('token_hash');
  const emailParam = searchParams.get('email');
  const urlBindCode = searchParams.get('bind_code');
  const urlConfigId = searchParams.get('config_id');
  const urlOpenid = searchParams.get('openid');
  
  const [mpQrScene, setMpQrScene] = useState<string | null>(null);
  const [mpQrPage, setMpQrPage] = useState<string | null>(null);
  const [mpDebugConfig, setMpDebugConfig] = useState<any>(null);
  const [ticketStatus, setTicketStatus] = useState<string>('pending');


  // 如果用户已登录，且没有 token_hash 等正在处理的，则重定向
  useEffect(() => {
    if (user && !tokenHash && !emailParam && !urlBindCode && !loading && !authLoading) {
      const from = searchParams.get('from');
      navigate(from ? decodeURIComponent(from) : '/');
    }
  }, [user, navigate, tokenHash, emailParam, urlBindCode, loading, authLoading, searchParams]);

  useEffect(() => {
    if (registerParam === 'true') {
      setIsRegistering(true);
      setActiveTab('register');
      if (sessionParam) {
        setTicket(sessionParam);
      }
    }
  }, [registerParam, sessionParam]);
    
  useEffect(() => {
    // 自动登录逻辑 (Issue 1)
    if (tokenHash && emailParam) {
      handleAutoLogin(tokenHash, emailParam);
    }
    fetchConfigs();
  }, [registerParam, sessionParam, tokenHash, emailParam]);

  // 处理带有 bind_code 和 config_id 的自动验证登录
  useEffect(() => {
    if (urlBindCode && urlConfigId && !autoVerifyTried && wechatConfigs.length > 0) {
      setBindCode(urlBindCode);
      setSelectedConfigId(urlConfigId);
      setActiveTab('wechat');
      setAutoVerifyTried(true);
      
      // 延迟一下执行，确保状态已更新
      setTimeout(() => {
        handleAutoVerify(urlBindCode, urlConfigId);
      }, 500);
    }
  }, [urlBindCode, urlConfigId, autoVerifyTried, wechatConfigs]);

  const handleAutoVerify = async (code: string, configId: string) => {
    setLoading(true);
    try {
      const domainUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('auth-sms/verify', {
        body: { code, configId, domainUrl }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || '验证失败');

      if (data.exists && data.loginLink) {
        toast.success('验证成功，正在登录...');
        window.location.href = data.loginLink;
      } else {
        setWechatVerifiedData({ ...data, configId });
        setIsAccountSelectionOpen(true);
      }
    } catch (err: any) {
      console.error('Auto verify error:', err);
      toast.error('自动验证失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 监听公众号选择，如果是服务号，生成动态二维码
  useEffect(() => {
    if (activeTab === 'wechat' && selectedConfigId) {
      const config = wechatConfigs.find(c => c.id === selectedConfigId);
      if (config?.type === 'service') {
        handleGenerateDynamicQr(selectedConfigId);
      } else {
        setDynamicQrCode(null);
        setSceneStr(null);
      }
    } else {
      setDynamicQrCode(null);
      setSceneStr(null);
    }
  }, [selectedConfigId, activeTab, wechatConfigs]);

  const handleGenerateDynamicQr = async (configId: string) => {
    setIsDynamicQrLoading(true);
    try {
      const newSceneStr = Math.random().toString(36).substring(2, 10);
      setSceneStr(newSceneStr);
      
      const { data, error } = await api.callWechatApi(configId, {
        action: 'create_qrcode',
        params: {
          expire_seconds: 600, // 10分钟有效期
          action_name: 'QR_STR_SCENE',
          action_info: {
            scene: { scene_str: newSceneStr }
          }
        }
      });
      
      if (error) throw error;
      
      if (data?.ticket) {
        setDynamicQrCode(`https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(data.ticket)}`);
      }
    } catch (error: any) {
      console.error('Generate dynamic QR failed:', error);
      setDynamicQrCode(null);
    } finally {
      setIsDynamicQrLoading(false);
    }
  };

  // 轮询或监听动态二维码对应的验证码或登录状态
  useEffect(() => {
    if (!sceneStr || !selectedConfigId) return;
    
    const timer = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('wechat_bind_requests')
          .select('code')
          .eq('scene_str', sceneStr)
          .eq('config_id', selectedConfigId)
          .maybeSingle();
          
        const bindData = data as any;
        if (bindData?.code) {
          setBindCode(bindData.code);
          toast.success('已识别扫码状态');
          clearInterval(timer);
        }
      } catch (e) {
        console.error('Polling bind requests failed:', e);
      }
    }, 3000);
    
    return () => clearInterval(timer);
  }, [sceneStr, selectedConfigId]);


  useEffect(() => {
    const fetchMpDebugConfig = async () => {
      try {
        const { data } = await api.getPublicMiniProgramConfig();
        setMpDebugConfig(data);
      } catch (e) {
        console.error('Fetch mp debug config error:', e);
      }
    };
    fetchMpDebugConfig();
  }, []);

  const fetchConfigs = async () => {
    try {
      const [wechatRes, sysRes] = await Promise.all([
        api.getWechatConfigs(),
        api.getStorageConfig()
      ]);
      setWechatConfigs(wechatRes.data || []);
      if (wechatRes.data && wechatRes.data.length > 0) {
        setSelectedConfigId(wechatRes.data[0].id);
      }
      setSysConfig(sysRes.data);
    } catch (err) {
      console.error('Fetch configs error:', err);
    }
  };

  const handleAutoLogin = async (hash: string, email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: hash,
        type: 'magiclink'
      });
      if (error) throw error;
      toast.success('自动登录成功');
      const from = searchParams.get('from');
      navigate(from ? decodeURIComponent(from) : '/');
    } catch (err: any) {
      console.error('Auto login error:', err);
      toast.error('自动登录失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 生成小程序码 (Issue 2)
  const generateQrCode = async () => {
    setIsQrLoading(true);
    try {
      const newTicket = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setTicket(newTicket);
      
      // 创建 login_ticket 记录
      await (supabase.from('login_tickets') as any).insert({
        ticket: newTicket,
        status: 'pending'
      });

      // 传入当前域名以匹配域名标识，或使用配置中的硬编码标识
      const mpDomain = window.location.origin;
      const { data, error } = await api.generateMiniProgramQr(newTicket, 'login', undefined, mpDomain);
      
      if (error) throw error;
      if (data && data.success) {
        setQrCode(data.qr_data);
        setMpQrScene(data.scene);
        setMpQrPage(data.page);
        
        // Polling logic is handled by the useEffect watching ticket, but we can call it if needed.
        // startPollingTicket(newTicket); 
      } else {
        throw new Error(data?.message || '生成小程序码失败');
      }
    } catch (err: any) {
      toast.error('生成码失败: ' + err.message);
    } finally {
      setIsQrLoading(false);
    }
  };

  // 轮询会话状态
  useEffect(() => {
    let interval: any;
    if (ticket && (activeTab === 'miniprogram' || isRegistering)) {
      interval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('login_tickets')
            .select('*, profiles(*)')
            .eq('ticket', ticket)
            .maybeSingle();
          
          const ticketData = data as any;
          if (ticketData) {
            if (ticketData.status === 'confirmed') {
              // 自动触发登录逻辑，并更新状态为正在登录
              clearInterval(interval);
              if (ticketData.user_id) {
                handleTicketLogin(ticketData.user_id);
              } else if (ticketData.openid) {
                setWechatVerifiedData({ openid: ticketData.openid, isMP: true });
                setIsAccountSelectionOpen(true);
                toast.info('授权成功，请选择绑定已有账号或注册新账号');
              }
            } else if (ticketData.status === 'fulfilled') {
              clearInterval(interval);
              if (ticketData.user_id) {
                handleTicketLogin(ticketData.user_id);
              }
            }
            // 更新本地状态用于显示
            setTicketStatus(ticketData.status);
          }
        } catch (err) {
          console.error('Check ticket error:', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [ticket, activeTab, isRegistering]);

  const handleTicketLogin = async (userId: string) => {
    setLoading(true);
    setTicketStatus('logging_in');
    try {
      // 尝试在数据库中更新状态为正在登录中 (反馈给正在看页面的用户)
      if (ticket) {
        await (supabase
          .from('login_tickets') as any)
          .update({ status: 'logging_in' })
          .eq('ticket', ticket)
          .eq('status', 'confirmed');
      }
      
      const { data, error: functionError } = await supabase.functions.invoke('wechat-miniprogram', {
        body: { action: 'get_login_token', userId }
      });
      
      if (functionError) {
        const errorText = typeof functionError?.context?.text === 'function' ? await functionError.context.text() : functionError?.message;
        throw new Error(errorText || functionError.message);
      }
      
      if (data?.token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: 'magiclink'
        });
        if (verifyError) throw verifyError;
        toast.success('登录成功');
        const from = searchParams.get('from');
        navigate(from ? decodeURIComponent(from) : '/');
      } else {
        throw new Error(data?.message || '获取登录凭证失败（无 Token）');
      }
    } catch (err: any) {
      toast.error('登录失败: ' + err.message);
      console.error('[Login] Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 微信公众号验证
  const handleWechatVerifyAction = async () => {
    if (!bindCode || !selectedConfigId) return toast.error('请输入验证码并选择公众号');
    setLoading(true);
    try {
      // 获取当前域名，类似于 LoginDialog.tsx
      const domainUrl = window.location.origin;
      const { data, error } = await supabase.functions.invoke('auth-sms/verify', {
        body: { code: bindCode, configId: selectedConfigId, domainUrl }
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || '验证失败');

      if (data.exists && data.loginLink) {
        toast.success('验证成功，正在登录...');
        window.location.href = data.loginLink;
      } else {
        setWechatVerifiedData({ ...data, configId: selectedConfigId });
        setIsAccountSelectionOpen(true);
      }
    } catch (err: any) {
      toast.error('验证失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndLogin = () => {
    setActiveTab('register');
    setIsAccountSelectionOpen(false);
    toast.info('请填写注册信息，注册后将自动为您绑定微信');
    if (wechatVerifiedData?.openid) {
      setUsername(`wx_${wechatVerifiedData.openid.slice(0, 8)}`);
    }
  };

  const handleBindAndLogin = () => {
    setActiveTab('login');
    setIsAccountSelectionOpen(false);
    toast.info('请输入您已有的账号密码，登录后将自动为您绑定微信');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('请输入账号和密码');
      return;
    }

    setLoading(true);
    try {
      let finalUserId: string | undefined;
      
      if (isRegistering) {
        if (!qq || !/^\d{5,12}$/.test(qq)) {
          toast.error('请输入正确的 QQ 号 (5-12位数字)');
          setLoading(false);
          return;
        }

        const referrerId = searchParams.get('ref') || sessionStorage.getItem('miaoda_ref') || undefined;
        // 如果是邀请码模式且没填邀请码，提示错误
        if (sysConfig?.registration_mode === 'invite' && !inviteCode) {
          toast.error('邀请码模式已开启，请输入有效邀请码进行注册');
          setLoading(false);
          return;
        }
        
        const providedEmail = `${qq.trim()}@qq.com`;
        const { error, data } = await signUpWithUsername(username, password, { qq: qq.trim() }, inviteCode || undefined, providedEmail, referrerId);
        if (error) throw error;
        finalUserId = data?.user?.id;
        toast.success('注册成功');
      } else {
        const { data: authData, error } = await signInWithUsername(username, password);
        if (error) throw error;
        finalUserId = authData?.user?.id;
        toast.success('登录成功');
      }

      // 处理微信/小程序自动绑定
      if (finalUserId) {
        // 1. 处理来自 Ticket 的场景 (小程序扫码)
        if (ticket) {
          const { data: ticketData } = await (supabase as any)
            .from('login_tickets')
            .select('openid')
            .eq('ticket', ticket)
            .maybeSingle();
            
          if (ticketData?.openid) {
            // 绑定小程序 OpenID
            await (supabase as any)
              .from('profiles')
              .update({ mp_openid: ticketData.openid })
              .eq('id', finalUserId);
              
            // 同步标记为已完成
            await (supabase as any)
              .from('login_tickets')
              .update({ status: 'fulfilled', user_id: finalUserId })
              .eq('ticket', ticket);
          }
        }
        
        // 2. 处理来自 wechatVerifiedData 的场景 (SMS/公众号验证或扫码待定)
        if (wechatVerifiedData?.openid) {
          if (wechatVerifiedData.isMP) {
            // 小程序绑定
            await (supabase as any)
              .from('profiles')
              .update({ mp_openid: wechatVerifiedData.openid })
              .eq('id', finalUserId);
          } else {
            // 公众号绑定
            await (supabase as any)
              .from('wechat_users')
              .upsert({
                openid: wechatVerifiedData.openid,
                user_id: finalUserId,
                subscribe_status: true,
                config_id: wechatVerifiedData.configId || selectedConfigId
              });
          }
        }

        // 3. 处理来自 URL openid 的场景 (每日图集跳转等)
        if (!ticket && !wechatVerifiedData?.openid && urlOpenid) {
          // 尝试同时更新 profiles 中的两个 openid 字段，或者根据来源判断
          // 每日图集通常在小程序环境，所以优先更新 mp_openid
          await (supabase as any)
            .from('profiles')
            .update({ mp_openid: urlOpenid })
            .eq('id', finalUserId);
        }
      }
      
      const from = searchParams.get('from');
      navigate(from ? decodeURIComponent(from) : '/');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background mesh-gradient relative overflow-hidden p-4">
      {/* 背景动态装饰 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <Card className="w-full max-w-md shadow-2xl border-primary/10 bg-card/30 backdrop-blur-2xl rounded-[2.5rem] relative overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-primary opacity-30" />
        
        <CardHeader className="text-center pb-2 pt-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center border border-primary/20 shadow-inner group">
              <ShieldCheck className="w-8 h-8 text-primary group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-black bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent tracking-tight">
            {isRegistering ? '开启赏析之旅' : '欢迎回来'}
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium text-xs mt-1">
            {isRegistering ? '请完成注册以绑定多端身份' : '安全、私密、优雅的视觉空间'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pb-10">
          {isAccountSelectionOpen ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="p-4 bg-primary/5 rounded-3xl border border-primary/10 text-center space-y-2">
                <div className="flex justify-center mb-1">
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-[10px] text-primary font-black uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    微信验证成功
                  </div>
                </div>
                <p className="text-xs font-medium text-muted-foreground px-2 leading-relaxed">
                  该微信目前尚未关联账户，请选择下一步操作：
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Button 
                  variant="outline" 
                  className="h-16 rounded-[1.25rem] border-primary/10 bg-primary/5 hover:bg-primary/10 flex items-center justify-between px-5 group transition-all"
                  onClick={handleBindAndLogin}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <LogIn className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">绑定已有账号</p>
                      <p className="text-[10px] text-muted-foreground">将此微信与您之前的账号关联</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </Button>

                <Button 
                  variant="outline" 
                  className="h-16 rounded-[1.25rem] border-primary/10 bg-primary/5 hover:bg-primary/10 flex items-center justify-between px-5 group transition-all"
                  onClick={handleCreateAndLogin}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold">创建新账号并绑定</p>
                      <p className="text-[10px] text-muted-foreground">首次使用本系统？点此快速开启</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <Button 
                  variant="ghost" 
                  className="w-full h-10 rounded-xl text-xs text-muted-foreground"
                  onClick={() => setIsAccountSelectionOpen(false)}
                >
                  返回登录页
                </Button>
              </div>
            </div>
          ) : (
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
            <TabsList className={cn(
              "grid w-full rounded-2xl p-1 bg-muted/30 h-12 shadow-inner border border-border/50",
              (() => {
                let cols = 1; // login is always there
                if (!(sysConfig?.registration_mode === 'disabled' && !wechatVerifiedData && !urlOpenid)) cols++;
                if ((sysConfig?.login_methods || ['password']).includes('wechat')) cols++;
                if ((sysConfig?.login_methods || []).includes('miniprogram')) cols++;
                return `grid-cols-${cols}`;
              })()
            )}>
              <TabsTrigger value="login" className="rounded-xl font-bold text-[10px] gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
                <LogIn className="w-3.5 h-3.5" />
                登录
              </TabsTrigger>
              {!(sysConfig?.registration_mode === 'disabled' && !wechatVerifiedData && !urlOpenid) && (
                <TabsTrigger value="register" className="rounded-xl font-bold text-[10px] gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
                  <UserPlus className="w-3.5 h-3.5" />
                  注册
                </TabsTrigger>
              )}
              {(sysConfig?.login_methods || ['password']).includes('wechat') && (
                <TabsTrigger value="wechat" className="rounded-xl font-bold text-[10px] gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
                  <MessageCircle className="w-3.5 h-3.5" />
                  公众号
                </TabsTrigger>
              )}
              {(sysConfig?.login_methods || []).includes('miniprogram') && (
                <TabsTrigger value="miniprogram" className="rounded-xl font-bold text-[10px] gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300">
                  <QrCode className="w-3.5 h-3.5" />
                  小程序
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">用户名</Label>
                  <div className="relative group">
                    <Input
                      id="username"
                      placeholder="请输入用户名"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 rounded-2xl bg-muted/30 border-none pl-12 font-bold shadow-inner focus:ring-1 ring-primary/20"
                    />
                    <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">密码</Label>
                  <div className="relative group">
                    <Input
                      id="password"
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-2xl bg-muted/30 border-none pl-12 font-bold shadow-inner focus:ring-1 ring-primary/20"
                    />
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors" />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full rounded-[1.2rem] h-12 bg-primary hover:bg-primary/90 text-white font-black shadow-xl shadow-primary/20 mt-2 group overflow-hidden relative"
                  disabled={loading}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  登录
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-6">
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">用户名</Label>
                  <div className="relative group">
                    <Input
                      id="reg-username"
                      placeholder="请输入用户名"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 rounded-2xl bg-muted/30 border-none pl-12 font-bold shadow-inner focus:ring-1 ring-primary/20"
                    />
                    <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">密码</Label>
                  <div className="relative group">
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="请输入密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-2xl bg-muted/30 border-none pl-12 font-bold shadow-inner focus:ring-1 ring-primary/20"
                    />
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-qq" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">QQ 号 (必填)</Label>
                  <div className="relative group">
                    <Input
                      id="reg-qq"
                      placeholder="请输入 QQ 号 (用于找回密码)"
                      value={qq}
                      onChange={(e) => setQq(e.target.value)}
                      className="h-12 rounded-2xl bg-muted/30 border-none pl-12 font-bold shadow-inner focus:ring-1 ring-primary/20"
                    />
                    <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors" />
                  </div>
                </div>

                {sysConfig?.registration_mode === 'invite' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
                    <Label htmlFor="reg-invite" className="text-[10px] font-black uppercase tracking-wider text-primary ml-1 flex items-center gap-1.5">
                      <Key className="w-3 h-3" />
                      邀请码 (必填)
                    </Label>
                    <div className="relative group">
                      <Input
                        id="reg-invite"
                        placeholder="请输入邀请码"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        className="h-12 rounded-2xl bg-primary/5 border border-primary/20 pl-12 font-bold shadow-inner focus:ring-1 ring-primary/40 uppercase"
                      />
                      <Badge className="absolute left-4 top-1/2 -translate-y-1/2 p-0 bg-transparent text-primary/40 group-focus-within:text-primary/60 transition-colors">
                        <UserPlus className="w-4 h-4" />
                      </Badge>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-[1.2rem] h-12 bg-primary hover:bg-primary/90 text-white font-black shadow-xl shadow-primary/20 mt-2 group overflow-hidden relative"
                  disabled={loading}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {wechatVerifiedData ? '注册并自动绑定' : '立即注册'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="wechat" className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">选择公众号</Label>
                    {isWechat() && (
                      <Badge variant="outline" className="h-5 text-[8px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-1.5 flex gap-1 items-center">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        微信环境已就绪
                      </Badge>
                    )}
                  </div>
                  <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none shadow-inner focus:ring-1 ring-primary/20">
                      <SelectValue placeholder="请选择公众号" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/40 shadow-2xl">
                      {wechatConfigs.map(c => (
                        <SelectItem key={c.id} value={c.id} className="rounded-xl py-2.5">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-3.5 h-3.5 text-primary" />
                            <span className="font-bold text-xs">{c.name}</span>
                            {c.type === 'service' && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* 微信公众号二维码显示 */}
                {selectedConfigId && (
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-emerald-500/10 to-primary/20 rounded-[2.5rem] blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative flex flex-col items-center justify-center p-6 bg-card rounded-[2rem] border border-border/40 shadow-xl overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-30" />
                      
                      <p className="text-[10px] font-black text-muted-foreground/60 mb-4 uppercase tracking-[0.2em]">
                        {wechatConfigs.find(c => c.id === selectedConfigId)?.type === 'service' ? '服务号动态登录码' : '公众号扫码关注'}
                      </p>
                      
                      <div className="relative group/qr">
                        <div className="w-40 h-40 bg-white p-3 rounded-[1.8rem] shadow-inner flex items-center justify-center overflow-hidden border border-border/10 ring-8 ring-muted/20">
                          {isDynamicQrLoading ? (
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          ) : (
                            <img 
                              src={dynamicQrCode || wechatConfigs.find(c => c.id === selectedConfigId)?.qr_code_url} 
                              alt="公众号二维码" 
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        
                        {wechatConfigs.find(c => c.id === selectedConfigId)?.type === 'service' && (
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full shadow-lg border border-border/40 scale-0 group-hover/qr:scale-100 transition-transform duration-300"
                            onClick={() => handleGenerateDynamicQr(selectedConfigId)}
                            disabled={isDynamicQrLoading}
                          >
                            <RefreshCw className={cn("w-3.5 h-3.5", isDynamicQrLoading && "animate-spin")} />
                          </Button>
                        )}
                      </div>

                      <div className="mt-6 text-center space-y-1.5 px-4">
                        <p className="text-[11px] font-bold text-foreground/80 leading-relaxed">
                          扫码关注并回复「登录」获取验证码
                        </p>
                        <p className="text-[9px] text-muted-foreground/60 leading-relaxed max-w-[180px]">
                          {wechatConfigs.find(c => c.id === selectedConfigId)?.type === 'service' ? '认证服务号支持扫码自动填充验证码' : '关注后系统将自动为您下发临时验证码'}
                        </p>
                      </div>

                      {/* 微信环境限制提示 */}
                      {!isWechat() && (
                        <div className="mt-4 p-2 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3 text-amber-600" />
                          <span className="text-[8px] font-bold text-amber-700">请在微信App内操作以确保监测安全</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">身份验证码</Label>
                    <button 
                      onClick={() => toast.info('请在微信公众号后台回复「登录」获取此六位数字代码')}
                      className="text-[9px] font-bold text-primary/60 hover:text-primary transition-colors flex items-center gap-1"
                    >
                      如何获取验证码？ <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <div className="relative group">
                    <Input
                      placeholder="请输入 6 位验证码"
                      value={bindCode}
                      onChange={(e) => setBindCode(e.target.value)}
                      maxLength={6}
                      className="h-12 rounded-2xl bg-muted/30 border-none pl-12 font-mono tracking-[0.5em] text-lg font-bold shadow-inner focus:ring-1 ring-primary/20"
                    />
                    <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary/60 transition-colors" />
                  </div>
                </div>
                
                <Button
                  className="w-full rounded-[1.2rem] h-12 bg-primary hover:bg-primary/90 text-white font-black shadow-xl shadow-primary/20 mt-2 group overflow-hidden relative"
                  onClick={handleWechatVerifyAction}
                  disabled={loading || !bindCode || !selectedConfigId}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />}
                  确认验证并进入
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="miniprogram" className="space-y-4 mt-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <div className="w-48 h-auto min-h-[192px] bg-muted rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-border transition-all group-hover:border-primary/50 overflow-hidden p-2 relative">
                    {isQrLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    ) : qrCode ? (
                      <div className="flex flex-col items-center w-full relative">
                        <img src={qrCode} alt="Login QR" className={cn("w-48 h-48 object-contain transition-all duration-500", ticketStatus !== 'pending' && "blur-sm opacity-40")} />
                        
                        {/* 状态叠加层 */}
                        {ticketStatus !== 'pending' && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in duration-300">
                            {ticketStatus === 'scanned' && (
                              <>
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                  <UserCheck className="w-6 h-6 animate-pulse" />
                                </div>
                                <div className="px-3 py-1 rounded-full bg-blue-500 text-[10px] text-white font-black tracking-widest uppercase shadow-lg">
                                  已扫码
                                </div>
                                <div className="flex flex-col items-center">
                                  <p className="text-[10px] text-muted-foreground font-bold">待确定登录</p>
                                  <p className="text-[8px] text-muted-foreground/60">请在小程序中点击确定</p>
                                </div>
                              </>
                            )}
                            {ticketStatus === 'confirmed' && (
                              <>
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                  <CircleCheckBig className="w-6 h-6" />
                                </div>
                                <div className="px-3 py-1 rounded-full bg-emerald-500 text-[10px] text-white font-black tracking-widest uppercase shadow-lg">
                                  已确定
                                </div>
                                <div className="flex flex-col items-center">
                                  <p className="text-[10px] text-muted-foreground font-bold italic animate-pulse">正在登录中...</p>
                                </div>
                              </>
                            )}
                            {ticketStatus === 'logging_in' && (
                              <>
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                                <div className="px-3 py-1 rounded-full bg-primary text-[10px] text-primary-foreground font-black tracking-widest uppercase shadow-lg">
                                  正在登录中
                                </div>
                                <p className="text-[10px] text-muted-foreground font-bold italic">安全加密通道已建立</p>
                              </>
                            )}
                          </div>
                        )}

                        {mpDebugConfig?.is_debug_enabled && ticketStatus === 'pending' && (
                          <div className="w-full space-y-2 mt-4 px-4 pb-4">
                            <div className="flex flex-col gap-1 p-2 bg-background rounded-xl text-[10px] break-all border border-border/40">
                              <div className="flex justify-between items-center text-muted-foreground border-b border-border/20 pb-1 mb-1">
                                <span>页面路径</span>
                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => {
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
                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => {
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
                      <QrCode className="w-12 h-12 text-muted-foreground/30" />
                    )}
                  </div>
                  {!qrCode && !isQrLoading && (
                    <Button 
                      variant="ghost" 
                      className="absolute inset-0 w-full h-full bg-black/5 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center"
                      onClick={generateQrCode}
                    >
                      <QrCode className="w-8 h-8 mb-2" />
                      <span>点击生成小程序码</span>
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  使用微信扫描上方小程序码进行登录
                </p>
                {qrCode && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="rounded-xl text-[10px]" 
                    onClick={generateQrCode}
                    disabled={loading}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    刷新小程序码
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
