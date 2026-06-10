# API 接口文档 (API_DOCUMENT.md)

本文档详细说明了图片视频赏析平台的所有 API 接口，供开发者通过 App SDK 或直接调用。

## 1. 基础信息
- **Base URL**: `https://supabase.wo58.cn/functions/v1`
- **认证方式**: 所有请求需通过 URL 参数或 Header 携带 `apiKey` 和 `appId`。
- **公共请求参数**:
  - `apiKey`: 在后台生成的 API 密钥
  - `appId`: 应用的唯一标识

---

## 2. 应用管理接口 (`/app-management`)

### 2.1 获取应用配置
- **路径**: `/app-management/config/{appId}`
- **方法**: `GET`
- **说明**: 获取应用的主题、配置、存储设置等。

### 2.2 检查版本更新
- **路径**: `/app-management/version/{appId}`
- **方法**: `GET`
- **参数**: `platform` (android/ios), `version` (当前版本)
- **说明**: 返回最新版本信息及是否强制更新。

### 2.3 获取功能开关
- **路径**: `/app-management/features/{appId}`
- **方法**: `GET`
- **说明**: 获取应用的功能启用状态（如是否开启评论、下载等）。

---

## 3. 媒体内容接口 (`/app-media`)

### 3.1 获取媒体列表
- **路径**: `/app-media/list`
- **方法**: `GET`
- **参数**: `page`, `limit`, `type` (image/video/all), `categoryId`, `sortBy` (latest/hot)
- **说明**: 分页获取经过审核的作品列表。

### 3.2 获取媒体详情
- **路径**: `/app-media/detail/{id}`
- **方法**: `GET`
- **说明**: 获取作品的详细信息，包括作者、标签等。

### 3.3 随机美图
- **路径**: `/app-media/random`
- **方法**: `GET`
- **参数**: `limit`, `type`
- **说明**: 随机获取指定数量的作品。

### 3.4 每日图集
- **路径**: `/app-media/daily`
- **方法**: `GET`
- **说明**: 获取今日精选发布的图集内容。

### 3.5 上传作品
- **路径**: `/app-media/upload`
- **方法**: `POST`
- **Body**:
  ```json
  {
    "userId": "uuid",
    "url": "media_url",
    "type": "image/video",
    "title": "标题",
    "description": "描述",
    "categoryId": "uuid",
    "tags": ["tag1", "tag2"]
  }
  ```

---

## 4. 图集接口 (`/app-albums`)

### 4.1 获取图集列表
- **路径**: `/app-albums/list`
- **方法**: `GET`
- **参数**: `page`, `limit`

### 4.2 获取图集内照片
- **路径**: `/app-albums/photos/{albumId}`
- **方法**: `GET`

---

## 5. 用户与社交接口 (`/app-user` & `/app-auth`)

### 5.1 用户登录
- **路径**: `/app-auth/login`
- **方法**: `POST`
- **Body**: `{"username": "...", "password": "...", "action": "login"}`

### 5.2 用户注册
- **路径**: `/app-auth/register`
- **方法**: `POST`
- **Body**: `{"username": "...", "password": "...", "email": "...", "action": "register"}`

### 5.3 获取用户资料
- **路径**: `/app-user/profile`
- **方法**: `GET`
- **参数**: `userId`

### 5.4 收藏操作
- **路径**: `/app-user/toggle-favorite`
- **方法**: `POST`
- **Body**: `{"userId": "...", "mediaId": "..."}`

---

## 6. 响应状态码
- `200`: 成功
- `400`: 请求参数错误
- `403`: API Key 无效或已过期
- `404`: 资源不存在
- `500`: 服务器内部错误
