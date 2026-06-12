#!/bin/bash
# 测试构建脚本（lint 检查调用）
# 支持通过环境变量传入自定义 Supabase 配置
# 用法：VITE_SUPABASE_URL=xxx VITE_SUPABASE_ANON_KEY=xxx npx vite build ...

OUTPUT=$(npx vite build --minify false --logLevel error --outDir /workspace/.dist 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo "$OUTPUT"
fi

exit $EXIT_CODE
