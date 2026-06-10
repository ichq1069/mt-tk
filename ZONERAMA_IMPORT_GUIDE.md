# 图集内图片列表接口导入功能使用说明

## 功能概述

通过「图集内图片列表接口」从 Zonerama 自动获取图集的所有图片链接，并批量导入到图集写真模块中。所有图片 URL 都会自动通过代理接口处理，确保安全加载。

## 配置步骤

### 步骤 1: 配置图集内图片列表接口

1. 登录后台管理系统
2. 进入：**系统参数设置** → **存储管理** → **专享上传**
3. 找到「图集内图片列表接口（可选）」配置项
4. 填写接口地址：
   ```
   https://zomphoto.wo58.cn/album?albumId=
   ```
5. 点击「保存配置」

### 步骤 2: 配置图片接口（可选但推荐）

1. 在同一页面找到「图片接口（可选）」配置项
2. 填写接口地址：
   ```
   https://zomphoto.wo58.cn/?url=
   ```
3. 点击「保存配置」

**说明**：图片接口用于代理处理所有 Zonerama 图片 URL，确保不会直接加载原图。

### 步骤 3: 配置图集自定义字段

1. 进入：**内容管理** → **图集写真** → **图集管理**
2. 选择或新建一个图集
3. 在图集编辑页面，找到「自定义字段」区域
4. 添加自定义字段：
   - 字段名：`albumId`
   - 字段值：Zonerama 图集 ID（如 `1069`）
5. 保存图集

## 使用流程

### 步骤 1: 进入图片管理

1. 在图集列表中，点击要导入图片的图集
2. 点击「图片管理」标签

### 步骤 2: 切换到接口导入

1. 在图片管理页面，点击「接口导入」标签
2. 系统会自动显示当前图集的 `albumId` 值

### 步骤 3: 开始导入

1. 确认 `albumId` 值正确
2. 点击「立即开始导入」按钮
3. 等待导入完成

### 步骤 4: 查看导入结果

1. 导入成功后，系统会自动切换到「链接导入」标签
2. 所有图片 URL 会填充到导入框中
3. 可以预览图片缩略图
4. 点击「开始导入」将图片保存到数据库

## 接口格式说明

### 请求格式

**接口地址**：
```
https://zomphoto.wo58.cn/album?albumId=1069
```

**请求方法**：GET

**参数**：
- `albumId`: Zonerama 图集 ID

### 响应格式

**成功响应**：
```json
{
  "title": "1069",
  "textAsHtml": null,
  "downloadDialogUrl": "/View/Dialog/DownloadAlbum",
  "photosId": [1019410708, 1019410472],
  "photos": [
    {
      "id": 1019410708,
      "url": "https://us.zonerama.com/photos/1019410708_690x1226_18.jpg"
    },
    {
      "id": 1019410472,
      "url": "https://us.zonerama.com/photos/1019410472_690x1226_18.jpg"
    }
  ]
}
```

**字段说明**：
- `photos`: 图片数组
  - `id`: 图片 ID
  - `url`: 图片 URL（原始链接）

### URL 处理逻辑

**原始 URL**：
```
https://us.zonerama.com/photos/1019410708_690x1226_18.jpg
```

**处理后 URL**（如果配置了图片接口）：
```
https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019410708_690x1226_18.jpg
```

**说明**：
- 系统会自动检测 Zonerama 图片 URL
- 自动应用图片接口代理处理
- 确保不会直接加载 `us.zonerama.com` 原图

## 工作流程

### 前端流程

1. 用户点击「立即开始导入」
2. 前端调用 `api.importZoneramaAlbum(albumId)`
3. 等待 Edge Function 返回结果
4. 接收处理后的 URL 列表
5. 填充到链接导入框
6. 自动切换到「链接导入」标签

### Edge Function 流程

1. 接收 `albumId` 参数
2. 从数据库读取「图集内图片列表接口」配置
3. 拼接完整的 API URL
4. 调用 Zonerama API 获取图片列表
5. 提取 `photos` 数组中的 `url` 字段
6. 读取「图片接口」配置
7. 对所有 Zonerama URL 应用代理接口
8. 返回处理后的 URL 列表

### 数据库存储流程

1. 用户在「链接导入」标签点击「开始导入」
2. 系统逐个处理 URL
3. 检查重复（基于 URL 唯一性）
4. 写入 `album_photos` 表
5. 默认分级状态为「待分级」

## 配置检查

### 检查图集内图片列表接口配置

**SQL 查询**：
```sql
SELECT value FROM system_configs WHERE key = 'zonerama_upload_config';
```

**预期结果**：
```json
{
  "album_id": "...",
  "session": "...",
  "photo_api": "https://zomphoto.wo58.cn/?url=",
  "album_photo_api": "https://zomphoto.wo58.cn/album?albumId="
}
```

### 检查图集自定义字段

**SQL 查询**：
```sql
SELECT id, title, custom_field_values 
FROM photo_albums 
WHERE id = 'your-album-id';
```

**预期结果**：
```json
{
  "id": "...",
  "title": "...",
  "custom_field_values": {
    "albumId": "1069"
  }
}
```

## 常见问题

### Q1: 点击「立即开始导入」没有反应？

**A**: 
1. 检查图集是否配置了 `albumId` 自定义字段
2. 检查后台是否配置了「图集内图片列表接口」
3. 打开浏览器控制台（F12）查看错误信息
4. 检查网络请求，确认 Edge Function 是否被调用

### Q2: 提示「图集内图片列表接口未配置」？

**A**: 
1. 进入后台管理系统
2. 导航到：系统参数设置 → 存储管理 → 专享上传
3. 填写「图集内图片列表接口（可选）」配置项
4. 保存配置
5. 刷新前端页面（Ctrl+Shift+R）

### Q3: 导入的图片显示不出来？

**A**: 
1. 检查是否配置了「图片接口」
2. 如果没有配置，Zonerama 图片将无法显示（安全拦截）
3. 配置图片接口后，刷新页面
4. 检查控制台日志，确认 URL 是否正确转换

### Q4: 导入后图片重复？

**A**: 
- 系统会自动检查 URL 唯一性
- 重复的 URL 会被跳过
- 如果仍然出现重复，可能是 URL 格式不同（如带参数）

### Q5: 如何验证接口是否正常工作？

**A**: 
1. 打开浏览器 Network 标签
2. 点击「立即开始导入」
3. 筛选 `zonerama-album-import` 请求
4. 查看请求响应，确认返回的 URL 列表
5. 确认所有 URL 都包含代理接口前缀

## 调试日志

### Edge Function 日志

**初始化日志**：
```
[zonerama-album-import] 读取图集内图片列表接口配置...
[zonerama-album-import] 图集内图片列表接口配置: https://zomphoto.wo58.cn/album?albumId=
[zonerama-album-import] 调用 Zonerama API: https://zomphoto.wo58.cn/album?albumId=1069
```

**成功日志**：
```
[zonerama-album-import] API 响应数据: {"title":"1069","photos":[...]}
[zonerama-album-import] 提取到 2 个图片 URL
[zonerama-album-import] 图片接口配置: https://zomphoto.wo58.cn/?url=
[zonerama-album-import] 已对 2 个 URL 应用代理接口
```

**错误日志**：
```
[zonerama-album-import] 读取配置失败: ...
[zonerama-album-import] API 响应失败: 502
[zonerama-album-import] ⚠️ 图片接口未配置，返回原始 URL
```

### 前端日志

**成功日志**：
```
已获取 2 个素材链接，已填入导入框并开启预览。
```

**错误日志**：
```
接口读取失败: 图集内图片列表接口未配置
接口读取失败: Zonerama API 响应失败，状态码: 502
```

## 安全规则

### 规则 1: 强制代理加载

- ✅ **允许**: 通过代理接口加载 Zonerama 图片
  - 示例: `https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/xxx.jpg`
  
- ❌ **禁止**: 直接加载 Zonerama 原图
  - 示例: `https://us.zonerama.com/photos/xxx.jpg`

### 规则 2: 配置检查

- ✅ **图集内图片列表接口配置存在**: 可以调用接口获取图片列表
- ❌ **图集内图片列表接口配置为空**: 返回错误提示

- ✅ **图片接口配置存在**: 所有 Zonerama URL 通过代理加载
- ⚠️ **图片接口配置为空**: 返回原始 URL，前端会触发安全拦截

### 规则 3: 自定义字段检查

- ✅ **图集配置了 albumId**: 可以开始导入
- ❌ **图集未配置 albumId**: 按钮禁用，显示提示信息

## 技术实现

### Edge Function 代码结构

```typescript
// 1. 读取配置
const { data: configData } = await supabase
  .from('system_configs')
  .select('value')
  .eq('key', 'zonerama_upload_config')
  .single();

const albumPhotoApi = configData?.value?.album_photo_api || '';
const photoApi = configData?.value?.photo_api || '';

// 2. 调用接口
const apiUrl = `${albumPhotoApi}${albumId}`;
const response = await fetch(apiUrl);
const data = await response.json();

// 3. 提取 URL
const photos = data.photos || [];
const imageUrls = photos.map((photo: any) => photo.url).filter(Boolean);

// 4. 应用代理
const processedUrls = imageUrls.map((url: string) => {
  if (url.includes('zonerama.com/photos') && photoApi) {
    return `${photoApi}${url}`;
  }
  return url;
});

// 5. 返回结果
return { code: 200, list: processedUrls };
```

### 前端调用代码

```typescript
// 调用 Edge Function
const { data, error } = await api.importZoneramaAlbum(albumId);

// 提取 URL 列表
const imageUrls = data.list || data.data || [];

// 填充到导入框
setBatchUrls(imageUrls.join('\n'));

// 切换到链接导入标签
setUploadTab('link');
```

## 相关文档

- Zonerama 安全规则: `ZONERAMA_SECURITY_RULES.md`
- 图集内图片接口配置说明: `ZONERAMA_ALBUM_PHOTO_API.md`
- 快速配置指南: `ZONERAMA_QUICK_GUIDE.md`
- 功能总结: `ZONERAMA_SUMMARY.md`

---

**创建时间**: 2026-04-02  
**作者**: 研发工程师智能体  
**版本**: 1.0.0
