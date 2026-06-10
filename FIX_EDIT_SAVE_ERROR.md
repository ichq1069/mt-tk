# 广告编辑保存错误修复 v1.0.14

## 问题描述
用户在点击"编辑"按钮修改现有广告后，点击"确定发布"时仍然出现 DOM 错误：
```
Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.
```

## 根本原因分析

1. **Dialog 内部的 Portal 组件冲突**
   - `Select` 组件的 `SelectContent` 会创建 Portal 渲染到 body
   - `ScrollArea` 组件可能也有特殊的 DOM 结构
   - 当状态快速变化（如 `editingAd` 从对象变为 `null`）时，这些 Portal 的挂载/卸载顺序导致冲突

2. **条件渲染导致 React 失去 DOM 节点控制**
   - 在 `DialogContent` 内部使用 `{editingAd && ...}` 条件渲染。
   - 当 `isDialogOpen` 为 true 但 `editingAd` 被设置为 `null` 时，React 会尝试从 DOM 中移除节点，但此时 Dialog 可能还在执行关闭动画或 Radix Portal 还在管理这些节点。

## 最终解决方案 (v1.0.14)

### 1. 使用稳定的表单状态 (formAd)
不再使用可能为 `null` 的 `editingAd` 直接驱动 UI。改为使用始终存在的 `formAd` 对象。
```typescript
const [formAd, setFormAd] = useState<Partial<Ad>>({
  type: 'splash',
  // ... 其他默认值
});
```

### 2. 移除动态 Key
移除了 Dialog 上的 `key={editingAd?.id || 'new'}`，因为频繁变更 Key 会导致组件强制卸载/重新挂载，在动画期间极易引发 DOM 协调错误。

### 3. 简化状态流
- `handleOpenDialog`: 直接设置 `formAd` 并打开对话框。
- `handleSave`: 直接使用 `formAd` 保存。
- 对话框关闭时，不再手动清空 `formAd`（除非下次打开），从而保证了关闭动画期间 DOM 结构的稳定性。

## 技术原理
React 的 `insertBefore` 错误通常是因为 React 认为某个节点应该在 A 下面，但实际上该节点已经被 Portal 或其他并发更新移走或移到了 B 下面。通过保持 Dialog 内部 DOM 结构的稳定性（始终渲染表单结构，不使用 null 条件判断），可以极大地降低此类错误的发生率。

---

**修复版本**: v1.0.14
**修复日期**: 2026-03-14
**状态**: ✅ 已在 AdsSection.tsx 中实施
