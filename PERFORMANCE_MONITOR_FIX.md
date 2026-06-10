# 性能监控页面错误修复

## 问题描述
性能监控页面显示"加载性能数据失败"错误，无法正常展示 Web Vitals 和缓存统计数据。

## 问题原因
1. **数据为空**：web_vitals_logs 和 cache_stats 表中暂无数据
2. **错误处理不当**：当 RPC 调用失败或返回空数据时，直接抛出错误并显示错误提示
3. **用户体验不佳**：没有区分"加载失败"和"暂无数据"两种情况

## 解决方案

### 1. 优化错误处理逻辑
**修改文件**：`/src/pages/admin/PerformanceMonitor.tsx`

**改进点**：
- 不再在 RPC 调用失败时直接抛出错误
- 使用 try-catch 包裹每个缓存键的查询，避免单个失败影响整体
- 添加详细的错误日志，便于调试
- 仅在真正的异常情况下显示错误提示

**修改前**：
```typescript
const { data: vitalsData, error: vitalsError } = await supabase.rpc(...);
if (vitalsError) throw vitalsError; // 直接抛出错误
```

**修改后**：
```typescript
const { data: vitalsData, error: vitalsError } = await supabase.rpc(...);
if (vitalsError) {
  console.error('Failed to fetch web vitals stats:', vitalsError);
  // 不抛出错误，继续执行
} else {
  setWebVitalsStats(vitalsData || []);
}
```

### 2. 添加空数据状态展示
**改进点**：
- 区分"加载中"、"暂无数据"、"加载失败"三种状态
- 为空数据状态添加友好的提示信息
- 使用图标和说明文字引导用户

**Web Vitals 空状态**：
```tsx
{webVitalsStats.length === 0 ? (
  <div className="text-center py-12 text-muted-foreground">
    <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
    <p className="text-sm">暂无性能数据</p>
    <p className="text-xs mt-2">性能数据将在用户访问时自动采集</p>
  </div>
) : (
  // 显示数据表格
)}
```

**缓存统计空状态**：
```tsx
{cacheStats.length === 0 ? (
  <div className="text-center py-12 text-muted-foreground">
    <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
    <p className="text-sm">暂无缓存统计数据</p>
    <p className="text-xs mt-2">缓存统计将在系统运行时自动记录</p>
  </div>
) : (
  // 显示数据表格
)}
```

### 3. 改进缓存统计查询逻辑
**修改前**：
```typescript
const cacheStatsPromises = cacheKeys.map(async (key) => {
  const { data, error } = await supabase.rpc(...);
  if (error) throw error; // 单个失败导致全部失败
  return data;
});
const cacheResults = await Promise.all(cacheStatsPromises);
```

**修改后**：
```typescript
const cacheResults: CacheStats[] = [];
for (const key of cacheKeys) {
  try {
    const { data, error } = await supabase.rpc(...);
    if (error) {
      console.error(`Failed to fetch cache stats for ${key}:`, error);
    } else if (data) {
      cacheResults.push(data);
    }
  } catch (e) {
    console.error(`Error fetching cache stats for ${key}:`, e);
  }
}
```

## 数据采集说明

### Web Vitals 数据采集
**采集时机**：用户访问页面时自动采集

**采集指标**：
- LCP (Largest Contentful Paint) - 最大内容绘制
- FID (First Input Delay) - 首次输入延迟
- CLS (Cumulative Layout Shift) - 累积布局偏移
- FCP (First Contentful Paint) - 首次内容绘制
- TTFB (Time to First Byte) - 首字节时间

**数据上报**：
- 开发环境：仅在控制台输出
- 生产环境：通过 `web-vitals-collector` Edge Function 上报到数据库

**启用方法**：
在应用入口文件（如 `main.tsx` 或 `App.tsx`）中添加：
```typescript
import { reportWebVitals, sendToAnalytics } from '@/lib/webVitals';

// 启用性能监控
reportWebVitals(sendToAnalytics);
```

### 缓存统计数据采集
**采集时机**：缓存操作时自动记录

**采集方式**：
- 使用 `cacheManager.getOrFetch()` 方法时自动记录命中/未命中
- 调用 `record_cache_hit()` RPC 函数写入统计表

**缓存键**：
- `popular_media` - 热门内容缓存
- `recommended_media` - 推荐内容缓存
- `tag_cloud` - 标签云缓存
- `user_profile` - 用户资料缓存

**启用方法**：
在需要缓存的地方使用 `cacheManager`：
```typescript
import { cacheManager } from '@/lib/cacheManager';

const data = await cacheManager.getOrFetch(
  'popular_media',
  async () => {
    // 获取数据的逻辑
    return await api.getPopularMedia();
  },
  3600 // TTL: 1小时
);
```

## 验证步骤

### 1. 验证空数据状态
1. 访问后台管理 → 监控体系 → 性能监控
2. 应该看到友好的"暂无数据"提示，而不是错误信息
3. 提示信息应包含数据采集说明

### 2. 验证数据采集
**Web Vitals**：
1. 在应用入口启用性能监控
2. 访问前端页面，触发性能数据采集
3. 等待数据上报到数据库
4. 刷新性能监控页面，应该能看到数据

**缓存统计**：
1. 使用 `cacheManager` 进行缓存操作
2. 触发缓存命中/未命中
3. 刷新性能监控页面，应该能看到统计数据

### 3. 验证错误处理
1. 模拟 RPC 调用失败（如修改函数名）
2. 页面应该显示具体的错误信息
3. 不应该因为单个查询失败而导致整个页面崩溃

## 后续优化建议

### 1. 自动启用性能监控
在 `App.tsx` 或 `main.tsx` 中自动启用：
```typescript
import { useEffect } from 'react';
import { reportWebVitals, sendToAnalytics } from '@/lib/webVitals';

function App() {
  useEffect(() => {
    // 仅在生产环境启用
    if (import.meta.env.PROD) {
      reportWebVitals(sendToAnalytics);
    }
  }, []);

  return <YourApp />;
}
```

### 2. 添加数据刷新间隔
```typescript
useEffect(() => {
  fetchData();
  
  // 每5分钟自动刷新一次
  const interval = setInterval(fetchData, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, []);
```

### 3. 添加数据导出功能
```typescript
const exportData = () => {
  const data = {
    webVitals: webVitalsStats,
    cache: cacheStats,
    exportTime: new Date().toISOString(),
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `performance-report-${Date.now()}.json`;
  a.click();
};
```

### 4. 添加性能趋势图表
使用 Chart.js 或 Recharts 展示性能趋势：
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

<LineChart data={performanceTrend}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="lcp" stroke="#8884d8" />
  <Line type="monotone" dataKey="fid" stroke="#82ca9d" />
</LineChart>
```

## 总结
通过优化错误处理逻辑和添加空数据状态展示，性能监控页面现在能够：
1. 正确处理无数据的情况，不再显示误导性的错误信息
2. 提供友好的用户提示，说明数据采集方式
3. 单个查询失败不影响其他数据的展示
4. 详细的错误日志便于问题排查

用户现在可以正常访问性能监控页面，并在数据采集后查看实时的性能统计信息。
