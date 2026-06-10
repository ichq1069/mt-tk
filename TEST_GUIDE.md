# 广告解锁功能测试指南

## 🎯 测试目标
验证小程序端看完广告后，H5 端能否立即显示解锁内容（无需修改小程序代码）

## 📋 测试步骤

### 1. 准备工作
- ✅ 确保云函数已部署最新版本
- ✅ 确保 H5 端已部署最新版本
- ✅ 准备一个测试日期的每日图集内容

### 2. H5 端操作
1. 打开 H5 页面：`https://app-a8orwhnquio1.appmiaoda.com/daily-gallery`
2. 点击某个日期的图集（如 2026-03-23）
3. 点击"扫码解锁"按钮，生成小程序码
4. **保持页面打开**，等待解锁状态同步

### 3. 小程序端操作
1. 使用微信扫描 H5 页面上的小程序码
2. 进入小程序任务页面
3. 点击"观看广告"按钮
4. **完整观看广告**直到结束
5. 看到"解锁成功"提示

### 4. H5 端验证
- ✅ **预期结果**：H5 页面应该在 1-2 秒内自动显示图集内容
- ❌ **异常情况**：如果 10 秒后仍未显示，说明同步失败

## 🔍 调试方法

### 查看云函数日志

在 Supabase Dashboard → Edge Functions → wechat-miniprogram → Logs 中查看：

**成功的日志示例：**
```
[WechatMP] Ad callback: itemId=20260323, host=undefined, status=completed, browserId=undefined, scene=undefined, checkCode=7a421d06
[WechatMP] browserId missing in body, attempting to recover from logs...
[WechatMP] SUCCESS: Retrieved browserId from qr log by itemId+checkCode: 571bc105-8c31-4150-a64a-d15dffc49b7e, scene: c=7a421d06&d=20260323&h=main&s=f5b4
[WechatMP] Ad callback for itemId: 20260323 (normalized: 2026-03-23), identifier: 571bc105-8c31-4150-a64a-d15dffc49b7e, status: completed
```

**失败的日志示例：**
```
[WechatMP] browserId missing in body, attempting to recover from logs...
[WechatMP] WARN: No matching qr log found for itemId=20260323, checkCode=7a421d06, checked 50 records
```

### 查看数据库记录

#### 1. 检查生成码记录
```sql
SELECT 
  scene, 
  details->>'browserId' as browser_id,
  details->>'itemId' as item_id,
  created_at
FROM mp_qr_generation_logs 
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 10;
```

**预期结果：**
| scene | browser_id | item_id | created_at |
|-------|------------|---------|------------|
| c=7a421d06&d=20260323&h=main&s=f5b4 | 571bc105-... | 2026-03-23 | 2026-03-23 10:30:00 |

#### 2. 检查解锁记录
```sql
SELECT 
  item_id,
  browser_id,
  openid,
  status,
  watch_status,
  unlocked_at,
  created_at,
  details->>'body' as request_body
FROM ad_unlock_logs
WHERE item_id = '2026-03-23'
ORDER BY created_at DESC
LIMIT 10;
```

**预期结果：**
| item_id | browser_id | status | watch_status | unlocked_at | created_at |
|---------|------------|--------|--------------|-------------|------------|
| 2026-03-23 | 571bc105-... | unlocked | completed | 2026-03-23 10:32:00 | 2026-03-23 10:30:15 |
| 2026-03-23 | 571bc105-... | watching | watching | null | 2026-03-23 10:30:10 |

**关键点：**
- ✅ 两条记录的 `browser_id` 应该**完全相同**
- ✅ 第一条（watching）是扫码时创建的
- ✅ 第二条（unlocked）是看完广告后更新的（或新插入的）

### 查看 H5 端控制台

打开浏览器开发者工具 → Console，查看轮询日志：

**成功的日志示例：**
```
[DailyGallery] Checking unlock status: { itemId: '2026-03-23', browserId: '571bc105-...' }
[DailyGallery] Unlock status: { status: 'unlocked', unlocked: true }
[DailyGallery] Unlocked! Fetching content...
```

**失败的日志示例：**
```
[DailyGallery] Checking unlock status: { itemId: '2026-03-23', browserId: '571bc105-...' }
[DailyGallery] Unlock status: { status: 'watching', unlocked: false }
[DailyGallery] Still waiting...
```

## ❌ 常见问题排查

### 问题 1：H5 端一直显示"等待解锁"

**可能原因：**
1. 小程序端没有传递 `checkCode` 参数
2. 时间窗口超过 10 分钟
3. `browserId` 恢复失败

**解决方法：**
1. 检查小程序端日志，确认 `checkCode` 是否正确解析
2. 重新生成小程序码并立即扫码测试
3. 查看云函数日志，确认是否成功恢复 `browserId`

### 问题 2：云函数日志显示"No matching qr log found"

**可能原因：**
1. H5 端生成码时没有记录到 `mp_qr_generation_logs` 表
2. `checkCode` 不匹配
3. `itemId` 格式不一致

**解决方法：**
```sql
-- 检查生成码记录是否存在
SELECT * FROM mp_qr_generation_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 检查 scene 字段格式
SELECT scene FROM mp_qr_generation_logs 
WHERE scene LIKE '%20260323%'
ORDER BY created_at DESC;
```

### 问题 3：解锁记录中 browser_id 为 null

**可能原因：**
- 云函数无法从日志中恢复 `browserId`

**解决方法：**
1. 确认小程序端传递了 `itemId` 和 `checkCode`
2. 确认 H5 端生成码时正确记录了 `browserId`
3. 增加云函数日志输出，查看详细匹配过程

## ✅ 成功标准

- ✅ H5 生成码后，`mp_qr_generation_logs` 表中有对应记录
- ✅ 小程序扫码后，`ad_unlock_logs` 表中创建 `watching` 状态记录
- ✅ 小程序看完广告后，`ad_unlock_logs` 表中更新为 `unlocked` 状态
- ✅ 两条记录的 `browser_id` 完全一致
- ✅ H5 端在 1-2 秒内自动显示内容

## 📞 技术支持

如果测试失败，请提供以下信息：
1. 云函数日志截图
2. 数据库查询结果截图
3. H5 端控制台日志截图
4. 小程序端控制台日志截图
