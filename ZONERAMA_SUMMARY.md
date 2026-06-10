# Zonerama 图片接口配置功能总结

## 版本信息

- **版本**: v1.3.0
- **日期**: 2026-04-02
- **状态**: ✅ 已完成

## 功能概述

本次更新新增了「图集内图片接口」配置功能，并修复了 Zonerama 图片接口配置不生效的问题，实施了严格的安全规则。

## 主要功能

### 1. 图片接口配置（已有功能，已修复）

**配置路径**: 后台管理系统 → 系统参数设置 → 存储管理 → 专享上传 → 图片接口（可选）

**默认值**: `https://zomphoto.wo58.cn/?url=`

**用途**: 
- 探索页图片
- 个人中心图片
- 单张图片浏览

**格式**:
```
输入: https://us.zonerama.com/photos/xxx.jpg
输出: https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/xxx.jpg
```

### 2. 图集内图片接口配置（新增功能）

**配置路径**: 后台管理系统 → 系统参数设置 → 存储管理 → 专享上传 → 图集内图片接口（可选）

**默认值**: `https://zomphoto.wo58.cn/album?albumId=`

**用途**: 
- 图集写真模块
- 图集内图片浏览
- 需要传递图集 ID 的场景

**格式**:
```
输入: https://us.zonerama.com/photos/xxx.jpg + albumId=12345
输出: https://zomphoto.wo58.cn/album?albumId=12345&img=/photos/xxx.jpg
```

## 技术实现

### 后端配置

**数据库表**: `system_configs`

**配置键**: `zonerama_upload_config`

**配置格式**:
```json
{
  "album_id": "...",
  "session": "...",
  "photo_api": "https://zomphoto.wo58.cn/?url=",
  "album_photo_api": "https://zomphoto.wo58.cn/album?albumId="
}
```

### 前端实现

**文件**: `src/lib/media.ts`

**缓存变量**:
- `cachedPhotoApi`: 图片接口配置缓存
- `cachedAlbumPhotoApi`: 图集内图片接口配置缓存
- `lastFetchTime`: 最后加载时间
- `CACHE_DURATION`: 缓存有效期（1 分钟）

**核心函数**:

1. **initZoneramaPhotoApi()** - 初始化配置（应用启动时调用）
   - 从数据库加载配置
   - 写入缓存变量
   - 输出调试日志

2. **getZoneramaPhotoApi()** - 获取图片接口配置（异步）
   - 检查缓存有效性
   - 缓存过期则重新加载
   - 返回配置值

3. **getZoneramaAlbumPhotoApi()** - 获取图集内图片接口配置（异步）
   - 检查缓存有效性
   - 缓存过期则重新加载
   - 返回配置值

4. **applyZoneramaPhotoApiSync(url)** - 应用图片接口配置（同步）
   - 检查是否为 Zonerama 图片
   - 从缓存读取配置
   - 拼接接口前缀
   - 配置为空时返回空字符串（安全拦截）

5. **applyZoneramaAlbumPhotoApiSync(url, albumId)** - 应用图集内图片接口配置（同步）
   - 检查是否为 Zonerama 图片
   - 从缓存读取配置
   - 提取图片路径
   - 拼接接口前缀和参数
   - 配置为空时返回空字符串（安全拦截）

### 配置页面

**文件**: `src/pages/admin/components/StorageSection.tsx`

**修改内容**:
1. 在 `zoneramaConfig` 状态中添加 `album_photo_api` 字段
2. 在配置表单中添加「图集内图片接口（可选）」输入框
3. 保存配置时自动包含新字段

## 安全规则

### 核心原则

**绝对不能直接加载 `us.zonerama.com` 的原图**

### 安全机制

1. **配置检查**
   - 配置存在：所有 Zonerama 图片通过代理加载
   - 配置为空：返回空字符串，前端显示占位图或不显示

2. **安全拦截**
   - 检测到 Zonerama 图片但配置为空时
   - 返回空字符串 `''`
   - 控制台显示安全拦截警告
   - 提示管理员配置接口

3. **日志记录**
   - 初始化日志：显示配置加载状态
   - 图片加载日志：显示 URL 转换过程
   - 安全拦截日志：显示拦截原因和配置路径

## 修复内容

### 1. 数据库表名错误（关键修复）

**问题**: 查询使用了错误的表名 `system_config`，导致 404 错误

**修复**: 
- `initZoneramaPhotoApi` 函数：`system_config` → `system_configs`
- `getZoneramaPhotoApi` 函数：`system_config` → `system_configs`

**影响**: 修复后配置可以正确从数据库加载到缓存

### 2. 硬编码旧接口问题（关键修复）

**问题**: 多个函数硬编码了旧接口 `https://zonerama.wo58.cn/?img=`

**修复**:
- `getZoneramaProxyUrl` 函数：移除硬编码，改用 `applyZoneramaPhotoApiSync(url)`
- `AlbumViewer getPhotoUrl` 函数：移除硬编码，改用 `applyZoneramaPhotoApiSync(url)`
- `getSecurityUrl` 函数：添加 `applyZoneramaPhotoApiSync(url)` 调用
- `getOptimizedImageUrl` 函数：添加 `applyZoneramaPhotoApiSync(url)` 调用

**影响**: 所有图片加载路径都使用后台配置的接口

### 3. 缺少安全拦截机制（关键修复）

**问题**: 配置为空时仍然返回原始 URL，导致直接加载 Zonerama 原图

**修复**:
- `applyZoneramaPhotoApiSync` 函数：配置为空时返回 `''` 而非原始 URL
- `applyZoneramaPhotoApi` 函数：配置为空时返回 `''` 而非原始 URL
- 添加安全拦截警告日志

**影响**: 绝对不会直接加载 `us.zonerama.com` 的原图

## 文档清单

1. **ZONERAMA_FIX_TEST.md** - 修复测试说明
   - 修复内容总结
   - 测试步骤（6 步）
   - 预期结果
   - 常见问题（5 个）

2. **ZONERAMA_SECURITY_RULES.md** - 安全规则文档
   - 核心安全原则
   - 安全规则（3 条）
   - 实现细节
   - 安全验证步骤
   - 配置管理
   - 常见问题（5 个）
   - 安全事件响应
   - 开发规范

3. **ZONERAMA_ALBUM_PHOTO_API.md** - 图集内图片接口配置说明
   - 功能概述
   - 配置路径
   - 配置格式
   - 与普通图片接口的区别
   - 使用方法
   - 配置步骤（5 步）
   - 安全规则
   - 调试日志
   - 常见问题（5 个）
   - 技术实现

4. **ZONERAMA_QUICK_GUIDE.md** - 快速配置指南
   - 配置项总览
   - 快速配置步骤（5 步）
   - 接口格式对比
   - 常见问题（3 个）

5. **ZONERAMA_SUMMARY.md** - 功能总结（本文档）

## 使用指南

### 配置步骤

1. **登录后台管理系统**
2. **进入配置页面**: 系统参数设置 → 存储管理 → 专享上传
3. **填写配置**:
   - 图片接口（可选）: `https://zomphoto.wo58.cn/?url=`
   - 图集内图片接口（可选）: `https://zomphoto.wo58.cn/album?albumId=`
4. **保存配置**: 点击「保存配置」按钮
5. **验证配置**: 刷新前端页面，检查控制台日志

### 验证步骤

1. **硬刷新页面**: Ctrl+Shift+R
2. **打开控制台**: F12
3. **查看初始化日志**:
   ```
   [initZoneramaPhotoApi] 图片接口配置已加载: https://zomphoto.wo58.cn/?url=
   [initZoneramaPhotoApi] 图集内图片接口配置已加载: https://zomphoto.wo58.cn/album?albumId=
   ```
4. **查看图片加载日志**: 访问探索页或图集页面
5. **检查网络请求**: Network 标签筛选 `zomphoto`

## 常见问题

### Q1: 配置后图片不显示？

**A**: 
1. 硬刷新页面（Ctrl+Shift+R）
2. 检查控制台日志，确认配置已加载
3. 检查网络请求，确认 URL 格式正确

### Q2: 如何验证配置是否生效？

**A**: 
1. 打开浏览器 Network 标签
2. 筛选 `zomphoto` 相关请求
3. 确认请求 URL 格式正确
4. 确认没有直接访问 `us.zonerama.com` 的请求

### Q3: 不配置会怎样？

**A**: 
- Zonerama 图片不会显示
- 控制台显示安全拦截警告
- 这是安全设计，不是 Bug

### Q4: 图片接口和图集内图片接口有什么区别？

**A**: 
- **图片接口**: 用于单张图片，格式为 `?url=完整URL`
- **图集内图片接口**: 用于图集，格式为 `?albumId=ID&img=路径`

### Q5: 为什么需要单独配置图集内图片接口？

**A**: 
1. 不同的接口格式（需要传递图集 ID）
2. 后端统计（可以统计每个图集的访问量）
3. 权限控制（可以根据图集 ID 进行权限校验）
4. 灵活配置（可以为不同场景配置不同的代理服务）

## 技术细节

### URL 转换示例

#### 图片接口

```typescript
// 输入
const url = 'https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg';

// 处理
const result = applyZoneramaPhotoApiSync(url);

// 输出
// https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
```

#### 图集内图片接口

```typescript
// 输入
const url = 'https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg';
const albumId = '12345';

// 处理
const result = applyZoneramaAlbumPhotoApiSync(url, albumId);

// 输出
// https://zomphoto.wo58.cn/album?albumId=12345&img=/photos/1019401782_2000x2000_0.jpg
```

### 缓存机制

```typescript
// 缓存变量
let cachedPhotoApi: string | null = null;
let cachedAlbumPhotoApi: string | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 分钟

// 缓存检查
if (cachedPhotoApi !== null && now - lastFetchTime < CACHE_DURATION) {
  return cachedPhotoApi; // 使用缓存
}

// 缓存过期，重新加载
const { data } = await supabase
  .from('system_configs')
  .select('value')
  .eq('key', 'zonerama_upload_config')
  .single();

cachedPhotoApi = data.value.photo_api;
lastFetchTime = now;
```

### 安全拦截逻辑

```typescript
// 检查是否为 Zonerama 图片
const isZoneramaPhoto = url.includes('zonerama.com/photos');
if (!isZoneramaPhoto) {
  return url; // 不是 Zonerama 图片，直接返回
}

// 检查配置是否存在
if (cachedPhotoApi === null || cachedPhotoApi === '') {
  console.warn('⚠️ 安全拦截：接口配置为空，拒绝加载 Zonerama 原图');
  return ''; // 返回空字符串，前端会显示占位图或不显示
}

// 拼接接口前缀
const result = `${cachedPhotoApi}${url}`;
return result;
```

## 版本历史

### v1.3.0 (2026-04-02)
- ✅ 新增图集内图片接口配置功能
- ✅ 修复数据库表名错误
- ✅ 修复硬编码旧接口问题
- ✅ 实施安全拦截机制
- ✅ 增强调试日志输出
- ✅ 创建完整的文档体系

### v1.2.0 (2026-04-02)
- ✅ 修复数据库表名错误
- ✅ 修复删除操作 confirm() 报错

### v1.1.0 (2026-04-01)
- ✅ 初始版本

## 相关链接

- 修复测试说明: `ZONERAMA_FIX_TEST.md`
- 安全规则文档: `ZONERAMA_SECURITY_RULES.md`
- 图集接口配置说明: `ZONERAMA_ALBUM_PHOTO_API.md`
- 快速配置指南: `ZONERAMA_QUICK_GUIDE.md`

---

**创建时间**: 2026-04-02  
**作者**: 研发工程师智能体  
**版本**: 1.0.0
