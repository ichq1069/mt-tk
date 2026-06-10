# Zonerama 图片接口配置修复测试说明

## 修复内容

已修复 Zonerama 图片接口配置不生效的问题，包括：

1. ✅ 修复数据库表名错误（`system_config` → `system_configs`）
2. ✅ 在 `getSecurityUrl` 函数中应用 Zonerama 接口配置
3. ✅ 在 `getOptimizedImageUrl` 函数中应用 Zonerama 接口配置
4. ✅ 修复 `getZoneramaProxyUrl` 函数使用硬编码旧接口的问题
5. ✅ 修复 `AlbumViewer` 页面使用硬编码旧接口的问题
6. ✅ **安全加固：禁止直接加载 Zonerama 原图**
7. ✅ 增强调试日志输出

## 安全规则（重要）

**绝对不能直接加载 `us.zonerama.com` 的原图**

- ✅ 如果后台配置了代理接口：所有 Zonerama 图片通过代理加载
- ❌ 如果后台没有配置接口：Zonerama 图片返回空字符串，前端显示占位图或不显示
- ⚠️ 控制台会显示安全拦截警告，提示管理员配置接口

**为什么要这样做？**
- 保护 Zonerama 原图不被直接访问
- 确保所有图片都通过代理服务加载
- 防止绕过代理直接访问原图

## 修复说明

### 问题 1: 数据库表名错误
- **问题**: 代码中使用了错误的表名 `system_config`（单数）
- **实际**: 数据库表名为 `system_configs`（复数）
- **影响**: 查询失败，返回 404 错误，配置无法加载
- **修复**: 修改 `initZoneramaPhotoApi` 和 `getZoneramaPhotoApi` 函数中的表名

### 问题 2: getSecurityUrl 和 getOptimizedImageUrl 未应用配置
- **问题**: 这两个函数直接返回原始 URL，没有应用 Zonerama 接口配置
- **影响**: 探索页图片没有加接口前缀
- **修复**: 在函数开头调用 `applyZoneramaPhotoApiSync(url)`

### 问题 3: getZoneramaProxyUrl 使用硬编码旧接口
- **问题**: 函数硬编码了旧接口 `https://zonerama.wo58.cn/?img=`
- **影响**: 即使后台配置了新接口，图片仍然使用旧接口加载
- **修复**: 移除硬编码，改用 `applyZoneramaPhotoApiSync(url)`

### 问题 4: AlbumViewer 页面使用硬编码旧接口
- **问题**: `getPhotoUrl` 函数硬编码了旧接口 `https://zonerama.wo58.cn/?img=`
- **影响**: 图集写真页面的图片仍然使用旧接口加载
- **修复**: 移除硬编码，改用 `applyZoneramaPhotoApiSync(url)`

## 测试步骤

### 步骤 1: 硬刷新页面

1. 打开应用首页（探索页）
2. 按 `Ctrl+Shift+R`（Windows）或 `Cmd+Shift+R`（Mac）硬刷新页面
3. 这会清除浏览器缓存，加载最新代码

### 步骤 2: 打开浏览器控制台

1. 按 `F12` 打开开发者工具
2. 切换到 **Console（控制台）** 标签

### 步骤 3: 查看初始化日志

应该看到以下日志：

```
[initZoneramaPhotoApi] 开始加载图片接口配置...
[initZoneramaPhotoApi] 查询结果: { value: { photo_api: "https://zomphoto.wo58.cn/?url=" } }
[initZoneramaPhotoApi] 图片接口配置已加载: https://zomphoto.wo58.cn/?url=
```

**如果看到错误**：
- `relation "public.system_config" does not exist` → 代码未更新，需要硬刷新
- `配置中没有 photo_api 字段` → 需要在后台保存配置

**如果看到安全拦截警告**：
```
⚠️ 安全拦截：接口配置为空，拒绝加载 Zonerama 原图
⚠️ 请在后台管理系统配置图片接口：系统参数设置 → 存储管理 → 专享上传 → 图片接口（可选）
```
这说明后台没有配置接口，Zonerama 图片不会显示。请按照提示配置接口。

### 步骤 4: 查看图片加载日志

滚动探索页或访问图集写真页面，应该看到以下日志：

**探索页日志**:
```
[getImageUrl] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg | isThumbnail: false
[getImageUrl] 是否为 Zonerama 图片: true
[applyZoneramaPhotoApiSync] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
[applyZoneramaPhotoApiSync] 当前缓存的接口配置: https://zomphoto.wo58.cn/?url=
[applyZoneramaPhotoApiSync] 拼接接口前缀: https://zomphoto.wo58.cn/?url= + https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg = https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
[getImageUrl] Zonerama 图片处理结果: https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
```

**图集写真页面日志**:
```
[AlbumViewer getPhotoUrl] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
[AlbumViewer getPhotoUrl] 是否为 Zonerama 图片: true
[applyZoneramaPhotoApiSync] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
[applyZoneramaPhotoApiSync] 当前缓存的接口配置: https://zomphoto.wo58.cn/?url=
[applyZoneramaPhotoApiSync] 拼接接口前缀: https://zomphoto.wo58.cn/?url= + https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg = https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
[AlbumViewer getPhotoUrl] 处理后 URL: https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
```

**getZoneramaProxyUrl 日志**:
```
[getZoneramaProxyUrl] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
[getZoneramaProxyUrl] 是否为 Zonerama 图片: true
[applyZoneramaPhotoApiSync] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
[applyZoneramaPhotoApiSync] 当前缓存的接口配置: https://zomphoto.wo58.cn/?url=
[applyZoneramaPhotoApiSync] 拼接接口前缀: https://zomphoto.wo58.cn/?url= + https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg = https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
[getZoneramaProxyUrl] 处理后 URL: https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
```

### 步骤 5: 检查图片元素

1. 右键点击任意 Zonerama 图片
2. 选择「检查」或「审查元素」
3. 查看 `<canvas>` 或 `<img>` 标签
4. 应该看到图片是从 `https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/...` 加载的

### 步骤 6: 检查网络请求

1. 切换到 **Network（网络）** 标签
2. 筛选图片请求（可以在筛选框输入 `zomphoto` 或 `zonerama`）
3. 查看请求的 URL
4. 应该看到请求 URL 以 `https://zomphoto.wo58.cn/?url=` 开头

## 预期结果

### 正确的 URL 格式

- **原始 URL**: `https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg`
- **处理后 URL**: `https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg`
- **配置为空时**: 返回空字符串 `''`，前端显示占位图或不显示

### 控制台日志

应该看到：
- ✅ 初始化日志显示配置已加载
- ✅ 图片加载日志显示 URL 转换过程
- ✅ 没有 404 错误
- ✅ 没有「relation does not exist」错误
- ✅ 没有直接加载 `us.zonerama.com` 的请求

### 图片显示

- ✅ 图片可以正常加载显示
- ✅ 缩略图和原图都应用了接口前缀
- ✅ 图片加载速度正常
- ❌ 不会出现直接加载 `us.zonerama.com` 的情况

### 安全验证

打开浏览器 **Network（网络）** 标签，筛选图片请求：
- ✅ 所有 Zonerama 图片请求都以 `https://zomphoto.wo58.cn/?url=` 开头
- ❌ 不应该有任何直接访问 `us.zonerama.com` 的请求
- ⚠️ 如果发现直接访问 `us.zonerama.com`，说明有代码绕过了安全检查，请立即报告

## 常见问题

### 问题 1: 仍然看到 404 错误

**解决方案**:
1. 确保已经硬刷新页面（Ctrl+Shift+R）
2. 清除浏览器缓存
3. 关闭浏览器后重新打开

### 问题 2: 日志显示「配置中没有 photo_api 字段」

**解决方案**:
1. 登录后台管理系统
2. 进入 **系统参数设置** → **存储管理** → **专享上传**
3. 填写「图片接口（可选）」：`https://zomphoto.wo58.cn/?url=`
4. 点击「保存配置」按钮
5. 等待保存成功提示
6. 刷新前端页面

### 问题 3: 图片仍然使用原始 URL

**可能原因**:
1. 浏览器缓存未清除
2. 配置未保存或保存失败
3. 代码未更新

**解决方案**:
1. 硬刷新页面（Ctrl+Shift+R）
2. 检查控制台日志，确认配置已加载
3. 检查控制台日志，确认 URL 转换过程
4. 如果仍然有问题，提供完整的控制台日志截图

### 问题 4: 看到安全拦截警告，图片不显示

**警告内容**:
```
⚠️ 安全拦截：接口配置为空，拒绝加载 Zonerama 原图
⚠️ 请在后台管理系统配置图片接口：系统参数设置 → 存储管理 → 专享上传 → 图片接口（可选）
```

**原因**: 后台没有配置图片接口

**解决方案**:
1. 登录后台管理系统
2. 进入 **系统参数设置** → **存储管理** → **专享上传**
3. 填写「图片接口（可选）」：`https://zomphoto.wo58.cn/?url=`
4. 点击「保存配置」按钮
5. 等待保存成功提示
6. 刷新前端页面

**注意**: 这是安全设计，不是 Bug。如果没有配置接口，系统会拒绝加载 Zonerama 原图，防止直接访问。

### 问题 5: 图片加载失败

**可能原因**:
1. 接口服务 `https://zomphoto.wo58.cn` 不可用
2. 原始图片 URL 无效
3. 网络连接问题

**解决方案**:
1. 检查网络连接
2. 在浏览器中直接访问接口 URL，测试是否可用
3. 检查原始图片 URL 是否有效

## 技术说明

### 修复的函数

1. **initZoneramaPhotoApi**: 修复数据库表名
2. **getZoneramaPhotoApi**: 修复数据库表名
3. **getSecurityUrl**: 添加 Zonerama 接口配置应用
4. **getOptimizedImageUrl**: 添加 Zonerama 接口配置应用
5. **getZoneramaProxyUrl**: 移除硬编码旧接口，改用后台配置
6. **AlbumViewer getPhotoUrl**: 移除硬编码旧接口，改用后台配置
7. **getProtectedUrl**: 已经正确应用（无需修改）
8. **getImageUrl**: 已经正确应用（无需修改）

### 调用链路

```
探索页加载图片
  ↓
getProtectedUrl / getSecurityUrl
  ↓
applyZoneramaPhotoApi / applyZoneramaPhotoApiSync
  ↓
检查缓存配置
  ↓
拼接接口前缀
  ↓
返回处理后的 URL
```

### 缓存机制

- 配置在应用启动时加载到内存缓存
- 缓存有效期：1 分钟
- 1 分钟后自动重新加载配置
- 可以通过刷新页面立即重新加载

## 相关文档

- 详细调试指南：`DEBUG_PHOTO_API.md`
- 调试步骤说明：`PHOTO_API_DEBUG_STEPS.md`
- Zonerama 集成文档：`docs/ZONERAMA_INTEGRATION.md`

---

**创建时间**: 2026-04-02  
**作者**: 研发工程师智能体
