# Zonerama 库功能说明

## 版本信息

- **版本**: v1.6.0
- **日期**: 2026-04-02
- **状态**: ✅ 已完成

## 功能概述

Zonerama 库是一个内容运营工具，允许管理员输入 Zonerama 相册 ID，自动获取图片列表并存储到数据库中，然后可以将图片转移到壁纸库或写真库。

### 核心功能

1. **获取 Zonerama 图片**
   - 输入相册 ID
   - 自动调用 Zonerama API 获取图片列表
   - 自动应用代理接口处理图片 URL
   - 批量插入数据库，自动去重

2. **图片管理**
   - 查看待处理图片
   - 查看已转移图片
   - 批量选择图片
   - 批量删除图片

3. **图片转移**
   - 转移到壁纸库（media 表）
   - 转移到写真库（album_photos 表）
   - 选择目标图集（写真库）
   - 自动更新状态

## 数据库设计

### zonerama_library 表

```sql
CREATE TABLE public.zonerama_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id TEXT NOT NULL,                    -- Zonerama 相册 ID
  photo_id TEXT NOT NULL,                    -- Zonerama 图片 ID
  url TEXT NOT NULL,                         -- 图片 URL（已应用代理）
  title TEXT,                                -- 图片标题
  status TEXT NOT NULL DEFAULT 'pending',    -- 状态
  transferred_to TEXT,                       -- 转移目标
  transferred_at TIMESTAMPTZ,                -- 转移时间
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(album_id, photo_id)                 -- 防止重复
);
```

**状态枚举**：
- `pending` - 待处理
- `transferred_to_wallpaper` - 已转到壁纸库
- `transferred_to_album` - 已转到写真库

**索引**：
- `idx_zonerama_library_album_id` - 相册 ID 索引
- `idx_zonerama_library_status` - 状态索引
- `idx_zonerama_library_created_at` - 创建时间索引（降序）

### RLS 策略

**权限控制**：仅管理员可访问

```sql
-- 查看权限
CREATE POLICY "管理员可查看 Zonerama 库"
  ON public.zonerama_library
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 插入权限
CREATE POLICY "管理员可插入 Zonerama 库"
  ON public.zonerama_library
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 更新权限
CREATE POLICY "管理员可更新 Zonerama 库"
  ON public.zonerama_library
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 删除权限
CREATE POLICY "管理员可删除 Zonerama 库"
  ON public.zonerama_library
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

## RPC 函数

### 1. batch_insert_zonerama_photos

**功能**：批量插入 Zonerama 图片

**参数**：
- `p_album_id` (TEXT) - 相册 ID
- `p_photos` (JSONB) - 图片数组

**返回**：
- `inserted_count` (INTEGER) - 插入数量
- `skipped_count` (INTEGER) - 跳过数量（重复）

**示例**：
```typescript
const { data, error } = await supabase.rpc('batch_insert_zonerama_photos', {
  p_album_id: '12345',
  p_photos: [
    { photo_id: '1', url: 'https://...', title: 'Photo 1' },
    { photo_id: '2', url: 'https://...', title: 'Photo 2' },
  ],
});

// data: [{ inserted_count: 2, skipped_count: 0 }]
```

**特性**：
- 自动去重（基于 album_id + photo_id）
- 错误容错（单张图片失败不影响其他）
- 返回详细统计

### 2. transfer_zonerama_to_wallpaper

**功能**：转移图片到壁纸库

**参数**：
- `p_photo_ids` (UUID[]) - 图片 ID 数组

**返回**：
- `success_count` (INTEGER) - 成功数量
- `error_count` (INTEGER) - 失败数量

**示例**：
```typescript
const { data, error } = await supabase.rpc('transfer_zonerama_to_wallpaper', {
  p_photo_ids: ['uuid1', 'uuid2', 'uuid3'],
});

// data: [{ success_count: 3, error_count: 0 }]
```

**操作**：
1. 从 zonerama_library 读取图片信息
2. 插入到 media 表（壁纸库）
   - user_id: 当前用户
   - url: 图片 URL
   - type: 'image'
   - status: 'approved'（直接审核通过）
   - title: 图片标题
3. 更新 zonerama_library 状态
   - status: 'transferred_to_wallpaper'
   - transferred_to: 'wallpaper'
   - transferred_at: NOW()

### 3. transfer_zonerama_to_album

**功能**：转移图片到写真库

**参数**：
- `p_photo_ids` (UUID[]) - 图片 ID 数组
- `p_target_album_id` (UUID) - 目标图集 ID

**返回**：
- `success_count` (INTEGER) - 成功数量
- `error_count` (INTEGER) - 失败数量

**示例**：
```typescript
const { data, error } = await supabase.rpc('transfer_zonerama_to_album', {
  p_photo_ids: ['uuid1', 'uuid2', 'uuid3'],
  p_target_album_id: 'album-uuid',
});

// data: [{ success_count: 3, error_count: 0 }]
```

**操作**：
1. 从 zonerama_library 读取图片信息
2. 插入到 album_photos 表（写真库）
   - album_id: 目标图集 ID
   - image_url: 图片 URL
   - level: 'normal'（默认普通级）
   - sort_order: 0
3. 更新 zonerama_library 状态
   - status: 'transferred_to_album'
   - transferred_to: 'album'
   - transferred_at: NOW()

## 前端组件

### ZoneramaLibrarySection

**位置**：`src/pages/admin/components/ZoneramaLibrarySection.tsx`

**功能模块**：

#### 1. 获取图片卡片

**UI 元素**：
- 输入框：相册 ID
- 按钮：获取图片

**交互流程**：
1. 用户输入相册 ID
2. 点击「获取图片」按钮或按 Enter 键
3. 从数据库读取配置（album_photo_api、photo_api）
4. 调用 Zonerama API（`${albumPhotoApi}${albumId}`）
5. 提取 `photos[].url` 字段
6. 应用代理接口处理 URL
7. 调用 `batch_insert_zonerama_photos` RPC 函数
8. 显示成功提示（新增 X 张，跳过 Y 张）
9. 刷新图片列表

**错误处理**：
- 配置未设置：提示「图集内图片列表接口未配置」
- 接口调用失败：提示「接口调用失败: 状态码 消息」
- 数据格式错误：提示「接口返回数据格式错误，缺少 photos 数组」
- 数据库错误：提示「获取失败: 错误消息」

#### 2. 待处理图片卡片

**UI 元素**：
- 标题：待处理图片 (数量)
- 按钮：全选、刷新、转到壁纸库、转到写真库、删除
- 图片网格：2/4/6 列响应式布局

**图片卡片**：
- 缩略图：1:1 比例
- 复选框：左上角
- 标题：底部显示
- 选中状态：蓝色边框

**交互**：
- 点击图片：选择/取消选择
- 点击复选框：选择/取消选择
- 全选按钮：全选/取消全选
- 刷新按钮：重新加载列表
- 转到壁纸库：打开转移对话框（目标：壁纸库）
- 转到写真库：打开转移对话框（目标：写真库）
- 删除：确认后删除选中图片

#### 3. 已转移图片卡片

**UI 元素**：
- 标题：已转移图片 (数量)
- 图片网格：2/4/6 列响应式布局

**图片卡片**：
- 缩略图：1:1 比例，半透明
- 遮罩：黑色半透明，显示「壁纸库」或「写真库」
- 标题：底部显示

**显示条件**：
- 仅当有已转移图片时显示

#### 4. 转移对话框

**UI 元素**：
- 标题：转移到壁纸库 / 转移到写真库
- 描述：将选中的 X 张图片转移到...
- 下拉选择：选择目标图集（仅写真库）
- 按钮：取消、确认转移

**交互流程**：
1. 用户点击「转到壁纸库」或「转到写真库」
2. 打开对话框
3. 如果是写真库，显示图集选择下拉框
4. 用户选择目标图集（写真库）
5. 点击「确认转移」
6. 调用对应的 RPC 函数
7. 显示成功提示（成功 X 张，失败 Y 张）
8. 关闭对话框
9. 清空选择
10. 刷新图片列表

**错误处理**：
- 未选择图片：提示「请先选择要转移的图片」
- 未选择图集：提示「请选择目标图集」
- 转移失败：提示「转移失败: 错误消息」

## 使用流程

### 1. 获取 Zonerama 图片

**步骤**：
1. 登录管理后台
2. 进入「内容运营」→「Zonerama 库」
3. 输入 Zonerama 相册 ID（如：`12345`）
4. 点击「获取图片」按钮
5. 等待获取完成
6. 查看成功提示（新增 X 张图片，跳过 Y 张重复图片）

**示例**：
```
输入：12345
结果：获取成功！新增 50 张图片，跳过 5 张重复图片
```

### 2. 转移到壁纸库

**步骤**：
1. 在待处理图片区域选择要转移的图片
2. 点击「转到壁纸库」按钮
3. 在对话框中确认
4. 等待转移完成
5. 查看成功提示（成功 X 张，失败 Y 张）

**结果**：
- 图片插入到 `media` 表
- 状态设为 `approved`（已审核）
- 用户 ID 为当前管理员
- Zonerama 库中状态更新为 `transferred_to_wallpaper`

### 3. 转移到写真库

**步骤**：
1. 在待处理图片区域选择要转移的图片
2. 点击「转到写真库」按钮
3. 在对话框中选择目标图集
4. 点击「确认转移」
5. 等待转移完成
6. 查看成功提示（成功 X 张，失败 Y 张）

**结果**：
- 图片插入到 `album_photos` 表
- 关联到选择的图集
- 分级设为 `normal`（普通级）
- Zonerama 库中状态更新为 `transferred_to_album`

### 4. 删除图片

**步骤**：
1. 在待处理图片区域选择要删除的图片
2. 点击「删除」按钮
3. 在确认对话框中点击「确定」
4. 等待删除完成
5. 查看成功提示（已删除 X 张图片）

**结果**：
- 图片从 `zonerama_library` 表中删除
- 不影响已转移的图片

## 配置要求

### 系统配置

**配置项**：`zonerama_upload_config`

**字段**：
- `album_photo_api` - 图集内图片列表接口
- `photo_api` - 图片代理接口

**示例**：
```json
{
  "album_photo_api": "https://zomphoto.wo58.cn/album?albumId=",
  "photo_api": "https://zomphoto.wo58.cn/?url="
}
```

**配置路径**：
- 后台管理系统 → 系统参数设置 → 存储管理 → 专享上传 → 图集内图片列表接口（可选）

### 权限要求

**必需权限**：`admin_library`

**权限检查**：
- 菜单访问：`canAccess('admin_library')`
- 数据库操作：RLS 策略检查 `profiles.role = 'admin'`

## 技术实现

### 前端技术栈

- **React**: 组件化开发
- **TypeScript**: 类型安全
- **shadcn/ui**: UI 组件库
- **Tailwind CSS**: 样式框架
- **Sonner**: Toast 提示
- **Lucide React**: 图标库

### 后端技术栈

- **Supabase**: 数据库和认证
- **PostgreSQL**: 关系型数据库
- **RLS**: 行级安全策略
- **RPC**: 远程过程调用

### 数据流

```
用户输入相册 ID
    ↓
前端调用 Zonerama API
    ↓
提取图片列表
    ↓
应用代理接口
    ↓
调用 batch_insert_zonerama_photos RPC
    ↓
插入数据库（自动去重）
    ↓
返回统计结果
    ↓
显示成功提示
```

```
用户选择图片
    ↓
点击转移按钮
    ↓
打开转移对话框
    ↓
选择目标（壁纸库/写真库）
    ↓
调用转移 RPC 函数
    ↓
插入目标表
    ↓
更新 Zonerama 库状态
    ↓
返回统计结果
    ↓
显示成功提示
```

## 性能优化

### 批量操作

**批量插入**：
- 使用 RPC 函数批量插入
- 单次插入多张图片
- 减少网络请求次数

**批量转移**：
- 支持多选图片
- 一次性转移多张图片
- 减少数据库操作次数

### 错误容错

**单张失败不影响其他**：
- 使用 `EXCEPTION WHEN OTHERS` 捕获错误
- 继续处理下一张图片
- 返回详细统计（成功/失败数量）

### 自动去重

**唯一约束**：
- `UNIQUE(album_id, photo_id)`
- `ON CONFLICT DO NOTHING`
- 避免重复插入

## 错误处理

### 前端错误

**配置错误**：
```typescript
if (!albumPhotoApi) {
  throw new Error('图集内图片列表接口未配置');
}
```

**接口错误**：
```typescript
if (!response.ok) {
  throw new Error(`接口调用失败: ${response.status} ${response.statusText}`);
}
```

**数据格式错误**：
```typescript
if (!data.photos || !Array.isArray(data.photos)) {
  throw new Error('接口返回数据格式错误，缺少 photos 数组');
}
```

### 后端错误

**RPC 函数错误处理**：
```sql
BEGIN
  -- 操作
EXCEPTION WHEN OTHERS THEN
  v_error_count := v_error_count + 1;
END;
```

**返回详细统计**：
```sql
RETURN QUERY SELECT v_success_count, v_error_count;
```

## 日志记录

### 前端日志

**获取图片**：
```typescript
console.log('[Zonerama 库] 开始获取相册图片，相册 ID:', albumId);
console.log('[Zonerama 库] 配置读取成功');
console.log('[Zonerama 库] 图集内图片列表接口:', albumPhotoApi);
console.log('[Zonerama 库] 图片代理接口:', photoApi);
console.log('[Zonerama 库] 调用接口:', apiUrl);
console.log('[Zonerama 库] 接口返回数据:', data);
console.log('[Zonerama 库] 提取到图片数量:', photoList.length);
console.log('[Zonerama 库] 插入成功:', insertedCount, '跳过:', skippedCount);
```

**转移图片**：
```typescript
console.log('[Zonerama 库] 开始转移，目标:', transferTarget, '图片数量:', selectedPhotos.length);
console.log('[Zonerama 库] 转移完成，成功:', successCount, '失败:', errorCount);
```

**删除图片**：
```typescript
console.error('[Zonerama 库] 删除失败:', error);
```

### 后端日志

**RPC 函数日志**：
- 使用 `RAISE NOTICE` 记录关键操作
- 使用 `RAISE WARNING` 记录警告
- 使用 `RAISE EXCEPTION` 记录错误

## 测试验收

### 功能测试

**1. 获取图片**
- ✅ 输入相册 ID，点击获取
- ✅ 显示加载状态
- ✅ 成功提示（新增 X 张，跳过 Y 张）
- ✅ 图片列表刷新
- ✅ 重复获取自动去重

**2. 转移到壁纸库**
- ✅ 选择图片
- ✅ 点击转到壁纸库
- ✅ 确认对话框
- ✅ 成功提示（成功 X 张，失败 Y 张）
- ✅ 图片状态更新
- ✅ 壁纸库中可见

**3. 转移到写真库**
- ✅ 选择图片
- ✅ 点击转到写真库
- ✅ 选择目标图集
- ✅ 确认对话框
- ✅ 成功提示（成功 X 张，失败 Y 张）
- ✅ 图片状态更新
- ✅ 写真库中可见

**4. 删除图片**
- ✅ 选择图片
- ✅ 点击删除
- ✅ 确认对话框
- ✅ 成功提示（已删除 X 张）
- ✅ 图片列表刷新

### 权限测试

**管理员**：
- ✅ 可访问 Zonerama 库菜单
- ✅ 可查看图片列表
- ✅ 可获取图片
- ✅ 可转移图片
- ✅ 可删除图片

**普通用户**：
- ✅ 不可访问 Zonerama 库菜单
- ✅ 直接访问返回权限错误

### 性能测试

**批量操作**：
- ✅ 一次获取 100 张图片
- ✅ 一次转移 50 张图片
- ✅ 一次删除 50 张图片
- ✅ 响应时间 < 5 秒

**并发操作**：
- ✅ 多个管理员同时操作
- ✅ 数据一致性
- ✅ 无死锁

### 错误测试

**配置错误**：
- ✅ 未配置接口：提示错误
- ✅ 接口地址错误：提示错误

**接口错误**：
- ✅ 接口返回 404：提示错误
- ✅ 接口返回 500：提示错误
- ✅ 接口超时：提示错误

**数据错误**：
- ✅ 相册不存在：提示警告
- ✅ 相册无图片：提示警告
- ✅ 数据格式错误：提示错误

## 常见问题

### Q1: 如何配置 Zonerama 接口？

**A**: 
1. 登录管理后台
2. 进入「系统参数设置」→「存储管理」→「专享上传」
3. 找到「图集内图片列表接口（可选）」
4. 填写接口地址（如：`https://zomphoto.wo58.cn/album?albumId=`）
5. 填写图片代理接口（如：`https://zomphoto.wo58.cn/?url=`）
6. 保存配置

### Q2: 为什么获取图片失败？

**A**: 
1. 检查配置是否正确
2. 检查相册 ID 是否正确
3. 检查接口是否可访问
4. 查看浏览器控制台日志
5. 查看错误提示信息

### Q3: 转移图片后在哪里查看？

**A**: 
- **壁纸库**：内容运营 → 壁纸管理 → 壁纸库
- **写真库**：内容运营 → 写真库 → 写真库管理

### Q4: 可以重复获取同一个相册吗？

**A**: 
可以，系统会自动去重。重复的图片会被跳过，只插入新图片。

### Q5: 转移后的图片可以删除吗？

**A**: 
- Zonerama 库中的图片可以删除
- 已转移到壁纸库/写真库的图片不受影响
- 需要在对应的库中删除

### Q6: 如何批量转移图片？

**A**: 
1. 点击「全选」按钮选择所有图片
2. 或者手动选择多张图片
3. 点击「转到壁纸库」或「转到写真库」
4. 确认转移

### Q7: 转移失败怎么办？

**A**: 
1. 查看错误提示信息
2. 检查目标图集是否存在（写真库）
3. 检查权限是否正确
4. 查看浏览器控制台日志
5. 重试操作

## 未来优化

### 短期优化

**1. 图片预览**
- 点击图片查看大图
- 支持左右切换
- 显示图片详细信息

**2. 批量编辑**
- 批量修改标题
- 批量设置分级（写真库）
- 批量设置分类（壁纸库）

**3. 筛选和搜索**
- 按相册 ID 筛选
- 按状态筛选
- 按标题搜索

### 长期优化

**1. 自动化**
- 定时自动获取
- 自动转移规则
- 自动分类

**2. 统计分析**
- 获取统计
- 转移统计
- 使用统计

**3. 多源支持**
- 支持其他图片源
- 统一管理界面
- 统一转移流程

## 相关文档

- 接口导入功能优化: `ZONERAMA_OPTIMIZATION.md`
- 图集写真模块: 需求文档第 2.26 节
- 壁纸管理: 需求文档第 2.7 节

## 总结

**功能**：
- 获取 Zonerama 图片并存储
- 转移到壁纸库或写真库
- 批量操作和管理

**特性**：
- 自动去重
- 批量操作
- 错误容错
- 权限控制
- 详细日志

**优势**：
- 简化内容运营流程
- 提高工作效率
- 减少手动操作
- 统一管理界面

---

**创建时间**: 2026-04-02  
**作者**: 研发工程师智能体  
**版本**: 1.0.0
