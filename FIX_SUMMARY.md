# 广告系统修复总结 v1.0.12

## 问题描述
用户在管理后台保存广告时遇到 React DOM 错误：
```
Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.
```

## 根本原因
Dialog 组件内部使用了条件渲染 `{editingAd && <ScrollArea>...</ScrollArea>}`，导致：
1. 当 `editingAd` 状态快速变化时，React 无法正确协调 DOM 树
2. ScrollArea 组件的挂载/卸载与 Dialog 的动画冲突
3. 表单字段的动态显示（如频率和跳过设置）加剧了 DOM 结构不稳定

## 解决方案

### 1. 优化 Dialog 状态管理
```typescript
<Dialog open={isDialogOpen} onOpenChange={(open) => {
  setIsDialogOpen(open);
  if (!open) {
    // 延迟清空状态，避免 DOM 更新冲突
    setTimeout(() => setEditingAd(null), 200);
  }
}}>
```

**关键点：**
- 使用 `setTimeout` 延迟清空 `editingAd` 状态
- 确保 Dialog 关闭动画完成后再清理状态
- 避免在 Dialog 动画过程中触发 DOM 重构

### 2. 稳定 DOM 结构
```typescript
<ScrollArea className="max-h-[70vh] pr-4">
  <div className="space-y-4 py-4">
    {editingAd && (
      <>
        {/* 所有表单字段 */}
      </>
    )}
  </div>
</ScrollArea>
```

**关键点：**
- ScrollArea 始终存在，不受条件渲染影响
- 条件渲染移到内部，只控制表单内容
- 保持 Dialog 的 DOM 结构稳定

### 3. 新增功能

#### 广告展示频率控制
- **每次访问 (always)**: 每次刷新页面都显示
- **每会话一次 (session)**: 使用 sessionStorage，浏览器会话内只显示一次
- **每天一次 (daily)**: 使用 localStorage + 时间戳，24小时内只显示一次

#### 跳过/关闭按钮控制
- **允许跳过**: 显示"跳过"按钮或"X"关闭按钮
- **不允许跳过**: 只显示倒计时，用户必须等待

#### 时间控制
- **上线时间 (start_time)**: 广告在指定时间后才显示
- **下线时间 (end_time)**: 广告在指定时间后自动停止显示

## 技术细节

### 数据库字段
```sql
ALTER TABLE ads ADD COLUMN frequency TEXT DEFAULT 'session';
ALTER TABLE ads ADD COLUMN allow_skip BOOLEAN DEFAULT true;
```

### 前端逻辑
```typescript
// 频率控制
if (ad.frequency === 'always') {
  shouldShow = true;
} else if (ad.frequency === 'daily') {
  const lastShown = localStorage.getItem(`ad_shown_${ad.id}`);
  if (!lastShown || now - parseInt(lastShown) > 24 * 60 * 60 * 1000) {
    shouldShow = true;
  }
} else { // session
  if (!sessionStorage.getItem(`ad_shown_${ad.id}`)) {
    shouldShow = true;
  }
}

// 时间控制
const now = Date.now();
if (ad.start_time && new Date(ad.start_time).getTime() > now) return false;
if (ad.end_time && new Date(ad.end_time).getTime() < now) return false;
```

## 测试验证

### 1. 清除缓存
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### 2. 测试开屏广告
- 配置：频率=always, 允许跳过=false
- 预期：每次刷新都显示，只有倒计时，无跳过按钮

### 3. 测试弹窗广告
- 配置：频率=session, 允许跳过=true
- 预期：会话内只显示一次，有关闭按钮

### 4. 测试后台保存
- 操作：新增/编辑广告，填写所有字段，点击保存
- 预期：保存成功，无任何错误

## 版本信息
- **版本号**: v1.0.12
- **显示位置**: 管理后台左侧边栏顶部
- **格式**: "全站数据管理 · v1.0.12"

## 文件变更清单
1. `src/pages/admin/components/AdsSection.tsx` - 修复 DOM 渲染问题
2. `src/pages/Home.tsx` - 实现频率和时间控制
3. `src/pages/admin/PCDashboard.tsx` - 添加版本号
4. `supabase/migrations/` - 数据库字段更新

## 后续建议
1. 监控生产环境是否还有 DOM 错误
2. 收集用户对广告频率的反馈
3. 考虑添加广告点击统计功能
4. 优化广告图片加载性能
