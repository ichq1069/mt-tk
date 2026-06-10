# Cloudflare R2 存储配置指南

## 1. 获取 Cloudflare R2 凭证

### 步骤 1: 登录 Cloudflare Dashboard
访问 https://dash.cloudflare.com/ 并登录您的账户

### 步骤 2: 创建 R2 存储桶
1. 在左侧菜单选择 **R2**
2. 点击 **创建存储桶**
3. 输入存储桶名称（例如：`my-media-bucket`）
4. 选择区域（建议选择离用户最近的区域）
5. 点击 **创建存储桶**

### 步骤 3: 获取 API 凭证
1. 在 R2 页面，点击右上角 **管理 R2 API 令牌**
2. 点击 **创建 API 令牌**
3. 选择权限：
   - **对象读取和写入** (Object Read & Write)
   - 或选择 **管理员读写** (Admin Read & Write)
4. 点击 **创建 API 令牌**
5. 保存显示的：
   - **Access Key ID**（访问密钥 ID）
   - **Secret Access Key**（密钥）

### 步骤 4: 获取端点地址
1. 返回 R2 存储桶列表
2. 点击您创建的存储桶
3. 在 **设置** 标签页找到：
   - **S3 API 端点**（格式类似：`https://<account_id>.r2.cloudflarestorage.com`）
   - **Account ID**（账户 ID）

### 步骤 5: 配置自定义域名（可选）
1. 在存储桶设置中，点击 **自定义域**
2. 添加您的域名（例如：`cdn.yourdomain.com`）
3. 按照提示配置 DNS 记录
4. 等待 DNS 生效后，可以使用自定义域名访问文件

## 2. 在应用中配置

### 管理员操作步骤：
1. 使用管理员账号登录应用
2. 进入 **管理后台** → **存储配置**
3. 填写以下信息：
   - **用户 ID (Account ID)**: 您的 Cloudflare 账户 ID
   - **密钥 ID (Access Key ID)**: 从步骤 3 获取
   - **密钥 (Secret Access Key)**: 从步骤 3 获取
   - **端点 (Endpoint)**: 从步骤 4 获取的 S3 API 端点
   - **存储桶名称 (Bucket Name)**: 您创建的存储桶名称
   - **自定义域名 (Custom Domain)**: （可选）如果配置了自定义域名，填写完整 URL（例如：`https://cdn.yourdomain.com`）

4. 点击 **检测连接** 验证配置是否正确
5. 验证成功后，点击 **保存配置**

## 3. 配置示例

```
用户 ID: abc123def456
密钥 ID: 1234567890abcdef1234567890abcdef
密钥: abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ
端点: https://abc123def456.r2.cloudflarestorage.com
存储桶名称: my-media-bucket
自定义域名: https://cdn.example.com (可选)
```

## 4. 验证配置

配置完成后：
1. 普通用户上传图片/视频时，文件将自动上传到 R2
2. 上传成功后，URL 将使用自定义域名（如果配置）或 R2 默认域名
3. 所有已发布的内容将在探索页展示

## 5. 常见问题

### Q: 连接检测失败，提示 Missing x-amz-content-sha256？
A: 这是因为 R2 存储对 S3 API 的安全要求。应用已在 Edge Function 签名逻辑中包含此头信息。如果仍然报错，请确保您的存储桶名称（Bucket Name）和端点（Endpoint）不包含多余的斜杠或空格。

### Q: 连接检测失败，提示存储桶不存在？
A: 请确认存储桶名称拼写正确，且该存储桶已在 Cloudflare 中创建

### Q: 上传成功但无法访问图片？
A: 请检查存储桶的公开访问设置，或配置自定义域名以提供公开访问

### Q: 如何修改已配置的信息？
A: 管理员可随时进入存储配置页面修改，修改后立即生效

## 6. 安全建议

- ✅ 定期轮换 API 密钥
- ✅ 仅授予必要的权限（对象读写即可）
- ✅ 不要将密钥分享给他人
- ✅ 使用自定义域名提升品牌形象
- ✅ 定期检查存储用量，避免超出配额

## 7. 技术说明

本应用使用以下技术实现 R2 存储：
- **AWS Signature V4** 签名算法进行身份验证
- **S3 兼容 API** 进行文件上传和管理
- **Edge Function** 在服务端处理签名，保护密钥安全
- **路径式访问** 支持标准 S3 API 调用方式
