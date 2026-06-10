# 确认对话框使用指南

## 问题背景

在沙箱环境中，浏览器原生的 `confirm()` 对话框会被阻止，导致以下错误：

```
Ignored call to 'confirm()'. The document is sandboxed, and the 'allow-modals' keyword is not set.
```

## 解决方案

使用自定义的确认对话框组件 `confirmAsync`，基于 shadcn/ui 的 AlertDialog 实现。

## 使用方法

### 1. 基本用法

```typescript
import { confirmAsync } from '@/components/ui/confirm-dialog';

const handleDelete = async () => {
  const confirmed = await confirmAsync('确定要删除吗？');
  if (!confirmed) return;
  
  // 执行删除操作
  await api.deleteItem(id);
};
```

### 2. 自定义选项

```typescript
const confirmed = await confirmAsync('确定要删除吗？', {
  title: '删除确认',           // 自定义标题
  confirmText: '删除',          // 确认按钮文字
  cancelText: '取消',           // 取消按钮文字
  variant: 'destructive',       // 使用红色删除按钮
});
```

### 3. 完整示例

```typescript
import { confirmAsync } from '@/components/ui/confirm-dialog';

const handleBatchDelete = async () => {
  if (selectedIds.length === 0) {
    toast.error('请先选择要删除的项目');
    return;
  }
  
  const confirmed = await confirmAsync(
    `确定要永久删除选中的 ${selectedIds.length} 个项目吗？此操作不可撤销！`,
    {
      title: '批量删除确认',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    }
  );
  
  if (!confirmed) return;
  
  // 执行批量删除
  setLoading(true);
  try {
    for (const id of selectedIds) {
      await api.deleteItem(id);
    }
    toast.success('删除成功');
    refresh();
  } catch (error) {
    toast.error('删除失败');
  } finally {
    setLoading(false);
  }
};
```

## API 参数

### confirmAsync(description, options?)

**参数：**

- `description` (string): 对话框描述文字（必填）
- `options` (object, 可选):
  - `title` (string): 对话框标题，默认 `'确认操作'`
  - `confirmText` (string): 确认按钮文字，默认 `'确认'`
  - `cancelText` (string): 取消按钮文字，默认 `'取消'`
  - `variant` ('default' | 'destructive'): 按钮样式，默认 `'default'`
    - `'default'`: 蓝色按钮
    - `'destructive'`: 红色按钮（用于删除等危险操作）

**返回值：**

- `Promise<boolean>`: 用户点击确认返回 `true`，点击取消或关闭返回 `false`

## 注意事项

### 1. 函数必须是 async

由于 `confirmAsync` 返回 Promise，调用它的函数必须是 `async` 函数：

```typescript
// ✅ 正确
const handleDelete = async () => {
  const confirmed = await confirmAsync('确定要删除吗？');
  if (!confirmed) return;
  // ...
};

// ❌ 错误
const handleDelete = () => {
  const confirmed = await confirmAsync('确定要删除吗？'); // 语法错误
  if (!confirmed) return;
  // ...
};
```

### 2. 不要在循环中调用

避免在循环中多次调用 `confirmAsync`，这会导致多个对话框同时弹出：

```typescript
// ❌ 错误
for (const id of ids) {
  const confirmed = await confirmAsync('确定要删除吗？');
  if (confirmed) {
    await api.deleteItem(id);
  }
}

// ✅ 正确
const confirmed = await confirmAsync(`确定要删除 ${ids.length} 个项目吗？`);
if (confirmed) {
  for (const id of ids) {
    await api.deleteItem(id);
  }
}
```

### 3. 删除操作使用 destructive 变体

对于删除、清空等危险操作，建议使用 `destructive` 变体：

```typescript
const confirmed = await confirmAsync('确定要删除吗？', {
  variant: 'destructive',
  confirmText: '删除',
});
```

## 迁移指南

### 从原生 confirm() 迁移

**原代码：**

```typescript
const handleDelete = () => {
  if (!confirm('确定要删除吗？')) return;
  api.deleteItem(id);
};
```

**新代码：**

```typescript
import { confirmAsync } from '@/components/ui/confirm-dialog';

const handleDelete = async () => {
  const confirmed = await confirmAsync('确定要删除吗？', {
    variant: 'destructive',
  });
  if (!confirmed) return;
  await api.deleteItem(id);
};
```

**关键变化：**

1. 导入 `confirmAsync`
2. 函数改为 `async`
3. 使用 `await confirmAsync(...)` 替代 `confirm(...)`
4. 结果存储在变量中，然后判断 `if (!confirmed) return;`

## 技术实现

### 组件结构

```
ConfirmDialogProvider (全局挂载在 App.tsx)
  └─ AlertDialog (shadcn/ui)
      ├─ AlertDialogContent
      │   ├─ AlertDialogHeader
      │   │   ├─ AlertDialogTitle
      │   │   └─ AlertDialogDescription
      │   └─ AlertDialogFooter
      │       ├─ AlertDialogCancel
      │       └─ AlertDialogAction
```

### 工作原理

1. `confirmAsync` 函数被调用时，更新全局状态并打开对话框
2. 返回一个 Promise，等待用户操作
3. 用户点击确认或取消时，resolve Promise 并关闭对话框
4. 调用方通过 `await` 获取用户选择结果

### 全局状态管理

使用简单的全局状态 + 监听器模式：

```typescript
let confirmState = {
  open: false,
  title: '确认操作',
  description: '',
  confirmText: '确认',
  cancelText: '取消',
  variant: 'default',
};

const confirmListeners = new Set<() => void>();

function notifyListeners() {
  confirmListeners.forEach(listener => listener());
}
```

## 常见问题

### Q1: 对话框没有弹出？

**原因**: 可能是 `ConfirmDialogProvider` 没有挂载

**解决方案**: 检查 `App.tsx` 中是否包含 `<ConfirmDialogProvider />`

### Q2: 点击确认后没有反应？

**原因**: 可能是没有正确处理返回值

**解决方案**: 确保使用 `await` 并检查返回值：

```typescript
const confirmed = await confirmAsync('确定吗？');
if (!confirmed) return; // 必须检查返回值
```

### Q3: 对话框样式不正确？

**原因**: 可能是 shadcn/ui 的 AlertDialog 组件没有正确安装

**解决方案**: 确保项目中已安装 `@/components/ui/alert-dialog`

### Q4: 在非 async 函数中如何使用？

**解决方案**: 将函数改为 async，或者使用 `.then()` 语法：

```typescript
// 方案 1: 改为 async（推荐）
const handleDelete = async () => {
  const confirmed = await confirmAsync('确定吗？');
  if (!confirmed) return;
  // ...
};

// 方案 2: 使用 .then()
const handleDelete = () => {
  confirmAsync('确定吗？').then((confirmed) => {
    if (!confirmed) return;
    // ...
  });
};
```

## 相关文件

- **组件定义**: `src/components/ui/confirm-dialog.tsx`
- **全局挂载**: `src/App.tsx`
- **使用示例**: `src/pages/admin/components/*.tsx`

## 更新日志

### v1.0.0 (2026-04-02)
- ✅ 创建自定义确认对话框组件
- ✅ 提供 confirmAsync 函数
- ✅ 支持自定义标题、描述、按钮文字
- ✅ 支持 destructive 变体
- ✅ 全局挂载 ConfirmDialogProvider
- ✅ 批量替换 32 个文件中的 confirm() 调用

---

**文档版本**: v1.0.0  
**最后更新**: 2026-04-02  
**作者**: 研发工程师智能体
