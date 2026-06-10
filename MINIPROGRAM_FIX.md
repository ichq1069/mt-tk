# 小程序端参数传递问题修复方案

## ✅ 云函数端解决方案（推荐 - 无需修改小程序）

### 已实现的增强逻辑

云函数已经增强了 `browserId` 恢复机制，**无需修改小程序端代码**即可工作：

#### 恢复策略

当小程序端没有传递 `scene` 参数时，云函数会：

1. **通过 itemId + checkCode 精确匹配**
   - 从 `mp_qr_generation_logs` 表中查询最近 10 分钟内的记录
   - 在内存中精确匹配 `scene` 字段中的 `c=checkCode` 和 `d=itemId`
   - 提取匹配记录中的 `browserId`

2. **时间窗口限制**
   - 只查询最近 10 分钟内的记录，避免误匹配历史数据
   - 提高查询性能和匹配准确性

3. **兜底机制**
   - 如果新表中找不到，会尝试从旧的 `mp_login_logs` 表中查询
   - 使用相同的匹配逻辑

#### 工作原理

```typescript
// 云函数代码（已实现）
if (!currentBrowserId && itemId && checkCode) {
  // 1. 查询最近 10 分钟内的生成码记录
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: qrLogs } = await supabaseClient
    .from("mp_qr_generation_logs")
    .select("details, scene, created_at")
    .gte("created_at", tenMinutesAgo)
    .order("created_at", { ascending: false })
    .limit(50);
  
  // 2. 在内存中精确匹配
  const shortItemId = itemId.replace(/daily_gallery_/g, '').replace(/-/g, '').slice(0, 12);
  const matchedLog = qrLogs.find(log => {
    const sceneStr = log.scene.includes('%') ? decodeURIComponent(log.scene) : log.scene;
    return sceneStr.includes(`c=${checkCode}`) && sceneStr.includes(`d=${shortItemId}`);
  });
  
  // 3. 提取 browserId
  if (matchedLog?.details?.browserId) {
    currentBrowserId = matchedLog.details.browserId;
  }
}
```

#### 优势

✅ **无需修改小程序端代码** - 现有小程序可以直接使用  
✅ **精确匹配** - 通过 itemId + checkCode 双重验证，避免误匹配  
✅ **时间窗口保护** - 只匹配最近 10 分钟的记录，提高准确性  
✅ **性能优化** - 限制查询数量，避免全表扫描  
✅ **兜底机制** - 多层查询策略，提高成功率

#### 测试验证

1. **H5 端生成小程序码**
2. **小程序端扫码并观看广告**（无需修改代码）
3. **查看云函数日志**，应该看到：
   ```
   [WechatMP] browserId missing in body, attempting to recover from logs...
   [WechatMP] SUCCESS: Retrieved browserId from qr log by itemId+checkCode: 571bc105-8c31-4150-a64a-d15dffc49b7e, scene: c=7a421d06&d=20260323&h=main&s=f5b4
   ```
4. **H5 端应该立即显示数据**

---

## 📱 小程序端优化方案（可选 - 更稳定）

如果希望进一步提高稳定性和性能，可以选择修改小程序端代码传递完整参数。

---

## 📊 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| **云函数端增强**（已实现） | ✅ 无需修改小程序<br>✅ 向后兼容<br>✅ 立即生效 | ⚠️ 依赖时间窗口<br>⚠️ 需要额外查询 | ⭐⭐⭐⭐⭐ |
| **小程序端传参**（可选） | ✅ 精确匹配<br>✅ 性能最优<br>✅ 无歧义 | ❌ 需要更新小程序<br>❌ 需要审核发布 | ⭐⭐⭐⭐ |

### 建议

1. **短期方案**：使用云函数端增强逻辑（已部署），无需等待小程序审核
2. **长期方案**：在下次小程序更新时，顺便加上完整参数传递，进一步优化

---

## 🔍 故障排查

### 如果仍然无法同步

1. **检查云函数日志**
   ```
   [WechatMP] Ad callback: itemId=20260323, host=undefined, status=completed, browserId=undefined, scene=undefined, checkCode=7a421d06
   [WechatMP] browserId missing in body, attempting to recover from logs...
   [WechatMP] SUCCESS: Retrieved browserId from qr log by itemId+checkCode: 571bc105-8c31-4150-a64a-d15dffc49b7e
   ```

2. **检查生成码记录**
   ```sql
   SELECT scene, details->>'browserId' as browserId, created_at 
   FROM mp_qr_generation_logs 
   WHERE created_at > NOW() - INTERVAL '10 minutes'
   ORDER BY created_at DESC;
   ```

3. **检查解锁记录**
   ```sql
   SELECT item_id, browser_id, status, unlocked_at, created_at
   FROM ad_unlock_logs
   WHERE item_id = '2026-03-23'
   ORDER BY created_at DESC;
   ```

4. **常见问题**
   - ❌ **时间窗口过期**：H5 生成码后超过 10 分钟才扫码 → 增加时间窗口或重新生成码
   - ❌ **checkCode 不匹配**：小程序端传递的 checkCode 与生成时不一致 → 检查小程序端解析逻辑
   - ❌ **itemId 格式不一致**：生成时是 `2026-03-23`，回调时是 `20260323` → 云函数已自动处理

---

## 📱 小程序端优化方案详细说明

### 问题诊断

### 当前问题
小程序端在调用云函数时**缺少关键参数**，导致云函数无法恢复 `browserId`，进而无法更新 H5 端的解锁状态。

### 缺少的参数对比

#### 1. `handleAdCompleted` 方法（广告完成回调）

**当前发送：**
```javascript
{
  action: 'ad_callback',
  itemId: this.vid,
  watch_status: 'completed',
  openid: uni.getStorageSync('openid') || '',
  checkCode: this.checkCode
}
```

**应该发送：**
```javascript
{
  action: 'ad_callback',
  itemId: this.vid,
  watch_status: 'completed',
  openid: uni.getStorageSync('openid') || '',
  checkCode: this.checkCode,
  scene: this.originalScene,           // ⚠️ 缺少：完整的 scene 参数
  hostIdentifier: this.hostIdentifier  // ⚠️ 缺少：域名标识符
}
```

#### 2. `fetchData` 方法（获取任务数据）

**当前发送：**
```javascript
{
  action: 'get_task_data',
  vid: this.vid
}
```

**应该发送：**
```javascript
{
  action: 'get_task_data',
  vid: this.vid,
  scene: this.originalScene,           // ⚠️ 缺少：完整的 scene 参数
  openid: uni.getStorageSync('openid') || ''
}
```

---

## 修复代码

### 完整修复后的小程序页面代码

```javascript
export default {
  data() {
    return {
      baseUrlmiaoda: 'https://backend.appmiaoda.com/projects/supabase290871706745094144',
      baseUrlsupabase: 'https://ehnwzyxssxwuqwkqysnb.supabase.co',
      baseUrl3wo58: 'https://supabase.wo58.cn',
      baseUrl: uni.getStorageSync('baseUrl') || 'https://backend.appmiaoda.com/projects/supabase290871706745094144',
      vid: '',
      itemData: null,
      unlocked: false,
      _isLoading: false,
      checkCode: '',
      hostIdentifier: '',        // 新增：保存域名标识符
      originalScene: '',         // 新增：保存完整的 scene 参数
      adUnitId: 'adunit-61b3f0c6051db5fe',
      videoAd: null
    }
  },

  onLoad(options) {
    console.log('[页面加载]', options);
    this.initVideoAd();
    this.parseOptions(options);
    this.fetchData();
  },

  onUnload() {
    this.destroyAd();
  },

  methods: {
    // 稳定广告初始化
    initVideoAd() {
      if (!uni.createRewardedVideoAd) return;
      this.destroyAd();

      this.videoAd = uni.createRewardedVideoAd({
        adUnitId: this.adUnitId
      });

      this.videoAd.onLoad(() => {
        console.log('✅ 广告加载完成');
      });

      this.videoAd.onError((err) => {
        console.error('广告错误：', err);
        this._isLoading = false;
        setTimeout(() => this.initVideoAd(), 2000);
      });

      this.videoAd.onClose((res) => {
        this._isLoading = false;
        if (res?.isEnded) {
          console.log('✅ 广告观看完成');
          this.handleAdCompleted();
        } else {
          uni.showToast({ title: '请完整观看广告', icon: 'none' });
        }
      });
    },

    // 显示广告
    handleShowAd() {
      if (this._isLoading) return;
      this._isLoading = true;

      this.videoAd.show().catch(() => {
        this.videoAd.load()
          .then(() => this.videoAd.show())
          .catch(() => {
            this._isLoading = false;
            uni.showToast({ title: '广告加载失败', icon: 'none' });
          });
      });
    },

    // 销毁广告（防报错、防泄漏）
    destroyAd() {
      if (this.videoAd) {
        try {
          this.videoAd.offLoad();
          this.videoAd.offError();
          this.videoAd.offClose();
        } catch (e) {}
        this.videoAd = null;
      }
    },

    // ========= 修复：保存完整的 scene 和 hostIdentifier =========
    parseOptions(options) {
      if (options.scene) {
        // 🔧 保存原始 scene（关键修复）
        this.originalScene = options.scene;
        
        const scene = decodeURIComponent(options.scene);
        const params = {};
        scene.split('&').forEach(p => {
          const pair = p.split('=');
          if (pair.length === 2) params[pair[0]] = pair[1];
        });
        
        if (params.h) {
          // 🔧 保存 hostIdentifier（关键修复）
          this.hostIdentifier = params.h;
          
          if (params.h.includes('miaoda') || params.h.startsWith('md-') || params.h === 'main') {
            this.baseUrl = this.baseUrlmiaoda;
          } else if (params.h.includes('supabase') || params.h.startsWith('sp-')) {
            this.baseUrl = this.baseUrlsupabase;
          } else if (params.h.includes('wo58') || params.h.startsWith('wo-')) {
            this.baseUrl = this.baseUrl3wo58;
          } else if (params.h.includes('dhso')) {
            this.baseUrl = this.baseUrl3wo58;
          }
          uni.setStorageSync('baseUrl', this.baseUrl);
        }
        
        if (params.d) this.vid = params.d;
        if (params.c) this.checkCode = params.c;
      } else if (options.d) {
        this.vid = options.d;
      }
      
      console.log('[解析结果]', {
        vid: this.vid,
        checkCode: this.checkCode,
        hostIdentifier: this.hostIdentifier,
        originalScene: this.originalScene,
        baseUrl: this.baseUrl
      });
    },

    // 🔧 修复：传递完整参数
    handleAdCompleted() {
      const url = this.baseUrl + '/functions/v1/wechat-miniprogram';
      const body = {
        action: 'ad_callback',
        itemId: this.vid,
        watch_status: 'completed',
        openid: uni.getStorageSync('openid') || '',
        checkCode: this.checkCode,
        scene: this.originalScene,           // ✅ 新增：传递完整 scene
        hostIdentifier: this.hostIdentifier  // ✅ 新增：传递域名标识符
      };

      console.log('[广告完成回调]', body);

      uni.request({
        url,
        method: 'POST',
        data: body,
        success: (res) => {
          console.log('[回调响应]', res.data);
          if (res.data.success) {
            uni.showToast({ title: '解锁成功' });
          } else {
            uni.showToast({ title: res.data.message || '解锁失败', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('[回调失败]', err);
          uni.showToast({ title: '网络异常', icon: 'none' });
        },
        complete: () => {
          this._isLoading = false;
        }
      });
    },

    // 🔧 修复：传递完整参数
    fetchData() {
      if (!this.vid) return;
      
      const body = {
        action: 'get_task_data',
        vid: this.vid,
        scene: this.originalScene,           // ✅ 新增：传递完整 scene
        openid: uni.getStorageSync('openid') || ''
      };
      
      console.log('[获取任务数据]', body);
      
      uni.request({
        url: this.baseUrl + '/functions/v1/wechat-miniprogram',
        method: 'POST',
        data: body,
        success: (res) => {
          console.log('[任务数据响应]', res.data);
          if (res.data.success) this.itemData = res.data.data;
        },
        fail: (err) => {
          console.error('[获取任务失败]', err);
        }
      });
    }
  }
}
```

---

## 关键修复点总结

### 1. 新增数据字段
```javascript
data() {
  return {
    hostIdentifier: '',    // 保存域名标识符（如 'main', 'dhso_https'）
    originalScene: '',     // 保存完整的 scene 参数（如 'c=7a421d06&d=20260323&h=main&s=f5b4'）
    // ... 其他字段
  }
}
```

### 2. 在 `parseOptions` 中保存参数
```javascript
parseOptions(options) {
  if (options.scene) {
    this.originalScene = options.scene;  // ✅ 保存原始 scene
    // ...
    if (params.h) {
      this.hostIdentifier = params.h;    // ✅ 保存 hostIdentifier
      // ...
    }
  }
}
```

### 3. 在 API 调用中传递参数
```javascript
// ad_callback
{
  // ... 原有参数
  scene: this.originalScene,           // ✅ 传递给云函数
  hostIdentifier: this.hostIdentifier  // ✅ 传递给云函数
}

// get_task_data
{
  // ... 原有参数
  scene: this.originalScene,           // ✅ 传递给云函数
  openid: uni.getStorageSync('openid') || ''
}
```

---

## 为什么需要这些参数？

### `scene` 参数的作用
云函数通过 `scene` 参数从 `mp_qr_generation_logs` 表中查询对应的 `browserId`：

```typescript
// 云函数代码（第914-937行）
const { data: qrLog } = await supabaseClient
  .from("mp_qr_generation_logs")
  .select("details, scene")
  .in("scene", variants)  // 使用 scene 匹配
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (qrLog?.details?.browserId) {
  currentBrowserId = qrLog.details.browserId;  // 恢复 browserId
}
```

### `browserId` 的作用
- H5 端生成小程序码时，会将自己的 `browserId` 记录到 `mp_qr_generation_logs` 表
- 小程序端看完广告后，云函数通过 `scene` 找回这个 `browserId`
- 云函数使用 `browserId` 更新 `ad_unlock_logs` 表中的解锁记录
- H5 端轮询时，通过 `browserId` 查询到最新的解锁状态

### 数据流向
```
H5 生成码 → 记录 browserId 到 mp_qr_generation_logs
     ↓
小程序扫码 → 获取 scene 参数
     ↓
小程序看广告 → 传递 scene 给云函数
     ↓
云函数 → 通过 scene 查询 browserId
     ↓
云函数 → 使用 browserId 更新 ad_unlock_logs
     ↓
H5 轮询 → 通过 browserId 查询解锁状态 ✅
```

---

## 测试验证步骤

1. **更新小程序代码**后重新编译上传
2. **H5 端生成小程序码**
3. **小程序端扫码**，查看控制台日志：
   ```
   [解析结果] { vid: '20260323', checkCode: '7a421d06', hostIdentifier: 'main', originalScene: 'c=7a421d06&d=20260323&h=main&s=f5b4' }
   ```
4. **观看广告完成**，查看控制台日志：
   ```
   [广告完成回调] { action: 'ad_callback', itemId: '20260323', scene: 'c=7a421d06&d=20260323&h=main&s=f5b4', ... }
   ```
5. **H5 端应该立即显示数据**

---

## 云函数日志验证

成功的日志应该包含：
```
[WechatMP] Ad callback: itemId=20260323, host=main, status=completed, browserId=571bc105-8c31-4150-a64a-d15dffc49b7e, scene=c=7a421d06&d=20260323&h=main&s=f5b4
[WechatMP] SUCCESS: Retrieved browserId from qr generation log: 571bc105-8c31-4150-a64a-d15dffc49b7e
```

如果看到：
```
[WechatMP] browserId missing in body, attempting to recover from logs...
```
说明小程序端没有传递 `scene` 参数，需要按照上述方案修复。
