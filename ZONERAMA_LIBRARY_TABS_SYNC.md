# Zonerama 库分栏结构和同步功能说明

## 版本信息

- **版本**: v1.8.0
- **日期**: 2026-04-02
- **状态**: ✅ 已完成

## 功能概述

将 Zonerama 库改为分栏（Tabs）结构，并新增相册同步功能，提升用户体验和管理效率。

## 重构内容

### 1. 分栏结构设计

**改造前**：
- 单一页面结构
- 相册管理折叠在"获取图片"卡片下方
- 需要点击"显示/隐藏"按钮切换

**改造后**：
- 使用 Tabs 分栏结构
- Tab 1: Zonerama 库（图片管理）
- Tab 2: 相册管理（相册配置）
- 功能分离，界面更清晰

### 2. Tab 1: Zonerama 库

**功能**：
- 获取图片：输入相册 ID，获取图片
- 待处理图片：显示待转移的图片，支持选择、转移、删除
- 已转移图片：显示已转移到壁纸库或写真库的图片
- 翻页功能：每页显示 24 张图片

**特点**：
- 专注于图片的获取和管理
- 支持批量操作（全选、转移、删除）
- 支持翻页浏览

### 3. Tab 2: 相册管理

**功能**：
- 添加新相册：输入相册 ID、名称、描述
- 相册列表：显示所有已保存的相册
- 相册操作：同步、选择、启用/禁用、删除
- 相册统计：显示图片数量、最后同步时间

**特点**：
- 独立的相册配置管理
- 支持快速选择相册
- 支持一键同步相册内容

## 新增功能

### 1. 相册同步功能

**功能描述**：
- 点击"同步"按钮，自动获取相册的最新图片
- 同步后更新相册的 `last_fetched_at` 和 `photo_count`
- 同步成功后显示新增和跳过的图片数量
- 如果当前正在查看该相册，同步后自动刷新图片列表

**实现流程**：

```typescript
// 1. 调用 Edge Function 获取图片
const { data, error } = await supabase.functions.invoke('fetch-zonerama-photos', {
  body: { albumId: config.album_id },
});

// 2. 批量插入到 zonerama_library
const { data: insertData, error: insertError } = await (supabase as any).rpc(
  'batch_insert_zonerama_photos',
  {
    p_album_id: config.album_id,
    p_photos: data.photos,
  }
);

// 3. 更新相册配置
await (supabase.from('zonerama_album_configs') as any).update({
  last_fetched_at: new Date().toISOString(),
  photo_count: result.inserted_count,
  updated_at: new Date().toISOString(),
}).eq('id', config.id);

// 4. 刷新相册配置列表
loadAlbumConfigs();

// 5. 如果当前正在查看该相册，刷新图片列表
if (albumId === config.album_id) {
  loadPhotos();
}
```

**状态管理**：
```typescript
const [syncingAlbumId, setSyncingAlbumId] = useState<string | null>(null);

// 同步时设置状态
setSyncingAlbumId(config.id);

// 同步完成后清除状态
setSyncingAlbumId(null);
```

**按钮状态**：
```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => handleSyncAlbum(config)}
  disabled={!config.is_active || syncingAlbumId === config.id}
>
  {syncingAlbumId === config.id ? (
    <>
      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      同步中
    </>
  ) : (
    <>
      <RefreshCw className="mr-1 h-3 w-3" />
      同步
    </>
  )}
</Button>
```

### 2. 相册统计信息

**显示内容**：
- 相册数量：`已保存的相册 (X)`
- 图片数量：`X 张图片`
- 最后同步时间：`最后同步: MM-DD HH:mm`

**实现代码**：
```typescript
<div className="text-sm text-muted-foreground">
  ID: {config.album_id}
  {config.description && ` · ${config.description}`}
  {config.photo_count > 0 && ` · ${config.photo_count} 张图片`}
  {config.last_fetched_at && (
    <span>
      {' · 最后同步: '}
      {new Date(config.last_fetched_at).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  )}
</div>
```

## 技术实现

### 1. Tabs 组件

**引入组件**：
```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

**结构**：
```typescript
<Tabs defaultValue="library" className="space-y-6">
  <TabsList>
    <TabsTrigger value="library">Zonerama 库</TabsTrigger>
    <TabsTrigger value="albums">相册管理</TabsTrigger>
  </TabsList>

  <TabsContent value="library" className="space-y-6">
    {/* Zonerama 库内容 */}
  </TabsContent>

  <TabsContent value="albums" className="space-y-6">
    {/* 相册管理内容 */}
  </TabsContent>
</Tabs>
```

### 2. 同步功能实现

**函数签名**：
```typescript
const handleSyncAlbum = async (config: AlbumConfig) => {
  setSyncingAlbumId(config.id);
  try {
    // 同步逻辑
  } catch (error: any) {
    console.error('[Zonerama 库] 同步失败:', error);
    toast.error('同步失败: ' + error.message);
  } finally {
    setSyncingAlbumId(null);
  }
};
```

**错误处理**：
- 捕获所有异常
- 显示详细的错误信息
- 确保状态正确清除

**成功提示**：
```typescript
toast.success(
  `同步成功！新增 ${result.inserted_count} 张图片，跳过 ${result.skipped_count} 张重复图片`
);
```

### 3. TypeScript 类型处理

**问题**：
- Supabase RPC 类型定义不完整
- 导致 TypeScript 编译错误

**解决方案**：
```typescript
// 使用 any 类型断言
const { data: insertData, error: insertError } = await (supabase as any).rpc(
  'batch_insert_zonerama_photos',
  {
    p_album_id: config.album_id,
    p_photos: data.photos,
  }
);
```

## 用户体验优化

### 1. 界面优化

**分栏结构**：
- 功能分离，界面更清晰
- 不需要折叠/展开操作
- 快速切换不同功能

**视觉反馈**：
- 同步时显示加载动画
- 已禁用的相册显示为半透明
- 按钮状态清晰（禁用、加载中）

### 2. 交互优化

**同步功能**：
- 一键同步，无需手动输入相册 ID
- 同步时禁用按钮，防止重复点击
- 同步成功后自动刷新数据

**状态管理**：
- 同步状态独立管理
- 不影响其他相册的操作
- 状态清晰，易于理解

### 3. 信息展示

**相册列表**：
- 显示相册名称或 ID
- 显示描述信息
- 显示图片数量
- 显示最后同步时间
- 显示启用/禁用状态

**统计信息**：
- 相册总数
- 每个相册的图片数量
- 最后同步时间（格式化显示）

## 使用说明

### 1. 添加相册

**步骤**：
1. 切换到"相册管理" Tab
2. 在"添加新相册"区域输入：
   - 相册 ID（必填）
   - 相册名称（可选）
   - 描述（可选）
3. 点击"保存相册"按钮
4. 等待保存成功提示

### 2. 同步相册

**步骤**：
1. 在相册列表中找到目标相册
2. 点击"同步"按钮
3. 等待同步完成
4. 查看同步结果提示

**注意**：
- 已禁用的相册不能同步
- 同步时按钮显示"同步中"
- 同步成功后显示新增和跳过的图片数量

### 3. 选择相册

**步骤**：
1. 在相册列表中找到目标相册
2. 点击"选择"按钮
3. 切换到"Zonerama 库" Tab
4. 相册 ID 已自动填入输入框
5. 点击"获取图片"按钮

### 4. 管理相册

**启用/禁用**：
- 点击"启用"或"禁用"按钮
- 已禁用的相册不能同步和选择

**删除**：
- 点击删除按钮（垃圾桶图标）
- 确认删除操作
- 删除后自动刷新列表

## 测试验收

### 1. 分栏结构

**测试项**：
- ✅ Tabs 组件正常显示
- ✅ 可以切换不同 Tab
- ✅ Tab 内容正确显示
- ✅ 默认显示"Zonerama 库" Tab

### 2. 同步功能

**正常流程**：
- ✅ 点击同步按钮后开始同步
- ✅ 同步时显示"同步中"状态
- ✅ 同步成功后显示成功提示
- ✅ 同步成功后更新相册配置
- ✅ 同步成功后刷新图片列表（如果正在查看该相册）

**异常处理**：
- ✅ 相册 ID 不存在时显示错误提示
- ✅ 网络错误时显示错误提示
- ✅ 同步失败后状态正确清除

**边界测试**：
- ✅ 已禁用的相册不能同步
- ✅ 同步时不能重复点击
- ✅ 相册无新图片时显示提示

### 3. 相册统计

**测试项**：
- ✅ 相册数量正确显示
- ✅ 图片数量正确显示
- ✅ 最后同步时间正确显示
- ✅ 时间格式化正确（MM-DD HH:mm）

### 4. 用户体验

**界面测试**：
- ✅ 分栏结构清晰
- ✅ 功能分离合理
- ✅ 视觉反馈明确

**交互测试**：
- ✅ 同步按钮状态正确
- ✅ 加载动画显示正确
- ✅ 提示信息清晰

## 更新日志

### v1.8.0 (2026-04-02)

**重构**：
- ✅ 将 Zonerama 库改为 Tabs 分栏结构
- ✅ Tab 1: Zonerama 库（图片管理）
- ✅ Tab 2: 相册管理（相册配置）
- ✅ 移除折叠式相册管理

**新增**：
- ✅ 相册同步功能
- ✅ 同步时调用 fetch-zonerama-photos Edge Function
- ✅ 同步后自动更新 last_fetched_at 和 photo_count
- ✅ 同步时显示加载状态
- ✅ 同步成功后显示详细结果

**优化**：
- ✅ 相册列表显示最后同步时间
- ✅ 相册列表显示相册数量统计
- ✅ 已禁用的相册不能同步
- ✅ 同步按钮在同步时显示加载动画
- ✅ 使用 any 类型断言解决 Supabase RPC 类型问题

**用户体验**：
- ✅ 分栏结构更清晰，功能分离
- ✅ 相册管理独立，不占用主界面空间
- ✅ 同步功能方便快速更新相册内容
- ✅ 统计信息一目了然

## 相关文档

- Zonerama 库功能说明: `ZONERAMA_LIBRARY.md`
- Zonerama 库使用指南: `ZONERAMA_LIBRARY_GUIDE.md`
- Zonerama 库修复说明: `ZONERAMA_LIBRARY_FIX.md`
- Zonerama 库相册管理: `ZONERAMA_LIBRARY_ALBUM_MANAGER.md`

## 总结

**重构效果**：
- 界面更清晰：分栏结构，功能分离
- 操作更便捷：无需折叠/展开
- 管理更高效：独立的相册管理 Tab

**新增功能**：
- 一键同步：快速更新相册内容
- 状态管理：同步状态清晰
- 统计信息：图片数量、最后同步时间

**用户体验**：
- 界面友好：分栏清晰，视觉反馈明确
- 操作简单：一键同步，无需手动输入
- 信息完整：统计信息一目了然

---

**创建时间**: 2026-04-02  
**作者**: 研发工程师智能体  
**版本**: 1.0.0
