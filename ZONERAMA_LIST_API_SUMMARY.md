# 图集内图片列表接口功能实现总结

## 版本信息

- **版本**: v1.4.0
- **日期**: 2026-04-02
- **状态**: ✅ 已完成

## 需求回顾

### 需求 1: 更改配置项名称

**原名称**: 图集内图片接口

**新名称**: 图集内图片列表接口

**原因**: 更准确地描述功能——该接口用于获取图集的图片列表，而非单张图片加载

### 需求 2: 实现接口导入功能

**功能描述**:
- 当图集自定义字段 `albumId` 有值时
- 点击「图片管理」→「接口导入」
- 使用「图集内图片列表接口」获取图片地址
- 提取接口返回的 `photos[].url` 字段
- 将所有图片 URL 存入图集数据表
- 所有 Zonerama 图片都通过代理接口加载

## 实现内容

### 1. 配置项名称修改

**文件**: `src/pages/admin/components/StorageSection.tsx`

**修改内容**:
```tsx
// 原标签
图集内图片接口（可选）

// 新标签
图集内图片列表接口（可选）

// 原说明
配置后，图集写真模块的图片将使用此接口加载。

// 新说明
配置后，图集管理的「接口导入」功能将使用此接口获取图片列表。
返回格式：{"photos":[{"id":xxx,"url":"..."}]}
```

### 2. Edge Function 重写

**文件**: `supabase/functions/zonerama-album-import/index.ts`

**核心功能**:

#### 2.1 读取配置

```typescript
// 从数据库读取配置
const { data: configData } = await supabase
  .from('system_configs')
  .select('value')
  .eq('key', 'zonerama_upload_config')
  .single();

// 提取图集内图片列表接口配置
const albumPhotoApi = configData?.value?.album_photo_api || '';

// 提取图片接口配置（用于代理处理）
const photoApi = configData?.value?.photo_api || '';
```

#### 2.2 调用接口

```typescript
// 拼接完整的 API URL
const apiUrl = `${albumPhotoApi}${albumId}`;
// 示例：https://zomphoto.wo58.cn/album?albumId=1069

// 调用 Zonerama API
const response = await fetch(apiUrl);
const data = await response.json();
```

#### 2.3 提取图片 URL

```typescript
// 提取 photos 数组
const photos = data.photos || [];

// 提取所有图片 URL
const imageUrls = photos.map((photo: any) => photo.url).filter(Boolean);
// 结果：["https://us.zonerama.com/photos/xxx.jpg", ...]
```

#### 2.4 应用代理接口

```typescript
// 对所有 Zonerama URL 应用代理接口
const processedUrls = imageUrls.map((url: string) => {
  // 检查是否为 Zonerama 图片
  if (url.includes('zonerama.com/photos')) {
    // 如果 URL 已经包含接口前缀，则不再重复拼接
    if (url.startsWith(photoApi)) {
      return url;
    }
    // 拼接接口前缀
    return `${photoApi}${url}`;
  }
  return url;
});

// 结果：["https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/xxx.jpg", ...]
```

#### 2.5 返回结果

```typescript
return {
  code: 200,
  msg: '获取成功',
  list: processedUrls,
  data: processedUrls
};
```

### 3. 前端集成

**文件**: `src/pages/admin/components/AlbumsSection.tsx`

**已有功能**（无需修改）:
- 「接口导入」标签页已存在
- `handleZoneramaApiImport` 函数已实现
- 自动切换到「链接导入」标签
- 自动填充 URL 到导入框

**工作流程**:
1. 用户点击「立即开始导入」
2. 调用 `api.importZoneramaAlbum(albumId)`
3. Edge Function 返回处理后的 URL 列表
4. 填充到 `batchUrls` 状态
5. 自动切换到「链接导入」标签
6. 用户点击「开始导入」保存到数据库

## 接口格式

### 请求格式

**URL**:
```
https://zomphoto.wo58.cn/album?albumId=1069
```

**方法**: GET

**参数**:
- `albumId`: Zonerama 图集 ID

### 响应格式

**成功响应**:
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

**字段说明**:
- `photos`: 图片数组（必需）
  - `id`: 图片 ID
  - `url`: 图片 URL（原始链接）

### Edge Function 返回格式

**成功响应**:
```json
{
  "code": 200,
  "msg": "获取成功",
  "list": [
    "https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019410708_690x1226_18.jpg",
    "https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019410472_690x1226_18.jpg"
  ],
  "data": [...]
}
```

**错误响应**:
```json
{
  "code": 400,
  "msg": "图集内图片列表接口未配置，请在后台管理系统配置..."
}
```

## URL 处理示例

### 示例 1: 完整流程

**输入**:
- `albumId`: `1069`
- `album_photo_api`: `https://zomphoto.wo58.cn/album?albumId=`
- `photo_api`: `https://zomphoto.wo58.cn/?url=`

**步骤 1**: 拼接接口 URL
```
https://zomphoto.wo58.cn/album?albumId=1069
```

**步骤 2**: 调用接口，获取响应
```json
{
  "photos": [
    {"id": 1019410708, "url": "https://us.zonerama.com/photos/1019410708_690x1226_18.jpg"}
  ]
}
```

**步骤 3**: 提取 URL
```
https://us.zonerama.com/photos/1019410708_690x1226_18.jpg
```

**步骤 4**: 应用代理接口
```
https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019410708_690x1226_18.jpg
```

**步骤 5**: 返回处理后的 URL
```json
{
  "code": 200,
  "list": ["https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019410708_690x1226_18.jpg"]
}
```

### 示例 2: 未配置图片接口

**输入**:
- `albumId`: `1069`
- `album_photo_api`: `https://zomphoto.wo58.cn/album?albumId=`
- `photo_api`: `''` （未配置）

**结果**:
```json
{
  "code": 200,
  "list": ["https://us.zonerama.com/photos/1019410708_690x1226_18.jpg"]
}
```

**说明**: 返回原始 URL，前端会触发安全拦截，图片不会显示

### 示例 3: 未配置图集内图片列表接口

**输入**:
- `albumId`: `1069`
- `album_photo_api`: `''` （未配置）

**结果**:
```json
{
  "code": 400,
  "msg": "图集内图片列表接口未配置，请在后台管理系统配置..."
}
```

**说明**: 无法调用接口，返回错误提示

## 安全规则

### 规则 1: 强制代理加载

- ✅ **允许**: 通过代理接口加载 Zonerama 图片
- ❌ **禁止**: 直接加载 Zonerama 原图

### 规则 2: 配置检查

- ✅ **图集内图片列表接口配置存在**: 可以调用接口
- ❌ **图集内图片列表接口配置为空**: 返回错误

- ✅ **图片接口配置存在**: 所有 URL 通过代理处理
- ⚠️ **图片接口配置为空**: 返回原始 URL，前端安全拦截

### 规则 3: 自定义字段检查

- ✅ **图集配置了 albumId**: 可以开始导入
- ❌ **图集未配置 albumId**: 按钮禁用

## 使用流程

### 配置阶段

1. **配置图集内图片列表接口**
   - 路径：系统参数设置 → 存储管理 → 专享上传
   - 配置项：图集内图片列表接口（可选）
   - 值：`https://zomphoto.wo58.cn/album?albumId=`

2. **配置图片接口**（推荐）
   - 路径：系统参数设置 → 存储管理 → 专享上传
   - 配置项：图片接口（可选）
   - 值：`https://zomphoto.wo58.cn/?url=`

3. **配置图集自定义字段**
   - 路径：内容管理 → 图集写真 → 图集管理
   - 字段名：`albumId`
   - 字段值：Zonerama 图集 ID（如 `1069`）

### 导入阶段

1. **进入图片管理**
   - 选择图集
   - 点击「图片管理」标签

2. **切换到接口导入**
   - 点击「接口导入」标签
   - 确认 `albumId` 值正确

3. **开始导入**
   - 点击「立即开始导入」
   - 等待导入完成

4. **保存到数据库**
   - 系统自动切换到「链接导入」标签
   - 预览图片缩略图
   - 点击「开始导入」保存

## 调试指南

### 检查配置

**SQL 查询**:
```sql
SELECT value FROM system_configs WHERE key = 'zonerama_upload_config';
```

**预期结果**:
```json
{
  "album_id": "...",
  "session": "...",
  "photo_api": "https://zomphoto.wo58.cn/?url=",
  "album_photo_api": "https://zomphoto.wo58.cn/album?albumId="
}
```

### 检查图集自定义字段

**SQL 查询**:
```sql
SELECT id, title, custom_field_values 
FROM photo_albums 
WHERE id = 'your-album-id';
```

**预期结果**:
```json
{
  "custom_field_values": {
    "albumId": "1069"
  }
}
```

### 查看 Edge Function 日志

**Supabase Dashboard**:
1. 进入 Supabase Dashboard
2. 选择项目
3. 进入 Edge Functions
4. 选择 `zonerama-album-import`
5. 查看 Logs

**日志示例**:
```
[zonerama-album-import] 读取图集内图片列表接口配置...
[zonerama-album-import] 图集内图片列表接口配置: https://zomphoto.wo58.cn/album?albumId=
[zonerama-album-import] 调用 Zonerama API: https://zomphoto.wo58.cn/album?albumId=1069
[zonerama-album-import] API 响应数据: {"title":"1069","photos":[...]}
[zonerama-album-import] 提取到 2 个图片 URL
[zonerama-album-import] 图片接口配置: https://zomphoto.wo58.cn/?url=
[zonerama-album-import] 已对 2 个 URL 应用代理接口
```

### 查看前端日志

**浏览器控制台**:
1. 打开浏览器控制台（F12）
2. 切换到 Console 标签
3. 点击「立即开始导入」
4. 查看日志输出

**日志示例**:
```
正在从 Zonerama 获取图片链接...
已获取 2 个素材链接，已填入导入框并开启预览。
```

### 查看网络请求

**浏览器 Network 标签**:
1. 打开浏览器控制台（F12）
2. 切换到 Network 标签
3. 点击「立即开始导入」
4. 筛选 `zonerama-album-import` 请求
5. 查看请求和响应

**请求示例**:
```
POST /functions/v1/zonerama-album-import
Body: {"albumId":"1069"}
```

**响应示例**:
```json
{
  "code": 200,
  "msg": "获取成功",
  "list": [
    "https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/xxx.jpg"
  ]
}
```

## 常见问题

### Q1: 点击「立即开始导入」没有反应？

**A**: 
1. 检查图集是否配置了 `albumId` 自定义字段
2. 检查后台是否配置了「图集内图片列表接口」
3. 打开浏览器控制台查看错误信息
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
- 如果仍然出现重复，可能是 URL 格式不同

### Q5: 如何验证接口是否正常工作？

**A**: 
1. 打开浏览器 Network 标签
2. 点击「立即开始导入」
3. 筛选 `zonerama-album-import` 请求
4. 查看请求响应，确认返回的 URL 列表
5. 确认所有 URL 都包含代理接口前缀

## 文档清单

1. **ZONERAMA_IMPORT_GUIDE.md** - 导入功能使用说明（本文档的详细版）
2. **ZONERAMA_ALBUM_PHOTO_API.md** - 图集内图片接口配置说明
3. **ZONERAMA_QUICK_GUIDE.md** - 快速配置指南
4. **ZONERAMA_SECURITY_RULES.md** - 安全规则文档
5. **ZONERAMA_FIX_TEST.md** - 修复测试说明
6. **ZONERAMA_SUMMARY.md** - 功能总结

## 版本历史

### v1.4.0 (2026-04-02)
- ✅ 将「图集内图片接口」改名为「图集内图片列表接口」
- ✅ 重写 Edge Function，实现接口导入功能
- ✅ 自动提取 `photos[].url` 字段
- ✅ 自动应用图片接口代理处理所有 URL
- ✅ 增强错误处理和日志输出
- ✅ 创建完整的使用说明文档

### v1.3.0 (2026-04-02)
- ✅ 新增图集内图片接口配置功能
- ✅ 修复数据库表名错误
- ✅ 修复硬编码旧接口问题
- ✅ 实施安全拦截机制

### v1.2.0 (2026-04-02)
- ✅ 修复数据库表名错误
- ✅ 修复删除操作 confirm() 报错

### v1.1.0 (2026-04-01)
- ✅ 初始版本

## 相关链接

- 导入功能使用说明: `ZONERAMA_IMPORT_GUIDE.md`
- 图集内图片接口配置说明: `ZONERAMA_ALBUM_PHOTO_API.md`
- 快速配置指南: `ZONERAMA_QUICK_GUIDE.md`
- 安全规则文档: `ZONERAMA_SECURITY_RULES.md`
- 修复测试说明: `ZONERAMA_FIX_TEST.md`
- 功能总结: `ZONERAMA_SUMMARY.md`

---

**创建时间**: 2026-04-02  
**作者**: 研发工程师智能体  
**版本**: 1.0.0
