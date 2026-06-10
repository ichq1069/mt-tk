import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/db/api';
import { toast } from 'sonner';
import { Loader2, Save, QrCode, Copy, Check, ExternalLink, HelpCircle, FileCode, Smartphone, Bell, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MiniProgramLogsSection } from './MiniProgramLogsSection';


export function MiniProgramSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingLogin, setGeneratingLogin] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrScene, setQrScene] = useState<string | null>(null);
  const [qrPage, setQrPage] = useState<string | null>(null);
  const [loginQrData, setLoginQrData] = useState<string | null>(null);
  const [loginQrScene, setLoginQrScene] = useState<string | null>(null);
  const [loginQrPage, setLoginQrPage] = useState<string | null>(null);
  const [testItemId, setTestItemId] = useState('daily_gallery_' + new Date().toISOString().split('T')[0]);
  const [testTicket, setTestTicket] = useState('test_ticket_' + Math.random().toString(36).slice(2, 8));
  const [copied, setCopied] = useState(false);
  const [storageConfig, setStorageConfig] = useState<any>(null);
  const [testBindUserId, setTestBindUserId] = useState('');
  const [bindQrData, setBindQrData] = useState<string | null>(null);
  const [bindQrScene, setBindQrScene] = useState<string | null>(null);
  const [bindQrPage, setBindQrPage] = useState<string | null>(null);
  const [generatingBind, setGeneratingBind] = useState(false);
  const [testUsers, setTestUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await api.supabase
        .from('profiles')
        .select('id, username, email, mobile')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Fetch users error:', error);
        return;
      }
      
      if (data) setTestUsers(data);
    };
    fetchUsers();
  }, []);

  const handleGenerateBindQr = async () => {
    if (!testBindUserId) {
      toast.error('请选择或输入要绑定的 User ID');
      return;
    }
    setGeneratingBind(true);
    try {
      const cleanDomain = getCleanDomain();
      const { data, error } = await api.supabase.functions.invoke('wechat-miniprogram', {
        body: { 
          action: 'generate_qr', 
          bindUserId: testBindUserId,
          domain: cleanDomain
        }
      });
      
      if (error) {
        const errorText = typeof error?.context?.text === 'function' ? await error.context.text() : error?.message;
        throw new Error(errorText || error.message);
      }
      if (data?.success) {
        setBindQrData(data.qr_data);
        setBindQrScene(data.scene);
        setBindQrPage(data.page);
      } else {
        toast.error('生成失败: ' + (data?.message || '未知错误'));
      }
    } catch (e: any) {
      console.error('Generate bind qr error:', e);
      toast.error('生成绑定码失败: ' + e.message);
    } finally {
      setGeneratingBind(false);
    }
  };


  const [config, setConfig] = useState({
    id: '',
    app_id: '',
    app_secret: '',
    ad_unit_id: '',
    task_page_path: 'pages/user/task',
    login_page_path: 'pages/user/wxlogin',
    is_mp_bind_enabled: false,
    is_mp_login_enabled: false,
    is_msg_push_enabled: false, // 新增
    is_debug_enabled: false,
    server_url: '',
    token: '',
    encoding_aes_key: '',
    message_encryption_mode: 'plain'
  });

  const generateRandomStr = (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const [activeTab, setActiveTab] = useState<'config' | 'renwu' | 'login' | 'bind' | 'logs'>('config');

  const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';

  const renwuCode = `<template>
  <view class="body">
    <view class="tip">⚡</view>
    <button class="button" :disabled="_isLoading" @click="handleShowAd">点击解锁</button>
    <view class="sss">观看视频广告 = <text>1</text>次解锁</view>
  </view>
</template>

<script>
let videoAd = null;
export default {
  data() {
    return {
      baseUrlmiaoda: 'https://backend.appmiaoda.com/projects/supabase290871706745094144',
      baseUrlsupabase: 'https://ehnwzyxssxwuqwkqysnb.supabase.co',
      baseUrl3wo58: 'https://supabase.wo58.cn',
      baseUrl: uni.getStorageSync('baseUrl') || 'https://backend.appmiaoda.com/projects/supabase290871706745094144',
      vid: '',
      itemData: null,
      unlocked: false,
      _isLoading: false,
      checkCode: '',
      hostIdentifier: '',
      originalScene: '',
      adUnitId: '${config.ad_unit_id || 'adunit-61b3f0c6051db5fe'}',
      isDestroyed: false
    }
  },
  onLoad(options) {
    this.isDestroyed = false;
    console.log('[任务页] onLoad 入参:', options);
    this.parseOptions(options);
    this.fetchData();
    this.initAd();
  },
  onUnload() {
    this.isDestroyed = true;
    this.destroyAd();
  },
  methods: {
    parseOptions(options) {
      if (options.scene) {
        this.originalScene = options.scene;
        const scene = decodeURIComponent(options.scene);
        const params = {};
        scene.split('&').forEach(p => {
          const pair = p.split('=');
          if (pair.length === 2) params[pair[0]] = pair[1];
        });
        if (params.h) this.hostIdentifier = params.h;
        if (params.d) this.vid = params.d;
        if (params.c) this.checkCode = params.c;
      } else {
        // 直接参数模式 (如开发者工具或普通跳转)
        if (options.d) this.vid = options.d;
        if (options.c) this.checkCode = options.c;
        if (options.h) this.hostIdentifier = options.h;
        // 如果没有 scene 但有关键参数，拼凑一个伪 scene 以便云函数找回 browserId
        if (options.c && options.d) {
           this.originalScene = 'c=' + options.c + '&d=' + options.d + (options.h ? '&h=' + options.h : '') + (options.s ? '&s=' + options.s : '');
        }
      }
      
      // 环境切换逻辑
      const h = this.hostIdentifier;
      if (h) {
        if (h.includes('miaoda') || h === 'md' || h.startsWith('md-') || h === 'main' || h === 'ma') this.baseUrl = this.baseUrlmiaoda;
        else if (h.includes('supabase') || h === 'sp' || h.startsWith('sp-')) this.baseUrl = this.baseUrlsupabase;
        else if (h.includes('wo58') || h === 'wo' || h.startsWith('wo-') || h.indexOf('dhso') !== -1) this.baseUrl = this.baseUrl3wo58;
        uni.setStorageSync('baseUrl', this.baseUrl);
      }
    },
    destroyAd() {
      if (videoAd) {
        try {
          if (videoAd.offLoad) videoAd.offLoad();
          if (videoAd.offError) videoAd.offError();
          if (videoAd.offClose) videoAd.offClose();
        } catch (e) {}
        videoAd = null;
      }
    },
    initAd() {
      if (!uni.createRewardedVideoAd) return;
      this.destroyAd();
      videoAd = uni.createRewardedVideoAd({ adUnitId: this.adUnitId });
      videoAd.onLoad(() => console.log('广告加载成功'));
      videoAd.onError((err) => {
        console.error('广告错误:', err);
        if (this.isDestroyed) return;
        this._isLoading = false;
      });
      videoAd.onClose((res) => {
        if (this.isDestroyed) return;
        if (res && res.isEnded) {
          this.handleAdCallback('completed');
        } else {
          this._isLoading = false;
          this.handleAdCallback('exited_incomplete');
          uni.showToast({ title: '需要完整观看广告', icon: 'none' });
        }
      });
    },
    async fetchData() {
      if (!this.vid || this.isDestroyed) return;
      uni.request({
        url: this.baseUrl + '/functions/v1/wechat-miniprogram',
        method: 'POST',
        data: { 
          action: 'get_task_data', 
          vid: this.vid,
          scene: this.originalScene,
          openid: uni.getStorageSync('openid') || ''
        },
        success: (res) => {
          if (this.isDestroyed) return;
          if (res.data.success) this.itemData = res.data.data;
        }
      });
    },
    handleShowAd() {
      if (this._isLoading || this.isDestroyed) return;
      this._isLoading = true;
      if (!videoAd) this.initAd();
      if (videoAd) {
        videoAd.show().then(() => {
          this.handleAdCallback('watching');
        }).catch((err) => {
          videoAd.load().then(() => {
            videoAd.show().then(() => {
              this.handleAdCallback('watching');
            });
          }).catch(() => {
            this._isLoading = false;
            uni.showToast({ title: '广告加载失败', icon: 'none' });
          });
        });
      }
    },
    handleAdCallback(status) {
      if (this.isDestroyed && status !== 'completed' && status !== 'exited_incomplete') return;
      uni.request({
        url: this.baseUrl + '/functions/v1/wechat-miniprogram',
        method: 'POST',
        data: {
          action: 'ad_callback',
          itemId: this.vid,
          watch_status: status,
          openid: uni.getStorageSync('openid') || '',
          checkCode: this.checkCode,
          scene: this.originalScene,
          hostIdentifier: this.hostIdentifier
        },
        success: (res) => {
          if (this.isDestroyed) return;
          if (status === 'completed') {
            this._isLoading = false;
            if (res.data.success) {
              this.unlocked = true;
              uni.showToast({ title: '解锁成功' });
            } else {
              uni.showToast({ title: res.data.message || '解锁失败', icon: 'none' });
            }
          }
        },
        fail: () => {
          if (this.isDestroyed) return;
          if (status === 'completed') {
            this._isLoading = false;
            uni.showToast({ title: '网络异常', icon: 'none' });
          }
        }
      });
    }
  }
}
</script>

<style scoped>
.body {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.tip {
  font-size: 32rpx;
  color: #fff;
  margin-bottom: 40rpx;
  font-weight: 500;
}
.button {
  width: 500rpx;
  height: 88rpx;
  background: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  color: #667eea;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.15);
}
.button:disabled {
  opacity: 0.6;
}
.sss {
  margin-top: 40rpx;
  font-size: 28rpx;
  color: rgba(255,255,255,0.9);
}
.sss text {
  color: #ffd700;
  font-weight: 600;
}
</style>
`;

  const loginCode = `<template>
  <view class="body">
    <view class="logo">
      <text>M</text>
    </view>
    <view class="title">微信快捷登录</view>
    <button class="button" :disabled="loading" @click="handleLogin">微信一键登录</button>
    <view class="sss">登录即代表同意 <text>《用户协议》</text></view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      // 多环境 API 域名映射
      baseUrlmiaoda: 'https://backend.appmiaoda.com/projects/supabase290871706745094144',
      baseUrlsupabase: 'https://ehnwzyxssxwuqwkqysnb.supabase.co',
      baseUrl3wo58: 'https://supabase.wo58.cn',
      // 当前基础域名
      baseUrl: uni.getStorageSync('baseUrl') || 'https://ehnwzyxssxwuqwkqysnb.supabase.co',
      loading: false,
      ticket: '',
      bindUserId: '',
      checkCode: '',
      scene: '',
      isDestroyed: false
    }
  },
  onLoad(options) {
    this.isDestroyed = false;
    console.log('[小程序交互日志][wxlogin.vue] onLoad 入参:', options);
    
    // 优先从 options 直接读取 (针对普通二维码或跳转)
    if (options.t) this.ticket = options.t;
    if (options.b) this.bindUserId = options.b;
    if (options.c) this.checkCode = options.c;
    if (options.h) this.switchBaseUrl(options.h);

    if (options.scene) {
      const scene = decodeURIComponent(options.scene);
      this.scene = scene;
      console.log('[小程序交互日志][wxlogin.vue] 扫码原始场景:', scene);
      if (scene.indexOf('=') !== -1) {
        const params = {};
        scene.split('&').forEach(p => {
          const pair = p.split('=');
          if (pair.length === 2) params[pair[0]] = pair[1];
        });
        console.log('[小程序交互日志][wxlogin.vue] 解析参数:', params);
        
        // 扫码进入时通过 h 参数识别环境标识，并动态切换 baseUrl
        if (params.h) this.switchBaseUrl(params.h);
        if (params.t) this.ticket = params.t;
        if (params.b) this.bindUserId = params.b;
        if (params.c) this.checkCode = params.c;
      } else {
        if (!this.ticket) this.ticket = scene;
      }
    }
    console.log('[小程序交互日志][wxlogin.vue] 最终票据:', this.ticket, '待绑定ID:', this.bindUserId, '校验码:', this.checkCode);
  },
  onUnload() {
    this.isDestroyed = true;
    console.log('[小程序交互日志][wxlogin.vue] 页面卸载');
  },
  methods: {
    switchBaseUrl(h) {
      if (h.indexOf('backend.appmiaoda.com') !== -1 || h.startsWith('md-')) {
        this.baseUrl = this.baseUrlmiaoda;
      } else if (h.indexOf('ehnwzyxssxwuqwkqysnb') !== -1 || h.startsWith('sp-')) {
        this.baseUrl = this.baseUrlsupabase;
      } else if (h.indexOf('wo58.cn') !== -1 || h.startsWith('wo-')) {
        this.baseUrl = this.baseUrl3wo58;
      }
      uni.setStorageSync('baseUrl', this.baseUrl);
      console.log('[小程序交互日志][wxlogin.vue] 切换基地址:', this.baseUrl);
    },
    safeNavigateBack() {
      if (this.isDestroyed) return;
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        console.log('[小程序交互日志][wxlogin.vue] 首页不执行返回');
      }
    },
    handleLogin() {
      console.log('[小程序交互日志][wxlogin.vue] 用户点击微信登录');
      if (this.loading || this.isDestroyed) return;
      if (this.scene && !this.checkCode) {
        return uni.showToast({ title: '参数无效，无法登录', icon: 'none' });
      }
      this.loading = true;
      uni.login({
        provider: 'weixin',
        success: (res) => {
          console.log('[小程序交互日志][wxlogin.vue] uni.login 获取 code 成功:', res.code);
          if (this.isDestroyed) return;
          this.loginToServer(res.code);
        },
        fail: (err) => {
          console.error('[小程序交互日志][wxlogin.vue] uni.login 失败:', err);
          if (this.isDestroyed) return;
          this.loading = false;
          uni.showToast({ title: '登录失败', icon: 'none' });
        }
      });
    },
    loginToServer(code) {
      if (this.isDestroyed) return;
      this.loading = true;
      const url = this.baseUrl + '/functions/v1/wechat-miniprogram';
      const body = {
        action: 'mp_login',
        code: code,
        ticket: this.ticket,
        bindUserId: this.bindUserId,
        scene: this.scene,
        checkCode: this.checkCode
      };
      console.log('[小程序交互日志][wxlogin.vue] 请求服务端登录, URL:', url, 'Body:', body);
      uni.request({
        url: url,
        method: 'POST',
        data: body,
        success: (res) => {
          console.log('[小程序交互日志][wxlogin.vue] 服务端登录返回反馈:', res.data);
          if (this.isDestroyed) return;
          this.loading = false;
          const data = res.data;
          if (data && data.success) {
            uni.setStorageSync('openid', data.openid);
            uni.showModal({
              title: '授权成功',
              content: '已完成授权，请返回网页端继续登录或绑定操作',
              showCancel: false,
              success: (modalRes) => {
                if (modalRes.confirm) {
                  setTimeout(() => this.safeNavigateBack(), 500);
                }
              }
            });
          } else {
            uni.showToast({ title: data?.message || '授权失败', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('[小程序交互日志][wxlogin.vue] 服务端登录请求网络失败:', err);
          if (this.isDestroyed) return;
          this.loading = false;
          uni.showToast({ title: '网络请求失败', icon: 'none' });
        }
      });
    }
  }
}
</script>

<style scoped>
.body {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.logo {
  width: 120rpx;
  height: 120rpx;
  background: #fff;
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1);
}
.logo text {
  font-size: 60rpx;
  color: #667eea;
  font-weight: bold;
}
.title {
  font-size: 36rpx;
  color: #fff;
  margin-bottom: 80rpx;
  font-weight: 600;
}
.button {
  width: 500rpx;
  height: 88rpx;
  background: #fff;
  border-radius: 44rpx;
  font-size: 32rpx;
  color: #667eea;
  font-weight: 600;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.15);
}
.button:disabled {
  opacity: 0.6;
}
.sss {
  margin-top: 40rpx;
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
}
.sss text {
  color: #ffd700;
}
</style>
`;

  const bindCode = `<template>
  <view class="body">
    <view class="title">关联已有账号</view>
    <view class="form">
      <input class="input" v-model="form.username" placeholder="用户名/邮箱" placeholder-style="color: rgba(255,255,255,0.5)" />
      <input class="input" v-model="form.password" type="password" placeholder="请输入密码" placeholder-style="color: rgba(255,255,255,0.5)" />
      <button class="button" :disabled="loading" @click="handleBind">确认绑定</button>
      <view class="back" @click="goBack">返回登录</view>
      <view v-if="bindUserId" style="margin-top:20rpx; font-size:24rpx; color:rgba(255,255,255,0.6); text-align:center">[调试] 待绑定ID: {{bindUserId}}</view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      baseUrlmiaoda: 'https://backend.appmiaoda.com/projects/supabase290871706745094144',
      baseUrlsupabase: 'https://ehnwzyxssxwuqwkqysnb.supabase.co',
      baseUrl3wo58: 'https://supabase.wo58.cn',
      baseUrl: uni.getStorageSync('baseUrl') || 'https://ehnwzyxssxwuqwkqysnb.supabase.co',
      loading: false,
      openid: '',
      ticket: '',
      bindUserId: '',
      checkCode: '',
      scene: '',
      isDestroyed: false,
      form: {
        username: '',
        password: ''
      }
    }
  },
  onLoad(options) {
    this.isDestroyed = false;
    console.log('[小程序交互日志][bind.vue] onLoad 入参:', options);
    
    // 优先从 options 直接读取
    if (options.openid) this.openid = options.openid;
    if (options.ticket) this.ticket = options.ticket;
    if (options.b) this.bindUserId = options.b;
    if (options.c) this.checkCode = options.c;
    if (options.h) this.switchBaseUrl(options.h);
    
    if (options.scene) {
      const scene = decodeURIComponent(options.scene);
      this.scene = scene;
      console.log('[小程序交互日志][bind.vue] 扫码原始场景:', scene);
      if (scene.indexOf('=') !== -1) {
        const params = {};
        scene.split('&').forEach(p => {
          const pair = p.split('=');
          if (pair.length === 2) params[pair[0]] = pair[1];
        });
        console.log('[小程序交互日志][bind.vue] 解析参数:', params);
        
        if (params.h) this.switchBaseUrl(params.h);
        if (params.b) this.bindUserId = params.b;
        if (params.c) this.checkCode = params.c;
      } else {
        if (!this.bindUserId) this.bindUserId = scene;
      }
    }
    console.log('[小程序交互日志][bind.vue] 最终待绑定ID:', this.bindUserId, '校验码:', this.checkCode);
    
    // 如果是扫码进入且包含 bindUserId 和校验码，则尝试静默绑定，不跳转绑定页
    if (this.bindUserId && this.checkCode) {
      console.log('[小程序交互日志][bind.vue] 触发静默绑定');
      this.silentBind();
    }
  },
  onUnload() {
    this.isDestroyed = true;
    console.log('[小程序交互日志][bind.vue] 页面卸载');
  },
  methods: {
    switchBaseUrl(h) {
      if (h.indexOf('backend.appmiaoda.com') !== -1 || h.startsWith('md-')) {
        this.baseUrl = this.baseUrlmiaoda;
      } else if (h.indexOf('ehnwzyxssxwuqwkqysnb') !== -1 || h.startsWith('sp-')) {
        this.baseUrl = this.baseUrlsupabase;
      } else if (h.indexOf('wo58.cn') !== -1 || h.startsWith('wo-')) {
        this.baseUrl = this.baseUrl3wo58;
      }
      uni.setStorageSync('baseUrl', this.baseUrl);
      console.log('[小程序交互日志][bind.vue] 切换基地址:', this.baseUrl);
    },
    silentBind() {
      console.log('[小程序交互日志][bind.vue] 用户触发静默绑定，待绑定ID:', this.bindUserId);
      this.loading = true;
      uni.login({
        provider: 'weixin',
        success: (loginRes) => {
          console.log('[小程序交互日志][bind.vue] uni.login 成功，code:', loginRes.code);
          console.log('[小程序交互日志][bind.vue] 准备发送绑定请求，URL:', this.baseUrl + '/functions/v1/wechat-miniprogram');
          console.log('[小程序交互日志][bind.vue] 请求参数:', {
            action: 'mp_bind',
            code: loginRes.code,
            userId: this.bindUserId,
            scene: this.scene,
            checkCode: this.checkCode
          });
          uni.request({
            url: this.baseUrl + '/functions/v1/wechat-miniprogram',
            method: 'POST',
            data: {
              action: 'mp_bind',
              code: loginRes.code,
              userId: this.bindUserId,
              scene: this.scene,
              checkCode: this.checkCode
            },
            success: (res) => {
              console.log('[小程序交互日志][bind.vue] 绑定接口响应:', res);
              this.loading = false;
              if (res.data.success) {
                console.log('[小程序交互日志][bind.vue] 绑定成功，1.5秒后跳转首页');
                uni.showToast({ title: '绑定成功' });
                setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1500);
              } else {
                console.log('[小程序交互日志][bind.vue] 绑定失败，提示:', res.data.message);
                uni.showToast({ title: res.data.message || '绑定失败，请手动尝试', icon: 'none' });
              }
            },
            fail: (err) => {
              console.error('[小程序交互日志][bind.vue] 绑定请求失败:', err);
              this.loading = false;
              uni.showToast({ title: '请求失败', icon: 'none' });
            }
          });
        },
        fail: (err) => {
          console.error('[小程序交互日志][bind.vue] uni.login 失败:', err);
          this.loading = false;
          uni.showToast({ title: '微信授权失败', icon: 'none' });
        }
      });
    },
    handleBind() {
      console.log('[小程序交互日志][bind.vue] 用户点击手动绑定按钮');
      if (!this.form.username || !this.form.password) {
        console.log('[小程序交互日志][bind.vue] 表单未填写完整');
        return uni.showToast({ title: '请填写完整', icon: 'none' });
      }
      console.log('[小程序交互日志][bind.vue] 表单验证通过，准备登录');
      this.loading = true;
      uni.login({
        provider: 'weixin',
        success: (loginRes) => {
          console.log('[小程序交互日志][bind.vue] uni.login 成功，code:', loginRes.code);
          console.log('[小程序交互日志][bind.vue] 准备发送绑定请求，URL:', this.baseUrl + '/functions/v1/wechat-miniprogram');
          console.log('[小程序交互日志][bind.vue] 请求参数:', {
            action: 'mp_bind',
            code: loginRes.code,
            username: this.form.username,
            openid: this.openid,
            ticket: this.ticket,
            checkCode: this.checkCode
          });
          uni.request({
            url: this.baseUrl + '/functions/v1/wechat-miniprogram',
            method: 'POST',
            data: {
              action: 'mp_bind',
              code: loginRes.code,
              username: this.form.username,
              password: this.form.password,
              openid: this.openid,
              ticket: this.ticket,
              checkCode: this.checkCode
            },
            success: (res) => {
              console.log('[小程序交互日志][bind.vue] 绑定接口响应:', res);
              this.loading = false;
              if (res.data.success) {
                console.log('[小程序交互日志][bind.vue] 绑定成功，1.5秒后跳转首页');
                uni.showToast({ title: '绑定成功' });
                setTimeout(() => {
                  uni.reLaunch({ url: '/pages/index/index' });
                }, 1500);
              } else {
                console.log('[小程序交互日志][bind.vue] 绑定失败，提示:', res.data.message);
                uni.showToast({ title: res.data.message || '绑定失败', icon: 'none' });
              }
            },
            fail: (err) => {
              console.error('[小程序交互日志][bind.vue] 绑定请求失败:', err);
              this.loading = false;
              uni.showToast({ title: '请求失败', icon: 'none' });
            }
          });
        },
        fail: (err) => {
          console.error('[小程序交互日志][bind.vue] uni.login 失败:', err);
          this.loading = false;
          uni.showToast({ title: '微信登录失败', icon: 'none' });
        }
      });
    },
    goBack() {
      console.log('[小程序交互日志][bind.vue] 用户点击返回登录');
      uni.navigateBack();
    }
  }
}
</script>

<style scoped>
.body {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.title {
  font-size: 40rpx;
  color: #fff;
  margin-bottom: 60rpx;
  font-weight: 600;
}
.form {
  width: 80%;
}
.input {
  width: 100%;
  height: 90rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 45rpx;
  margin-bottom: 30rpx;
  padding: 0 40rpx;
  color: #fff;
  font-size: 30rpx;
  border: 1px solid rgba(255,255,255,0.2);
}
.button {
  width: 100%;
  height: 90rpx;
  background: #fff;
  border-radius: 45rpx;
  font-size: 32rpx;
  color: #667eea;
  font-weight: 600;
  margin-top: 30rpx;
}
.back {
  text-align: center;
  margin-top: 40rpx;
  font-size: 28rpx;
  color: rgba(255,255,255,0.7);
}
</style>
`;


  const [serverConfig, setServerConfig] = useState<{
    type: 'miaoda' | 'supabase' | 'custom';
    baseUrl: string;
  }>({
    type: 'miaoda',
    baseUrl: 'https://backend.appmiaoda.com/projects/supabase290871706745094144'
  });

  useEffect(() => {
    fetchConfig();
    fetchServerConfig();
  }, []);

  const fetchServerConfig = async () => {
    try {
      const { data } = await api.getSystemConfig('mini_program_server_config');
      if (data?.value) {
        setServerConfig(data.value);
      }
    } catch (error) {
      console.error('获取小程序服务器配置失败:', error);
    }
  };

  const handleSaveServerConfig = async () => {
    try {
      const { error } = await api.updateSystemConfig('mini_program_server_config', serverConfig);
      if (error) throw error;
      toast.success('服务器配置已保存');
    } catch (error: any) {
      toast.error(`保存失败: ${error.message}`);
    }
  };

  const getCallbackUrl = (configId: string) => {
    const baseUrl = serverConfig.baseUrl || 'https://backend.appmiaoda.com/projects/supabase290871706745094144';
    // 确保没有多余的斜杠
    const sanitizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${sanitizedBaseUrl}/functions/v1/wechat-miniprogram?config_id=${configId}`;
  };

  const fetchConfig = async () => {
    try {
      const { data: storageRes } = await api.getStorageConfig();
      if (storageRes) setStorageConfig(storageRes);

      const { data, error } = await api.getMiniProgramConfig();
      if (error) throw error;
      if (data) {
        setConfig({
          id: data.id,
          app_id: data.app_id || '',
          app_secret: data.app_secret || '',
          ad_unit_id: data.ad_unit_id || '',
          task_page_path: data.task_page_path || 'pages/user/task',
          login_page_path: data.login_page_path || 'pages/user/wxlogin',
          is_mp_login_enabled: data.is_mp_login_enabled ?? false,
          is_mp_bind_enabled: data.is_mp_bind_enabled ?? false,
          is_msg_push_enabled: data.is_msg_push_enabled ?? false, // 新增
          is_debug_enabled: data.is_debug_enabled ?? false,
          server_url: data.server_url || '',
          token: data.token || '',
          encoding_aes_key: data.encoding_aes_key || '',
          message_encryption_mode: data.message_encryption_mode || 'plain'
        } as any);
      }
    } catch (error: any) {
      toast.error('加载小程序配置失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 自动生成 URL 如果为空
      const currentConfig = { ...config };
      const callbackUrl = getCallbackUrl(config.id);
      currentConfig.server_url = callbackUrl;
      
      const { error } = await api.updateMiniProgramConfig(currentConfig);
      if (error) throw error;
      
      // 保存服务器基础配置
      await api.updateSystemConfig('mini_program_server_config', serverConfig);
      
      // 同步更新 storage_configs
      await (api.supabase.from('storage_configs') as any).update({
        is_mp_login_enabled: config.is_mp_login_enabled,
        is_mp_bind_enabled: config.is_mp_bind_enabled
      }).eq('id', (await api.getStorageConfig()).data?.id);

      setConfig(currentConfig as any);
      toast.success('配置已保存');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error('保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQr = async () => {
    setGenerating(true);
    try {
      const { data, error } = await api.generateMiniProgramQr(
        testItemId, 
        'daily_gallery', 
        undefined, 
        storageConfig?.mp_domain_identifier
      );
      if (error) throw error;
      if (data.success) {
        setQrData(data.qr_data);
        setQrScene(data.scene);
        setQrPage(data.page);
        toast.success('预览码生成成功');
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast.error('生成失败: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateLoginQr = async () => {
    setGeneratingLogin(true);
    try {
      const { data, error } = await api.generateMiniProgramQr(
        testTicket, 
        'login', 
        undefined, 
        storageConfig?.mp_domain_identifier
      );
      if (error) throw error;
      if (data.success) {
        setLoginQrData(data.qr_data);
        setLoginQrScene(data.scene);
        setLoginQrPage(data.page);
        toast.success('登录预览码生成成功');
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast.error('生成登录码失败: ' + error.message);
    } finally {
      setGeneratingLogin(false);
    }
  };

  const handleCopy = (text: string, msg: string = '已复制') => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(msg);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCleanDomain = () => {
    return storageConfig?.mp_domain_identifier ? storageConfig.mp_domain_identifier.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  };

  const getTestQrScene = () => {
    const shortItemId = testItemId.replace(/daily_gallery_/g, '').replace(/-/g, '');
    const cleanDomain = getCleanDomain();
    if (cleanDomain) {
      return `d=${shortItemId}&h=${cleanDomain}`.slice(0, 32);
    }
    return `d=${shortItemId}`.slice(0, 32);
  };

  const getTestLoginScene = () => {
    const ticket = testTicket.replace(/-/g, '');
    const cleanDomain = getCleanDomain();
    if (cleanDomain) {
      return `t=${ticket.slice(0, 12)}&h=${cleanDomain}`.slice(0, 32);
    }
    return ticket.slice(0, 32);
  };

  const handleGenerateRandomToken = (field: 'token' | 'encoding_aes_key') => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const len = field === 'token' ? 32 : 43;
    let res = '';
    for(let i=0; i<len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    setConfig({...config, [field]: res});
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline-block" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-6 bg-muted/20 p-1.5 rounded-2xl w-fit">
        <Button 
          variant={activeTab === 'config' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('config')}
          className="rounded-xl"
        >
          接口配置
        </Button>
        <Button 
          variant={activeTab === 'renwu' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('renwu')}
          className="rounded-xl"
        >
          任务代码 (renwu.vue)
        </Button>
        <Button 
          variant={activeTab === 'login' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('login')}
          className="rounded-xl"
        >
          登录代码 (wxlogin.vue)
        </Button>
        <Button 
          variant={activeTab === 'logs' ? 'secondary' : 'ghost'} 
          onClick={() => setActiveTab('logs')}
          className="rounded-xl"
        >
          记录流水
        </Button>

      </div>

      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="rounded-3xl border-none shadow-sm h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-5 h-5 text-primary" />
                基础参数
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>小程序 AppID</Label>
                <Input value={config.app_id} onChange={e => setConfig({...config, app_id: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>小程序 AppSecret</Label>
                <Input value={config.app_secret} onChange={e => setConfig({...config, app_secret: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>小程序激励广告单元 ID</Label>
                <Input value={config.ad_unit_id} onChange={e => setConfig({...config, ad_unit_id: e.target.value})} className="rounded-xl" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>任务生成页面路径</Label>
                  <Input 
                    value={config.task_page_path} 
                    onChange={e => setConfig({...config, task_page_path: e.target.value})} 
                    className="rounded-xl" 
                    placeholder="例如: pages/user/task" 
                  />
                  <p className="text-[10px] text-muted-foreground">用于生成任务扫码跳转页面</p>
                </div>
                <div className="space-y-2">
                  <Label>登录业务页面路径</Label>
                  <Input 
                    value={config.login_page_path} 
                    onChange={e => setConfig({...config, login_page_path: e.target.value})} 
                    className="rounded-xl" 
                    placeholder="例如: pages/user/wxlogin" 
                  />
                  <p className="text-[10px] text-muted-foreground">用于快捷登录扫码跳转页面</p>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">启用小程序登录</Label>
                    <p className="text-xs text-muted-foreground">开启后，用户可以通过微信小程序扫码登录</p>
                  </div>
            {/* 服务器基础地址选择 */}
            <Card className="rounded-3xl border-none shadow-sm bg-primary/5 border border-primary/10 mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-black flex items-center gap-2">
                  <Save className="w-5 h-5 text-primary" />
                  小程序服务器地址配置
                </CardTitle>
                <CardDescription>
                  选择小程序后台使用的 API 服务器基础地址
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <SelectTrigger className="rounded-xl border-none bg-background shadow-none h-11">
                        <SelectValue placeholder="选择服务器" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        <SelectItem value="miaoda">秒哒服务器 (推荐)</SelectItem>
                        <SelectItem value="supabase">Supabase 官方服务器</SelectItem>
                        <SelectItem value="custom">手动输入地址</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-60">服务器基础地址 (Base URL)</Label>
                    <Input 
                      value={serverConfig.baseUrl} 
                      onChange={(e) => setServerConfig({ ...serverConfig, baseUrl: e.target.value })}
                      placeholder="https://your-backend-url.com"
                      className="rounded-xl border-none bg-background shadow-none h-11"
                      disabled={serverConfig.type !== 'custom'}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

                  <Switch 
                    checked={config.is_mp_login_enabled} 
                    onCheckedChange={(checked) => setConfig({ ...config, is_mp_login_enabled: checked })} 
                  />
                </div>
                  <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-bold">启用消息推送自动回复</Label>
                      <p className="text-xs text-muted-foreground">开启后，小程序客服消息将支持关键词自动回复和功能逻辑触发</p>
                    </div>
                    <Switch 
                      checked={config.is_msg_push_enabled} 
                      onCheckedChange={(checked) => setConfig({ ...config, is_msg_push_enabled: checked })} 
                    />
                  </div>


                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">启用小程序绑定</Label>
                    <p className="text-xs text-muted-foreground">开启后，用户可以在个人中心绑定微信小程序</p>
                  </div>
                  <Switch 
                    checked={config.is_mp_bind_enabled} 
                    onCheckedChange={(checked) => setConfig({ ...config, is_mp_bind_enabled: checked })} 
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">调试模式</Label>
                    <p className="text-xs text-muted-foreground">开启后，生成小程序码时将显示页面路径及参数信息</p>
                  </div>
                  <Switch 
                    checked={config.is_debug_enabled} 
                    onCheckedChange={(checked) => setConfig({ ...config, is_debug_enabled: checked })} 
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl mt-6">
                {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />} 保存
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-3xl border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  消息推送配置
                </CardTitle>
                <CardDescription>配置小程序后台的“消息推送”，用于接收登录、广告完播等事件</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    小程序 URL (服务器地址)
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(config.server_url || '', 'URL 已复制')}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </Label>
                  <Input value={config.server_url} readOnly className="rounded-xl bg-muted/30" placeholder="保存后自动生成" />
                </div>
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    Token (令牌)
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleGenerateRandomToken('token')}>
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </Label>
                  <Input value={config.token} onChange={e => setConfig({...config, token: e.target.value})} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="flex justify-between">
                    EncodingAESKey (消息加密密钥)
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleGenerateRandomToken('encoding_aes_key')}>
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </Label>
                  <Input value={config.encoding_aes_key} onChange={e => setConfig({...config, encoding_aes_key: e.target.value})} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>消息加密模式</Label>
                  <RadioGroup 
                    value={config.message_encryption_mode} 
                    onValueChange={(v) => setConfig({...config, message_encryption_mode: v})}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="plain" id="mp-plain" />
                      <Label htmlFor="mp-plain" className="text-xs">明文</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="compatibility" id="mp-comp" />
                      <Label htmlFor="mp-comp" className="text-xs">兼容</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="safe" id="mp-safe" />
                      <Label htmlFor="mp-safe" className="text-xs">安全</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 py-3">
                  <HelpCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-[10px] text-amber-700 dark:text-amber-400">
                    请将以上信息填入微信小程序后台：开发 {"->"} 开发管理 {"->"} 开发设置 {"->"} 消息推送。
                    数据格式请选择 <span className="font-bold">JSON</span>。
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" /> 测试扫码</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>资源 ID</Label>
                  <Input value={testItemId} onChange={e => setTestItemId(e.target.value)} className="rounded-xl" />
                </div>
                <Button onClick={handleGenerateQr} disabled={generating} variant="outline" className="w-full rounded-xl">
                  {generating ? <Loader2 className="animate-spin mr-2" /> : <QrCode className="mr-2 h-4 w-4" />} 生成测试码
                </Button>
                
                {qrData && (
                  <div className="flex flex-col items-center mt-4 space-y-3">
                    <img referrerPolicy="no-referrer" src={qrData} className="w-40 h-40 bg-white p-2 border rounded-xl" />
                    {config.is_debug_enabled && (
                      <div className="w-full space-y-2 mt-2">
                        <div className="flex flex-col gap-1 p-2 bg-muted rounded-xl text-[10px] break-all">
                          <div className="flex justify-between items-center text-muted-foreground border-b pb-1 mb-1">
                            <span>页面路径</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(qrPage || config.task_page_path, '路径已复制')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="font-mono">{qrPage || config.task_page_path}</div>
                        </div>
                        <div className="flex flex-col gap-1 p-2 bg-muted rounded-xl text-[10px] break-all">
                          <div className="flex justify-between items-center text-muted-foreground border-b pb-1 mb-1">
                            <span>场景参数 (scene)</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(qrScene || getTestQrScene(), '场景参数已复制')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="font-mono">{qrScene || getTestQrScene()}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-primary" /> 测试登录</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>测试 Ticket</Label>
                  <Input value={testTicket} onChange={e => setTestTicket(e.target.value)} className="rounded-xl" />
                </div>
                <Button onClick={handleGenerateLoginQr} disabled={generatingLogin} variant="outline" className="w-full rounded-xl">
                  {generatingLogin ? <Loader2 className="animate-spin mr-2" /> : <QrCode className="mr-2 h-4 w-4" />} 生成登录码
                </Button>
                
                {loginQrData && (
                  <div className="flex flex-col items-center mt-4 space-y-3">
                    <img referrerPolicy="no-referrer" src={loginQrData} className="w-40 h-40 bg-white p-2 border rounded-xl" />
                    {config.is_debug_enabled && (
                      <div className="w-full space-y-2 mt-2">
                        <div className="flex flex-col gap-1 p-2 bg-muted rounded-xl text-[10px] break-all">
                          <div className="flex justify-between items-center text-muted-foreground border-b pb-1 mb-1">
                            <span>页面路径</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(loginQrPage || config.login_page_path, '路径已复制')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="font-mono">{loginQrPage || config.login_page_path}</div>
                        </div>
                        <div className="flex flex-col gap-1 p-2 bg-muted rounded-xl text-[10px] break-all">
                          <div className="flex justify-between items-center text-muted-foreground border-b pb-1 mb-1">
                            <span>场景参数 (scene)</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(loginQrScene || getTestLoginScene(), '场景参数已复制')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="font-mono">{loginQrScene || getTestLoginScene()}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" /> 测试绑定 (bindUserId)
                </CardTitle>
                <CardDescription>用于测试账号绑定功能</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>选择测试用户</Label>
                  <select 
                    className="w-full h-10 px-3 py-2 bg-background border border-input rounded-xl text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={testBindUserId}
                    onChange={(e) => setTestBindUserId(e.target.value)}
                  >
                    <option value="">请选择用户</option>
                    {testUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.username || u.email || u.mobile || '未设置信息'} ({u.id.slice(0,8)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>或直接输入 User ID</Label>
                  <Input value={testBindUserId} onChange={e => setTestBindUserId(e.target.value)} className="rounded-xl" placeholder="UUID 格式" />
                </div>
                <Button onClick={handleGenerateBindQr} disabled={generatingBind} variant="outline" className="w-full rounded-xl">
                  {generatingBind ? <Loader2 className="animate-spin mr-2" /> : <QrCode className="mr-2 h-4 w-4" />} 生成绑定码
                </Button>
                
                {bindQrData && (
                  <div className="flex flex-col items-center mt-4 space-y-3">
                    <img referrerPolicy="no-referrer" src={bindQrData} className="w-40 h-40 bg-white p-2 border rounded-xl" />
                    {config.is_debug_enabled && (
                      <div className="w-full space-y-2 mt-2">
                        <div className="flex flex-col gap-1 p-2 bg-muted rounded-xl text-[10px] break-all">
                          <div className="flex justify-between items-center text-muted-foreground border-b pb-1 mb-1">
                            <span>页面路径</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(bindQrPage || config.login_page_path || 'pages/user/wxlogin', '路径已复制')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="font-mono">{bindQrPage || config.login_page_path || 'pages/user/wxlogin'}</div>
                        </div>
                        <div className="flex flex-col gap-1 p-2 bg-muted rounded-xl text-[10px] break-all">
                          <div className="flex justify-between items-center text-muted-foreground border-b pb-1 mb-1">
                            <span>场景参数 (scene)</span>
                            <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => handleCopy(bindQrScene || '', '场景参数已复制')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="font-mono">{bindQrScene || ''}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      )}

      {(activeTab === 'renwu' || activeTab === 'login') && (
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {activeTab === 'renwu' ? '任务详情组件 (renwu.vue)' : 
                 '快捷登录组件 (wxlogin.vue)'}
              </CardTitle>
              <CardDescription>复制以下代码到小程序项目的对应页面中</CardDescription>
            </div>
            <Button variant="outline" onClick={() => handleCopy(
              activeTab === 'renwu' ? renwuCode : loginCode
            )} className="rounded-xl">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />} 复制代码
            </Button>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={
                activeTab === 'renwu' ? renwuCode : loginCode
              } 
              readOnly 
              className="font-mono text-[10px] min-h-[500px] bg-muted/20 border-none rounded-2xl resize-none p-4" 
            />
          </CardContent>
        </Card>
      )}
      {activeTab === 'logs' && (
        <MiniProgramLogsSection />
      )}

    </div>
  );
}
