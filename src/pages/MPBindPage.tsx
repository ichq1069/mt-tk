import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, LogIn, UserPlus, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MPBindPage() {
  const [searchParams] = useSearchParams();
  const rawScene = searchParams.get('scene') || '';
  const urlOpenid = searchParams.get('openid') || '';
  const urlCode = searchParams.get('code') || '';
  
  // 场景代码解析逻辑
  const [sceneData, setSceneData] = useState<any>(() => {
    const data: any = { raw: rawScene };
    if (rawScene) {
      const decoded = rawScene.includes('%') ? decodeURIComponent(rawScene) : rawScene;
      decoded.split('&').forEach(p => {
        const [k, v] = p.split('=');
        if (k === 't') data.ticket = v;
        if (k === 'b') data.bindUserId = v;
        if (k === 'c') data.checkCode = v;
        if (k === 'h') data.host = v;
      });
    }
    return data;
  });

  const sceneCode = sceneData.ticket || sceneData.bindUserId || rawScene;
  const hostId = sceneData.host;

  const [loading, setLoading] = useState(false);
  const [bindStep, setBindStep] = useState<'options' | 'login' | 'success'>('options');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isWechatLoggedIn, setIsWechatLoggedIn] = useState(false);

  // 自动触发授权逻辑
  useEffect(() => {
    if ((urlCode || urlOpenid) && sceneCode && !isWechatLoggedIn && !loading) {
      handleMockWechatLogin();
    }
  }, [urlCode, urlOpenid, sceneCode]);

  // 模拟微信授权
  const handleMockWechatLogin = async () => {
    if (!sceneCode) {
      toast.error('未找到有效的会话代码');
      return;
    }
    
    setLoading(true);
    try {
      // 如果 URL 中带有真实 code 或 openid，优先使用
      const finalCode = urlCode || "mock_code_" + Math.random().toString(36).substr(2, 9);
      const finalOpenid = urlOpenid || (urlCode ? undefined : "mock_openid_" + Math.random().toString(36).substr(2, 9));
      
      const { data, error } = await supabase.functions.invoke('miniprogram-login', {
        body: { 
          action: 'update_session', 
          scene_code: sceneCode, 
          code: finalCode,
          openid: finalOpenid
        }
      });
      
      if (error) throw error;
      const resData = (data as any);
      if (resData.success) {
        setIsWechatLoggedIn(true);
        if (resData.data.is_bound) {
          setBindStep('success');
          toast.success('检测到已绑定账号，登录成功');
        } else {
          setBindStep('options');
          toast.info('您尚未绑定账号，请选择一个选项');
        }
      } else {
        toast.error(resData.error || '微信授权失败，请重试');
      }
    } catch (err: any) {
      console.error('[MPLogin] WeChat auth error:', err);
      toast.error('微信授权异常: ' + (err.message || '未知网络错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleBindAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('请输入账号和密码');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('miniprogram-login', {
        body: { action: 'bind_account', scene_code: sceneCode, username, password }
      });
      
      if (error) throw error;
      const resData = (data as any);
      if (resData.success) {
        setBindStep('success');
        toast.success('绑定成功！');
      } else {
        toast.error(resData.error || '绑定失败');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewUser = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('miniprogram-login', {
        body: { action: 'create_user', scene_code: sceneCode }
      });
      
      if (error) throw error;
      if ((data as any).success) {
        toast.success('请在 H5 页面继续完成注册');
        // 在实际小程序中，我们会保持这个页面，或者引导用户看H5页面
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!sceneCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">无效的扫码参数，请重新扫码。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/40">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {bindStep === 'success' ? '登录成功' : !isWechatLoggedIn ? '微信授权' : '账号绑定'}
          </CardTitle>
          <CardDescription>
            {bindStep === 'success' ? '您已成功登录系统' : !isWechatLoggedIn ? '请先完成微信授权以识别身份' : '选择一个选项以继续绑定流程'}
            {hostId && (
              <span className="block text-xs mt-1 text-primary opacity-70">
                来自域名标识: {hostId}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isWechatLoggedIn && (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <Button 
                onClick={handleMockWechatLogin} 
                disabled={loading}
                className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                点击微信授权登录
              </Button>
              <p className="text-xs text-muted-foreground">该操作将安全地获取您的微信身份信息</p>
            </div>
          )}

          {isWechatLoggedIn && bindStep === 'options' && (
            <div className="grid grid-cols-1 gap-4">
              <Button 
                variant="outline" 
                className="h-24 rounded-2xl flex flex-col items-center justify-center space-y-2 border-2 hover:border-primary transition-all group"
                onClick={() => setBindStep('login')}
              >
                <LogIn className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                <span className="font-bold">我有账户，去绑定</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-24 rounded-2xl flex flex-col items-center justify-center space-y-2 border-2 hover:border-primary transition-all group"
                onClick={handleCreateNewUser}
                disabled={loading}
              >
                <UserPlus className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                <span className="font-bold">没有账户，去注册</span>
              </Button>

              <div className="bg-muted/50 p-4 rounded-xl border border-border/60">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold">快捷方式</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  如果您不想输入账号密码，可以在网站个人中心的微信绑定模块重新生成小程序码，扫码后无需输入账户密码即可自动完成绑定。
                </p>
              </div>
            </div>
          )}

          {bindStep === 'login' && (
            <form onSubmit={handleBindAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bind-username">用户名</Label>
                <Input
                  id="bind-username"
                  placeholder="请输入您的网站账号"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bind-password">密码</Label>
                <Input
                  id="bind-password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full rounded-xl h-11 bg-primary hover:bg-primary-glow font-bold shadow-lg"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  立即绑定
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setBindStep('options')}
                  className="text-xs h-8"
                >
                  返回上一步
                </Button>
              </div>
            </form>
          )}

          {bindStep === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 space-y-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="w-12 h-12 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-bold">绑定成功！</p>
                <p className="text-sm text-muted-foreground">
                  H5端页面将自动刷新，请关闭此小程序返回浏览器查看。
                </p>
              </div>
              <Button 
                variant="outline" 
                className="rounded-full px-8"
                onClick={() => window.close()}
              >
                关闭小程序
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function Label({ children, htmlFor, className }: any) {
  return (
    <label htmlFor={htmlFor} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}>
      {children}
    </label>
  );
}
