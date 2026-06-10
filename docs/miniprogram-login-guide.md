# 小程序扫码登录与账号绑定技术方案

## 一、核心流程概述

本方案实现了用户在 H5 端未登录状态下扫描小程序码后的完整登录与绑定流程，核心逻辑基于 **OpenID 匹配机制**。

### 核心判断逻辑
```
小程序获取用户 OpenID → 查询数据库中是否存在该 OpenID
├─ 已绑定（OpenID 存在）→ 自动登录成功
└─ 未绑定（OpenID 不存在）→ 跳转绑定/注册流程
```

---

## 二、数据库设计

### 2.1 会话管理表 `miniprogram_login_sessions`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| scene_code | TEXT | 场景值（用于关联 H5 和小程序） |
| openid | TEXT | 微信小程序用户 OpenID |
| user_id | UUID | 绑定的用户 ID（外键关联 auth.users） |
| status | TEXT | 会话状态：pending/processing/success/failed/cancelled |
| action | TEXT | 操作类型：login/bind/register |
| created_at | TIMESTAMPTZ | 创建时间 |
| expires_at | TIMESTAMPTZ | 过期时间（默认 10 分钟） |

### 2.2 用户表扩展 `profiles`

新增字段：
- `wechat_openid` (TEXT): 存储微信小程序用户的 OpenID

---

## 三、后端接口设计

### 3.1 Edge Function: `miniprogram-login`

#### 接口 1: 创建会话
**请求**
```json
{
  "action": "create_session"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "scene_code": "scene_1234567890_abc123",
    "status": "pending",
    "action": "login"
  }
}
```

#### 接口 2: 检查会话状态（H5 端轮询）
**请求**
```json
{
  "action": "check_session",
  "scene_code": "scene_1234567890_abc123"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "status": "success",
    "action": "login",
    "username": "user123",  // 仅在 status=success 时返回
    "openid": "oXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}
```

#### 接口 3: 更新会话（小程序端扫码后调用）
**请求**
```json
{
  "action": "update_session",
  "scene_code": "scene_1234567890_abc123",
  "code": "wx_auth_code_123",  // 微信授权码（可选）
  "openid": "oXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"  // 直接传 openid（回退方案）
}
```

**响应（已绑定）**
```json
{
  "success": true,
  "data": {
    "is_bound": true,
    "user_id": "uuid",
    "openid": "oXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "action": "login"
  }
}
```

**响应（未绑定）**
```json
{
  "success": true,
  "data": {
    "is_bound": false,
    "openid": "oXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "action": "bind"
  }
}
```

#### 接口 4: 绑定账号（小程序端输入账号密码）
**请求**
```json
{
  "action": "bind_account",
  "scene_code": "scene_1234567890_abc123",
  "username": "user123",
  "password": "password123"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "message": "绑定成功"
  }
}
```

#### 接口 5: 创建新用户（小程序端选择注册）
**请求**
```json
{
  "action": "create_user",
  "scene_code": "scene_1234567890_abc123"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "message": "请在H5页面完成注册",
    "action": "register"
  }
}
```

---

## 四、前端交互流程

### 4.1 H5 端（LoginPage.tsx）

#### 步骤 1: 生成小程序码
```typescript
const generateQrCode = async () => {
  // 1. 调用后端创建会话
  const { data } = await supabase.functions.invoke('miniprogram-login', {
    body: { action: 'create_session' }
  });
  
  // 2. 获取 scene_code
  const sceneCode = data.data.scene_code;
  
  // 3. 生成小程序码 URL（携带 scene_code）
  const mpUrl = `${window.location.origin}/mp/wxlogin?scene=${sceneCode}`;
  
  // 4. 使用 QRCodeDataUrl 组件渲染二维码
  setQrCode(mpUrl);
};
```

#### 步骤 2: 轮询会话状态
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const { data } = await supabase.functions.invoke('miniprogram-login', {
      body: { action: 'check_session', scene_code: sceneCode }
    });
    
    const session = data.data;
    
    if (session.status === 'success' && session.username) {
      // 登录成功，使用返回的 username 进行登录
      await signInWithUsername(session.username, 'WECHAT_LOGIN_PASS');
      navigate('/');
    } else if (session.status === 'processing' && session.action === 'register') {
      // 需要注册
      setIsRegistering(true);
    }
  }, 2000);
  
  return () => clearInterval(interval);
}, [sceneCode]);
```

#### 步骤 3: 注册并绑定
```typescript
const handleAuth = async (e: React.FormEvent) => {
  if (isRegistering) {
    // 1. 注册新用户
    const { data } = await signUpWithUsername(username, password);
    
    // 2. 获取会话中的 openid
    const { data: sessionData } = await supabase
      .from('miniprogram_login_sessions')
      .select('openid')
      .eq('scene_code', sceneCode)
      .single();
    
    // 3. 绑定 openid 到新用户
    await supabase
      .from('profiles')
      .update({ wechat_openid: sessionData.openid })
      .eq('id', data.user.id);
    
    // 4. 更新会话状态为成功
    await supabase
      .from('miniprogram_login_sessions')
      .update({ status: 'success', user_id: data.user.id })
      .eq('scene_code', sceneCode);
  }
};
```

### 4.2 小程序端（MPBindPage.tsx）

#### 步骤 1: 微信授权获取 OpenID
```typescript
const handleMockWechatLogin = async () => {
  // 1. 调用微信 API 获取 code
  const mockCode = "mock_code_" + Math.random().toString(36).substr(2, 9);
  
  // 2. 发送 code 给后端，后端调用微信 API 换取 openid
  const { data } = await supabase.functions.invoke('miniprogram-login', {
    body: { 
      action: 'update_session', 
      scene_code: sceneCode, 
      code: mockCode
    }
  });
  
  // 3. 根据返回结果判断是否已绑定
  if (data.data.is_bound) {
    setBindStep('success');  // 已绑定，登录成功
  } else {
    setBindStep('options');  // 未绑定，显示绑定选项
  }
};
```

#### 步骤 2: 选择绑定方式

**方式 1: 已有账号，输入账号密码绑定**
```typescript
const handleBindAccount = async (e: React.FormEvent) => {
  const { data } = await supabase.functions.invoke('miniprogram-login', {
    body: { 
      action: 'bind_account', 
      scene_code: sceneCode, 
      username, 
      password 
    }
  });
  
  if (data.success) {
    setBindStep('success');  // 绑定成功
  }
};
```

**方式 2: 没有账号，跳转 H5 注册**
```typescript
const handleCreateNewUser = async () => {
  await supabase.functions.invoke('miniprogram-login', {
    body: { action: 'create_user', scene_code: sceneCode }
  });
  
  // H5 端会检测到 action='register'，自动跳转注册页面
};
```

---

## 五、核心逻辑流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                         H5 端（未登录）                          │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  点击生成小程序码       │
                    │  调用 create_session   │
                    │  获取 scene_code       │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  展示二维码             │
                    │  开始轮询会话状态       │
                    └────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      小程序端（扫码进入）                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  微信授权获取 code      │
                    │  调用 update_session   │
                    │  后端换取 openid       │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  查询数据库             │
                    │  profiles.wechat_openid│
                    └────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
    ┌───────────────────┐           ┌───────────────────┐
    │  OpenID 已存在     │           │  OpenID 不存在     │
    │  （已绑定用户）    │           │  （未绑定用户）    │
    └───────────────────┘           └───────────────────┘
                │                                 │
                ▼                                 ▼
    ┌───────────────────┐           ┌───────────────────┐
    │  更新会话状态      │           │  更新会话状态      │
    │  status=success   │           │  status=processing│
    │  action=login     │           │  action=bind      │
    └───────────────────┘           └───────────────────┘
                │                                 │
                ▼                                 ▼
    ┌───────────────────┐           ┌───────────────────┐
    │  H5 端检测到成功   │           │  小程序端显示选项  │
    │  自动登录          │           │  1. 已有账号绑定   │
    └───────────────────┘           │  2. 注册新账号     │
                                    └───────────────────┘
                                                │
                        ┌───────────────────────┴───────────────────────┐
                        │                                               │
                        ▼                                               ▼
            ┌───────────────────┐                         ┌───────────────────┐
            │  输入账号密码      │                         │  跳转 H5 注册页    │
            │  调用 bind_account│                         │  调用 create_user │
            └───────────────────┘                         └───────────────────┘
                        │                                               │
                        ▼                                               ▼
            ┌───────────────────┐                         ┌───────────────────┐
            │  验证账号密码      │                         │  H5 端检测到       │
            │  绑定 openid      │                         │  action=register  │
            │  更新会话状态      │                         │  显示注册表单      │
            └───────────────────┘                         └───────────────────┘
                        │                                               │
                        ▼                                               ▼
            ┌───────────────────┐                         ┌───────────────────┐
            │  H5 端检测到成功   │                         │  用户填写信息      │
            │  自动登录          │                         │  注册并绑定 openid│
            └───────────────────┘                         └───────────────────┘
                                                                        │
                                                                        ▼
                                                            ┌───────────────────┐
                                                            │  更新会话状态      │
                                                            │  status=success   │
                                                            └───────────────────┘
                                                                        │
                                                                        ▼
                                                            ┌───────────────────┐
                                                            │  H5 端检测到成功   │
                                                            │  自动登录          │
                                                            └───────────────────┘
```

---

## 六、关键技术点

### 6.1 OpenID 获取方式

**方式 1: 通过微信 API（推荐）**
```typescript
// 小程序端调用 wx.login() 获取 code
wx.login({
  success: (res) => {
    const code = res.code;
    // 发送 code 给后端
  }
});

// 后端调用微信 API 换取 openid
const wxResponse = await fetch(
  `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`
);
const wxData = await wxResponse.json();
const openid = wxData.openid;
```

**方式 2: 直接传递 openid（回退方案）**
```typescript
// 如果没有配置微信 API，可以直接传递模拟的 openid
const mockOpenid = "mock_openid_" + Math.random().toString(36).substr(2, 9);
```

### 6.2 会话状态轮询

H5 端每 2 秒轮询一次会话状态，直到：
- `status = 'success'`: 登录成功
- `status = 'processing' && action = 'register'`: 需要注册
- 会话过期（10 分钟）

### 6.3 安全性考虑

1. **会话过期机制**: 会话有效期 10 分钟，过期自动失效
2. **密码验证**: 绑定账号时需验证账号密码
3. **OpenID 唯一性**: 一个 OpenID 只能绑定一个账号
4. **HTTPS 传输**: 所有接口必须使用 HTTPS

---

## 七、环境变量配置

需要在 Supabase Edge Function 中配置以下环境变量：

```bash
WECHAT_MINIPROGRAM_LOGIN_APP_ID=wx1234567890abcdef
WECHAT_MINIPROGRAM_LOGIN_APP_SECRET=1234567890abcdef1234567890abcdef
```

---

## 八、测试流程

### 8.1 已绑定用户登录测试
1. H5 端生成小程序码
2. 小程序端扫码，授权获取 OpenID
3. 后端检测到 OpenID 已存在，返回 `is_bound: true`
4. H5 端自动登录成功

### 8.2 未绑定用户绑定测试
1. H5 端生成小程序码
2. 小程序端扫码，授权获取 OpenID
3. 后端检测到 OpenID 不存在，返回 `is_bound: false`
4. 小程序端显示绑定选项
5. 用户选择"已有账号"，输入账号密码
6. 后端验证账号密码，绑定 OpenID
7. H5 端自动登录成功

### 8.3 未绑定用户注册测试
1. H5 端生成小程序码
2. 小程序端扫码，授权获取 OpenID
3. 后端检测到 OpenID 不存在，返回 `is_bound: false`
4. 小程序端显示绑定选项
5. 用户选择"注册新账号"
6. H5 端自动跳转注册页面
7. 用户填写注册信息
8. 后端创建新用户并绑定 OpenID
9. H5 端自动登录成功

---

## 九、常见问题

### Q1: 如何处理 OpenID 重复绑定？
A: 数据库中 `profiles.wechat_openid` 字段应设置为唯一索引，防止重复绑定。

### Q2: 会话过期后如何处理？
A: H5 端检测到会话过期后，提示用户重新生成二维码。

### Q3: 如何处理网络异常？
A: 前端实现重试机制，后端返回明确的错误信息。

### Q4: 如何支持多个小程序？
A: 可以在 `profiles` 表中添加多个 openid 字段，或者创建关联表存储多个小程序的 openid。

---

## 十、后续优化方向

1. **支持多小程序绑定**: 一个账号可以绑定多个小程序
2. **支持解绑功能**: 用户可以在个人中心解绑小程序
3. **支持扫码绑定**: 在个人中心生成专属绑定二维码
4. **支持自动登录**: 小程序端记住登录状态，下次自动登录
5. **支持会话管理**: 查看所有登录设备，支持远程登出

---

## 十一、相关文件清单

### 后端
- `supabase/functions/miniprogram-login/index.ts`: Edge Function 主文件
- `supabase/migrations/xxx_miniprogram_login_sessions_table.sql`: 数据库迁移文件

### 前端
- `src/pages/LoginPage.tsx`: H5 登录页面
- `src/pages/MPBindPage.tsx`: 小程序绑定页面
- `src/routes.tsx`: 路由配置

### 配置
- `WECHAT_MINIPROGRAM_LOGIN_APP_ID`: 微信小程序 AppID
- `WECHAT_MINIPROGRAM_LOGIN_APP_SECRET`: 微信小程序 AppSecret

---

**文档版本**: v1.0  
**最后更新**: 2026-03-30  
**作者**: Miaoda AI Assistant
