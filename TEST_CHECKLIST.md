# 快速测试清单 ✅

## 测试环境准备
```javascript
// 在浏览器控制台执行，清除所有缓存
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## 测试项目

### ✅ 1. 后台版本号显示
- [ ] 登录管理员账号
- [ ] 进入 PC 管理后台
- [ ] 查看左侧边栏顶部
- [ ] **预期结果**: 显示 "全站数据管理 · v1.0.12"

### ✅ 2. 广告保存功能
- [ ] 点击"广告管理"菜单
- [ ] 点击"新增广告位"按钮
- [ ] 填写表单（所有字段）
- [ ] 点击"确定发布"
- [ ] **预期结果**: 保存成功，无 DOM 错误

### ✅ 3. 开屏广告（不允许跳过）
**当前配置:**
- 类型: splash
- 频率: always（每次访问）
- 允许跳过: false
- 显示时长: 5秒

**测试步骤:**
- [ ] 刷新首页
- [ ] **预期**: 立即看到开屏广告
- [ ] **预期**: 右上角只显示倒计时（5s, 4s, 3s...）
- [ ] **预期**: 没有"跳过"按钮
- [ ] **预期**: 必须等待5秒才能进入
- [ ] 再次刷新页面
- [ ] **预期**: 广告再次出现（因为 frequency=always）

### ✅ 4. 弹窗广告（允许关闭）
**当前配置:**
- 类型: popup
- 频率: session（每会话一次）
- 允许跳过: true
- 显示时长: 3秒

**测试步骤:**
- [ ] 开屏广告结束后
- [ ] **预期**: 看到弹窗广告
- [ ] **预期**: 右上角有 X 关闭按钮
- [ ] 点击 X 关闭
- [ ] 刷新页面
- [ ] **预期**: 弹窗不再出现（同一会话）
- [ ] 关闭浏览器，重新打开
- [ ] **预期**: 弹窗再次出现（新会话）

### ✅ 5. 频率控制测试

#### 测试 "每次访问"
```sql
UPDATE ads SET frequency = 'always' WHERE type = 'splash';
```
- [ ] 清除缓存
- [ ] 刷新页面多次
- [ ] **预期**: 每次都显示

#### 测试 "每会话一次"
```sql
UPDATE ads SET frequency = 'session' WHERE type = 'splash';
```
- [ ] 清除缓存
- [ ] 刷新页面
- [ ] **预期**: 第一次显示
- [ ] 再次刷新
- [ ] **预期**: 不显示
- [ ] 关闭浏览器重新打开
- [ ] **预期**: 再次显示

#### 测试 "每天一次"
```sql
UPDATE ads SET frequency = 'daily' WHERE type = 'splash';
```
- [ ] 清除缓存
- [ ] 刷新页面
- [ ] **预期**: 显示
- [ ] 再次刷新
- [ ] **预期**: 不显示（24小时内）

### ✅ 6. 跳过按钮控制

#### 测试"允许跳过"
```sql
UPDATE ads SET allow_skip = true WHERE type = 'splash';
```
- [ ] 清除缓存
- [ ] 刷新页面
- [ ] **预期**: 显示"跳过 Xs"按钮
- [ ] 点击按钮
- [ ] **预期**: 立即关闭广告

#### 测试"不允许跳过"
```sql
UPDATE ads SET allow_skip = false WHERE type = 'splash';
```
- [ ] 清除缓存
- [ ] 刷新页面
- [ ] **预期**: 只显示倒计时"Xs"
- [ ] **预期**: 无法点击跳过
- [ ] **预期**: 必须等待倒计时结束

### ✅ 7. 时间控制测试

#### 测试上线时间
```sql
UPDATE ads SET start_time = NOW() + INTERVAL '1 hour' WHERE type = 'splash';
```
- [ ] 刷新页面
- [ ] **预期**: 广告不显示（未到上线时间）

#### 测试下线时间
```sql
UPDATE ads SET end_time = NOW() - INTERVAL '1 hour' WHERE type = 'splash';
```
- [ ] 刷新页面
- [ ] **预期**: 广告不显示（已过下线时间）

#### 恢复正常时间
```sql
UPDATE ads 
SET start_time = NOW(), 
    end_time = NOW() + INTERVAL '7 days' 
WHERE type = 'splash';
```

## 问题排查

### 如果广告不显示
1. 检查数据库：
```sql
SELECT id, type, is_active, start_time, end_time, frequency 
FROM ads 
WHERE type = 'splash';
```

2. 检查浏览器存储：
```javascript
// 查看 localStorage
console.log('localStorage:', localStorage);
// 查看 sessionStorage
console.log('sessionStorage:', sessionStorage);
```

3. 清除缓存重试：
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 如果保存广告时出错
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 尝试保存广告
4. 查看是否有红色错误信息
5. 截图错误信息并报告

## 测试完成确认

- [ ] 所有测试项目已完成
- [ ] 没有发现任何错误
- [ ] 版本号正确显示
- [ ] 广告功能正常工作

## 测试结果报告

**测试日期**: ___________
**测试人员**: ___________
**测试结果**: ☐ 通过  ☐ 失败

**问题描述**（如有）:
_______________________________________
_______________________________________
_______________________________________

**截图附件**（如有）:
_______________________________________
