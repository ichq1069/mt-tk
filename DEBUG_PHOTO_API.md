# Zonerama 图片接口配置调试指南

## 问题描述

图片接口配置后，前端图片 URL 仍然使用直链，没有应用配置的接口前缀。

## 调试步骤

### 1. 检查配置是否保存成功

1. 登录后台管理系统
2. 进入 **系统参数设置** → **存储管理** → **专享上传**
3. 查看「图片接口（可选）」输入框中是否有配置值
4. 如果没有，填写接口前缀（例如：`https://zomphoto.wo58.cn/?url=`）
5. 点击「保存配置」按钮

### 2. 检查浏览器控制台日志

1. 打开浏览器控制台（F12）
2. 刷新页面
3. 查看控制台日志，应该看到以下日志：

**初始化日志**：
```
[initZoneramaPhotoApi] 开始加载图片接口配置...
[initZoneramaPhotoApi] 查询结果: { value: { photo_api: "https://zomphoto.wo58.cn/?url=" } }
[initZoneramaPhotoApi] 图片接口配置已加载: https://zomphoto.wo58.cn/?url=
```

**图片加载日志**：
```
[getImageUrl] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg | isThumbnail: false
[getImageUrl] 是否为 Zonerama 图片: true
[applyZoneramaPhotoApiSync] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
[applyZoneramaPhotoApiSync] 当前缓存的接口配置: https://zomphoto.wo58.cn/?url=
[applyZoneramaPhotoApiSync] 拼接接口前缀: https://zomphoto.wo58.cn/?url= + https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg = https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
[getImageUrl] Zonerama 图片处理结果: https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
```

### 3. 检查图片元素

1. 右键点击图片 → 「检查」或「审查元素」
2. 查看 `<img>` 或 `<canvas>` 标签的 `src` 属性
3. 应该看到：
   ```html
   <img src="https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg" />
   ```

### 4. 检查网络请求

1. 打开浏览器控制台（F12）
2. 切换到 **Network（网络）** 标签
3. 筛选图片请求
4. 查看请求的 URL 是否包含接口前缀

## 可能的问题

### 问题 1: 查询失败 - relation "public.system_config" does not exist

**错误信息**:
```
GET https://backend.appmiaoda.com/.../system_config?... 404 (Not Found)
[initZoneramaPhotoApi] 查询失败: {code: '42P01', details: null, hint: null, message: 'relation "public.system_config" does not exist'}
```

**原因**: 数据库表名错误，应该是 `system_configs`（复数）而不是 `system_config`（单数）

**解决方案**:
1. 这是代码错误，已在最新版本中修复
2. 如果仍然出现此错误，请确保代码已更新到最新版本
3. 硬刷新页面（Ctrl+Shift+R）清除缓存

### 问题 2: 控制台没有看到初始化日志

**原因**: 初始化函数没有被调用

**解决方案**:
1. 检查 `ConfigContext.tsx` 中是否调用了 `initZoneramaPhotoApi`
2. 确认应用是否正常启动
3. 尝试硬刷新页面（Ctrl+Shift+R 或 Cmd+Shift+R）

### 问题 3: 日志显示「配置中没有 photo_api 字段」

**原因**: 数据库中没有保存配置

**解决方案**:
1. 重新进入后台管理 → 存储管理 → 专享上传
2. 填写图片接口配置
3. 点击「保存配置」
4. 等待保存成功提示
5. 刷新页面

### 问题 4: 日志显示「接口配置为空，使用原始 URL」

**原因**: 配置值为空字符串或 null

**解决方案**:
1. 检查后台配置是否正确填写
2. 确认配置值不是空字符串
3. 重新保存配置

### 问题 5: 日志显示「不是 Zonerama 图片，直接返回」

**原因**: URL 不包含 `zonerama.com/photos`

**解决方案**:
1. 检查图片 URL 是否确实是 Zonerama 图片
2. 如果是其他图床的图片，不会应用接口配置
3. 只有 Zonerama 图片才会应用接口配置

### 问题 6: 日志显示配置已加载，但图片 URL 没有变化

**原因**: 可能是缓存问题或 URL 检测逻辑问题

**解决方案**:
1. 检查控制台是否有 `[getImageUrl]` 日志
2. 检查 `[applyZoneramaPhotoApiSync]` 日志中的「当前缓存的接口配置」值
3. 如果缓存值为空，说明初始化失败，需要检查数据库配置
4. 如果缓存值正确，但没有拼接，检查是否有其他错误日志

### 问题 7: 查询失败错误

**原因**: 数据库连接问题或权限问题

**解决方案**:
1. 检查 Supabase 连接是否正常
2. 检查 `system_config` 表是否存在
3. 检查是否有查询权限
4. 查看完整的错误信息

## 手动测试

如果自动加载不工作，可以在浏览器控制台手动测试：

```javascript
// 1. 导入函数
import { initZoneramaPhotoApi, applyZoneramaPhotoApiSync } from '@/lib/media';

// 2. 手动初始化
await initZoneramaPhotoApi();

// 3. 测试 URL 转换
const testUrl = 'https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg';
const result = applyZoneramaPhotoApiSync(testUrl);
console.log('转换结果:', result);
```

## 数据库检查

如果需要直接检查数据库配置，可以在 Supabase SQL Editor 中执行：

```sql
SELECT value 
FROM system_config 
WHERE key = 'zonerama_upload_config';
```

应该返回类似：

```json
{
  "photo_api": "https://zomphoto.wo58.cn/?url="
}
```

## 预期行为

### 配置前

- 图片 URL: `https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg`
- 控制台日志:
  ```
  [getImageUrl] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg | isThumbnail: false
  [getImageUrl] 是否为 Zonerama 图片: true
  [applyZoneramaPhotoApiSync] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
  [applyZoneramaPhotoApiSync] 当前缓存的接口配置: null
  [applyZoneramaPhotoApiSync] 接口配置为空，使用原始 URL
  [getImageUrl] Zonerama 图片处理结果: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
  ```

### 配置后

- 图片 URL: `https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg`
- 控制台日志:
  ```
  [initZoneramaPhotoApi] 开始加载图片接口配置...
  [initZoneramaPhotoApi] 查询结果: { value: { photo_api: "https://zomphoto.wo58.cn/?url=" } }
  [initZoneramaPhotoApi] 图片接口配置已加载: https://zomphoto.wo58.cn/?url=
  
  [getImageUrl] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg | isThumbnail: false
  [getImageUrl] 是否为 Zonerama 图片: true
  [applyZoneramaPhotoApiSync] 输入 URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
  [applyZoneramaPhotoApiSync] 当前缓存的接口配置: https://zomphoto.wo58.cn/?url=
  [applyZoneramaPhotoApiSync] 拼接接口前缀: https://zomphoto.wo58.cn/?url= + https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg = https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
  [getImageUrl] Zonerama 图片处理结果: https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
  ```

## 下一步

如果按照以上步骤仍然无法解决问题，请提供以下信息：

1. 浏览器控制台的完整日志（包括所有 `[initZoneramaPhotoApi]` 和 `[applyZoneramaPhotoApiSync]` 日志）
2. 后台配置截图
3. 图片元素的 HTML 代码
4. 网络请求截图（F12 → Network → 筛选图片请求）

---

**文档版本**: v1.2.0  
**最后更新**: 2026-04-02  
**作者**: 研发工程师智能体

## 更新日志

### v1.2.0 (2026-04-02)
- ✅ 修复数据库表名错误（system_config → system_configs）
- ✅ 新增「查询失败 - relation does not exist」问题解答
- ✅ 更新问题编号（1-7）

### v1.1.0 (2026-04-02)
- ✅ 增强调试日志输出
- ✅ 添加 getImageUrl 函数日志
- ✅ 添加 applyZoneramaPhotoApiSync 详细日志
- ✅ 更新调试步骤说明
- ✅ 更新常见问题解答
- ✅ 更新预期行为示例

### v1.0.0 (2026-04-02)
- ✅ 创建调试指南文档
- ✅ 添加调试步骤
- ✅ 添加常见问题解答
- ✅ 添加手动测试方法
- ✅ 添加数据库检查方法
