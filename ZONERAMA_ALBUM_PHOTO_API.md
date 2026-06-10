# Zonerama 图集内图片接口配置说明

## 功能概述

新增「图集内图片接口」配置项，用于图集写真模块的图片加载。与普通图片接口分开配置，支持不同的接口格式。

## 配置路径

**后台管理系统** → **系统参数设置** → **存储管理** → **专享上传** → **图集内图片接口（可选）**

## 配置格式

### 默认值
```
https://zomphoto.wo58.cn/album?albumId=
```

### 接口格式说明

**输入**：
- 原始图片 URL: `https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg`
- 图集 ID: `12345`

**输出**：
```
https://zomphoto.wo58.cn/album?albumId=12345&img=/photos/1019401782_2000x2000_0.jpg
```

**格式规则**：
1. 接口前缀：`https://zomphoto.wo58.cn/album?albumId=`
2. 拼接图集 ID：`12345`
3. 添加图片路径参数：`&img=/photos/xxx.jpg`
4. 图片路径会自动去掉域名部分，只保留 `/photos/` 开头的路径

## 与普通图片接口的区别

### 普通图片接口（photo_api）

**配置**：`https://zomphoto.wo58.cn/?url=`

**格式**：
```
https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/xxx.jpg
```

**用途**：
- 探索页图片
- 个人中心图片
- 单张图片浏览

### 图集内图片接口（album_photo_api）

**配置**：`https://zomphoto.wo58.cn/album?albumId=`

**格式**：
```
https://zomphoto.wo58.cn/album?albumId=12345&img=/photos/xxx.jpg
```

**用途**：
- 图集写真模块
- 图集内图片浏览
- 需要传递图集 ID 的场景

## 使用方法

### 前端调用

```typescript
import { applyZoneramaAlbumPhotoApiSync } from '@/lib/media';

// 在图集页面中使用
const originalUrl = 'https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg';
const albumId = '12345';

// 应用图集接口配置
const processedUrl = applyZoneramaAlbumPhotoApiSync(originalUrl, albumId);
// 结果：https://zomphoto.wo58.cn/album?albumId=12345&img=/photos/1019401782_2000x2000_0.jpg
```

### 函数说明

#### applyZoneramaAlbumPhotoApiSync

**参数**：
- `url: string | null | undefined` - 原始图片 URL
- `albumId?: string | null` - 图集 ID（可选）

**返回值**：
- `string` - 应用接口后的 URL
- 如果配置为空，返回空字符串 `''`

**安全规则**：
- 如果是 Zonerama 图片，但后台没有配置接口，则返回空字符串
- 绝对不能直接加载 `us.zonerama.com` 的原图
- 只有配置了代理接口，才能加载 Zonerama 图片

## 配置步骤

### 步骤 1: 登录后台管理系统

访问后台管理系统，使用管理员账号登录。

### 步骤 2: 进入配置页面

导航路径：**系统参数设置** → **存储管理** → **专享上传**

### 步骤 3: 填写配置

在「图集内图片接口（可选）」输入框中填写：
```
https://zomphoto.wo58.cn/album?albumId=
```

**注意**：
- 必须以 `https://` 开头
- 必须以 `?albumId=` 结尾
- 不要添加多余的空格或换行

### 步骤 4: 保存配置

点击「保存配置」按钮，等待保存成功提示。

### 步骤 5: 验证配置

1. 刷新前端页面（Ctrl+Shift+R）
2. 打开浏览器控制台（F12）
3. 查看初始化日志：
   ```
   [initZoneramaPhotoApi] 图集内图片接口配置已加载: https://zomphoto.wo58.cn/album?albumId=
   ```
4. 访问图集写真页面，查看图片加载日志
5. 检查网络请求，确认 URL 格式正确

## 安全规则

### 规则 1: 强制代理加载

- ✅ **允许**: 通过代理接口加载 Zonerama 图片
  - 示例: `https://zomphoto.wo58.cn/album?albumId=12345&img=/photos/xxx.jpg`
  
- ❌ **禁止**: 直接加载 Zonerama 原图
  - 示例: `https://us.zonerama.com/photos/xxx.jpg`

### 规则 2: 配置检查

- ✅ **配置存在**: 所有图集内 Zonerama 图片通过代理加载
- ❌ **配置为空**: 返回空字符串，前端显示占位图或不显示

### 规则 3: 安全拦截

当检测到 Zonerama 图片但配置为空时：
1. 返回空字符串 `''`
2. 控制台显示安全拦截警告
3. 提示管理员配置接口

## 调试日志

### 初始化日志

```
[initZoneramaPhotoApi] 开始加载图片接口配置...
[initZoneramaPhotoApi] 查询结果: { value: { photo_api: "...", album_photo_api: "..." } }
[initZoneramaPhotoApi] 图片接口配置已加载: https://zomphoto.wo58.cn/?url=
[initZoneramaPhotoApi] 图集内图片接口配置已加载: https://zomphoto.wo58.cn/album?albumId=
```

### 图片加载日志

```
[applyZoneramaAlbumPhotoApiSync] 输入 URL: https://us.zonerama.com/photos/xxx.jpg | albumId: 12345
[applyZoneramaAlbumPhotoApiSync] 当前缓存的图集接口配置: https://zomphoto.wo58.cn/album?albumId=
[applyZoneramaAlbumPhotoApiSync] ✅ 拼接图集接口: https://zomphoto.wo58.cn/album?albumId= + albumId: 12345 + img: /photos/xxx.jpg = https://zomphoto.wo58.cn/album?albumId=12345&img=/photos/xxx.jpg
```

### 安全拦截日志

```
[applyZoneramaAlbumPhotoApiSync] ⚠️ 安全拦截：图集接口配置为空，拒绝加载 Zonerama 原图
[applyZoneramaAlbumPhotoApiSync] ⚠️ 请在后台管理系统配置图集内图片接口：系统参数设置 → 存储管理 → 专享上传 → 图集内图片接口（可选）
```

## 常见问题

### Q1: 图集内图片接口与普通图片接口有什么区别？

**A**: 
- **普通图片接口**：用于探索页、个人中心等单张图片场景，格式为 `?url=完整URL`
- **图集内图片接口**：用于图集写真模块，格式为 `?albumId=图集ID&img=图片路径`，可以传递图集 ID 用于后端统计和权限控制

### Q2: 为什么需要单独配置图集内图片接口？

**A**: 
1. **不同的接口格式**：图集接口需要传递图集 ID，而普通接口不需要
2. **后端统计**：通过图集 ID 可以统计每个图集的访问量
3. **权限控制**：后端可以根据图集 ID 进行权限校验
4. **灵活配置**：可以为不同场景配置不同的代理服务

### Q3: 如果不配置图集内图片接口会怎样？

**A**: 
- 图集写真模块的 Zonerama 图片不会显示
- 控制台会显示安全拦截警告
- 提示管理员配置接口
- 这是安全设计，不是 Bug

### Q4: 配置后图片仍然不显示？

**A**: 
1. 硬刷新页面（Ctrl+Shift+R）清除缓存
2. 检查控制台日志，确认配置已加载
3. 检查控制台日志，确认 URL 转换过程
4. 检查网络请求，确认请求 URL 格式正确
5. 确认后端代理服务正常运行

### Q5: 如何验证配置是否生效？

**A**: 
1. 打开浏览器 Network 标签
2. 访问图集写真页面
3. 筛选 `zomphoto` 相关请求
4. 确认请求 URL 包含 `albumId` 参数
5. 确认没有直接访问 `us.zonerama.com` 的请求

## 技术实现

### 数据库存储

配置存储在 `system_configs` 表中：

```sql
-- 查询配置
SELECT value FROM system_configs WHERE key = 'zonerama_upload_config';

-- 配置格式
{
  "album_id": "...",
  "session": "...",
  "photo_api": "https://zomphoto.wo58.cn/?url=",
  "album_photo_api": "https://zomphoto.wo58.cn/album?albumId="
}
```

### 缓存机制

- 配置加载到内存缓存 `cachedAlbumPhotoApi`
- 缓存有效期 1 分钟
- 过期后自动重新加载
- 应用启动时预加载配置

### URL 转换逻辑

```typescript
// 1. 检查是否为 Zonerama 图片
const isZoneramaPhoto = url.includes('zonerama.com/photos');

// 2. 检查配置是否存在
if (cachedAlbumPhotoApi === null || cachedAlbumPhotoApi === '') {
  return ''; // 安全拦截
}

// 3. 提取图片路径
const photoPath = url.replace('https://us.zonerama.com', '');

// 4. 拼接接口
const result = `${cachedAlbumPhotoApi}${albumId}&img=${encodeURIComponent(photoPath)}`;
```

## 相关文档

- Zonerama 安全规则: `ZONERAMA_SECURITY_RULES.md`
- 修复测试说明: `ZONERAMA_FIX_TEST.md`
- 调试指南: `DEBUG_PHOTO_API.md`

---

**创建时间**: 2026-04-02  
**作者**: 研发工程师智能体  
**版本**: 1.0.0
