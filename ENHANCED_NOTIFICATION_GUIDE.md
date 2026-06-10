# 增强通知系统功能说明

本次更新为实时通知系统添加了丰富的视觉效果、声音提示、桌面通知和用户自定义偏好设置。

## 新增功能

### 1. 声音提示系统 (`notification-sound.ts`)

使用 Web Audio API 生成不同类型的通知音效：

- **成功音效**：清脆的上升音（C5 → G5）
- **错误音效**：低沉的下降音（G4 → C4）
- **信息音效**：单音提示（E5）
- **警告音效**：双音提示（A4 × 2）

**特性**：
- 音量可调（0-1）
- 可独立开关
- 延迟初始化避免自动播放限制
- 轻量级，无需外部音频文件

### 2. 桌面通知管理器 (`desktop-notification.ts`)

封装浏览器 Notification API，提供统一的桌面通知接口：

**功能**：
- 权限请求和状态检查
- 自定义通知内容、图标、徽章
- 点击通知跳转到相关页面
- 自动关闭或需要交互
- 预设快捷方法（审核通过/拒绝/系统通知/新内容）

**示例**：
```typescript
// 请求权限
await desktopNotification.requestPermission();

// 显示审核通过通知
await desktopNotification.showApprovalNotification('标题', '内容标题');

// 显示自定义通知
await desktopNotification.show({
  title: '通知标题',
  body: '通知内容',
  icon: '/logo.png',
  onClick: () => {
    window.location.href = '/target-page';
  }
});
```

### 3. 通知偏好设置 (`notification-preferences.ts`)

完整的用户偏好设置系统：

**设置项**：
- **全局开关**：一键关闭所有通知
- **应用内通知**：
  - 启用/禁用
  - 声音开关
  - 动画效果
- **桌面通知**：
  - 启用/禁用
  - 分类控制（审核通过/拒绝/系统/新内容）
- **声音设置**：
  - 启用/禁用
  - 音量调节（0-100%）
  - 分类控制（审核/系统）
- **免打扰模式**：
  - 启用/禁用
  - 时间段设置（如 22:00-08:00）
  - 自动跨天处理
- **频率限制**：
  - 启用/禁用
  - 每分钟最多通知数（1-20）

**特性**：
- 自动检测免打扰时间段
- 频率限制防止通知轰炸
- 保存到用户 profile
- 实时生效

### 4. 增强通知系统 (`enhanced-notification.ts`)

集成所有通知功能的统一接口：

**功能**：
- 自动应用用户偏好设置
- 同时触发应用内通知、声音和桌面通知
- 免打扰模式和频率限制检查
- 预设快捷方法

**示例**：
```typescript
// 设置用户偏好
enhancedNotification.setPreferences(preferences);

// 显示审核通过通知（自动应用所有设置）
await enhancedNotification.showApproval('内容标题', '描述');

// 显示自定义通知
await enhancedNotification.show({
  title: '通知标题',
  description: '通知描述',
  type: 'success',
  duration: 5000,
  action: {
    label: '查看',
    onClick: () => { /* ... */ }
  }
});
```

### 5. 通知偏好设置对话框 (`NotificationPreferencesDialog.tsx`)

完整的可视化设置界面：

**界面**：
- 4 个标签页（通用/声音/桌面/高级）
- 实时预览和测试功能
- 音量滑块和声音试听
- 桌面权限请求
- 免打扰时间选择器
- 频率限制滑块

**特性**：
- 保存到用户 profile
- 实时应用设置
- 重置为默认值
- 测试通知功能

### 6. 通知偏好 Context (`NotificationPreferencesContext.tsx`)

全局状态管理：

**功能**：
- 从用户 profile 加载偏好
- 自动应用到增强通知系统
- 提供 hook 访问偏好设置

**使用**：
```typescript
const { preferences, setPreferences, loading } = useNotificationPreferences();
```

## 集成到现有系统

### 1. Realtime Hooks 更新

所有 Realtime hooks 已更新为使用增强通知系统：

- `useRealtimeMediaUpdates`：审核通过/拒绝使用增强通知
- `useRealtimeNotifications`：系统通知使用增强通知
- `useRealtimeExplore`：新内容提醒（可选）

### 2. 页面集成

#### Profile 页面
- 通知图标长按打开偏好设置
- 集成 NotificationPreferencesDialog

#### RealtimeDemo 页面
- 添加通知设置按钮
- 测试各种通知效果
- 桌面权限请求

### 3. App.tsx 集成

添加 NotificationPreferencesProvider 到应用根组件：

```typescript
<AuthProvider>
  <NotificationPreferencesProvider>
    {/* 其他组件 */}
  </NotificationPreferencesProvider>
</AuthProvider>
```

## 用户体验优化

### 1. 视觉效果

- **动画**：滑入、淡入、抖动等动画效果
- **颜色主题**：不同类型通知使用不同颜色
- **图标**：丰富的图标系统
- **进度条**：通知倒计时

### 2. 声音反馈

- **即时反馈**：操作立即播放声音
- **音量控制**：用户可调节音量
- **静音模式**：一键静音
- **分类控制**：不同类型独立控制

### 3. 桌面通知

- **系统级通知**：即使应用在后台也能收到
- **点击跳转**：点击通知直接跳转到相关页面
- **自定义图标**：使用应用 logo
- **自动关闭**：5 秒后自动关闭（可配置）

### 4. 智能控制

- **免打扰模式**：夜间自动静音
- **频率限制**：防止通知过多
- **用户偏好**：完全自定义
- **实时生效**：设置立即应用

## 技术特性

### 1. 性能优化

- **延迟初始化**：AudioContext 延迟创建
- **频率限制**：防止通知轰炸
- **内存管理**：自动清理过期记录

### 2. 兼容性

- **浏览器检测**：自动检测 Notification API 支持
- **降级处理**：不支持时优雅降级
- **跨浏览器**：支持主流浏览器

### 3. 类型安全

- **TypeScript**：完整的类型定义
- **接口规范**：清晰的接口设计
- **类型推导**：自动类型推导

### 4. 可扩展性

- **模块化设计**：各功能独立模块
- **插件式架构**：易于添加新功能
- **配置驱动**：通过配置控制行为

## 使用指南

### 1. 基础使用

```typescript
import { enhancedNotification } from '@/lib/enhanced-notification';

// 显示审核通过通知
await enhancedNotification.showApproval('内容标题');

// 显示审核拒绝通知
await enhancedNotification.showRejection('拒绝原因');

// 显示系统通知
await enhancedNotification.showSystem('标题', '内容');
```

### 2. 自定义通知

```typescript
await enhancedNotification.show({
  title: '自定义通知',
  description: '这是一条自定义通知',
  type: 'info',
  duration: 3000,
  action: {
    label: '查看详情',
    onClick: () => {
      // 处理点击
    }
  }
});
```

### 3. 设置偏好

```typescript
import { useNotificationPreferences } from '@/contexts/NotificationPreferencesContext';

const { preferences, setPreferences } = useNotificationPreferences();

// 修改偏好
setPreferences({
  ...preferences,
  sound: {
    ...preferences.sound,
    volume: 0.8
  }
});
```

### 4. 请求桌面权限

```typescript
import { desktopNotification } from '@/lib/desktop-notification';

// 请求权限
const permission = await desktopNotification.requestPermission();

if (permission === 'granted') {
  // 显示桌面通知
  await desktopNotification.show({
    title: '通知标题',
    body: '通知内容'
  });
}
```

## 测试和调试

### 1. 测试页面

访问 `/realtime-demo` 查看完整的演示和测试功能：

- 测试各种通知类型
- 测试声音效果
- 测试桌面通知
- 测试偏好设置

### 2. 控制台日志

所有通知操作都有详细的控制台日志：

```
[Realtime] 订阅频道: media-updates-user-xxx
[Realtime] 收到变化: {...}
[EnhancedNotification] 显示通知: {...}
[NotificationSound] 播放声音: success
[DesktopNotification] 显示桌面通知: {...}
```

### 3. 调试工具

- **浏览器开发者工具**：查看 Notification API 状态
- **音频调试**：检查 AudioContext 状态
- **网络面板**：查看 Realtime 连接状态

## 最佳实践

1. **用户体验优先**：
   - 不要过度使用通知
   - 尊重用户的偏好设置
   - 提供清晰的关闭选项

2. **性能考虑**：
   - 使用频率限制
   - 避免同时显示多个通知
   - 及时清理过期通知

3. **可访问性**：
   - 提供声音和视觉两种反馈
   - 支持键盘操作
   - 清晰的文字描述

4. **隐私保护**：
   - 不在通知中显示敏感信息
   - 尊重免打扰模式
   - 提供完全关闭选项

## 未来扩展

可能的扩展方向：

1. **更多声音效果**：
   - 自定义音效上传
   - 更多预设音效
   - 音效主题

2. **更多通知类型**：
   - 进度通知
   - 交互式通知
   - 富媒体通知

3. **更多控制选项**：
   - 通知历史记录
   - 通知分组
   - 通知优先级

4. **AI 智能**：
   - 智能免打扰
   - 通知聚合
   - 个性化推荐

## 文件清单

新增文件：
- `/src/lib/notification-sound.ts` - 声音管理器
- `/src/lib/desktop-notification.ts` - 桌面通知管理器
- `/src/lib/notification-preferences.ts` - 偏好设置类型和工具
- `/src/lib/enhanced-notification.ts` - 增强通知系统
- `/src/components/NotificationPreferencesDialog.tsx` - 偏好设置对话框
- `/src/contexts/NotificationPreferencesContext.tsx` - 偏好设置 Context

修改文件：
- `/src/hooks/useRealtimeMediaUpdates.ts` - 使用增强通知
- `/src/hooks/useRealtimeNotifications.ts` - 使用增强通知
- `/src/pages/Profile.tsx` - 添加偏好设置入口
- `/src/pages/RealtimeDemo.tsx` - 添加测试功能
- `/src/App.tsx` - 添加 NotificationPreferencesProvider

## 总结

本次更新大幅提升了通知系统的用户体验，提供了：

✅ 丰富的视觉效果和动画
✅ 多种声音提示
✅ 系统级桌面通知
✅ 完整的用户偏好设置
✅ 智能免打扰和频率限制
✅ 模块化和可扩展的架构
✅ 完整的类型安全
✅ 详细的文档和示例

用户现在可以完全自定义通知体验，从声音、视觉到桌面通知，一切尽在掌控！
