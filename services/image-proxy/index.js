const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const app = express();
const PORT = process.env.PORT || 3001;

// 解决 CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  next();
});

// 图片代理处理端点
// 访问格式: /img/图片路径?w=宽度&h=高度&quality=画质&mode=crop&format=webp
app.get('/img/*', async (req, res) => {
  try {
    // 1. 解析原始图片 URL
    // 假设 R2 存储的基础域名, 也可以通过参数传入或环境变量设置
    const R2_BASE_URL = process.env.R2_BASE_URL || 'https://pub-a39e26dae2e041e189462c89729727c7.r2.dev';
    const imagePath = req.params[0];
    const originUrl = `${R2_BASE_URL}/${imagePath}`;

    // 2. 解析处理参数
    const w = parseInt(req.query.w);
    const h = parseInt(req.query.h);
    const quality = parseInt(req.query.quality || '80');
    const mode = req.query.mode; // 'crop' or others
    const format = req.query.format; // 'webp', 'jpeg', 'png'

    console.log(`[Proxy] Processing: ${originUrl}, params: w=${w}, h=${h}, q=${quality}, mode=${mode}, format=${format}`);

    // 3. 获取远程图片
    const response = await axios({
      url: originUrl,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 10000
    });

    // 4. 使用 sharp 进行实时处理
    let pipeline = sharp(response.data);

    // 缩放与裁剪逻辑
    if (w || h) {
      if (mode === 'crop' && w && h) {
        // 居中裁剪
        pipeline = pipeline.resize(w, h, {
          fit: 'cover',
          position: 'center'
        });
      } else {
        // 等比缩放
        pipeline = pipeline.resize(w, h, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }

    // 画质与格式转换
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality });
    } else if (format === 'png') {
      pipeline = pipeline.png({ quality });
    } else {
      // 默认转 jpeg 以获得较好的压缩率
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    }

    // 5. 输出处理后的图片流
    const resultBuffer = await pipeline.toBuffer();
    const resultFormat = format || 'jpeg';
    
    res.set({
      'Content-Type': `image/${resultFormat}`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Proxy-By': 'Node-Sharp-Proxy'
    });

    res.send(resultBuffer);

  } catch (error) {
    console.error('[Proxy Error]:', error.message);
    if (error.response && error.response.status === 404) {
      return res.status(404).send('Original image not found');
    }
    res.status(500).send('Image processing failed');
  }
});

// 基础健康检查
app.get('/health', (req, res) => res.send('Image Proxy is running'));

app.listen(PORT, () => {
  console.log(`Image Proxy Server listening on port ${PORT}`);
  console.log(`Base R2 URL: ${process.env.R2_BASE_URL || 'Not Set'}`);
});
