# Image Processing Proxy Service

A Node.js real-time image processing proxy for Cloudflare R2 (CFR2) or other remote image storage.

## Features
- Real-time resizing (`w`, `h`)
- Real-time cropping (`mode=crop`)
- Real-time quality adjustment (`quality`)
- Format conversion (e.g., `format=webp`)
- Memory-based processing using `sharp`
- No local storage or modified source files

## Installation
```bash
# 进入服务目录
cd services/image-proxy

# 安装依赖
npm install
```

## Configuration
Set the following environment variables:
- `PORT`: Server port (default: 3001)
- `R2_BASE_URL`: Your Cloudflare R2 public domain (e.g., https://pub-xxx.r2.dev)

## Deployment (Start)
```bash
# 直接启动
npm start

# 使用 PM2 启动 (推荐)
pm2 start index.js --name image-proxy
```

## Usage
Access format: `https://your-proxy-domain/img/IMAGE_PATH?w=300&h=300&quality=80&mode=crop&format=webp`

### Examples:
- **Width only (height auto)**: `?w=300`
- **Height only (width auto)**: `?h=300`
- **Center Crop**: `?w=300&h=300&mode=crop`
- **Quality adjustment**: `?quality=85`
- **Force WebP**: `?format=webp`
