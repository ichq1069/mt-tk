import React, { useMemo, useEffect } from 'react';
import { Header, TabBar } from './Navigation';
import { useLocation } from 'react-router-dom';
import { useConfig } from '@/contexts/ConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useAds } from '@/contexts/AdContext';
import Home from '../../pages/Home';
import { ClipboardMonitor } from './ClipboardMonitor';
import { EasterEggTrigger } from '@/components/EasterEggTrigger';
import { StarHuntTrigger } from '@/components/StarHuntTrigger';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { config } = useConfig();
  const { isAdmin } = useAuth();
  const { isSplashActive } = useAds();

  // 解决页面切换后可能残留的滚动锁定问题
  useEffect(() => {
    document.body.style.overflow = '';
    document.body.classList.remove('overflow-hidden');

    const timer = setTimeout(() => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.touchAction = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.classList.remove('overflow-hidden');
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, location.search]);

  // 使用 MutationObserver 监控变化，检测并修复异常滚动锁定
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const hasRadixOpen = document.querySelector('[data-state="open"]');
      if (document.body.classList.contains('overflow-hidden') && !hasRadixOpen) {
        console.warn('检测到意外的滚动锁定，正在自动修复');
        document.body.classList.remove('overflow-hidden');
        document.body.style.overflow = '';
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => observer.disconnect();
  }, []);

  // 核心逻辑：判断当前页面是否为“单页显示”模式
  const isStandalonePage = useMemo(() => {
    // 1. 基础硬编码排除
    const path = location.pathname;
    if (path.includes('/admin/pc') ||
        path.includes('/admin/analytics') ||
        path.includes('/debug') ||
        path.includes('/daily-gallery') ||
        path.includes('/refresh-image') ||
        path === '/login') {
      return true;
    }

    // 2. 获取导航栏配置
    const defaultNavItems = [
      { path: '/' },
      { path: '/discovery' },
      { path: '/upload' },
      { path: '/albums' },
      { path: '/profile' }
    ];

    const navConfig = (isAdmin && config?.admin_bottom_nav_config)
      ? config.admin_bottom_nav_config
      : (config?.bottom_nav_config || { items: defaultNavItems });

    const navPaths = navConfig?.items?.map((it: any) => it.path) || defaultNavItems.map(it => it.path);
    const cleanPath = location.pathname.replace(/\/$/, '') || '/';
    
    const isNavPage = navPaths.some((p: string) => {
      const cleanP = p.replace(/\/$/, '') || '/';
      if (cleanP === '/') return cleanPath === '/';
      return cleanPath === cleanP || (cleanP !== '/' && cleanPath.startsWith(cleanP + '/'));
    });

    // 3. 用户显式设置的单页路径
    if (config?.standalone_paths !== undefined && config?.standalone_paths !== null) {
      return config.standalone_paths.includes(cleanPath) || cleanPath.includes('/albums/');
    }

    // 默认逻辑：非导航页即单页，且写真详情页固定为单页
    return !isNavPage || cleanPath.includes('/albums/');
  }, [location.pathname, config, isAdmin]);

  const showNav = !isStandalonePage && !isSplashActive;

  // 核心逻辑：定义哪些页面自带 Header，不需要全局 Header
  const hasCustomHeader = useMemo(() => {
    const customHeaderPaths = [
      '/profile',
      '/notifications',
      '/check-in',
      '/points',
      '/badges',
      '/growth-logs',
      '/upload',
      '/albums',
      '/discovery',
      '/fast-organize',
      '/daily-gallery',
      '/id-shop',
      '/refresh-image'
    ];
    return customHeaderPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  }, [location.pathname]);

  const isHome = location.pathname === '/';
  const showHeader = showNav && !isHome && !hasCustomHeader;

  // 如果是独立页面，直接返回子组件，不添加任何包装（避免 H5 容器样式干扰）
  if (isStandalonePage) {
    return (
      <>
        <ClipboardMonitor />
        <EasterEggTrigger />
        <StarHuntTrigger />
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <ClipboardMonitor />
      <EasterEggTrigger />
      <StarHuntTrigger />
      {showHeader && <Header />}

      <main className={`relative ${showNav ? (showHeader ? 'pt-14' : 'pt-0') + ' pb-20' : ''}`}>
        {/* 首页：永远存在，只是隐藏，绝不卸载 */}
        <div className={cn(
          "absolute inset-0 z-0",
          isHome ? "block animate-in fade-in duration-300" : "hidden"
        )}>
          <Home isVisible={isHome} />
        </div>

        {/* 其他页面：正常渲染 */}
        {!isHome && (
          <div className="relative z-10 h-full animate-in fade-in duration-300">
            {children}
          </div>
        )}
      </main>

      {showNav && <TabBar />}
    </div>
  );
}
