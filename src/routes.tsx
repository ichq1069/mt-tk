import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { PageTransition } from './components/common/PageTransition';

// 加载中组件
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 animate-pulse">
      Loading Experience
    </p>
  </div>
);

// 懒加载包装器
const lazyLoad = (importFunc: () => Promise<{ default: React.ComponentType<any> }>) => {
  const LazyComponent = lazy(importFunc);
  return (
    <Suspense fallback={<PageLoader />}>
      <LazyComponent />
    </Suspense>
  );
};

// 立即加载的关键页面（首屏）
import Home from './pages/Home';
import LoginPage from './pages/LoginPage';
import MPBindPage from './pages/MPBindPage';
import NotFound from './pages/NotFound';
// PCDashboard 已移动到懒加载列表

export interface RouteConfig {
  path: string;
  element: ReactNode;
  label?: string;
  adminOnly?: boolean;
  importFunc?: () => Promise<any>;
}

// 懒加载包装器，记录 importFunc，增加加载重试机制
const lazyLoadWithPrefetch = (importFunc: () => Promise<{ default: React.ComponentType<any> }>) => {
  const LazyComponent = lazy(async () => {
    try {
      return await importFunc();
    } catch (error: any) {
      console.error('Lazy load failed, retrying...', error);
      
      const isChunkLoadError = error.name === 'ChunkLoadError' || 
                             /Failed to fetch dynamically imported module/i.test(error.message);

      if (isChunkLoadError) {
        const lastReloaded = sessionStorage.getItem('last_chunk_error_reload');
        const now = Date.now();
        
        // 如果是首次报错，延迟 1.5 秒重试
        // 如果 10 秒内已经刷新过页面但仍然报错，则抛出错误让 ErrorBoundary 处理
        if (!lastReloaded || now - parseInt(lastReloaded) > 10000) {
           return new Promise<{ default: React.ComponentType<any> }>((resolve, reject) => {
            setTimeout(async () => {
              try {
                const res = await importFunc();
                resolve(res);
              } catch (retryError) {
                console.error('Lazy load retry failed, forcing reload:', retryError);
                sessionStorage.setItem('last_chunk_error_reload', Date.now().toString());
                window.location.reload();
                // 返回一个永远不会 resolve 的 promise，因为页面即将刷新
                return;
              }
            }, 1500);
          });
        }
      }
      
      throw error;
    }
  });
  return {
    element: (
      <Suspense fallback={<PageLoader />}>
        <PageTransition>
          <LazyComponent />
        </PageTransition>
      </Suspense>
    ),
    importFunc
  };
};

const wrap = (comp: ReactNode) => (
  <PageTransition>{comp}</PageTransition>
);

export const routes: RouteConfig[] = [
  // 关键页面 - 立即加载，首页已在 Layout 中常驻渲染，路由层返回空
  { path: '/', element: null, label: '探索' },
  { path: '/login', element: wrap(<LoginPage />), label: '登录' },
  { path: '/mp/bind', element: wrap(<MPBindPage />), label: '小程序绑定' },
  { path: '/mp/wxlogin', element: wrap(<MPBindPage />), label: '微信登录' },
  
  { path: '/tags', ...lazyLoadWithPrefetch(() => import('./pages/Tags')), label: '标签云' },
  // 次要页面 - 懒加载
  { path: '/debug', ...lazyLoadWithPrefetch(() => import('./pages/Debug')), label: '调试' },
  { path: '/upload', ...lazyLoadWithPrefetch(() => import('./pages/Upload')), label: '壁纸分享' },
  { path: '/profile', ...lazyLoadWithPrefetch(() => import('./pages/Profile')), label: '我的' },
  { path: '/notifications', ...lazyLoadWithPrefetch(() => import('./pages/Notifications')), label: '消息通知' },
  { path: '/check-in', ...lazyLoadWithPrefetch(() => import('./pages/CheckIn')), label: '签到中心' },
  { path: '/points', ...lazyLoadWithPrefetch(() => import('./pages/Points')), label: '积分明细' },
  { path: '/badges', ...lazyLoadWithPrefetch(() => import('./pages/Badges')), label: '我的勋章' },
  { path: '/growth-logs', ...lazyLoadWithPrefetch(() => import('./pages/GrowthLogs')), label: '成长值记录' },

  { path: '/albums', ...lazyLoadWithPrefetch(() => import('./pages/Albums')), label: '图集写真' },
  { path: '/albums/:id', ...lazyLoadWithPrefetch(() => import('./pages/AlbumViewer')) },
  { path: '/discovery', ...lazyLoadWithPrefetch(() => import('./pages/Discovery')), label: '发现' },
  { path: '/fast-organize', ...lazyLoadWithPrefetch(() => import('./pages/FastOrganize')), label: '极速整理' },
  { path: '/id-shop', ...lazyLoadWithPrefetch(() => import('./pages/DigitalIdShop')), label: 'ID 靓号铺子' },
  { path: '/personalized', ...lazyLoadWithPrefetch(() => import('./components/PersonalizedHome')), label: '个性化推荐' },
  { path: '/promotion/:id', ...lazyLoadWithPrefetch(() => import('./pages/PublicPromotionPage')) },
  { path: '/usage-guide/:id', ...lazyLoadWithPrefetch(() => import('./pages/UsageGuide')), label: '使用手册' },
  { path: '/daily-gallery', ...lazyLoadWithPrefetch(() => import('./pages/DailyGalleryPage')), label: '每日图集' },
  { path: '/refresh-image', ...lazyLoadWithPrefetch(() => import('./pages/RefreshImage')), label: '随机美图' },
  { path: '/realtime-demo', ...lazyLoadWithPrefetch(() => import('./pages/RealtimeDemo')), label: 'Realtime 演示' },
  { path: '/api/docs', ...lazyLoadWithPrefetch(() => import('./pages/admin/SwaggerDocs')), label: 'API 文档中心' },

  
  // 管理页面 - 懒加载
  { path: '/admin/audit', ...lazyLoadWithPrefetch(() => import('./pages/admin/Audit')), label: '审核管理', adminOnly: true },
  { path: '/admin/users', ...lazyLoadWithPrefetch(() => import('./pages/admin/Users')), label: '用户管理', adminOnly: true },
  { path: '/admin/tags', ...lazyLoadWithPrefetch(() => import('./pages/admin/TagManagement')), label: '标签管理', adminOnly: true },
  { path: '/admin/performance', ...lazyLoadWithPrefetch(() => import('./pages/admin/PerformanceMonitor')), label: '性能监控', adminOnly: true },
  { path: '/admin/analytics/*', ...lazyLoadWithPrefetch(() => import('./pages/admin/AnalyticsDashboard')), label: '统计分析', adminOnly: true },
  { path: '/admin/pc', ...lazyLoadWithPrefetch(() => import('./pages/admin/PCDashboard')), label: 'PC管理后台', adminOnly: true },
  { path: '/admin/pc/:tab', ...lazyLoadWithPrefetch(() => import('./pages/admin/PCDashboard')), label: 'PC管理后台', adminOnly: true },
  { path: '/admin/duplicates', ...lazyLoadWithPrefetch(() => import('./pages/admin/Duplicates')), label: '重复素材查重', adminOnly: true },
  { path: '/admin/webmaster', ...lazyLoadWithPrefetch(() => import('./pages/admin/components/WebmasterSection')), label: '站长工具', adminOnly: true },

  
  // 404 页面
  { path: '*', element: wrap(<NotFound />) },
];

