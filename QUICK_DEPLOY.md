# 快速部署指南 - 让所有链接都能直接访问

## 🎯 问题说明

您的应用是单页应用（SPA），当前遇到的问题是：
- ✅ 在应用内点击链接可以正常跳转
- ❌ 直接在浏览器地址栏输入 URL 会返回 404

这是因为服务器没有配置 SPA fallback 规则。

---

## 🚀 快速解决方案

### 方案 1：使用 Vercel（推荐 - 最简单）

1. **安装 Vercel CLI：**
```bash
npm i -g vercel
```

2. **登录 Vercel：**
```bash
vercel login
```

3. **部署项目：**
```bash
cd /workspace/app-a8orwhnquio1
vercel --prod
```

✅ **完成！** 项目已自动配置好 SPA 路由支持（使用项目中的 `vercel.json`）

---

### 方案 2：使用 Netlify

1. **安装 Netlify CLI：**
```bash
npm i -g netlify-cli
```

2. **登录 Netlify：**
```bash
netlify login
```

3. **构建项目：**
```bash
npm run build
```

4. **部署：**
```bash
netlify deploy --prod --dir=dist
```

✅ **完成！** 项目已自动配置好 SPA 路由支持（使用项目中的 `netlify.toml` 和 `public/_redirects`）

---

### 方案 3：使用 Nginx 服务器

**如果您的域名 `mt.wo58.cn` 使用的是 Nginx 服务器：**

1. **SSH 登录到服务器：**
```bash
ssh user@mt.wo58.cn
```

2. **编辑 Nginx 配置：**
```bash
sudo nano /etc/nginx/sites-available/mt.wo58.cn
```

3. **添加以下配置：**
```nginx
server {
    listen 80;
    server_name mt.wo58.cn;
    root /var/www/html/dist;  # 替换为您的实际路径
    index index.html;

    # 关键配置 - SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

4. **测试配置：**
```bash
sudo nginx -t
```

5. **重启 Nginx：**
```bash
sudo systemctl reload nginx
```

6. **上传构建文件：**
```bash
# 在本地执行
npm run build
scp -r dist/* user@mt.wo58.cn:/var/www/html/dist/
```

✅ **完成！** 现在所有路由都可以直接访问了

---

### 方案 4：使用 Apache 服务器

**如果您的服务器使用 Apache：**

1. **构建项目：**
```bash
npm run build
```

2. **上传文件到服务器：**
```bash
scp -r dist/* user@server:/var/www/html/
```

项目中已经包含了 `public/.htaccess` 文件，会自动复制到 `dist` 目录。

3. **确保 Apache 启用了 mod_rewrite：**
```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

✅ **完成！** `.htaccess` 文件会自动处理 SPA 路由

---

## 🧪 验证配置

配置完成后，测试以下链接（替换为您的域名）：

1. 直接访问管理后台：
   ```
   https://mt.wo58.cn/admin/pc
   ```

2. 直接访问个人中心：
   ```
   https://mt.wo58.cn/profile
   ```

3. 直接访问上传页面：
   ```
   https://mt.wo58.cn/upload
   ```

4. 刷新任意页面：
   - 应该保持在当前页面，不会跳转到 404

---

## 📋 已创建的配置文件

项目中已经为您创建了以下配置文件：

| 文件 | 用途 | 部署平台 |
|------|------|---------|
| `vercel.json` | Vercel 配置 | Vercel |
| `netlify.toml` | Netlify 配置 | Netlify |
| `public/_redirects` | Netlify 重定向规则 | Netlify |
| `public/.htaccess` | Apache 配置 | Apache 服务器 |
| `nginx.conf.example` | Nginx 配置示例 | Nginx 服务器 |

---

## ❓ 常见问题

### Q: 我不知道我的服务器用的是什么？

**检查方法：**

```bash
# 检查是否是 Nginx
nginx -v

# 检查是否是 Apache
apache2 -v
# 或
httpd -v
```

### Q: 配置后还是 404？

**排查步骤：**

1. **清除浏览器缓存：**
   - 按 `Ctrl + Shift + R`（Windows/Linux）
   - 按 `Cmd + Shift + R`（Mac）

2. **检查服务器配置是否生效：**
   ```bash
   # Nginx
   sudo nginx -t
   sudo systemctl status nginx
   
   # Apache
   sudo apachectl configtest
   sudo systemctl status apache2
   ```

3. **查看服务器日志：**
   ```bash
   # Nginx
   sudo tail -f /var/log/nginx/error.log
   
   # Apache
   sudo tail -f /var/log/apache2/error.log
   ```

### Q: 我想用最简单的方法？

**推荐使用 Vercel：**
- 免费
- 自动 HTTPS
- 全球 CDN 加速
- 零配置
- 一条命令部署

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## 📞 需要帮助？

如果遇到问题，请提供：
1. 您使用的部署方式（Vercel / Netlify / Nginx / Apache）
2. 错误截图或错误信息
3. 服务器日志（如适用）

详细文档请查看：`SPA_ROUTING_GUIDE.md`

---

**最后更新：** 2026-03-13
