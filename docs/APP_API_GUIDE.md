# 图片视频赏析平台 - App前端对接API文档

> 本文档专为App前端开发设计，侧重于核心业务页面的数据获取与交互。包含了SDK接入、图集权限逻辑、探索页、上传页、个人中心、签到、写真图集等页面的API调用示例。

---

## 目录

- [1. App SDK 接入指南](#1-app-sdk-接入指南)
- [2. 认证与登录（Login & Auth）](#2-认证与登录login--auth)
- [3. 图集权限逻辑说明](#3-图集权限逻辑说明)
- [4. 核心页面接口](#4-核心页面接口)
  - [4.1 探索页（Discovery）](#41-探索页discovery)
  - [4.2 上传页（Upload）](#42-上传页upload)
  - [4.3 个人中心（Profile/My）](#43-个人中心profilemy)
  - [4.4 签到页（Check-in）](#44-签到页check-in)
  - [4.5 写真图集页（Albums）](#45-写真图集页albums)
  - [4.6 标签与分类（Tags & Categories）](#46-标签与分类tags--categories)
- [5. 社交与消息](#5-社交与消息)
- [6. App版本与配置](#6-app版本与配置)

---

## 1. App SDK 接入指南

为了简化对接流程，我们提供了 `AppManager` SDK，封装了配置获取、版本检查、功能开关等核心逻辑。

### 1.1 SDK 初始化
```typescript
import { AppManager, initApp } from '@/lib/app-sdk';

const sdkConfig = {
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_API_KEY',
};

// 方式一：基础初始化
const manager = new AppManager(sdkConfig);

// 方式二：一键初始化（验证密钥、获取配置并应用主题）
const { config, features, keyInfo } = await initApp(sdkConfig);
```

### 1.2 核心方法

#### 获取完整配置
包含主题配色、API端点、存储配置等。
```typescript
const { success, data: config } = await manager.getConfig();
// config.theme - 颜色、间距等 UI 配置
// config.api   - 业务接口基准地址
// config.cfr2  - 存储访问密钥
```

#### 获取功能开关
用于动态控制 App 内的功能模块显隐。
```typescript
const { features } = await manager.getFeatureFlags();
if (features.enableUpload) {
  // 显示上传入口
}
```

#### 检查版本更新
```typescript
const update = await manager.checkVersion('android', '1.0.2');
if (update.hasUpdate) {
  console.log('新版本说明:', update.latestVersion.releaseNotes);
  // update.latestVersion.isForceUpdate 为 true 时建议强制弹窗
}
```

#### 导出打包配置 (Android)
用于获取原生壳工程所需的配置文件内容。
```typescript
const { data: buildFiles } = await manager.exportBuildConfig();
// buildFiles.mainActivity - MainActivity.kt 代码
// buildFiles.manifest     - AndroidManifest.xml 内容
```

### 1.3 React 集成 (Hook)
```typescript
import { useAppConfig } from '@/lib/app-sdk';

function App() {
  const { appConfig, features, loading, error } = useAppConfig({
    appId: '...',
    apiKey: '...'
  });

  if (loading) return <Loading />;
  
  return (
    <div style={{ color: appConfig?.theme.primaryColor }}>
      {features?.enableDiscovery && <DiscoveryPage />}
    </div>
  );
}
```

---

## 2. 认证与登录（Login & Auth）

App端支持多种登录方式，建议优先使用 Supabase 标准认证。

### 2.1 邮箱/密码登录
```typescript
import { supabase } from '@/db/supabase';

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});
// 成功后 data.session 包含 access_token，SDK会自动持久化存储。
```

### 2.2 用户名登录（自定义接口）
如果您的平台支持纯用户名（非邮箱）登录，请使用此接口：
```typescript
import { api } from '@/db/api';

const { data, error } = await api.directLogin('username', 'password123');
```

### 2.3 注册账号
```typescript
// 方式一：邮箱注册
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: { username: '用户昵称' } // 存储到 profile 的额外信息
  }
});

// 方式二：用户名注册
const { data, error } = await api.directSignUp(
  'username', 
  'password123', 
  { nickname: '昵称' } // customData
);
```

### 2.4 第三方登录（如微信）
App端通常使用小程序授权或OAuth：
```typescript
// 小程序快捷绑定/登录
const { data, error } = await supabase.functions.invoke('miniprogram-login', {
  body: { code: '微信授权code' }
});
```

### 2.5 退出登录
```typescript
await supabase.auth.signOut();
```

### 2.6 获取当前登录状态
```typescript
const { data: { session } } = await supabase.auth.getSession();
const isLoggedIn = !!session;
```

---

## 3. 图集权限逻辑说明

App端获取图集遵循以下权限规则：

1.  **公开图集**：所有用户（包括游客）均可获取。
2.  **私有图集**：
    *   **权限组匹配**：用户所属的 `permission_group_id` 必须与图集要求的权限组一致。
    *   **已加入图集**：用户通过特定操作（如购买、申请）加入后的图集。
3.  **App端调用策略**：
    *   使用 `getPhotoAlbums` 获取所有公开可见的图集。
    *   使用 `getJoinedPrivateAlbums` 获取当前用户已获得权限的私有图集。

---

## 4. 核心页面接口

### 4.1 探索页（Discovery）

用于展示已审核通过的图片和视频流。

#### 获取内容列表
```typescript
import { api } from '@/db/api';

const { data, error, total } = await api.getApprovedMedia(
  0,              // page: 页码
  20,             // limit: 每页数量
  user?.id,       // userId: 可选，用于个性化推荐排除逻辑
  'all',          // type: 'all' | 'image' | 'video'
  'all',          // categoryId: 'all' | 具体分类UUID
  'latest',       // sortBy: 'latest'(最新) | 'popular'(热门) | 'random'(随机)
  [],             // tagIds: 标签ID数组，用于筛选
  false           // force: 是否强制刷新缓存
);
```

#### 搜索内容
```typescript
// 通过 supabase 直接查询
const { data, error } = await supabase
  .from('media_items')
  .select('*, profiles(username, avatar_url)')
  .eq('status', 'approved')
  .or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
  .order('created_at', { ascending: false });
```

---

### 4.2 上传页（Upload）

用户上传个人作品的完整流程。

#### 第一步：上传文件到存储
```typescript
const file = // 获取到的文件对象
const path = `user-uploads/${user.id}/${Date.now()}_${file.name}`;

const { data: url, error } = await api.uploadFile('user-uploads', path, file);
// 返回公网可访问的URL
```

#### 第二步：提交作品信息
```typescript
const { data, error } = await api.uploadMedia({
  user_id: user.id,
  url: url,           // 上一步获得的URL
  type: 'image',      // 'image' | 'video'
  title: '作品标题',
  description: '描述',
  category_id: 'xxx', // 从分类接口获取的ID
  tags: ['标签A', '标签B'],
  is_adult_content: false
});

// 注意：普通用户上传后状态默认为 'pending' (审核中)，仅自己可见。
```

---

### 4.3 个人中心（Profile/My）

展示用户信息、作品统计、积分等。

#### 获取当前用户信息
```typescript
const { data: profile } = await api.getProfile(user.id);
// 包含：username, avatar_url, points(积分), level(等级), exp(经验), role等
```

#### 获取我的作品（带状态）
```typescript
const { data, total } = await api.getUserMedia(user.id, 0, 20);
// 展示时可根据 status 区分：approved(已发布), pending(审核中), rejected(已拒绝)
```

#### 我的收藏
```typescript
const { data } = await supabase
  .from('favorites')
  .select('*, media_items(*)')
  .eq('user_id', user.id);
```

---

### 4.4 签到页（Check-in）

#### 检查今日是否已签到
```typescript
const { hasCheckedIn } = await api.getCheckInStatus(user.id);
```

#### 执行签到
```typescript
const { data, error } = await api.performCheckIn(user.id);
// 返回：{ success: true, points_earned: 10, continuous_days: 3 }
```

#### 签到历史（日历展示）
```typescript
const { data } = await api.getCheckInHistory(user.id, 0, 31);
```

---

### 4.5 写真图集页（Albums）

侧重于展示由管理员发布的专业图集。

#### 获取公开图集列表
```typescript
const { data, total } = await api.getPhotoAlbums(
  0,      // page
  20,     // limit
  '',     // search
  null,   // permissionGroupId
  true    // onlyPublic: true 仅公开
);
```

#### 获取我已获得的私有图集
```typescript
const { data, total } = await api.getJoinedPrivateAlbums(user.id, 0, 20);
```

#### 获取图集内所有照片
```typescript
const { data } = await supabase
  .from('album_photos')
  .select('*')
  .eq('album_id', albumId)
  .order('sort_order', { ascending: true });
```

#### 验证/加入图集（如果是私有的）
```typescript
await api.joinAlbum(user.id, albumId);
```

---

### 4.6 标签与分类（Tags & Categories）

#### 获取全部分类（用于上传选择和首页导航）
```typescript
const { data } = await supabase
  .from('content_categories')
  .select('*')
  .eq('is_active', true)
  .order('sort_order', { ascending: true });
```

#### 获取热门标签
```typescript
const { data } = await supabase
  .from('tags')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(20);
```

---

## 5. 社交与消息

#### 发表/查看评论
```typescript
// 查看
const { data } = await supabase
  .from('comments')
  .select('*, profiles(username, avatar_url)')
  .eq('media_id', mediaId);

// 发表
await supabase.from('comments').insert({
  media_id: mediaId,
  user_id: user.id,
  content: '赞！'
});
```

#### 通知中心
```typescript
const { data } = await api.getNotifications(user.id);
// 包含：系统通知、审核通知、互动通知
```

---

## 6. App版本与配置

App启动时应调用以下接口同步配置。

#### 获取App全局配置
```typescript
import { AppManager } from '@/lib/app-sdk';

const manager = new AppManager({ appId: 'YOUR_APP_ID', apiKey: 'YOUR_KEY' });
const { data: config } = await manager.getConfig();
// 包含：theme(主题), features(功能开关), api(服务端点)
```

#### 检查更新
```typescript
const { data: updateInfo } = await manager.checkVersion('android', '1.0.0');
if (updateInfo.hasUpdate) {
  // 提示升级：updateInfo.latestVersion.downloadUrl
}
```

---

## 附录：核心数据模型

### MediaItem (作品)
- `id`: UUID
- `url`: 内容链接
- `type`: 'image' | 'video'
- `status`: 'approved' | 'pending' | 'rejected'
- `title`: 标题

### PhotoAlbum (图集)
- `id`: UUID
- `title`: 标题
- `cover_url`: 封面图
- `is_public`: 是否公开
