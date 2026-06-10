# SPA 路由配置指南

本项目是一个单页应用（SPA），使用 React Router 进行客户端路由。为了确保所有路由都能通过直接访问 URL 的方式正常工作，需要配置服务器端的 fallback 规则。

## 问题说明

**为什么需要配置？**

- ✅ **应用内导航**（点击链接）：React Router 拦截 → 客户端渲染 → 正常工作
- ❌ **直接访问 URL**（地址栏输入或刷新）：浏览器请求服务器 → 服务器找不到文件 → 返回 404

**解决方案：** 配置服务器将所有未匹配到实际文件的请求都返回 `index.html`，让前端路由接管。

---

## 配置方法（根据您的部署环境选择）

### 1. Vercel 部署

**配置文件：** `vercel.json`（已创建）

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**部署步骤：**
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

✅ **无需额外配置**，Vercel 会自动读取 `vercel.json`

---

### 2. Netlify 部署

**配置文件：** `netlify.toml`（已创建）或 `public/_redirects`（已创建）

**方式 A - 使用 netlify.toml：**
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**方式 B - 使用 _redirects：**
```
/*    /index.html   200
```

**部署步骤：**
```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 登录
netlify login

# 部署
netlify deploy --prod --dir=dist
```

✅ **无需额外配置**，Netlify 会自动读取配置文件

---

### 3. Nginx 服务器

**配置文件：** `/etc/nginx/sites-available/your-site`（参考 `nginx.conf.example`）

**关键配置：**
```nginx
server {
    listen 80;
    server_name mt.wo58.cn;
    root /var/www/html/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**部署步骤：**

1. **构建项目：**
```bash
npm run build
```

2. **上传 dist 目录到服务器：**
```bash
scp -r dist/* user@server:/var/www/html/dist/
```

3. **编辑 Nginx 配置：**
```bash
sudo nano /etc/nginx/sites-available/your-site
```

4. **测试并重启 Nginx：**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 4. Apache 服务器

**配置文件：** `public/.htaccess`（已创建）

**关键配置：**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

**部署步骤：**

1. **构建项目：**
```bash
npm run build
```

2. **上传 dist 目录（包括 .htaccess）到服务器：**
```bash
scp -r dist/* user@server:/var/www/html/
```

3. **确保 Apache 启用了 mod_rewrite：**
```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

---

### 5. Docker + Nginx

**创建 Dockerfile：**

```dockerfile
FROM nginx:alpine

# 复制构建产物
COPY dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**创建 nginx.conf：**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**构建和运行：**
```bash
# 构建前端
npm run build

# 构建 Docker 镜像
docker build -t my-app .

# 运行容器
docker run -d -p 80:80 my-app
```

---

## 验证配置是否生效

配置完成后，测试以下场景：

1. ✅ 直接访问 `https://your-domain.com/admin/pc` → 应该正常显示管理后台
2. ✅ 直接访问 `https://your-domain.com/profile` → 应该正常显示个人中心
3. ✅ 刷新任何页面 → 应该保持在当前页面，不会 404
4. ✅ 访问不存在的路由（如 `/not-exist`）→ 应该显示 404 页面（前端路由处理）

---

## 常见问题

### Q1: 配置后仍然 404？

**检查清单：**
- [ ] 确认配置文件路径正确
- [ ] 确认服务器已重启/重载配置
- [ ] 检查浏览器缓存（Ctrl+Shift+R 强制刷新）
- [ ] 检查服务器日志：`sudo tail -f /var/log/nginx/error.log`

### Q2: 静态资源 404？

确保静态资源路径正确：
- Vite 构建后的资源在 `dist/assets/` 目录
- 检查 `vite.config.ts` 中的 `base` 配置

### Q3: API 请求失败？

如果后端 API 和前端在同一域名下，需要配置反向代理：

**Nginx 示例：**
```nginx
location /api {
    proxy_pass http://backend:3000;
    proxy_set_header Host $host;
}
```

---

## 推荐部署方案

| 场景 | 推荐方案 | 优点 |
|------|---------|------|
| 快速部署 | Vercel / Netlify | 零配置，自动 HTTPS，CDN 加速 |
| 自有服务器 | Nginx | 性能好，配置灵活 |
| 容器化部署 | Docker + Nginx | 环境一致，易于迁移 |
| 共享主机 | Apache + .htaccess | 无需 root 权限 |

---

## 技术支持

如果遇到问题，请提供以下信息：
1. 部署环境（Vercel / Netlify / Nginx / Apache / 其他）
2. 错误信息或截图
3. 服务器日志（如适用）
4. 浏览器控制台错误信息

---

**最后更新：** 2026-03-13
