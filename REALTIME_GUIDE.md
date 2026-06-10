# Supabase Realtime 实时通知系统

本项目已集成 Supabase Realtime 功能，实现了实时的内容审核通知和探索页面更新。

## 功能概述

### 1. 实时审核通知
当管理员审核用户上传的内容时，用户会立即收到实时通知：
- ✅ **审核通过**：显示成功通知，内容自动发布到探索页
- ❌ **审核拒绝**：显示拒绝原因，提示用户修改后重新上传

### 2. 探索页面实时更新
当有新内容通过审核时：
- 刷新按钮显示新内容数量徽章
- 用户点击刷新可查看最新内容
- 避免打断用户当前浏览体验

### 3. 个人中心实时同步
用户在个人中心可以实时看到：
- 内容状态变化（pending → approved/rejected）
- 审核结果和拒绝原因
- 内容的其他更新

## 技术实现

### 核心 Hooks

#### 1. `useRealtimeMediaUpdates`
监听 `media_items` 表的实时变化，用于内容审核通知。

```typescript
import { useRealtimeMediaUpdates } from '@/hooks/useRealtimeMediaUpdates';

// 在组件中使用
useRealtimeMediaUpdates({
  userId: user?.id,           // 可选：只监听特定用户的内容
  enabled: true,              // 是否启用监听
  onApproved: (item) => {     // 审核通过回调
    console.log('内容已通过审核:', item);
  },
  onRejected: (item) => {     // 审核拒绝回调
    console.log('内容被拒绝:', item);
  },
  onUpdate: (item) => {       // 通用更新回调
    console.log('内容已更新:', item);
  }
});
```

**特性**：
- 自动显示 toast 通知
- 支持过滤特定用户的内容
- 监听 INSERT、UPDATE 事件
- 自动清理订阅

#### 2. `useRealtimeNotifications`
监听 `notifications` 表的实时变化，用于系统通知。

```typescript
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

useRealtimeNotifications({
  userId: user?.id,                    // 必需：用户 ID
  enabled: true,                       // 是否启用监听
  onNewNotification: (notification) => {
    console.log('收到新通知:', notification);
    // 更新通知列表
    setNotifications(prev => [notification, ...prev]);
  }
});
```

**特性**：
- 自动显示 toast 通知
- 支持不同类型的通知图标
- 只监听 INSERT 事件
- 自动清理订阅

#### 3. `useRealtimeExplore`
监听探索页面的实时更新，显示新内容提示。

```typescript
import { useRealtimeExplore } from '@/hooks/useRealtimeExplore';

const { newItemsCount, resetNewItemsCount } = useRealtimeExplore({
  enabled: true,
  onNewApprovedItem: (item) => {
    console.log('新内容通过审核:', item);
  }
});

// 显示新内容数量
{newItemsCount > 0 && (
  <Badge>{newItemsCount}</Badge>
)}

// 刷新时重置计数
<Button onClick={() => {
  handleRefresh();
  resetNewItemsCount();
}}>
  刷新
</Button>
```

**特性**：
- 只监听状态从 pending 变为 approved 的内容
- 提供新内容计数
- 不自动刷新列表，避免打断用户
- 提供重置计数方法

## 已集成页面

### 1. Home.tsx（探索页）
- ✅ 监听新审核通过的内容
- ✅ 刷新按钮显示新内容数量徽章
- ✅ 点击刷新重置计数

### 2. Profile.tsx（个人中心）
- ✅ 监听用户自己内容的审核状态
- ✅ 实时更新本地列表状态
- ✅ 自动显示审核结果通知

### 3. Upload.tsx（上传页面）
- ✅ 监听用户上传内容的审核状态
- ✅ 自动显示审核结果通知

### 4. Notifications.tsx（通知页面）
- ✅ 监听新通知
- ✅ 自动添加到通知列表
- ✅ 显示 toast 提示

## 数据库配置

### Realtime 复制已启用
```sql
-- media_items 表已启用 Realtime
alter publication supabase_realtime add table media_items;

-- notifications 表已启用 Realtime
alter publication supabase_realtime add table notifications;
```

### 监听的事件类型

#### media_items 表
- **INSERT**：新内容创建
- **UPDATE**：内容状态变化（pending → approved/rejected）
- **过滤器**：可选择只监听特定用户的内容

#### notifications 表
- **INSERT**：新通知创建
- **过滤器**：只监听特定用户的通知

## 性能优化

### 1. 自动清理订阅
所有 hooks 都会在组件卸载时自动清理 Realtime 订阅，避免内存泄漏。

```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel')...;
  
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### 2. 条件启用
通过 `enabled` 参数控制是否启用监听，避免不必要的订阅。

```typescript
useRealtimeMediaUpdates({
  enabled: !!user && isPageActive
});
```

### 3. 过滤器优化
使用 Supabase 的服务端过滤器，减少客户端接收的数据量。

```typescript
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'media_items',
  filter: `user_id=eq.${userId}`  // 服务端过滤
}, callback)
```

## 调试

### 启用日志
所有 Realtime hooks 都包含详细的控制台日志：

```typescript
console.log('[Realtime] 订阅频道:', channelName);
console.log('[Realtime] 收到变化:', payload);
console.log('[Realtime] 订阅状态:', status);
```

### 检查订阅状态
```typescript
const { isSubscribed } = useRealtimeMediaUpdates({...});

console.log('是否已订阅:', isSubscribed);
```

### 常见问题

1. **没有收到通知**
   - 检查表是否启用了 Realtime 复制
   - 检查 RLS 策略是否允许读取
   - 检查过滤器是否正确

2. **重复订阅**
   - 确保 useEffect 依赖项正确
   - 检查是否正确清理订阅

3. **性能问题**
   - 使用服务端过滤器
   - 避免在高频更新的表上使用
   - 考虑使用防抖/节流

## 扩展使用

### 自定义 Realtime Hook

```typescript
import { useEffect, useRef } from 'react';
import { supabase } from '@/db/supabase';

export function useRealtimeCustom(options) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!options.enabled) return;

    const channel = supabase
      .channel('custom-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'your_table',
        filter: 'your_filter'
      }, (payload) => {
        // 处理变化
        console.log('收到变化:', payload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [options.enabled]);

  return { isSubscribed: channelRef.current !== null };
}
```

## 最佳实践

1. **只在需要时启用**：使用 `enabled` 参数控制订阅
2. **使用服务端过滤**：减少客户端数据处理
3. **正确清理订阅**：避免内存泄漏
4. **合理使用回调**：避免在回调中执行耗时操作
5. **错误处理**：监听订阅状态，处理错误情况
6. **用户体验**：避免频繁的 toast 通知打断用户

## 参考资料

- [Supabase Realtime 文档](https://supabase.com/docs/guides/realtime)
- [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Realtime Quotas](https://supabase.com/docs/guides/realtime/quotas)
