import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { reportWebVitals, sendToAnalytics } from "./lib/webVitals";
import { logCollector } from "./lib/logCollector";

// 初始化日志收集器
if (typeof window !== 'undefined') {
  // 确保在其他代码运行前初始化拦截器
  (window as any).__logCollector = logCollector;
}

// 初始化会话 ID 用于性能追踪
if (typeof window !== 'undefined') {
  (window as any).__session_id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  console.log("!!! APP MAIN STARTING - " + new Date().toISOString() + " !!!");
}

// 过滤浏览器扩展错误（如翻译插件）
window.addEventListener('unhandledrejection', (event) => {
  const isExtensionError = 
    event.reason?.err?.message?.includes('message port closed') ||
    event.reason?.cmd === 'beacon-report-mes' ||
    (typeof event.reason === 'object' && event.reason?.cmd && event.reason?.err);
  
  if (isExtensionError) {
    event.preventDefault();
    console.debug('[扩展错误已过滤]', event.reason);
  }
});

// 注册 Service Worker（探索页 / 写真图集页 / 每日图集页 缓存加速）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // 使用相对路径注册 SW
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        console.debug('[SW] 注册成功，scope:', registration.scope);

        // 检测到新版 SW 时提示用户刷新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.debug('[SW] 新版本已就绪，将在下次访问时生效');
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[SW] 注册失败:', err);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// 性能监控
reportWebVitals(sendToAnalytics);
