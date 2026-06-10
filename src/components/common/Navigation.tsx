import React, { useCallback, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useConfig } from '@/contexts/ConfigContext';
import { routes } from '@/routes';
import { Button } from '@/components/ui/button';

export function TabBar() {
  const { config } = useConfig();
  const { profile, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 根据角色选择配置
  const navConfig = (isAdmin && (config as any)?.admin_bottom_nav_config) 
    ? (config as any).admin_bottom_nav_config 
    : (config?.bottom_nav_config || {
        style: 'standard',
        items: [
          { id: 'home', label: '首页', icon: 'Home', path: '/' },
          { id: 'discovery', label: '发现', icon: 'Compass', path: '/discovery' },
          { id: 'upload', label: '上传', icon: 'Upload', path: '/upload', is_special: true },
          { id: 'albums', label: '写真', icon: 'FolderHeart', path: '/albums' },
          { id: 'profile', label: '我的', icon: 'User', path: '/profile' }
        ],
        active_color: 'var(--primary)',
        inactive_color: 'var(--muted-foreground)'
      });

  const permissions = profile?.permission_groups?.permissions || [];
  const filteredItems = navConfig.items.filter((item: any) => {
    if (item.id === 'albums') return permissions.includes('album_browse') || isAdmin;
    return true;
  });

  const isTabActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
  };

  const renderIcon = (iconName: string, className?: string, style?: React.CSSProperties) => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className={className} style={style} />;
  };

  // 预加载页面组件
  const handlePrefetch = useCallback((path: string) => {
    const route = routes.find(r => r.path === path);
    if (route && (route as any).importFunc) {
      (route as any).importFunc();
    }
  }, []);

  const handleTabClick = async (path: string, e: React.MouseEvent) => {
    // 检查是否有大图预览开启
    const hasPreview = !!document.querySelector('.media-preview-container');

    // 关闭所有可能打开的预览
    window.dispatchEvent(new CustomEvent('closeMediaPreview'));

    if (!profile && path !== '/' && path !== '/discovery' && path !== '/daily-gallery' && path !== '/refresh-image') {
      e.preventDefault();
      const loginPath = `/login?from=${encodeURIComponent(path)}`;
      navigate(loginPath);
      return;
    }
    
    // 如果已经在当前页，则滚动回顶部
    if (location.pathname === path) {
      // 如果之前有大图预览，则只关闭大图，不滚动到顶部
      if (hasPreview) {
        return;
      }
      
      // 如果是随机图页面，触发刷新
      if (path === '/refresh-image') {
        window.dispatchEvent(new CustomEvent('refresh-random-image'));
        return;
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    navigate(path);
  };

  const resolveColor = (colorStr: string) => {
    if (!colorStr) return undefined;
    if (colorStr.includes('var(')) {
      return `hsl(${colorStr})`;
    }
    return colorStr;
  };

  const animationConfig = useMemo(() => {
    const anim = navConfig.animation || { type: 'none' };
    const duration = anim.duration || 0.3;
    const tapScale = anim.tap_scale || 0.9;
    const hoverScale = anim.hover_scale || 1.1;

    const variants: Record<string, any> = {
      none: {
        initial: {},
        animate: {},
        tap: { scale: tapScale },
        hover: { scale: hoverScale }
      },
      scale: {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        tap: { scale: tapScale },
        hover: { scale: hoverScale }
      },
      jump: {
        initial: {},
        animate: { y: [0, -8, 0] },
        tap: { scale: tapScale },
        hover: { scale: hoverScale },
        transition: { duration, repeat: Infinity, repeatDelay: 2 }
      },
      pulse: {
        initial: {},
        animate: { scale: [1, 1.05, 1] },
        tap: { scale: tapScale },
        hover: { scale: hoverScale },
        transition: { duration: duration * 2, repeat: Infinity }
      },
      float: {
        initial: {},
        animate: { y: [0, -4, 0] },
        tap: { scale: tapScale },
        hover: { scale: hoverScale },
        transition: { duration: duration * 3, repeat: Infinity, ease: "easeInOut" }
      }
    };

    return {
      type: anim.type,
      duration,
      tapScale,
      hoverScale,
      variant: variants[anim.type] || variants.none
    };
  }, [navConfig.animation]);

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/40 flex justify-around items-center z-[1000]",
      navConfig.style === 'standard' ? "min-h-16 px-4 pt-2" : "min-h-16 px-2 pt-0 overflow-visible"
    )}
    style={{ 
      paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 0.5rem)`,
      height: 'calc(4rem + env(safe-area-inset-bottom, 0px))' // 固定高度防止抖动
    }}
    >
      {filteredItems.map((tab: any) => {
        const active = isTabActive(tab.path);
        const isDock = navConfig.style === 'dock' && tab.is_special;

        // 优化：在极小屏幕下进一步缩小 tapScale，或者禁用大规模缩放
        const finalTapScale = window.innerWidth < 350 ? 0.95 : animationConfig.tapScale;

        const motionProps = {
          initial: active ? animationConfig.variant.initial : {},
          animate: active ? animationConfig.variant.animate : {},
          whileTap: { scale: finalTapScale },
          whileHover: { scale: animationConfig.hoverScale },
          transition: animationConfig.variant.transition || { duration: animationConfig.duration }
        };

        if (isDock) {
          return (
            <motion.div
              key={tab.id}
              className="flex-1 flex flex-col items-center justify-center relative -top-3 cursor-pointer"
              onMouseEnter={() => handlePrefetch(tab.path)}
              onTouchStart={() => handlePrefetch(tab.path)}
              onClick={(e) => handleTabClick(tab.path, e)}
              {...motionProps}
            >
              <div 
                className="w-11 h-11 xs:w-12 xs:h-12 rounded-full flex items-center justify-center shadow-lg text-white"
                style={{ backgroundColor: resolveColor(navConfig.active_color) }}
              >
                {renderIcon(tab.icon, "w-5 h-5 xs:w-6 xs:h-6")}
              </div>
              <span 
                className="text-[9px] xs:text-[10px] font-bold mt-1 whitespace-nowrap" 
                style={{ color: resolveColor(active ? navConfig.active_color : navConfig.inactive_color) }}
              >
                {tab.label}
              </span>
            </motion.div>
          );
        }

        return (
          <motion.div
            key={tab.id}
            onMouseEnter={() => handlePrefetch(tab.path)}
            onTouchStart={() => handlePrefetch(tab.path)}
            onClick={(e) => handleTabClick(tab.path, e)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 xs:gap-1 cursor-pointer"
            {...motionProps}
          >
            {renderIcon(tab.icon, "w-5 h-5 xs:w-6 xs:h-6", { 
              color: resolveColor(active ? navConfig.active_color : navConfig.inactive_color) 
            })}
            <span 
              className="text-[9px] xs:text-[10px] font-medium whitespace-nowrap" 
              style={{ color: resolveColor(active ? navConfig.active_color : navConfig.inactive_color) }}
            >
              {tab.label}
            </span>
          </motion.div>
        );
      })}
    </nav>
  );
}


export function Header() {
  const { openLoginDialog, user } = useAuth();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  
  const currentRoute = routes.find((r: any) => {
    if (r.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(r.path);
  });
  
  const title = currentRoute?.label || (isAdminPage ? '管理后台' : '视觉赏析');
  const versionStr = isAdminPage ? ' v3.0.0 (Admin)' : ' v3.0.0';

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-50">
      <h1 className="text-lg font-black tracking-tight text-primary">
        {title}
        <span className="text-[10px] font-normal opacity-70 ml-1">{versionStr}</span>
      </h1>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            import('@/lib/utils').then(({ dispatchEasterEggClick }) => {
              dispatchEasterEggClick('click_surprise');
            });
            import('sonner').then(({ toast }) => {
              toast('惊喜正在降临...', { icon: '🎁' });
            });
          }}
          className="rounded-full w-8 h-8 text-primary/60 hover:text-primary transition-colors"
        >
          <Icons.Gift className="w-4 h-4" />
        </Button>
        {!user && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => openLoginDialog()}
            className="rounded-xl font-bold text-xs"
          >
            登录
          </Button>
        )}
      </div>
    </header>
  );
}
