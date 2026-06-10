# PC 管理后台修复说明

## 问题描述
在电脑端访问 https://app-a7metxb241s1.appmiaoda.com/admin-pc 时，页面显示空白或显示 H5 移动端提示。

## 根本原因
1. **移动端检测逻辑过于严格**：原代码在桌面浏览器中，只要窗口宽度小于 1024px 就会触发移动端提示
2. **Layout 组件影响**：PC 管理后台被包裹在 H5 的 Layout 组件中，可能受到样式影响

## 修复方案

### 1. 优化移动端检测逻辑 (PCDashboard.tsx)
```typescript
// 修复前：桌面浏览器窗口 < 1024px 就显示移动端提示
if (isMobileDevice) {
  setIsMobile(window.innerWidth < 1024);
} else {
  setIsMobile(window.innerWidth < 640);
}

// 修复后：只有同时满足移动设备 UA 和屏幕 < 768px 才提示
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const screenWidth = window.innerWidth;

if (isMobileDevice && screenWidth < 768) {
  setIsMobile(true);
} else {
  setIsMobile(false);
}
```

### 2. PC 管理后台独立于 Layout (Layout.tsx)
```typescript
// 修复前：PC 管理后台仍被 Layout 包裹
const showNav = location.pathname !== '/login' && !location.pathname.startsWith('/admin-pc');

// 修复后：PC 管理后台完全独立，不使用 Layout
const isStandalonePage = location.pathname === '/admin-pc' || location.pathname === '/debug';

if (isStandalonePage) {
  return <>{children}</>;
}
```

### 3. 添加详细日志
在 PCDashboard.tsx 中添加了完整的控制台日志：
- 设备检测信息（UA、屏幕宽度）
- 组件渲染状态（用户、权限、菜单）
- 权限加载流程

### 4. 修复类型错误
- 添加了 `Ad` 和 `RedemptionCode` 类型导入
- 修复了 `createReport` 函数调用方式
- 处理了表单字段的 null 值问题

## 验证步骤
1. 在 PC 浏览器中访问：https://app-a7metxb241s1.appmiaoda.com/admin-pc
2. 打开浏览器开发者工具（F12）查看控制台日志
3. 确认看到以下日志：
   - `[PCDashboard] 设备检测: { isMobileDevice: false, screenWidth: xxxx }`
   - `[PCDashboard] 检测到 PC 端，正常显示`
   - `[PCDashboard] 组件渲染: { user: xxx, profile: xxx, isMobile: false }`
4. 页面应正常显示侧边栏和管理后台内容

## 预期效果
- ✅ PC 端（桌面浏览器）：正常显示完整的管理后台界面
- ✅ 平板端（iPad 等）：根据屏幕宽度自动适配
- ✅ 移动端（手机）：显示"请在 PC 端访问"的提示页面
- ✅ 强制进入：移动端用户可以点击"强制进入后台"按钮访问

## 技术细节
- 移动端检测阈值：768px（Bootstrap 的 md 断点）
- 独立页面：/admin-pc 和 /debug 不使用 Layout 包裹
- 权限系统：管理员（role='admin'）拥有所有权限，默认显示控制台
