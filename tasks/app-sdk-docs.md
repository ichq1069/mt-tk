# App Management SDK 开发文档

## 概述

App Management SDK 是一套用于前端应用与后端管理系统无缝对接的工具包。它提供了配置管理、版本控制、功能开关、内容获取及权限验证等核心功能。

## 安装与初始化

### 1. 引入 SDK

```typescript
import { AppManager, initApp } from '@/lib/app-sdk';
```

### 2. 初始化

建议在应用入口处（如 `App.tsx` 或 `main.tsx`）进行初始化。

```typescript
const sdkConfig = {
  appId: 'your-app-id',
  apiKey: 'your-api-key',
  baseUrl: 'https://supabase.wo58.cn/functions/v1/app-management' // 可选
};

const { manager, config, features } = await initApp(sdkConfig);
```

## 核心功能接口

### AppManager 类

#### 配置管理
- `getConfig()`: 获取应用完整配置，包含 UI、存储、API 等。
- `getFeatureFlags()`: 获取功能开关。
- `validateKey()`: 验证 API 密钥有效性。

#### 内容管理 (Media)
- `getMediaItems(params)`: 获取作品列表，支持分页、分类和搜索。
- `getMediaDetail(id)`: 获取作品详情。
- `searchMedia(query, params)`: 搜索作品。
- `getTrendingTags()`: 获取热门搜索标签。
- `getRandomMedia(params)`: 获取随机作品。
- `getDailyGallery()`: 获取每日精选作品。
- `getWallpapers(params)`: 获取壁纸分类下的作品。

#### 相册管理 (Albums)
- `getPhotoAlbums(params)`: 获取相册列表。
- `getAlbumPhotos(albumId)`: 获取相册内的所有照片。

#### 互动功能 (Interactions)
- `getCategories()`: 获取所有分类。
- `getComments(mediaId)`: 获取作品评论。
- `postComment(mediaId, userId, content)`: 发表评论。

#### 用户与权限 (User & Permissions)
- `getUserProfile(userId)`: 获取用户信息及权限组。
- `getPermissions(userId)`: 获取用户权限列表。
- `checkPermission(userId, permission)`: 检查用户是否有特定权限。
- `getUserFavorites(userId)`: 获取用户收藏列表。
- `toggleFavorite(userId, mediaId)`: 切换收藏状态。

#### 身份验证 (Auth)
- `login(credentials)`: 用户登录。
- `register(userData)`: 用户注册。

#### 上传 (Upload)
- `uploadMedia(data)`: 上传新作品。

## 缓存机制

SDK 内置了大数据缓存存储封装。在请求成功时会自动将数据缓存至本地，在网络请求失败时会自动尝试从本地缓存读取，确保离线或弱网环境下的基本可用性。

## 敏感数据处理

SDK 支持自动加解密敏感字段。凡是以 `__ENC__` 开头的字符串，在通过 SDK 获取后会自动完成解密，前端无需手动处理 Base64 或其他加密格式。

## 主题应用

可以使用 `applyTheme` 函数快速将后台配置的主题应用到 CSS 变量中。

```typescript
import { applyTheme } from '@/lib/app-sdk';

// config.theme: { primaryColor: '#ff0000', ... }
applyTheme(config.theme);
```

对应的 CSS 变量格式为 `--app-primary-color`。
