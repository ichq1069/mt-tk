# 每日图集三库流转系统说明

## 概述

根据用户需求，将每日图集系统调整为清晰的三库流转机制：
1. **每日图集库 (Daily Pool)** - 所有符合条件的图片总池
2. **待发布库 (Pending Publish)** - 按配置数量选取的预发布素材
3. **已发布库 (Published)** - 已发布图片的历史汇总

## 库的定义和作用

### 1. 每日图集库 (Pool)
- **数据库状态**: `daily_gallery_status = 'unused'`
- **作用**: 存放所有符合条件的图片（审核通过、未隐藏、类型为图片、未被排除）
- **来源**: 图片审核通过后自动进入
- **容量**: 无限制

### 2. 待发布库 (Pending)
- **数据库状态**: `daily_gallery_status = 'pending'`
- **作用**: 存放即将发布的预选素材
- **来源**: 
  - 自动：系统调用 `auto_refill_pending_daily_gallery_materials` RPC
  - 手动：管理员从每日图集库中选入
- **容量**: 受系统配置 `daily_count` 限制（默认 5 张）

### 3. 已发布库 (Published)
- **数据库状态**: `daily_gallery_status = 'used'`
- **作用**: 存放已经发布在帖子中的图片
- **来源**: 创建每日图集帖子时，图片从待发布库转入
- **容量**: 无限制（历史汇总）

## 流转规则

### 完整流转链路

```
[审核通过] → [每日图集库 (unused)]
                    ↓
            [选取/补充操作]
                    ↓
            [待发布库 (pending)]
                    ↓
            [创建发布帖子]
                    ↓
            [已发布库 (used)]
                    ↓
            [删除发布记录]
                    ↓
            [回到每日图集库 (unused)]
```

### 具体操作

#### 1. 入库（自动）
- **触发条件**: 图片审核通过且符合每日图集条件
- **状态变化**: 无 → `unused`
- **目标库**: 每日图集库

#### 2. 选取入待发布库
**方式 A：自动补充**
- **触发**: 点击"自动补充待发布库"按钮
- **RPC**: `auto_refill_pending_daily_gallery_materials`
- **逻辑**: 
  - 检查当前待发布库数量
  - 计算需要补充的数量 = `daily_count` - 当前数量
  - 从每日图集库随机选取从未发布过的图片
  - 更新状态为 `pending`
- **状态变化**: `unused` → `pending`

**方式 B：手动选入**
- **触发**: 管理员在每日图集库中勾选图片，点击"选入待发布库"
- **API**: `updateMediaDailyGalleryStatus(ids, 'pending')`
- **限制**: 检查待发布库容量，不能超过 `daily_count`
- **状态变化**: `unused` → `pending`

#### 3. 发布（创建帖子）
- **触发**: 创建每日图集帖子
- **API**: `createDailyGalleryPost`
- **RPC**: `mark_images_as_used`
- **逻辑**: 将帖子中的所有图片标记为已使用
- **状态变化**: `pending` → `used`
- **目标库**: 已发布库

#### 4. 删除发布记录（回流）
- **触发**: 删除每日图集帖子
- **API**: `deleteDailyGalleryPost`
- **逻辑**: 将帖子中的所有图片状态重置
- **状态变化**: `used` → `unused`
- **目标库**: 每日图集库（回流）

#### 5. 移回每日图集库（手动）
- **触发**: 管理员在待发布库中勾选图片，点击"移回每日图集库"
- **API**: `updateMediaDailyGalleryStatus(ids, 'unused')`
- **状态变化**: `pending` → `unused`

## 前端界面调整

### 管理后台 (DailyGallerySection.tsx)

#### Tab 标签页文案
- ✅ `待使用库 (新上传)` → **每日图集库 (Pool)**
- ✅ `待发布库 (预选)` → **待发布库 (Pending)**
- ✅ `已发布库 (历史记录)` → **已发布库 (Published)**

#### 批量操作按钮
- ✅ `加入待发布` → **选入待发布库**
- ✅ `移回待使用` → **移回每日图集库**
- ✅ `一键补充待发布` → **自动补充待发布库**

#### 提示文案
- ✅ 顶部说明：清晰展示三库流转规则
- ✅ 待发布库提示：说明补充来源和容量限制
- ✅ 空状态提示：根据不同库显示相应的引导

#### 新增功能
- ✅ 待发布库空状态下显示"立即自动补充"按钮
- ✅ 所有库的文案统一使用"库"的概念

## 数据库层面

### 表结构
- **表名**: `media_items`
- **关键字段**: `daily_gallery_status` (text)
- **可选值**: `'unused'` | `'pending'` | `'used'`

### 相关 RPC 函数

#### 1. auto_refill_pending_daily_gallery_materials
**作用**: 自动从每日图集库补充待发布库

**逻辑**:
```sql
1. 获取配置的 daily_count
2. 统计当前 pending 数量
3. 计算需要补充的数量
4. 从 unused 中随机选取从未发布过的图片
5. 更新状态为 pending
6. 返回补充结果
```

#### 2. mark_images_as_used
**作用**: 标记图片为已使用

**逻辑**:
```sql
UPDATE media_items
SET daily_gallery_status = 'used'
WHERE id = ANY(image_ids);
```

#### 3. get_daily_gallery_available_images_rpc
**作用**: 获取指定状态的图片列表

**参数**: 
- `p_status`: `'unused'` | `'pending'`
- `p_limit`, `p_offset`: 分页参数
- `p_search`: 搜索关键词

#### 4. get_used_daily_gallery_images
**作用**: 获取已发布库的图片列表

**特点**: 关联 `daily_gallery_posts` 表，显示发布日期

## API 接口

### 核心接口 (media_social_api.ts)

#### 1. getDailyGalleryAvailableImages
```typescript
async getDailyGalleryAvailableImages(
  limit = 50, 
  offset = 0, 
  search = '', 
  status = 'unused' | 'pending'
)
```
**作用**: 获取每日图集库或待发布库的图片

#### 2. updateMediaDailyGalleryStatus
```typescript
async updateMediaDailyGalleryStatus(
  ids: string[], 
  status: 'unused' | 'pending' | 'used'
)
```
**作用**: 批量更新图片状态

#### 3. autoRefillPendingMaterials
```typescript
async autoRefillPendingMaterials()
```
**作用**: 调用 RPC 自动补充待发布库

#### 4. getDailyGalleryUsedImages
```typescript
async getDailyGalleryUsedImages(
  limit = 50, 
  offset = 0, 
  search = ''
)
```
**作用**: 获取已发布库的图片

#### 5. createDailyGalleryPost
```typescript
async createDailyGalleryPost(post: {
  post_date: string;
  password: string;
  password_expires_at: string;
  image_ids: string[];
  is_published?: boolean;
})
```
**作用**: 创建发布帖子，自动将图片标记为 `used`

#### 6. deleteDailyGalleryPost
```typescript
async deleteDailyGalleryPost(id: string)
```
**作用**: 删除发布帖子，自动将图片状态重置为 `unused`

## 使用场景

### 场景 1：日常发布流程
1. 管理员审核通过图片 → 自动进入**每日图集库**
2. 系统或管理员点击"自动补充" → 图片进入**待发布库**
3. 管理员创建发布帖子 → 图片进入**已发布库**
4. 用户访问每日图集页面 → 查看已发布的图片

### 场景 2：手动管理流程
1. 管理员在**每日图集库**中浏览图片
2. 勾选心仪的图片，点击"选入待发布库"
3. 在**待发布库**中预览即将发布的素材
4. 如需调整，可勾选图片点击"移回每日图集库"
5. 确认无误后创建发布帖子

### 场景 3：删除和回流
1. 管理员发现某个发布帖子有问题
2. 删除该发布记录
3. 帖子中的图片自动回到**每日图集库**
4. 可以重新选入待发布库或用于其他日期

## 配置说明

### 系统配置 (system_configs 表)
- **配置键**: `daily_gallery_config`
- **关键字段**: `daily_count` - 每日发布数量（默认 5）
- **作用**: 
  - 限制待发布库的容量
  - 自动补充时的目标数量

### 修改配置
在管理后台的"每日图集 → 配置"页面可以修改 `daily_count`。

## 注意事项

### 1. 容量限制
- 待发布库的容量受 `daily_count` 限制
- 手动选入时会检查容量，超出会提示错误
- 自动补充时会计算需要补充的数量，不会超出限制

### 2. 图片筛选规则
自动补充时，只会选取符合以下条件的图片：
- `daily_gallery_status = 'unused'`
- `status = 'approved'`
- `is_hidden = false`
- `type = 'image'`
- `deleted_at IS NULL`
- `exclude_from_daily_gallery = false`
- **从未出现在任何发布记录中**

### 3. 状态一致性
- 图片状态由后端 RPC 统一管理，确保一致性
- 前端操作通过 API 调用，不直接修改数据库
- 删除帖子时自动回流，无需手动操作

### 4. 历史记录
- 已发布库保留所有历史发布的图片
- 可以通过搜索功能查找特定图片
- 显示图片的发布日期，方便追溯

## 技术细节

### 状态转换矩阵

| 当前状态 | 操作 | 目标状态 | 触发方式 |
|---------|------|---------|---------|
| - | 审核通过 | unused | 自动 |
| unused | 选入待发布 | pending | 手动/自动 |
| pending | 创建帖子 | used | 手动 |
| pending | 移回图集库 | unused | 手动 |
| used | 删除帖子 | unused | 手动 |

### 数据流向图

```
┌─────────────────┐
│   审核通过的图片   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  每日图集库 (Pool) │ ← 删除帖子回流
│   status: unused │
└────────┬────────┘
         │
         │ 选取/补充
         ↓
┌─────────────────┐
│ 待发布库 (Pending)│ ← 可手动移回
│  status: pending │
└────────┬────────┘
         │
         │ 创建帖子
         ↓
┌─────────────────┐
│已发布库(Published)│
│   status: used   │
└─────────────────┘
```

## 总结

通过这次调整，每日图集系统的三库流转机制更加清晰：

1. **每日图集库**：作为总池子，存放所有备选图片
2. **待发布库**：作为预发布区，存放即将发布的精选素材
3. **已发布库**：作为历史记录，汇总所有已发布的图片

流转规则简单明了：
- 图片从审核通过自动进入图集库
- 管理员或系统从图集库选取进入待发布库
- 创建帖子时图片进入已发布库
- 删除帖子时图片回到图集库

这种设计既保证了发布流程的灵活性，又确保了图片资源的可追溯性和可复用性。
