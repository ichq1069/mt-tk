#!/bin/bash

# 正式构建脚本
# 支持通过环境变量自定义 Supabase 配置
# 用法：
#   VITE_SUPABASE_URL=https://xxx VITE_SUPABASE_ANON_KEY=xxx ./scripts/build-prod.sh
#   或直接 ./scripts/build-prod.sh（使用 .env 中的默认值）

set -e

echo "================================"
echo "  正式生产构建"
echo "================================"
echo ""

# 检查环境变量
if [ -n "$VITE_SUPABASE_URL" ]; then
  echo "自定义 Supabase URL: $VITE_SUPABASE_URL"
else
  echo "使用默认 Supabase URL"
fi

if [ -n "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "自定义 Supabase Anon Key: ${VITE_SUPABASE_ANON_KEY:0:20}..."
else
  echo "使用默认 Supabase Anon Key"
fi

echo ""
echo "开始构建..."
echo ""

# 执行正式构建（启用压缩、清空输出目录）
# base 路径由 vite.config.ts 中的配置决定（默认 '/'，可通过 VITE_BASE_PATH 覆盖）
# 注意：环境变量会自动被 Vite 读取（VITE_ 前缀）
npx vite build \
  --outDir /workspace/.dist \
  --emptyOutDir

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "================================"
  echo "  构建成功"
  echo "================================"
  echo "输出目录: /workspace/.dist"
  echo ""
  echo "预览命令: npm run preview"
  echo "  或: npx vite preview --outDir /workspace/.dist --host"
  echo ""
else
  echo ""
  echo "================================"
  echo "  构建失败"
  echo "================================"
  exit $EXIT_CODE
fi
