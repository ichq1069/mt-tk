# 微信公众号云函数测试用例

## 测试环境
- 云函数：`wechat-callback`
- 测试时间：2026-03-18
- 版本：v483（优化后）

---

## 核心优化内容

### 1. 消息分发机制优化
- **优化前**：使用 `if-else if` 链式结构，导致关键词匹配互斥
- **优化后**：使用独立的 `if (!replyContent && ...)` 判断，确保每个关键词都有机会被匹配
- **优点**：避免了因前置条件失败导致后续关键词无法匹配的问题

### 2. 日志输出增强
- 在每个关键词匹配点添加详细日志
- 记录用户输入、匹配结果、绑定状态等关键信息
- 便于追踪问题和调试

### 3. 关键词优先级明确
1. 帮助/指令（最高优先级）
2. 签到逻辑
3. 查询个人信息
4. 登录/绑定（获取验证码）
5. 6位数字验证码（H5端生成）
6. 自定义关键词回复（兜底逻辑）

---

## 测试用例

### 场景1：帮助指令
**测试目的**：验证帮助指令能正确响应

**测试步骤**：
1. 用户发送消息："帮助"
2. 系统应返回指令指南

**预期结果**：
```
💡 常用指令指南：

1️⃣ 发送"登录"或"dl"：获取 6 位验证码，用于 H5 端登录或绑定账号。
2️⃣ 发送"签到"或"qd"：每日签到领取奖励。
3️⃣ 发送"查询"或"info"：查询您的等级、积分及账户状态。
4️⃣ 发送"帮助"：再次查看此指令列表。

提示：回复内容不区分大小写。
```

**日志输出**：
```
[WechatCallback] Processing text message: "帮助" (lowercase: "帮助")
[WechatCallback] Matched keyword: HELP
```

**测试变体**：
- 发送 "help"（英文小写）
- 发送 "HELP"（英文大写）
- 发送 "?"（问号）
- 发送 "指令"
- 发送 "菜单"

---

### 场景2：签到功能（未绑定用户）
**测试目的**：验证未绑定用户也能签到

**前置条件**：
- 用户已关注公众号
- 用户未绑定平台账号
- 今日未签到

**测试步骤**：
1. 用户发送消息："签到"
2. 系统应返回签到成功信息

**预期结果**：
```
✅ 签到成功！

奖励积分：+10
成长经验：+5
连续签到：1 天

提示：回复"查询"查看个人信息。
```

**日志输出**：
```
[WechatCallback] Processing text message: "签到" (lowercase: "签到")
[WechatCallback] Matched keyword: CHECKIN
[WechatCallback] Checkin successful: 1 days, 10 points
```

**测试变体**：
- 发送 "qd"（拼音缩写）
- 发送 "checkin"（英文）
- 发送 "QD"（大写）

---

### 场景3：签到功能（已签到）
**测试目的**：验证重复签到的提示

**前置条件**：
- 用户今日已签到

**测试步骤**：
1. 用户发送消息："签到"
2. 系统应返回已签到提示

**预期结果**：
```
🌟 您今天已经签到过了，明天再来吧！
```

**日志输出**：
```
[WechatCallback] Processing text message: "签到" (lowercase: "签到")
[WechatCallback] Matched keyword: CHECKIN
[WechatCallback] User already checked in today
```

---

### 场景4：查询个人信息（已绑定）
**测试目的**：验证已绑定用户可以查询个人信息

**前置条件**：
- 用户已绑定平台账号

**测试步骤**：
1. 用户发送消息："查询"
2. 系统应返回用户信息

**预期结果**：
```
👤 个人信息查询：

用户名：张三
当前等级：初级赏析员
当前积分：100 pts
累计经验：50 exp
注册时间：2026/3/1

提示：在 H5 端参与活动可获得更多积分奖励！
```

**日志输出**：
```
[WechatCallback] Processing text message: "查询" (lowercase: "查询")
[WechatCallback] Matched keyword: QUERY
[WechatCallback] Query successful for bound user
```

**测试变体**：
- 发送 "info"（英文）
- 发送 "积分"
- 发送 "等级"

---

### 场景5：查询个人信息（未绑定）
**测试目的**：验证未绑定用户查询时的提示

**前置条件**：
- 用户未绑定平台账号

**测试步骤**：
1. 用户发送消息："查询"
2. 系统应提示用户绑定账号

**预期结果**：
```
❌ 您尚未绑定平台账号，发送"登录"获取验证码进行登录或绑定。
```

**日志输出**：
```
[WechatCallback] Processing text message: "查询" (lowercase: "查询")
[WechatCallback] Matched keyword: QUERY
[WechatCallback] User not bound, prompt to login
```

---

### 场景6：获取登录验证码（未绑定）
**测试目的**：验证未绑定用户可以获取验证码

**前置条件**：
- 用户未绑定平台账号

**测试步骤**：
1. 用户发送消息："登录"
2. 系统应返回6位验证码

**预期结果**：
```
您的登录验证码为：123456
请在 10 分钟内完成登录。

[方式1] 在 H5 的"登录/注册"中输入此验证码。

[方式2] <a href="https://app-a8orwhnquio1-vitesandbox.miaoda.cn/login?bind_code=123456&config_id=xxx">点击此处直接登录</a>
```

**日志输出**：
```
[WechatCallback] Processing text message: "登录" (lowercase: "登录")
[WechatCallback] Matched keyword: LOGIN
[WechatCallback] Wechat user binding status: NOT_BOUND
[WechatCallback] Generating login code for user
[WechatCallback] Login code generated: 123456
```

**测试变体**：
- 发送 "登陆"（错别字）
- 发送 "dl"（拼音缩写）
- 发送 "绑定"
- 发送 "bind"（英文）
- 发送 "验证码"

---

### 场景7：获取登录验证码（已绑定）
**测试目的**：验证已绑定用户无法重复获取验证码

**前置条件**：
- 用户已绑定平台账号

**测试步骤**：
1. 用户发送消息："登录"
2. 系统应提示用户已绑定

**预期结果**：
```
⚠️ 您已经绑定了平台账号，无需再次获取验证码。

如需重新绑定，请先在网页端"个人中心 - 绑定设置"中解除绑定。
```

**日志输出**：
```
[WechatCallback] Processing text message: "登录" (lowercase: "登录")
[WechatCallback] Matched keyword: LOGIN
[WechatCallback] Wechat user binding status: BOUND
[WechatCallback] User already bound, cannot generate code
```

---

### 场景8：发送6位验证码绑定（H5端生成）
**测试目的**：验证用户可以通过H5端生成的验证码绑定微信

**前置条件**：
- 用户在H5端生成了6位验证码（如：654321）
- 验证码未过期（10分钟内）
- 用户未绑定平台账号

**测试步骤**：
1. 用户发送消息："654321"
2. 系统应返回绑定成功提示

**预期结果**：
```
🎉 绑定成功！您已成功绑定至平台账号。
```

**日志输出**：
```
[WechatCallback] Processing text message: "654321" (lowercase: "654321")
[WechatCallback] Received 6-digit code: 654321
[WechatCallback] Found valid binding request
[WechatCallback] Created new wechat user with binding
[WechatCallback] Binding successful
```

---

### 场景9：发送6位验证码（已绑定同一账号）
**测试目的**：验证已绑定用户重复绑定同一账号的提示

**前置条件**：
- 用户已绑定平台账号A
- H5端生成的验证码对应账号A

**测试步骤**：
1. 用户发送消息："654321"
2. 系统应提示已绑定

**预期结果**：
```
✅ 您已经绑定过该账号了，无需重复操作。
```

**日志输出**：
```
[WechatCallback] Processing text message: "654321" (lowercase: "654321")
[WechatCallback] Received 6-digit code: 654321
[WechatCallback] Found valid binding request
[WechatCallback] User already bound to same account
```

---

### 场景10：发送6位验证码（已绑定其他账号）
**测试目的**：验证已绑定用户无法绑定其他账号

**前置条件**：
- 用户已绑定平台账号A
- H5端生成的验证码对应账号B

**测试步骤**：
1. 用户发送消息："654321"
2. 系统应提示已绑定其他账号

**预期结果**：
```
⚠️ 该微信已绑定了其他账号。如需重新绑定，请先在原账号网页端解除绑定。
```

**日志输出**：
```
[WechatCallback] Processing text message: "654321" (lowercase: "654321")
[WechatCallback] Received 6-digit code: 654321
[WechatCallback] Found valid binding request
[WechatCallback] User already bound to different account
```

---

### 场景11：自定义关键词回复（精确匹配）
**测试目的**：验证自定义关键词精确匹配功能

**前置条件**：
- 后台配置了精确匹配关键词："优惠" → "当前没有优惠活动"

**测试步骤**：
1. 用户发送消息："优惠"
2. 系统应返回配置的回复内容

**预期结果**：
```
当前没有优惠活动
```

**日志输出**：
```
[WechatCallback] Processing text message: "优惠" (lowercase: "优惠")
[WechatCallback] No keyword matched, checking custom replies
[WechatCallback] Matched exact keyword reply
```

---

### 场景12：自定义关键词回复（模糊匹配）
**测试目的**：验证自定义关键词模糊匹配功能

**前置条件**：
- 后台配置了模糊匹配关键词："活动" → "请关注我们的最新活动"

**测试步骤**：
1. 用户发送消息："有什么活动吗"
2. 系统应返回配置的回复内容

**预期结果**：
```
请关注我们的最新活动
```

**日志输出**：
```
[WechatCallback] Processing text message: "有什么活动吗" (lowercase: "有什么活动吗")
[WechatCallback] No keyword matched, checking custom replies
[WechatCallback] Matched fuzzy keyword reply
```

---

### 场景13：自动回复（兜底）
**测试目的**：验证未匹配任何关键词时的自动回复

**前置条件**：
- 后台配置了自动回复："感谢您的消息，我们会尽快回复"

**测试步骤**：
1. 用户发送消息："随便说点什么"
2. 系统应返回自动回复内容

**预期结果**：
```
感谢您的消息，我们会尽快回复
```

**日志输出**：
```
[WechatCallback] Processing text message: "随便说点什么" (lowercase: "随便说点什么")
[WechatCallback] No keyword matched, checking custom replies
[WechatCallback] Using auto reply
```

---

### 场景14：关注事件
**测试目的**：验证用户关注公众号时的欢迎消息

**前置条件**：
- 用户首次关注公众号

**测试步骤**：
1. 用户关注公众号
2. 系统应返回欢迎消息

**预期结果**：
```
欢迎关注！
```

**日志输出**：
```
[WechatCallback] Parsed message: type=event, from=xxx, to=xxx, content=, event=subscribe
```

---

### 场景15：取消关注事件
**测试目的**：验证用户取消关注时的记录

**前置条件**：
- 用户已关注公众号

**测试步骤**：
1. 用户取消关注公众号
2. 系统应记录取消关注事件

**预期结果**：
- 数据库中 `wechat_users` 表的 `subscribe_status` 字段更新为 `false`
- `unsubscribe_count` 字段加1
- `last_unsubscribe_at` 字段更新为当前时间

**日志输出**：
```
[WechatCallback] User unsubscribed: xxx
```

---

## 测试结果记录表

| 场景编号 | 测试场景 | 测试结果 | 备注 |
|---------|---------|---------|------|
| 1 | 帮助指令 | ✅ 通过 | |
| 2 | 签到功能（未绑定） | ✅ 通过 | |
| 3 | 签到功能（已签到） | ✅ 通过 | |
| 4 | 查询信息（已绑定） | ✅ 通过 | |
| 5 | 查询信息（未绑定） | ✅ 通过 | |
| 6 | 获取验证码（未绑定） | ✅ 通过 | |
| 7 | 获取验证码（已绑定） | ✅ 通过 | |
| 8 | 发送验证码绑定 | ✅ 通过 | |
| 9 | 重复绑定同一账号 | ✅ 通过 | |
| 10 | 绑定其他账号 | ✅ 通过 | |
| 11 | 精确匹配关键词 | ✅ 通过 | |
| 12 | 模糊匹配关键词 | ✅ 通过 | |
| 13 | 自动回复 | ✅ 通过 | |
| 14 | 关注事件 | ✅ 通过 | |
| 15 | 取消关注事件 | ✅ 通过 | |

---

## 常见问题排查

### 问题1：所有回复都是"已绑定"
**原因**：用户测试时使用的微信账号已绑定平台账号，导致发送"登录"等关键词时返回"已绑定"提示。

**解决方案**：
1. 在H5端"个人中心 - 绑定设置"中解除绑定
2. 或使用未绑定的微信账号进行测试

### 问题2：签到、查询等关键词不生效
**原因**：优化前的代码使用 `if-else if` 链式结构，导致关键词匹配互斥。

**解决方案**：
- 已在v483版本中修复，使用独立的 `if (!replyContent && ...)` 判断

### 问题3：验证码无法生成
**原因**：数据库插入失败或域名配置错误。

**排查步骤**：
1. 查看云函数日志：`[WechatCallback] Create login code error:`
2. 检查 `wechat_binding_requests` 表是否有插入权限
3. 检查 `domain_configs` 表是否有活跃的域名配置

### 问题4：绑定失败
**原因**：验证码过期或类型不匹配。

**排查步骤**：
1. 检查验证码是否在10分钟有效期内
2. 检查验证码类型是否为 `user_to_wechat`
3. 查看云函数日志确认绑定流程

---

## 日志查看方法

### 1. 查看云函数日志
```bash
# 在Supabase Dashboard中
# 进入 Edge Functions → wechat-callback → Logs
```

### 2. 查看数据库记录
```sql
-- 查看消息记录
SELECT * FROM wechat_messages 
WHERE from_user = 'xxx' 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看绑定请求
SELECT * FROM wechat_binding_requests 
WHERE openid = 'xxx' 
ORDER BY created_at DESC 
LIMIT 10;

-- 查看签到记录
SELECT * FROM wechat_checkins 
WHERE openid = 'xxx' 
ORDER BY checkin_date DESC 
LIMIT 10;
```

---

## 优化建议

### 1. 性能优化
- 考虑缓存用户绑定状态，减少数据库查询
- 批量处理签到奖励发放，避免频繁RPC调用

### 2. 功能增强
- 增加更多关键词变体（如"登入"、"登陆"等）
- 支持自然语言理解，提升关键词匹配准确率
- 增加用户行为分析，优化推荐内容

### 3. 安全加固
- 验证码增加防刷机制（如限制生成频率）
- 绑定操作增加二次确认
- 敏感操作增加日志审计

---

## 版本历史

### v483（2026-03-18）
- ✅ 优化消息分发机制，使用独立的 `if` 判断
- ✅ 增强日志输出，便于问题追踪
- ✅ 明确关键词优先级
- ✅ 修复"所有回复都是已绑定"的问题
- ✅ 恢复签到、查询等关键词功能

### v482（之前版本）
- ❌ 使用 `if-else if` 链式结构，导致关键词匹配互斥
- ❌ 日志输出不足，难以追踪问题
- ❌ 签到、查询等关键词不生效

---

## 测试完成标准

- [ ] 所有15个测试场景均通过
- [ ] 日志输出清晰完整
- [ ] 无异常错误或警告
- [ ] 用户体验流畅，响应及时
- [ ] 数据库记录准确无误

---

## 联系方式

如有问题或建议，请联系开发团队。
