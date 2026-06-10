# Zonerama 图片安全规则

## 核心安全原则

**绝对不能直接加载 `us.zonerama.com` 的原图**

所有 Zonerama 图片必须通过后台配置的代理接口加载，不允许任何绕过行为。

## 安全规则

### 规则 1: 强制代理加载

- ✅ **允许**: 通过代理接口加载 Zonerama 图片
  - 示例: `https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/xxx.jpg`
  
- ❌ **禁止**: 直接加载 Zonerama 原图
  - 示例: `https://us.zonerama.com/photos/xxx.jpg`

### 规则 2: 配置检查

- ✅ **配置存在**: 所有 Zonerama 图片通过代理加载
- ❌ **配置为空**: 返回空字符串，前端显示占位图或不显示

### 规则 3: 安全拦截

当检测到 Zonerama 图片但配置为空时：
1. 返回空字符串 `''`
2. 控制台显示安全拦截警告
3. 提示管理员配置接口

## 实现细节

### 函数级别的安全检查

所有处理 Zonerama 图片的函数都实现了安全检查：

1. **applyZoneramaPhotoApiSync** (同步版本)
   ```typescript
   if (cachedPhotoApi === null || cachedPhotoApi === '') {
     console.warn('[applyZoneramaPhotoApiSync] ⚠️ 安全拦截：接口配置为空，拒绝加载 Zonerama 原图');
     return ''; // 返回空字符串
   }
   ```

2. **applyZoneramaPhotoApi** (异步版本)
   ```typescript
   const photoApi = await getZoneramaPhotoApi();
   if (!photoApi) {
     console.warn('[applyZoneramaPhotoApi] ⚠️ 安全拦截：接口配置为空，拒绝加载 Zonerama 原图');
     return ''; // 返回空字符串
   }
   ```

3. **getZoneramaProxyUrl**
   ```typescript
   const processedUrl = applyZoneramaPhotoApiSync(original);
   return processedUrl; // 如果配置为空，返回 ''
   ```

4. **AlbumViewer getPhotoUrl**
   ```typescript
   const processedUrl = applyZoneramaPhotoApiSync(original);
   return processedUrl; // 如果配置为空，返回 ''
   ```

5. **getSecurityUrl**
   ```typescript
   const processedUrl = applyZoneramaPhotoApiSync(url);
   return processedUrl; // 如果配置为空，返回 ''
   ```

6. **getOptimizedImageUrl**
   ```typescript
   const processedUrl = applyZoneramaPhotoApiSync(url);
   // 使用 processedUrl 进行后续处理
   ```

### 前端处理

当图片 URL 为空字符串时，前端组件会：
- 显示占位图（如果有配置）
- 不显示图片（如果没有占位图）
- 不发起任何网络请求

## 安全验证

### 验证步骤

1. **打开浏览器开发者工具**
   - 按 `F12` 打开
   - 切换到 **Network（网络）** 标签

2. **筛选图片请求**
   - 在筛选框输入 `zonerama`
   - 查看所有 Zonerama 相关的请求

3. **检查请求 URL**
   - ✅ 正确: `https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/xxx.jpg`
   - ❌ 错误: `https://us.zonerama.com/photos/xxx.jpg`

4. **检查控制台日志**
   - 查看是否有安全拦截警告
   - 确认所有 URL 转换过程

### 验证清单

- [ ] 所有 Zonerama 图片请求都以 `https://zomphoto.wo58.cn/?url=` 开头
- [ ] 没有任何直接访问 `us.zonerama.com` 的请求
- [ ] 配置为空时，控制台显示安全拦截警告
- [ ] 配置为空时，图片不显示或显示占位图
- [ ] 配置正确时，图片正常加载

## 配置管理

### 配置路径

**后台管理系统** → **系统参数设置** → **存储管理** → **专享上传** → **图片接口（可选）**

### 配置格式

```
https://zomphoto.wo58.cn/?url=
```

**注意**:
- 必须以 `https://` 开头
- 必须以 `?url=` 结尾
- 不要添加多余的空格或换行

### 配置验证

保存配置后，系统会：
1. 验证配置格式是否正确
2. 将配置存储到数据库 `system_configs` 表
3. 前端在应用启动时加载配置到缓存
4. 缓存有效期 1 分钟，过期后自动重新加载

## 常见问题

### Q1: 为什么要禁止直接加载原图？

**A**: 保护 Zonerama 原图不被直接访问，确保所有图片都通过代理服务加载，便于：
- 统计图片访问量
- 控制图片访问权限
- 防止图片盗链
- 优化图片加载速度

### Q2: 配置为空时，为什么不显示图片？

**A**: 这是安全设计，不是 Bug。如果没有配置接口，系统会拒绝加载 Zonerama 原图，防止直接访问。管理员需要配置接口后，图片才会显示。

### Q3: 如何快速配置接口？

**A**: 
1. 登录后台管理系统
2. 进入 **系统参数设置** → **存储管理** → **专享上传**
3. 填写「图片接口（可选）」：`https://zomphoto.wo58.cn/?url=`
4. 点击「保存配置」按钮
5. 刷新前端页面

### Q4: 配置后图片仍然不显示？

**A**: 
1. 硬刷新页面（Ctrl+Shift+R）清除缓存
2. 检查控制台日志，确认配置已加载
3. 检查控制台日志，确认 URL 转换过程
4. 检查网络请求，确认请求 URL 包含接口前缀

### Q5: 如何验证安全规则是否生效？

**A**: 
1. 打开浏览器 Network 标签
2. 筛选 `zonerama` 相关请求
3. 确认所有请求都以 `https://zomphoto.wo58.cn/?url=` 开头
4. 确认没有直接访问 `us.zonerama.com` 的请求

## 安全事件响应

### 如果发现直接访问原图

1. **立即报告**
   - 记录发现时间
   - 记录访问的 URL
   - 记录浏览器控制台日志
   - 记录网络请求截图

2. **排查原因**
   - 检查是否有代码绕过了安全检查
   - 检查是否有新增的图片加载路径
   - 检查是否有第三方库直接加载图片

3. **修复措施**
   - 修复绕过安全检查的代码
   - 在所有图片加载路径添加安全检查
   - 更新安全规则文档

## 开发规范

### 新增图片加载功能时

1. **必须使用安全函数**
   - 使用 `applyZoneramaPhotoApiSync(url)` 或 `applyZoneramaPhotoApi(url)`
   - 不要直接使用原始 URL

2. **必须处理空字符串**
   - 当函数返回空字符串时，显示占位图或不显示
   - 不要尝试加载空字符串

3. **必须添加日志**
   - 记录输入 URL
   - 记录处理后 URL
   - 记录是否触发安全拦截

4. **必须进行测试**
   - 测试配置存在时的行为
   - 测试配置为空时的行为
   - 测试网络请求是否正确

### 代码审查清单

- [ ] 是否使用了安全函数处理 Zonerama URL
- [ ] 是否处理了空字符串返回值
- [ ] 是否添加了详细的日志
- [ ] 是否进行了安全验证测试
- [ ] 是否更新了相关文档

## 相关文档

- 修复测试说明: `ZONERAMA_FIX_TEST.md`
- 调试指南: `DEBUG_PHOTO_API.md`
- 调试步骤: `PHOTO_API_DEBUG_STEPS.md`
- Zonerama 集成文档: `docs/ZONERAMA_INTEGRATION.md`

---

**创建时间**: 2026-04-02  
**作者**: 研发工程师智能体  
**版本**: 1.0.0
