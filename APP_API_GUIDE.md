# App SDK 集成指南 (APP_API_GUIDE.md)

本指南旨在帮助开发者快速将图片视频赏析平台的后端功能集成到自有的 App、小程序或 H5 项目中。

## 1. 快速开始

### 1.1 安装依赖
如果您的项目使用 NPM，请确保已安装 `supabase` 相关依赖（如果需要直接调用 REST 接口）：
```bash
npm install @supabase/supabase-js
```

### 1.2 引入 SDK
将项目中的 `src/lib/app-sdk.ts` 复制到您的项目中。

### 1.3 初始化 SDK
```typescript
import { initApp } from './lib/app-sdk';

const sdkConfig = {
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://supabase.wo58.cn/functions/v1/app-management' // 可选，默认为此地址
};

async function startApp() {
  try {
    const { manager, config, features } = await initApp(sdkConfig);
    console.log('App 初始化成功:', config.appName);
    
    // 应用主题颜色
    // applyTheme(config.theme);
    
    return manager;
  } catch (error) {
    console.error('初始化失败:', error);
  }
}
```

---

## 2. 常用功能代码示例

### 2.1 获取首页媒体流
```typescript
const res = await manager.getMediaItems({
  type: 'all',
  sortBy: 'latest',
  page: 0,
  limit: 20
});

if (res.success) {
  setItems(res.data);
}
```

### 2.2 用户登录与权限检查
```typescript
// 登录
const loginRes = await manager.login({
  username: 'user1',
  password: 'password123'
});

if (loginRes.success) {
  const userId = loginRes.user.id;
  
  // 检查是否有上传权限
  const canUpload = await manager.checkPermission(userId, 'media_upload');
  if (canUpload) {
    console.log('该用户可以上传');
  }
}
```

### 2.3 上传新作品
```typescript
const uploadRes = await manager.uploadMedia({
  userId: '...',
  url: 'https://your-storage.com/image.jpg',
  title: '我的摄影作品',
  type: 'image',
  tags: ['风景', '治愈']
});
```

### 2.4 获取每日精选
```typescript
const dailyRes = await manager.getDailyGallery();
if (dailyRes.success) {
  // 展示在“每日精选”板块
}
```

---

## 3. 开发建议
1. **错误处理**: 始终检查 SDK 返回对象的 `success` 属性。
2. **缓存机制**: SDK 内部已集成简单的 LocalStorage 缓存，在网络不稳定时会自动返回缓存数据。
3. **安全提醒**: 请勿在客户端明文存储 `service_role` 密钥，仅使用生成的 `apiKey`。
4. **图片优化**: 建议使用 `config.api.cdnDomain` 拼接图片地址，以获得更快的加载速度。

## 4. 获取支持
如有任何对接问题，请在后台管理系统的“帮助中心”提交反馈。
