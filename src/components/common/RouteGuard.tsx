import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConfig } from '@/contexts/ConfigContext';
import { Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';


interface RouteGuardProps {
  children: React.ReactNode;
}

// 请在 PUBLIC_ROUTES 中添加无需登录即可访问的页面。
const PUBLIC_ROUTES = ['/', '/login', '/403', '/404', '/debug', '/daily-gallery', '/refresh-image', '/usage-guide/*'];
const ADMIN_ROUTES = ['/admin/*', '/admin/pc', '/admin/duplicates'];

function matchRoute(path: string, patterns: string[]) {
  // 规范化路径：去除查询参数、去除末尾斜杠
  const cleanPath = path.split('?')[0].replace(/\/$/, '') || '/';
  
  return patterns.some(pattern => {
    // 规范化模式
    const cleanPattern = pattern.replace(/\/$/, '') || '/';
    
    if (cleanPattern === '/') return cleanPath === '/';
    
    if (cleanPattern.endsWith('/*')) {
      const base = cleanPattern.slice(0, -2);
      return cleanPath === base || cleanPath.startsWith(base + '/');
    }
    
    return cleanPath === cleanPattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, profile, permissions, loading: authLoading, openLoginDialog } = useAuth();
  const { config: sysConfig, loading: configLoading } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // 权限检查逻辑：只有在所有关键状态都准备好后才进行跳转决策
    if (authLoading || configLoading) return;

    const isForceLogin = sysConfig?.force_login === true;
    
    // 如果开启了强制登录，首页 '/' 不再作为公共路由，必须登录后查看
    // 只有登录页、403、404、调试页、每日图集以及使用指南保持公开
    const dynamicPublicRoutes = isForceLogin 
      ? PUBLIC_ROUTES.filter(r => r !== '/') 
      : PUBLIC_ROUTES;

    const isPublic = matchRoute(location.pathname, dynamicPublicRoutes);
    const isAdminRoute = matchRoute(location.pathname, ADMIN_ROUTES);

    const canAccess = isPublic;

    if (!user && !canAccess) {
      // 未登录且不在公开路由白名单中，弹出登录框并跳转登录页或首页
      openLoginDialog();
      if (isForceLogin && location.pathname !== '/login') {
        navigate('/login', { replace: true, state: { from: location.pathname } });
      } else if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    } else if (user && isAdminRoute) {
      // 判定是否有权访问任何一个管理功能
      const hasAnyAdminAccess = profile?.role === 'admin' || permissions.some(p => p.startsWith('admin_'));
      
      // 只有在 profile 已经加载完成且明确没有任何管理权限时才跳 403
      if (profile && !hasAnyAdminAccess) {
        navigate('/403', { replace: true });
      }
    }

  }, [user, profile, permissions, authLoading, configLoading, location.pathname, navigate, sysConfig, openLoginDialog]);

  if (authLoading || configLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[10000]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">正在加载配置...</p>
        </div>
      </div>
    );
  }

  // 维护模式处理
  const isMaintenance = sysConfig?.is_maintenance_mode === true;
  const isAdmin = profile?.role === 'admin';
  const isAllowedInMaintenance = matchRoute(location.pathname, [
    '/login', 
    '/403', 
    '/404', 
    '/admin/*', 
    ...(sysConfig?.maintenance_allowed_paths || [])
  ]);

  if (isMaintenance && !isAdmin && !isAllowedInMaintenance) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[10001] p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-3xl flex items-center justify-center text-red-600 dark:text-red-400 mx-auto shadow-xl animate-bounce">
            <TriangleAlert className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tighter">系统维护中</h1>
            <p className="text-muted-foreground">
              {sysConfig?.maintenance_message || '为了提供更好的服务，系统正在进行例行维护，请稍后再试。'}
            </p>
          </div>
          <div className="pt-6 flex flex-col gap-3">
             <Button className="rounded-2xl h-12 font-bold" onClick={() => window.location.reload()}>
               刷新页面
             </Button>
             <Button variant="ghost" className="rounded-2xl h-12 font-bold text-xs text-muted-foreground" onClick={() => navigate('/login')}>
               管理员登录
             </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
