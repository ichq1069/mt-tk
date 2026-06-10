# 小程序扫码登录问题修复指南

## 问题诊断

根据小程序日志：
```
[小程序交互日志][wxlogin.vue] 请求服务端登录, URL: https://backend.appmiaoda.com/projects/supabase290871706745094144/functions/v1/wechat-miniprogram 
Body: {action: "mp_login", code: "0a1TeHkl2YAZth4leqol2a2enp3TeHk7", ticket: "", scene: "", checkCode: ""}
```

**核心问题**：小程序传递的 `ticket` 和 `scene` 参数都是空字符串，导致 Edge Function 无法更新 H5 端创建的 `login_tickets` 记录。

## 问题原因

小程序扫码进入时，应该从以下位置获取 scene 参数：

1. **方式一：通过 `onLoad` 生命周期的 options 参数**
   ```javascript
   // wxlogin.vue 或 wxlogin.js
   onLoad(options) {
     const scene = options.scene || '';  // 从 URL 参数获取
     console.log('[小程序] 获取到 scene:', scene);
   }
   ```

2. **方式二：通过 `uni.getLaunchOptionsSync()` 获取启动参数**
   ```javascript
   const launchOptions = uni.getLaunchOptionsSync();
   const scene = launchOptions.query?.scene || launchOptions.scene || '';
   ```

3. **方式三：从小程序码的 scene 字段解析**
   ```javascript
   // 小程序码扫码进入时，微信会将 scene 参数放在 options.scene 中
   // scene 格式: t=ticket12位&h=域名标识&c=校验码
   ```

## 修复步骤

### 步骤 1：检查小程序 wxlogin 页面的 onLoad 方法

确保正确获取 scene 参数：

```javascript
// wxlogin.vue 或 wxlogin.js
export default {
  data() {
    return {
      scene: '',
      ticket: '',
      checkCode: ''
    }
  },
  
  onLoad(options) {
    console.log('[小程序交互日志][wxlogin.vue] onLoad options:', options);
    
    // 方式1：从 URL 参数获取
    let scene = options.scene || '';
    
    // 方式2：如果没有，尝试从启动参数获取
    if (!scene) {
      const launchOptions = uni.getLaunchOptionsSync();
      scene = launchOptions.query?.scene || launchOptions.scene || '';
    }
    
    console.log('[小程序交互日志][wxlogin.vue] 解析到 scene:', scene);
    
    // 解析 scene 参数
    if (scene) {
      this.scene = scene;
      this.parseScene(scene);
    } else {
      console.error('[小程序交互日志][wxlogin.vue] 未获取到 scene 参数！');
      uni.showToast({
        title: '二维码参数错误',
        icon: 'none'
      });
    }
  },
  
  methods: {
    parseScene(scene) {
      // 解析 scene 格式: t=ticket12位&h=域名标识&c=校验码
      const params = {};
      scene.split('&').forEach(p => {
        const [k, v] = p.split('=');
        params[k] = v;
      });
      
      this.ticket = params.t || '';
      this.checkCode = params.c || '';
      
      console.log('[小程序交互日志][wxlogin.vue] 解析结果:', {
        ticket: this.ticket,
        checkCode: this.checkCode
      });
    },
    
    async handleWechatLogin() {
      console.log('[小程序交互日志][wxlogin.vue] 用户点击微信登录');
      
      // 1. 获取微信 code
      const { code } = await uni.login({ provider: 'weixin' });
      console.log('[小程序交互日志][wxlogin.vue] uni.login 获取 code 成功:', code);
      
      // 2. 调用后端登录接口
      const url = 'https://backend.appmiaoda.com/projects/supabase290871706745094144/functions/v1/wechat-miniprogram';
      const body = {
        action: 'mp_login',
        code: code,
        ticket: this.ticket,        // ✅ 传递正确的 ticket
        scene: this.scene,          // ✅ 传递完整的 scene
        checkCode: this.checkCode   // ✅ 传递校验码
      };
      
      console.log('[小程序交互日志][wxlogin.vue] 请求服务端登录, URL:', url, 'Body:', body);
      
      const res = await uni.request({
        url: url,
        method: 'POST',
        data: body,
        header: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[小程序交互日志][wxlogin.vue] 服务端登录返回反馈:', res.data);
      
      if (res.data.success) {
        if (res.data.isBound) {
          // 已绑定，登录成功
          uni.showToast({
            title: '登录成功，请返回网页',
            icon: 'success'
          });
        } else {
          // 未绑定，跳转绑定页面
          uni.navigateTo({
            url: `/pages/user/bind?scene=${this.scene}`
          });
        }
      } else {
        uni.showToast({
          title: res.data.message || '登录失败',
          icon: 'none'
        });
      }
    }
  }
}
```

### 步骤 2：验证 H5 端生成的小程序码

确保 H5 端生成的小程序码包含正确的 scene 参数：

```typescript
// LoginDialog.tsx 或 LoginPage.tsx
const generateMpLoginQr = async () => {
  setMpQrData(null);
  try {
    // 1. 生成唯一 ticket
    const newTicket = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setTicket(newTicket);
    
    console.log('[H5] 生成的 ticket:', newTicket);
    
    // 2. 创建 login_ticket 记录
    await supabase.from('login_tickets').insert({
      ticket: newTicket,
      status: 'pending'
    });
    
    // 3. 调用 Edge Function 生成小程序码
    const mpIdentifier = sysConfig?.mp_domain_identifier || 'miaoda';
    const { data, error } = await api.generateMiniProgramQr(newTicket, 'login', undefined, mpIdentifier);
    
    if (error) throw error;
    
    if (data && data.success) {
      console.log('[H5] 生成的小程序码 scene:', data.scene);
      console.log('[H5] 生成的小程序码 page:', data.page);
      
      setMpQrData(data.qr_data);
      setMpQrScene(data.scene);
      setMpQrPage(data.page);
      
      // 4. 开始轮询
      startPollingTicket(newTicket);
    }
  } catch (e: any) {
    console.error('[H5] 生成小程序码失败:', e);
    toast.error('生成小程序码失败: ' + e.message);
  }
};
```

### 步骤 3：验证 Edge Function 生成的 scene 格式

Edge Function 已经正确实现了 scene 生成逻辑：

```typescript
// supabase/functions/wechat-miniprogram/index.ts
if (type === 'login' || action === 'mp_login') {
  const ticket = (itemId || '').replace(/-/g, '');
  const shortTicket = ticket.slice(0, 12);
  const checkCode = await generateCheckCode(shortTicket);
  
  let shortIdentifier = mpIdentifier;
  if (shortIdentifier === 'miaoda') shortIdentifier = 'md-';
  else if (shortIdentifier === 'supabase') shortIdentifier = 'sp-';
  else if (shortIdentifier === 'wo58') shortIdentifier = 'wo-';

  if (shortIdentifier) {
    scene = `t=${shortTicket}&h=${shortIdentifier}&c=${checkCode}`.slice(0, 32);
  } else {
    scene = `t=${shortTicket}&c=${checkCode}`.slice(0, 32);
  }
  page = config.login_page_path || "pages/user/wxlogin";
}
```

**生成的 scene 示例**：
```
t=abc123def456&h=md-&c=a1b2c3d4
```

### 步骤 4：测试流程

1. **H5 端**：
   - 打开登录页面
   - 点击"小程序登录"
   - 查看控制台输出的 ticket 和 scene
   - 确认小程序码生成成功

2. **小程序端**：
   - 扫描小程序码
   - 查看控制台输出的 onLoad options
   - 确认 scene 参数正确解析
   - 点击"微信登录"
   - 查看请求 body 中的 ticket、scene、checkCode 是否正确

3. **H5 端轮询**：
   - 观察控制台是否输出"登录成功"
   - 确认页面自动跳转

## 常见问题排查

### Q1: 小程序 onLoad 获取不到 scene 参数

**原因**：可能是小程序路径配置错误

**解决**：
1. 检查管理后台"小程序配置" → "登录页面路径"是否正确
2. 确认小程序中存在该页面（如 `pages/user/wxlogin`）
3. 在小程序 `app.json` 中添加该页面路径

### Q2: scene 参数被 URL 编码

**原因**：微信可能会对 scene 参数进行 URL 编码

**解决**：在小程序端解码
```javascript
onLoad(options) {
  let scene = options.scene || '';
  // 尝试解码
  if (scene.includes('%')) {
    scene = decodeURIComponent(scene);
  }
  console.log('[小程序] 解码后的 scene:', scene);
}
```

### Q3: H5 端轮询一直没有响应

**原因**：ticket 不匹配或数据库更新失败

**排查步骤**：
1. 在 Supabase 后台查看 `login_tickets` 表
2. 确认是否有对应的 ticket 记录
3. 查看 `status` 字段是否更新为 `fulfilled`
4. 查看 `user_id` 或 `openid` 字段是否有值

### Q4: Edge Function 返回"校验码验证失败"

**原因**：checkCode 计算不一致

**解决**：
1. 确认 H5 端和小程序端传递的 ticket 完全一致
2. 检查 Edge Function 的 `generateCheckCode` 函数
3. 确认环境变量 `MP_CHECK_SECRET` 已配置

## 调试技巧

### 1. 启用详细日志

在小程序端添加更多日志：
```javascript
console.log('[DEBUG] onLoad options:', JSON.stringify(options));
console.log('[DEBUG] scene:', scene);
console.log('[DEBUG] parsed ticket:', this.ticket);
console.log('[DEBUG] request body:', JSON.stringify(body));
```

### 2. 使用 Supabase 日志

查看 Edge Function 日志：
```bash
# 在 Supabase Dashboard 中查看 Edge Functions 日志
# 或使用 CLI
supabase functions logs wechat-miniprogram
```

### 3. 数据库实时监控

在 Supabase Dashboard 中打开 `login_tickets` 表，实时观察数据变化。

## 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                         H5 端（未登录）                          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  生成 ticket           │
                    │  ticket = "abc123..."  │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  插入 login_tickets    │
                    │  status = 'pending'    │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  调用 Edge Function    │
                    │  生成小程序码           │
                    │  scene = "t=abc&h=md&c=123" │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  展示小程序码           │
                    │  开始轮询 ticket 状态   │
                    └────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      小程序端（扫码进入）                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  onLoad(options)       │
                    │  scene = options.scene │
                    │  解析: t=abc&h=md&c=123│
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  用户点击"微信登录"     │
                    │  uni.login() 获取 code │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  调用 Edge Function    │
                    │  action = 'mp_login'   │
                    │  ticket = 'abc'        │ ✅ 关键！
                    │  scene = 't=abc&...'   │ ✅ 关键！
                    │  checkCode = '123'     │ ✅ 关键！
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Edge Function 处理    │
                    │  1. 验证 checkCode     │
                    │  2. 获取 openid        │
                    │  3. 查询是否已绑定     │
                    └────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
    ┌───────────────────┐           ┌───────────────────┐
    │  已绑定            │           │  未绑定            │
    │  更新 ticket:      │           │  更新 ticket:      │
    │  status='fulfilled'│           │  status='fulfilled'│
    │  user_id=xxx       │           │  openid=xxx        │
    └───────────────────┘           └───────────────────┘
                │                                 │
                ▼                                 ▼
    ┌───────────────────┐           ┌───────────────────┐
    │  H5 轮询检测到     │           │  H5 轮询检测到     │
    │  user_id 存在      │           │  openid 存在       │
    │  自动登录成功      │           │  显示绑定/注册选项 │
    └───────────────────┘           └───────────────────┘
```

## 总结

**核心修复点**：
1. ✅ 小程序端必须正确获取并解析 scene 参数
2. ✅ 小程序端调用 Edge Function 时必须传递完整的 ticket、scene、checkCode
3. ✅ Edge Function 已优化，支持空 ticket 的容错处理
4. ✅ H5 端轮询逻辑已完善，支持 user_id 和 openid 两种情况

**下一步**：
请检查小程序端的 `wxlogin.vue` 文件，确保按照上述步骤正确实现 scene 参数的获取和传递。
