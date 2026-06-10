# Zonerama 接口配置快速指南

## 配置项总览

| 配置项 | 默认值 | 用途 | 格式示例 |
|---|---|---|---|
| 图片接口 | `https://zomphoto.wo58.cn/?url=` | 探索页、个人中心等单张图片 | `?url=完整URL` |
| 图集内图片接口 | `https://zomphoto.wo58.cn/album?albumId=` | 图集写真模块 | `?albumId=ID&img=路径` |

## 快速配置步骤

### 1. 登录后台

访问后台管理系统，使用管理员账号登录。

### 2. 进入配置页面

**系统参数设置** → **存储管理** → **专享上传**

### 3. 填写配置

#### 图片接口（可选）
```
https://zomphoto.wo58.cn/?url=
```

#### 图集内图片接口（可选）
```
https://zomphoto.wo58.cn/album?albumId=
```

### 4. 保存配置

点击「保存配置」按钮，等待保存成功提示。

### 5. 验证配置

1. 刷新前端页面（Ctrl+Shift+R）
2. 打开浏览器控制台（F12）
3. 查看初始化日志，确认配置已加载
4. 访问探索页或图集页面，查看图片是否正常显示

## 接口格式对比

### 图片接口

**输入**：
```
https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
```

**输出**：
```
https://zomphoto.wo58.cn/?url=https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
```

### 图集内图片接口

**输入**：
```
URL: https://us.zonerama.com/photos/1019401782_2000x2000_0.jpg
albumId: 12345
```

**输出**：
```
https://zomphoto.wo58.cn/album?albumId=12345&img=/photos/1019401782_2000x2000_0.jpg
```

## 常见问题

### Q: 配置后图片不显示？

**A**: 
1. 硬刷新页面（Ctrl+Shift+R）
2. 检查控制台日志
3. 检查网络请求

### Q: 如何验证配置是否生效？

**A**: 
1. 打开浏览器 Network 标签
2. 筛选 `zomphoto` 相关请求
3. 确认请求 URL 格式正确

### Q: 不配置会怎样？

**A**: 
- Zonerama 图片不会显示
- 控制台显示安全拦截警告
- 这是安全设计，不是 Bug

## 相关文档

- 详细说明: `ZONERAMA_ALBUM_PHOTO_API.md`
- 安全规则: `ZONERAMA_SECURITY_RULES.md`
- 测试说明: `ZONERAMA_FIX_TEST.md`

---

**创建时间**: 2026-04-02  
**版本**: 1.0.0
