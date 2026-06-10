# 广告功能测试指南

## 版本信息
- 当前版本：v1.0.12
- 更新日期：2026-03-14
- 功能：广告管理系统（开屏、弹窗、瀑布流）

## 已修复问题
1. ✅ 修复了广告保存时的 DOM 渲染错误（insertBefore 崩溃）
2. ✅ 优化了 Dialog 组件的状态管理，避免 React 协调冲突
3. ✅ 新增广告展示频率控制（每次访问、每会话一次、每天一次）
4. ✅ 新增广告跳过/关闭按钮控制
5. ✅ 实现了基于时间的自动上下架功能
6. ✅ 后台版本号显示（v1.0.12）

## 测试步骤

### 1. 清除浏览器缓存
在测试前，请先清除浏览器的 localStorage 和 sessionStorage：
```javascript
// 在浏览器控制台执行
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. 测试开屏广告（不允许跳过）
**配置：**
- 类型：开屏广告
- 频率：每次访问（always）
- 允许跳过：否（false）
- 显示时长：5秒

**预期行为：**
1. 刷新首页，应该立即看到开屏广告
2. 右上角只显示倒计时（5s, 4s, 3s...），没有"跳过"按钮
3. 必须等待倒计时结束才能进入主页
4. 再次刷新页面，广告会再次出现（因为设置为 always）

### 3. 测试弹窗广告（允许关闭）
**配置：**
- 类型：弹窗广告
- 频率：每会话一次（session）
- 允许跳过：是（true）
- 显示时长：3秒

**预期行为：**
1. 开屏广告结束后，应该看到弹窗广告
2. 右上角有 X 关闭按钮，可以立即关闭
3. 关闭后，在同一会话中刷新页面，弹窗不会再出现
4. 关闭浏览器重新打开（新会话），弹窗会再次出现

### 4. 测试频率控制

#### 测试 "每次访问" (always)
```sql
UPDATE ads SET frequency = 'always' WHERE type = 'splash';
```
- 每次刷新页面都会显示

#### 测试 "每会话一次" (session)
```sql
UPDATE ads SET frequency = 'session' WHERE type = 'splash';
```
- 同一浏览器会话中只显示一次
- 关闭浏览器重新打开会再次显示

#### 测试 "每天一次" (daily)
```sql
UPDATE ads SET frequency = 'daily' WHERE type = 'splash';
```
- 24小时内只显示一次
- 可以通过清除 localStorage 来重置

### 5. 测试后台管理

#### 访问管理后台
1. 登录管理员账号
2. 进入 PC 管理后台
3. 查看左下角版本号：应显示 "v1.0.12"

#### 测试广告编辑
1. 点击"广告管理"菜单
2. 点击"新增广告位"按钮
3. 填写表单：
   - 广告类型：选择任意类型
   - 显示时长：输入数字
   - 图片 URL：粘贴图片链接
   - 标题和描述：输入文本
   - 显示频率：选择频率选项
   - 允许跳过：切换开关
4. 点击"确定发布"
5. **预期结果：** 保存成功，不应出现任何错误

#### 验证保存成功
```sql
SELECT id, type, title, frequency, allow_skip, is_active 
FROM ads 
ORDER BY created_at DESC 
LIMIT 5;
```

### 6. 测试时间控制

#### 测试上线时间
```sql
-- 设置广告在未来上线
UPDATE ads 
SET start_time = NOW() + INTERVAL '1 hour' 
WHERE type = 'splash';
```
- 刷新首页，广告不应显示

#### 测试下线时间
```sql
-- 设置广告已过期
UPDATE ads 
SET end_time = NOW() - INTERVAL '1 hour' 
WHERE type = 'splash';
```
- 刷新首页，广告不应显示

## 常见问题排查

### 问题1：广告不显示
**检查清单：**
1. 广告的 `is_active` 是否为 `true`
2. 当前时间是否在 `start_time` 和 `end_time` 之间
3. 是否已经在本地缓存中标记为已显示（检查 localStorage/sessionStorage）
4. 浏览器控制台是否有错误信息

### 问题2：保存广告时出错
**解决方案：**
1. 检查浏览器控制台的错误信息
2. 确保所有必填字段都已填写
3. 清除浏览器缓存后重试
4. 检查网络请求是否成功

### 问题3：频率控制不生效
**解决方案：**
1. 清除 localStorage 和 sessionStorage
2. 检查广告的 `frequency` 字段值是否正确
3. 使用浏览器开发者工具查看存储的键值

## 数据库查询命令

### 查看所有广告
```sql
SELECT * FROM ads ORDER BY created_at DESC;
```

### 查看活跃广告
```sql
SELECT id, type, title, frequency, allow_skip, is_active, start_time, end_time
FROM ads 
WHERE is_active = true
  AND (start_time IS NULL OR start_time <= NOW())
  AND (end_time IS NULL OR end_time >= NOW())
ORDER BY created_at DESC;
```

### 重置测试数据
```sql
-- 删除所有广告
DELETE FROM ads;

-- 重新插入测试广告
-- （参考上面的测试步骤）
```

## 技术说明

### 核心修复
1. **Dialog 状态管理优化**
   - 使用延迟清空状态避免 DOM 更新冲突
   - 将条件渲染移到 ScrollArea 内部，保持 DOM 结构稳定

2. **频率控制实现**
   - `always`: 每次都显示
   - `session`: 使用 sessionStorage 记录
   - `daily`: 使用 localStorage + 时间戳判断

3. **时间控制**
   - 前端过滤：检查 start_time 和 end_time
   - 自动上下架：超出时间范围的广告不显示

### 文件变更
- `src/pages/admin/components/AdsSection.tsx`: 修复 DOM 渲染问题
- `src/pages/Home.tsx`: 实现频率和时间控制逻辑
- `src/pages/admin/PCDashboard.tsx`: 添加版本号显示
- `supabase/migrations/`: 添加 frequency 和 allow_skip 字段

## 联系支持
如果测试过程中遇到问题，请提供：
1. 浏览器控制台的完整错误信息
2. 网络请求的响应内容
3. 当前广告的配置（从数据库查询）
4. 操作步骤的详细描述
