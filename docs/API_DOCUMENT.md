# 图片视频赏析平台 - 完整API接口文档

> 本文档汇总了平台所有前后端接口，包含 Supabase 数据库直接调用和 Edge Function 远程调用两种方式。前端页面开发可直接参考对应章节的示例代码。

---

## 目录

- [1. 认证与登录](#1-认证与登录)
- [2. 用户管理](#2-用户管理)
- [3. 媒体内容（上传/探索/审核）](#3-媒体内容)
- [4. 个人中心](#4-个人中心)
- [5. 写真集（Albums）](#5-写真集)
- [6. 每日图集](#6-每日图集)
- [7. 签到与积分](#7-签到与积分)
- [8. 通知消息](#8-通知消息)
- [9. 社交互动](#9-社交互动)
- [10. 标签与分类](#10-标签与分类)
- [11. 管理后台](#11-管理后台)
- [12. 系统配置](#12-系统配置)
- [13. App管理](#13-app管理)
- [14. 微信公众号](#14-微信公众号)
- [15. 数据分析](#15-数据分析)
- [附录：错误码对照表](#附录错误码对照表)

---

## 基础调用方式

### Supabase 客户端直接调用

```typescript
import { supabase } from '@/db/supabase';

// SELECT
const { data, error } = await supabase
  .from('表名')
  .select('*')
  .eq('字段', '值')
  .order('created_at', { ascending: false })
  .range(0, 19); // 分页

// INSERT
const { data, error } = await supabase
  .from('表名')
  .insert([{ 字段: '值' }])
  .select()
  .single();

// UPDATE
const { data, error } = await supabase
  .from('表名')
  .update({ 字段: '新值' })
  .eq('id', 'xxx')
  .select()
  .single();

// DELETE
const { error } = await supabase
  .from('表名')
  .delete()
  .eq('id', 'xxx');
```

### Edge Function 调用

```typescript
const { data, error } = await supabase.functions.invoke('函数名', {
  body: { /* 请求体 */ }
});
```

### RPC 存储过程调用

```typescript
const { data, error } = await supabase.rpc('函数名', {
  p_param1: 'value1',
  p_param2: 'value2'
});
```

---

## 1. 认证与登录

### 1.1 邮箱/用户名登录

```typescript
import { api } from '@/db/api';

// 方式一：Supabase Auth 邮箱登录
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// 方式二：用户名密码登录（自定义）
const { data, error } = await api.directLogin('用户名', '密码');
```

**返回值：**
| 字段 | 类型 | 说明 |
|------|------|------|
| data.session | object | JWT Token、refresh_token |
| data.user | object | user_id、email、role |
| error.message | string | 错误信息 |

### 1.2 注册账号

```typescript
// Supabase Auth 注册
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: { data: { username: '昵称' } }
});

// 自定义用户名注册
const { data, error } = await api.directSignUp(
  '用户名',
  '密码',
  { nickname: '昵称' },  // customData
  'INVITE_CODE',          // 邀请码（可选）
  'email@example.com'     // 邮箱（可选）
);
```

### 1.3 获取当前登录用户

```typescript
const { data: { user } } = await supabase.auth.getUser();
// user.id  当前用户UUID
// user.email  邮箱

// 获取完整资料
const { data: profile } = await api.getProfile(user.id);
// profile.username  用户名
// profile.avatar_url  头像
// profile.role  角色 (admin/user)
```

### 1.4 退出登录

```typescript
await supabase.auth.signOut();
```

### 1.5 重置密码

```typescript
// 管理员重置用户密码
await api.resetUserPassword(userId, 'newPassword123');
```

---

## 2. 用户管理

### 2.1 获取用户列表（管理后台）

```typescript
const { data, error, total } = await api.getAllProfiles(
  0,      // page 页码
  20,     // limit 每页条数
  '搜索关键词',  // search 支持用户名/邮箱/备注/数字ID
  'group_id'    // groupId 权限组筛选（可选）
);

// data: Profile[]
// total: 总条数
```

### 2.2 搜索用户

```typescript
const { data, error } = await api.searchProfiles('搜索关键词');
// 返回最多5条匹配结果
```

### 2.3 更新用户资料

```typescript
await api.updateProfile(userId, {
  username: '新昵称',
  avatar_url: 'https://...',
  notes: '管理员备注',
  is_banned: true,      // 封禁
  is_blacklisted: true  // 拉黑
});
```

### 2.4 更新用户角色

```typescript
await api.updateProfileRole(userId, 'admin'); // admin | user | super_admin
```

### 2.5 获取用户权限

```typescript
const { permissions, group_name } = await api.getCurrentUserPermissions(userId);
// permissions: string[]  如 ['upload', 'admin_dashboard', 'audit_content']
// group_name: string    权限组名称
```

### 2.6 删除用户

```typescript
await api.deleteUser(userId);
```

---

## 3. 媒体内容

### 3.1 上传媒体（核心）

```typescript
// 第一步：上传文件到R2存储
const file = e.target.files[0];
const { data: uploadRes, error: uploadError } = await api.uploadFile(
  'user-uploads',                    // bucket
  `uploads/${Date.now()}_${file.name}`, // path
  file
);
// uploadRes = "https://cdn.xxx.com/uploads/xxx.jpg"

// 第二步：创建媒体记录
const { data: mediaItem, error } = await api.uploadMedia({
  user_id: user.id,
  url: uploadRes,
  type: 'image',        // 'image' | 'video'
  title: '作品标题',
  description: '作品描述',
  category_id: '分类ID', // 可选
  tags: ['标签1', '标签2'], // 可选
  is_adult_content: false
});

// 状态说明：
// - pending: 待审核（普通用户上传默认）
// - approved: 已通过（管理员/免审核组直接通过）
// - rejected: 已拒绝
// - archived: 已归档
```

**业务逻辑：**
- 普通用户上传 → 状态为 `pending`，自己可见
- 管理员/免审核组上传 → 状态为 `approved`，直接进入探索页
- 管理员审核通过 → 状态变为 `approved`
- 管理员拒绝 → 状态变为 `rejected`，用户可修改后重新上传

### 3.2 批量上传

```typescript
const items = files.map(file => ({
  user_id: user.id,
  url: file.url,
  type: file.type,
  title: file.title,
  category_id: file.categoryId,
  tags: file.tags
}));

const { data, error } = await api.batchUploadMedia(items);
```

### 3.3 获取探索页内容（已审核通过的公开内容）

```typescript
const { data, error, total } = await api.getApprovedMedia(
  0,              // page
  20,             // limit
  user?.id,       // userId（可选，用于个性化推荐）
  'all',          // type: 'all' | 'image' | 'video'
  'all',          // categoryId: 'all' | 具体分类ID
  'latest',       // sortBy: 'latest' | 'popular' | 'random'
  ['tagId1'],     // tagIds（可选，标签筛选）
  false           // force（是否强制刷新缓存）
);

// data: MediaItem[]
// total: 总数
```

### 3.4 获取用户自己的作品

```typescript
const { data, error, total } = await api.getUserMedia(userId, 0, 20);
// 包含所有状态：pending / approved / rejected / archived
```

### 3.5 获取待审核内容（管理员）

```typescript
const { data, error, total } = await api.getPendingMedia(0, 20);
```

### 3.6 获取已归档/已删除内容（管理员）

```typescript
const { data: archived } = await api.getArchivedMedia(0, 20);
const { data: deleted } = await api.getDeletedMedia(0, 20);
```

### 3.7 审核操作（管理员）

```typescript
// 通过审核
await api.updateMediaItem(mediaId, { status: 'approved' });

// 拒绝审核（可填写拒绝原因）
await api.updateMediaItem(mediaId, {
  status: 'rejected',
  admin_notes: '图片模糊，请重新上传高清版本'
});

// 批量操作
await api.batchSoftDeleteMedia([id1, id2, id3]);  // 批量软删除
await api.batchRestoreMedia([id1, id2]);           // 批量恢复
await api.batchHardDeleteMedia([id1]);               // 批量永久删除
```

### 3.8 获取单个媒体详情

```typescript
const { data, error } = await api.getMediaItem(mediaId);
// data: MediaItem 包含用户信息、标签、评论等
```

### 3.9 更新媒体信息

```typescript
await api.updateMediaItem(mediaId, {
  title: '新标题',
  description: '新描述',
  category_id: '新分类ID',
  tags: ['新标签1', '新标签2'],
  is_adult_content: true
});
```

### 3.10 获取时间线日期分布

```typescript
const { data, error } = await api.getTimelineDates(
  userId,
  'all',      // type
  'all',      // categoryId
  ['tagId']   // tagIds
);
// data: [{ date: '2024-01-15', count: 12 }, ...]
```

---

## 4. 个人中心

### 4.1 获取当前用户完整信息

```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await api.getProfile(user.id);

// profile 包含字段：
// - id, username, email, avatar_url
// - role, group_id, digital_id
// - points, exp, level
// - is_banned, is_blacklisted
// - created_at, last_sign_in_at
// - permission_groups: { name, permissions }
```

### 4.2 获取用户积分记录

```typescript
const { data, error, total } = await api.getPointsLogs(userId, 0, 20);
// data: PointsLog[]
//   - type: 'signin' | 'upload' | 'favorite' | 'download' | 'reward'
//   - points: +/- 积分值
//   - description: 描述
//   - created_at
```

### 4.3 获取用户成长记录

```typescript
const { data, error } = await api.getUserGrowthLogs(userId, 0, 20);
```

### 4.4 获取签到状态

```typescript
const { hasCheckedIn, error } = await api.getCheckInStatus(userId);
// hasCheckedIn: true/false
```

### 4.5 执行签到

```typescript
const { data, error } = await api.performCheckIn(userId);
// 自动计算连续签到天数，发放积分奖励
```

### 4.6 获取签到历史

```typescript
const { data, error } = await api.getCheckInHistory(userId, 0, 30);
```

### 4.7 兑换码兑换

```typescript
const { data, error } = await api.redeemCode(userId, 'CODE123');
```

### 4.8 获取用户勋章

```typescript
const { data: badges } = await supabase
  .from('user_badges')
  .select('*, badges(*)')
  .eq('user_id', userId);
```

### 4.9 领取勋章任务

```typescript
const { data, error } = await api.checkUserBadges(userId);
// 自动检查并发放符合条件的勋章
```

---

## 5. 写真集

### 5.1 获取写真集列表

```typescript
const { data, error, total } = await api.getPhotoAlbums(
  0,       // page
  20,      // limit
  '搜索',   // search
  'groupId', // permissionGroupId（可选）
  true      // onlyPublic（只显示公开的）
);

// data: PhotoAlbum[]
//   - id, title, description, cover_url
//   - is_public, is_active, is_zonerama
//   - permission_groups: { name }
```

### 5.2 获取写真集详情

```typescript
const { data: album, error } = await api.getPhotoAlbum(albumId);
// album.album_photos: 照片列表
```

### 5.3 获取写真集照片

```typescript
const { data, error, count } = await supabase
  .from('album_photos')
  .select('*, profiles!user_id(*)')
  .eq('album_id', albumId)
  .order('sort_order', { ascending: true })
  .range(0, 49);
```

### 5.4 创建/更新写真集（管理员）

```typescript
await api.upsertPhotoAlbum({
  title: '写真集标题',
  description: '描述',
  cover_url: 'https://...',
  is_public: true,
  is_active: true,
  permission_group_id: 'group_id', // 访问权限组
  zonerama_album_id: 'zonerama_id'  // 外部图集ID（可选）
});
```

### 5.5 加入私有写真集

```typescript
await api.joinAlbum(userId, albumId);
```

### 5.6 检查是否已加入

```typescript
const isJoined = await api.isAlbumJoined(userId, albumId);
```

### 5.7 生成写真集PDF

```typescript
const { data, error } = await supabase.functions.invoke('generate-album-pdf', {
  body: { albumId }
});
// data.url = PDF下载地址
```

---

## 6. 每日图集

### 6.1 获取每日图集列表

```typescript
const { data, error } = await supabase
  .from('daily_galleries')
  .select('*')
  .eq('status', 'published')
  .order('publish_date', { ascending: false })
  .limit(30);
```

### 6.2 获取图集详情及密码

```typescript
const { data, error } = await supabase
  .from('daily_galleries')
  .select('*')
  .eq('publish_date', '2024-01-15')
  .maybeSingle();

// 验证密码
const { data: history } = await api.getDailyGalleryAccessHistory(openid);
// 如果已验证过则无需再次输入
```

### 6.3 获取每日图集访问历史

```typescript
const { data, error } = await api.getDailyGalleryAccessHistory(openid);
```

---

## 7. 签到与积分

### 7.1 签到配置（管理员）

```typescript
const { data, error } = await api.getSigninConfigs();
// data: [{ day_number: 1, points_reward: 10, description: '第一天' }, ...]

await api.updateSigninConfigs([
  { day_number: 1, points_reward: 10 },
  { day_number: 2, points_reward: 20 }
]);
```

### 7.2 积分逻辑配置（管理员）

```typescript
const { data, error } = await api.getPointsLogic();
// 设置积分规则
await api.updatePointsLogic({
  upload_image: 5,
  upload_video: 10,
  favorite: 1,
  comment: 2,
  share: 3,
  download: -2
});
```

### 7.3 发放用户奖励

```typescript
await api.awardUserReward(userId, 'image_publish', `post_${mediaId}`);
// action: 'image_publish' | 'video_publish' | 'favorite' | 'comment' | 'share' | 'download'
```

---

## 8. 通知消息

### 8.1 获取通知列表

```typescript
const { data, error } = await api.getNotifications(userId, isAdmin);
// 未登录：只显示全局通知
// 已登录：显示用户专属通知 + 全局通知
// isAdmin=true：显示所有通知（管理后台用）
```

### 8.2 标记已读

```typescript
await api.markNotificationAsRead(notificationId);      // 单条
await api.markAllNotificationsAsRead(userId);          // 全部
```

### 8.3 删除已读通知

```typescript
await api.deleteReadNotifications(userId);
```

### 8.4 创建通知（管理员）

```typescript
await api.createNotification({
  user_id: '目标用户ID',    // null = 全局通知
  role_id: null,             // null = 不限角色
  type: 'system',
  title: '系统通知',
  content: '通知内容',
  link: '/page',             // 点击跳转链接
  channel: 'in_app'          // 'in_app' | 'email' | 'sms' | 'all'
});
```

---

## 9. 社交互动

### 9.1 收藏/取消收藏

```typescript
// 收藏
await supabase.from('favorites').insert([{
  user_id: userId,
  media_id: mediaId
}]);

// 取消收藏
await supabase.from('favorites').delete()
  .eq('user_id', userId)
  .eq('media_id', mediaId);

// 获取用户收藏列表
const { data } = await supabase.from('favorites')
  .select('*, media_items(*)')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### 9.2 点赞

```typescript
await api.trackInteraction(mediaId, 'favorite', 1);
// interaction_type: 'view' | 'favorite' | 'click' | 'share'
```

### 9.3 评论

```typescript
// 发表评论
await supabase.from('comments').insert([{
  media_id: mediaId,
  user_id: userId,
  content: '评论内容',
  parent_id: null  // 一级评论为null，回复时填入父评论ID
}]);

// 获取评论列表
const { data } = await supabase.from('comments')
  .select('*, profiles!user_id(username, avatar_url)')
  .eq('media_id', mediaId)
  .order('created_at', { ascending: true });
```

### 9.4 举报

```typescript
await api.createReport({
  reporter_id: userId,
  media_id: mediaId,
  report_type: 'inappropriate', // 'inappropriate' | 'copyright' | 'spam' | 'other'
  reason: '举报原因描述'
});
```

---

## 10. 标签与分类

### 10.1 获取所有标签

```typescript
const { data, error } = await supabase
  .from('tags')
  .select('*')
  .order('name', { ascending: true });
```

### 10.2 获取内容分类

```typescript
const { data, error } = await supabase
  .from('content_categories')
  .select('*')
  .eq('is_active', true)
  .order('sort_order', { ascending: true });
```

### 10.3 创建分类（管理员）

```typescript
await supabase.from('content_categories').insert([{
  name: '风景',
  description: '风景类内容',
  icon: 'mountain',
  is_active: true,
  sort_order: 1
}]);
```

---

## 11. 管理后台

### 11.1 用户管理

```typescript
// 见 2.1 ~ 2.6

// 封禁/解封用户
await api.updateProfileBannedStatus(userId, true);
await api.updateProfileBlacklistStatus(userId, true);

// 批量更新用户
await api.batchUpdateProfiles([
  { id: 'user1', digital_id: '10001', custom_fields: {} },
  { id: 'user2', digital_id: '10002' }
]);

// 手动创建用户
await api.createUserManually({
  username: '新用户',
  password: 'password123',
  email: 'test@example.com',
  role: 'user'
});
```

### 11.2 内容审核

```typescript
// 见 3.5 ~ 3.7

// 获取举报列表
const { data, error, total } = await api.getReports(0, 20, 'pending');
// status: 'pending' | 'resolved' | 'dismissed'

// 处理举报
await api.updateReportStatus(reportId, 'resolved', '处理结果', '警告');
```

### 11.3 存储管理

```typescript
// 测试R2连接
const { data, error } = await api.testR2Connection();

// 获取存储统计
const { data } = await supabase.from('storage_stats').select('*').maybeSingle();

// 清理已删除文件
await api.purgeAllDeletedMedia();
```

### 11.4 系统配置

```typescript
// 获取配置项
const { data, error } = await api.getSystemConfig('audit_config');
// key: 'audit_config' | 'dedupe_config' | 'points_logic' | 'theme_config' | 'email_config' | 'custom_fields'

// 更新配置项
await api.updateSystemConfig('audit_config', {
  global_audit_enabled: true,
  bypass_audit_with_permission: true
});
```

### 11.5 权限组管理

```typescript
// 获取权限组
const { data } = await api.getPermissionGroups();

// 创建权限组
await api.createPermissionGroup({
  name: 'VIP用户组',
  permissions: ['upload', 'download', 'bypass_audit'],
  requires_audit: false  // 免审核
});

// 设置默认权限组
await api.setDefaultGroup(groupId);

// 更新用户权限组
await api.updateUserGroup(userId, groupId);
```

### 11.6 靓号管理

```typescript
// 获取靓号池
const { data } = await api.getSpecialDigitalIds();

// 创建靓号
await api.createSpecialDigitalId({
  digital_id: '888888',
  price: 100,
  is_sold: false
});

// 购买靓号
await api.buySpecialDigitalId(userId, specialId);
```

### 11.7 等级管理

```typescript
const { data } = await api.getRanks();
// data: [{ name: '新手', min_exp: 0, max_exp: 100 }, ...]

await api.createRank({ name: '大师', min_exp: 10000 });
await api.updateRank(rankId, { max_exp: 50000 });
```

### 11.8 邀请码管理

```typescript
// 见 core_user_api.ts 中的 invite code 相关方法
```

### 11.9 广告管理

```typescript
// 见 ads_api.ts
const { data } = await api.getAds();
await api.createAd({ title: '广告标题', content: '...', position: 'banner' });
```

---

## 12. 系统配置

### 12.1 获取系统配置项

```typescript
const { data, error } = await api.getSystemConfig(configKey);

// 常用配置项 key：
// 'audit_config'      - 审核配置
// 'dedupe_config'     - 去重配置
// 'points_logic'      - 积分逻辑
// 'theme_config'      - 主题配置
// 'email_config'      - 邮件配置
// 'custom_fields'     - 自定义用户字段
// 'rank_config'       - 等级配置
// 'storage_config'    - 存储配置
// 'recommendation_settings' - 推荐权重
```

### 12.2 更新系统配置

```typescript
await api.updateSystemConfig('audit_config', {
  global_audit_enabled: true,
  bypass_audit_with_permission: true
});
```

### 12.3 全局关键词替换（内容过滤）

```typescript
// 获取替换规则
const { data } = await api.getKeywordReplacements();

// 添加规则
await api.upsertKeywordReplacement({
  original_word: '敏感词',
  replacement_word: '***',
  type: 'content',  // 'content' | 'user'
  is_active: true
});
```

### 12.4 数字ID配置

```typescript
const { data } = await api.getDigitalIdConfig();
// data: { min_id: 10000, max_id: 99999, enabled: true }

await api.updateDigitalIdConfig({ enabled: true, min_id: 10000 });
```

---

## 13. App管理

### 13.1 获取App配置

```typescript
// 方式一：通过SDK
import { AppManager } from '@/lib/app-sdk';
const manager = new AppManager({ appId: 'xxx', apiKey: 'xxx' });
const { data } = await manager.getConfig();

// 方式二：直接请求Edge Function
const res = await fetch(
  `${baseUrl}/functions/v1/app-management/config/${appId}?apiKey=${apiKey}`
);
const { data } = await res.json();

// data 包含：
// - appId, appName, bundleId, platform
// - theme: 主题配色
// - features: 功能开关
// - api: API端点配置
// - cfr2: 存储配置
// - apk: APK打包配置
```

### 13.2 检查版本更新

```typescript
const { data } = await manager.checkVersion('android', '1.0.0');
// data.hasUpdate: true/false
// data.latestVersion: { version, downloadUrl, isForceUpdate }
```

### 13.3 验证API密钥

```typescript
const { data } = await manager.validateKey();
// data.valid: true/false
// data.permissions: ['read', 'write']
// data.rateLimit: 1000
```

### 13.4 获取功能开关

```typescript
const { data } = await manager.getFeatureFlags();
// data.features:
//   enableUpload, enableDiscovery, enableAlbum,
//   enableComment, enableShare, enableDownload, ...
```

### 13.5 导出打包配置

```typescript
const { data } = await manager.exportBuildConfig();
// data.buildFiles:
//   mainActivity: MainActivity.kt 完整代码
//   manifest: AndroidManifest.xml
//   gradle: build.gradle
```

### 13.6 App配置CRUD（管理后台）

```typescript
// 获取所有App
const { data } = await supabase.from('app_configs').select('*');

// 创建App
await supabase.from('app_configs').insert([{
  app_id: 'unique_id',
  app_name: 'App名称',
  platform: ['android', 'ios'],
  theme_config: { primaryColor: '#6366f1' },
  feature_flags: { enableUpload: true },
  api_config: { baseUrl: 'https://...' },
  cfr2_config: { enabled: true, endpoint: '...' },
  apk_config: { package_name: 'com.example.app' }
}]);

// 更新
await supabase.from('app_configs').update({ app_name: '新名称' }).eq('app_id', appId);

// 删除
await supabase.from('app_configs').delete().eq('id', id);
```

### 13.7 版本管理

```typescript
// 发布版本
await supabase.from('app_versions').insert([{
  app_id: 'appId',
  version: '1.1.0',
  version_code: 2,
  platform: 'android',
  download_url: 'https://.../app.apk',
  is_force_update: false,
  status: 'published'
}]);

// 获取版本列表
const { data } = await supabase.from('app_versions')
  .select('*')
  .eq('app_id', appId)
  .order('created_at', { ascending: false });
```

### 13.8 API密钥管理

```typescript
// 生成密钥
await supabase.from('app_api_keys').insert([{
  app_id: 'appId',
  key_name: '生产环境',
  api_key: 'sk_' + crypto.randomUUID().replace(/-/g, ''),
  secret_key: 'sec_' + crypto.randomUUID().replace(/-/g, ''),
  permissions: ['read', 'write'],
  rate_limit: 1000,
  is_active: true
}]);

// 获取密钥列表
const { data } = await supabase.from('app_api_keys')
  .select('*')
  .eq('app_id', appId);
```

---

## 14. 微信公众号

### 14.1 获取公众号配置

```typescript
const { data, error } = await api.getWechatConfigs();
// data: [{ id, name, app_id, app_secret, token, encoding_aes_key }, ...]
```

### 14.2 测试公众号连接

```typescript
const { data, error } = await api.testWechatConnection(configId);
```

### 14.3 获取公众号粉丝

```typescript
const { data } = await api.getWechatUsers(configId);
```

### 14.4 获取图文素材

```typescript
const { data, error } = await supabase.functions.invoke('wechat-api', {
  body: { action: 'get_materials', configId, type: 'news', offset: 0, count: 20 }
});
```

### 14.5 模板消息管理

```typescript
// 获取模板列表
const { data } = await supabase.from('wechat_notification_templates')
  .select('*')
  .eq('config_id', configId);

// 添加模板
await api.addWechatNotificationTemplate(configId, {
  tid: '模板ID',
  kidList: [1, 2, 3],
  sceneDesc: '场景描述'
});
```

### 14.6 发送通知任务

```typescript
// 创建任务
await supabase.from('wechat_notification_tasks').insert([{
  config_id: configId,
  template_id: templateId,
  title: '通知标题',
  content: '通知内容',
  url: 'https://...',
  target_type: 'all'  // 'all' | 'tag' | 'openid_list'
}]);

// 执行任务
await api.sendWechatNotificationTask(configId, taskId);
```

---

## 15. 数据分析

### 15.1 记录用户访问

```typescript
await api.logUserVisitStats({
  user_id: userId,
  ip_address: '192.168.1.1',
  browser: 'Chrome',
  os: 'Windows',
  network_type: 'wifi',
  path: '/discovery',
  duration: 120,
  device: 'PC',
  country: 'CN',
  region: 'Guangdong',
  city: 'Shenzhen',
  referrer: 'https://google.com',
  resolution: '1920x1080',
  language: 'zh-CN',
  page_title: '探索页'
});
```

### 15.2 获取访问统计

```typescript
const { data } = await api.getVisitStats();
// data: 最近2000条访问记录
```

### 15.3 获取终端分析

```typescript
const { data } = await api.getTerminalAnalytics();
// data: { browser_stats: [...], os_stats: [...], device_stats: [...] }
```

### 15.4 媒体热度计算

```typescript
const { data, error } = await supabase.functions.invoke('calculate-media-heat', {
  body: { mediaId }
});
```

---

## 附录：错误码对照表

| 错误码/状态 | 说明 | 处理建议 |
|------------|------|---------|
| 400 Bad Request | 请求参数错误 | 检查请求体字段 |
| 401 Unauthorized | 未登录/Token过期 | 重新登录获取Token |
| 403 Forbidden | 无权限 | 检查用户角色或权限组 |
| 404 Not Found | 资源不存在 | 检查ID是否正确 |
| 409 Conflict | 数据冲突 | 如重复插入唯一字段 |
| 422 Unprocessable | 业务逻辑错误 | 如积分不足、已拥有该勋章 |
| 429 Too Many Requests | 请求频率超限 | 降低调用频率 |
| 500 Internal Error | 服务器错误 | 联系管理员 |
| PGRST103 | Supabase权限错误 | 检查RLS策略 |

---

## 前端页面与API对应速查表

| 页面/功能 | 核心API | 说明 |
|----------|---------|------|
| **探索页** | `api.getApprovedMedia()` | 浏览已审核内容，支持分类/标签/排序筛选 |
| **上传页** | `api.uploadFile()` + `api.uploadMedia()` | 先上传文件，再创建记录 |
| **个人中心** | `api.getProfile()` + `api.getUserMedia()` + `api.getPointsLogs()` | 用户信息+作品+积分 |
| **审核管理** | `api.getPendingMedia()` + `api.updateMediaItem()` | 管理员审核待处理内容 |
| **写真集** | `api.getPhotoAlbums()` + `api.getPhotoAlbum()` | 浏览写真集及详情 |
| **每日图集** | `supabase.from('daily_galleries')` | 密码验证后查看 |
| **签到** | `api.getCheckInStatus()` + `api.performCheckIn()` | 每日签到领积分 |
| **通知** | `api.getNotifications()` + `api.markNotificationAsRead()` | 系统消息 |
| **收藏** | `supabase.from('favorites')` | 收藏/取消收藏 |
| **评论** | `supabase.from('comments')` | 发表评论/查看列表 |
| **用户管理** | `api.getAllProfiles()` + `api.updateProfile()` | 后台用户CRUD |
| **存储管理** | `api.testR2Connection()` + `api.purgeAllDeletedMedia()` | R2存储管理 |
| **系统配置** | `api.getSystemConfig()` + `api.updateSystemConfig()` | 全局配置 |
| **权限组** | `api.getPermissionGroups()` + `api.createPermissionGroup()` | RBAC权限管理 |
| **App管理** | `supabase.from('app_configs')` + AppManager SDK | App配置/版本/密钥 |
| **公众号** | `api.getWechatConfigs()` + `api.sendWechatNotificationTask()` | 微信集成 |
| **数据分析** | `api.getVisitStats()` + `api.getTerminalAnalytics()` | 访问统计 |
