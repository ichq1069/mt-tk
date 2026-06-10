import { defineConfig } from "vite";
import { miaodaDevPlugin } from "miaoda-sc-plugin";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

// 生成编译时间戳作为版本号，确保 index.html 中的 JS 加载能绕过 CDN/浏览器缓存
const buildTime = new Date().getTime();
console.log('Build triggered at:', buildTime);

// https://vite.dev/config/
export default defineConfig({
    // 使用绝对路径 '/' 确保 SPA 懒加载 chunk 在任何路由下都能正确加载
    // 如需部署在子目录下，请设置 VITE_BASE_PATH 环境变量（如 '/app/'）
    base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    miaodaDevPlugin(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 代码分割优化
    rollupOptions: {
      output: {
        // 版本化资源命名，确保缓存失效
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: (id) => {
          // 将所有第三方库合并到同一个 vendor chunk 中
          // 彻底解决因循环依赖导致的分块顺序错乱、React 重复打包、
          // useLayoutEffect 未定义等运行时白屏问题
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 设置 chunk 大小警告限制
    chunkSizeWarningLimit: 500,
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    // 启用 sourcemap（仅用于错误追踪）
    sourcemap: false,
    // 优化资源内联阈值
    assetsInlineLimit: 4096, // 4KB 以下内联
  },
  // 性能优化
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-tooltip',
      'recharts',
      'react-helmet-async',
      'rrweb',
      'web-vitals'
    ],
    exclude: ['@tanstack/react-virtual'],
  },
  // 开发服务器优化
  server: {
    hmr: {
      overlay: false, // 禁用错误覆盖层，提升开发体验
    },
  },
});
