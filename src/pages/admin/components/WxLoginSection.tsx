import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/db/api';
import { toast } from 'sonner';
import { Loader2, Save, Copy, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function WxLoginSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [config, setConfig] = useState({
    app_id: '',
    app_secret: '',
    page_path: 'pages/user/wxlogin',
    code_snippet: ''
  });
  const [storageConfig, setStorageConfig] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data: storageRes } = await api.getStorageConfig();
      if (storageRes) setStorageConfig(storageRes);

      const { data, error } = await api.getMiniProgramConfig();
      if (error) throw error;
      if (data) {
        setConfig({
          app_id: data.app_id || '',
          app_secret: data.app_secret || '',
          page_path: data.page_path || 'pages/user/wxlogin',
          code_snippet: data.code_snippet || ''
        });
      }
    } catch (error: any) {
      toast.error('加载小程序配置失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config.app_id || !config.app_secret) {
      toast.error('请填写 AppID 和 AppSecret');
      return;
    }

    setSaving(true);
    try {
      // 强制生成最新的代码片段并保存
      const newSnippet = generateCodeSnippet();
      const updatedConfig = { ...config, code_snippet: newSnippet };
      const { error } = await api.updateMiniProgramConfig(updatedConfig);
      if (error) throw error;
      setConfig(updatedConfig);
      toast.success('配置已保存');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const generateCodeSnippet = () => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const code = `<template>
  <view class="login-container">
    <view class="header">
      <view class="logo-placeholder">
        <text>M</text>
      </view>
      <text class="title">微信快捷登录</text>
    </view>
    
    <view class="content">
      <button class="login-btn" @click="handleLogin" :loading="loading">
        微信一键登录
      </button>
      <view class="agreement" @click="openAgreement('user')">
        登录即代表您同意<text class="link">《用户协议》</text>和<text class="link" @click.stop="openAgreement('privacy')">《隐私政策》</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // 当前基础域名 (由管理端标识 h 参数决定，例如 miaoda/supabase/wo58)
      baseUrl: uni.getStorageSync('baseUrl') || '${baseUrl.replace(/\/$/, '')}',
      loading: false,
      ticket: '',
      bindUserId: '',
      scene: ''
    }
  },
  onLoad(options) {
    if (options.scene) {
      const scene = decodeURIComponent(options.scene);
      this.scene = scene;
      if (scene.indexOf('=') !== -1) {
        const params = {};
        scene.split('&').forEach(p => {
          const pair = p.split('=');
          if (pair.length === 2) params[pair[0]] = pair[1];
        });
        
        // 扫码进入时通过 h 参数识别环境标识
        if (params.h) {
          // 如果需要多端适配，可以在此根据 h 参数设置对应的 baseUrl
          // 例如: if (params.h === 'prod') this.baseUrl = 'https://api.prod.com';
          uni.setStorageSync('baseUrl', this.baseUrl);
        }
        if (params.t) this.ticket = params.t;
        if (params.b) this.bindUserId = params.b;
      } else {
        this.ticket = scene;
      }
    }
  },
  methods: {
    handleLogin() {
      this.loading = true;
      uni.login({
        provider: 'weixin',
        success: (res) => {
          this.loginToServer(res.code);
        },
        fail: (err) => {
          this.loading = false;
          uni.showToast({ title: '登录失败，请重试', icon: 'none', duration: 2000 });
          console.error('微信登录失败:', err);
        }
      });
    },
    loginToServer(code) {
      console.log('[wxlogin] loginToServer 开始请求, action: mp_login');
      uni.request({
        url: this.baseUrl + '/functions/v1/wechat-miniprogram',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          action: this.bindUserId ? 'mp_bind' : 'mp_login',
          code: code,
          ticket: this.ticket,
          bindUserId: this.bindUserId,
          scene: this.scene
        },
        success: (res) => {
          this.loading = false;
          const data = res.data;
          console.log('[wxlogin] 服务器响应:', data);
          if (data && data.success) {
            uni.setStorageSync('token', data.token);
            uni.setStorageSync('openid', data.openid);
            uni.showToast({ title: '登录成功', icon: 'success', duration: 1500 });
            setTimeout(() => uni.navigateBack(), 1500);
          } else if (data && (data.needBind === true || data.needBind === 'true')) {
            console.log('[wxlogin] 检测到需要绑定账号');
            uni.showModal({
              title: '关联账号',
              content: data.message || '您尚未关联系统账号，请先登录已有账号或创建新账号完成绑定',
              confirmText: '去关联',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 这里跳转到绑定页面，传递 openid 和相关参数
                  uni.navigateTo({
                    url: '/pages/user/bind?openid=' + data.openid + '&ticket=' + this.ticket
                  });
                }
              }
            });
          } else {
            console.error('[wxlogin] 登录失败:', data?.message || '未知错误');
            uni.showToast({ 
              title: data?.message || '登录失败，请稍后再试', 
              icon: 'none', 
              duration: 2000 
            });
          }
        },
        fail: (err) => {
          this.loading = false;
          console.error('[wxlogin] 请求失败:', err);
          uni.showToast({ title: '网络异常，登录失败', icon: 'none', duration: 2000 });
        }
      });
    },
    openAgreement(type) {
      const url = type === 'user' 
        ? 'https://your-domain.com/user-agreement' 
        : 'https://your-domain.com/privacy-policy';
      uni.navigateTo({
        url: \`/pages/webview/webview?url=\${encodeURIComponent(url)}\`
      });
    }
  }
}
</script>

<style scoped>
.login-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fff; }
.header { display: flex; flex-direction: column; align-items: center; margin-bottom: 60rpx; }
.logo-placeholder { width: 120rpx; height: 120rpx; background: #07c160; border-radius: 30rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 20rpx; }
.logo-placeholder text { color: #fff; font-size: 60rpx; font-weight: bold; }
.title { font-size: 36rpx; font-weight: bold; color: #333; }
.content { width: 80%; display: flex; flex-direction: column; align-items: center; }
.login-btn { width: 100%; background: #07c160; color: #fff; border-radius: 45rpx; margin-top: 100rpx; font-weight: bold; font-size: 32rpx; border: none; }
.agreement { font-size: 24rpx; color: #999; margin-top: 40rpx; text-align: center; }
.link { color: #576b95; }
</style>
`;
    return code;
  };

  const handleCopy = () => {
    if (!config.code_snippet) {
      toast.error('请先生成代码');
      return;
    }
    navigator.clipboard.writeText(config.code_snippet);
    setCopied(true);
    toast.success('代码已复制到剪贴板');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>微信小程序登录配置</CardTitle>
          <CardDescription>配置小程序登录页面，用户可通过微信一键登录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>AppID</Label>
            <Input
              value={config.app_id}
              onChange={(e) => setConfig({ ...config, app_id: e.target.value })}
              placeholder="请输入小程序 AppID"
            />
          </div>

          <div className="space-y-2">
            <Label>AppSecret</Label>
            <Input
              type="password"
              value={config.app_secret}
              onChange={(e) => setConfig({ ...config, app_secret: e.target.value })}
              placeholder="请输入小程序 AppSecret"
            />
          </div>

          <div className="space-y-2">
            <Label>登录页面路径</Label>
            <Input
              value={config.page_path}
              onChange={(e) => setConfig({ ...config, page_path: e.target.value })}
              placeholder="pages/user/wxlogin"
            />
            <p className="text-xs text-muted-foreground">
              小程序登录页面的路径，默认为 pages/user/wxlogin
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                保存配置
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {config.code_snippet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>小程序登录页面代码 (wxlogin.vue)</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制代码
                  </>
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              将以下代码复制到小程序项目的 pages/user/wxlogin.vue 文件中
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.code_snippet}
              readOnly
              className="font-mono text-xs min-h-[400px]"
            />
            <Alert className="mt-4">
              <AlertDescription>
                <strong>使用说明：</strong>
                <ol className="list-decimal list-inside space-y-1 mt-2">
                  <li>在小程序项目中创建 pages/user 目录（如果不存在）</li>
                  <li>创建 wxlogin.vue 文件并粘贴上述代码</li>
                  <li>在 pages.json 中添加该页面路由</li>
                  <li>用户点击登录按钮后将自动调用微信登录接口</li>
                  <li>登录成功后会自动保存 token 并返回上一页</li>
                  <li>如果用户未绑定账号，会跳转到绑定页面</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
