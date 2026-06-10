import { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Activity,
  Users,
  FileText,
  Target,
  Flame,
  Menu,
  ArrowLeft,
  BarChart3,
  HeartPulse,
  CalendarDays,
  Zap,
} from 'lucide-react';

import OverviewPage from './OverviewPage';
import RealtimePage from './RealtimePage';
import VisitorsPage from './VisitorsPage';
import PagesPage from './PagesPage';
import GoalsPage from './GoalsPage';
import HeatmapsPage from './HeatmapsPage';
import ReplaysPage from './ReplaysPage';
import StatusPage from './StatusPage';
import DailyGalleryAnalyticsPage from './DailyGalleryAnalyticsPage';
import PerformancePage from './PerformancePage';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

const menuItems: MenuItem[] = [
  { id: 'overview', label: '概览', icon: <LayoutDashboard className="w-4 h-4" />, path: '/admin/analytics/overview' },
  { id: 'status', label: '状态监控', icon: <HeartPulse className="w-4 h-4" />, path: '/admin/analytics/status' },
  { id: 'realtime', label: '实时监控', icon: <Activity className="w-4 h-4" />, path: '/admin/analytics/realtime' },
  { id: 'visitors', label: '访客分析', icon: <Users className="w-4 h-4" />, path: '/admin/analytics/visitors' },
  { id: 'pages', label: '页面分析', icon: <FileText className="w-4 h-4" />, path: '/admin/analytics/pages' },
  { id: 'goals', label: '目标转化', icon: <Target className="w-4 h-4" />, path: '/admin/analytics/goals' },
  { id: 'heatmaps', label: '热力图', icon: <Flame className="w-4 h-4" />, path: '/admin/analytics/heatmaps' },
  { id: 'performance', label: '性能监控', icon: <Zap className="w-4 h-4" />, path: '/admin/analytics/performance' },
  { id: 'daily-gallery', label: '每日图集分析', icon: <CalendarDays className="w-4 h-4" />, path: '/admin/analytics/daily-gallery' },
];

function renderPage(pathname: string) {
  if (pathname === '/admin/analytics' || pathname === '/admin/analytics/overview') return <OverviewPage />;
  if (pathname === '/admin/analytics/status') return <StatusPage />;
  if (pathname === '/admin/analytics/realtime') return <RealtimePage />;
  if (pathname === '/admin/analytics/visitors') return <VisitorsPage />;
  if (pathname === '/admin/analytics/pages') return <PagesPage />;
  if (pathname === '/admin/analytics/goals') return <GoalsPage />;
  if (pathname === '/admin/analytics/heatmaps') return <HeatmapsPage />;
  if (pathname === '/admin/analytics/performance') return <PerformancePage />;
  if (pathname === '/admin/analytics/daily-gallery') return <DailyGalleryAnalyticsPage />;
  return <OverviewPage />;
}

export default function AnalyticsDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeMenu = useMemo(() => {
    const item = menuItems.find((m) => location.pathname === m.path || location.pathname === '/admin/analytics' && m.id === 'overview');
    return item?.id || 'overview';
  }, [location.pathname]);

  const currentTitle = useMemo(() => {
    return menuItems.find((m) => m.id === activeMenu)?.label || '统计分析';
  }, [activeMenu]);

  const handleMenuClick = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo区域 */}
      <div className="flex items-center gap-2 px-4 h-14 shrink-0 border-b border-border/50">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-tight">统计后台</h1>
          <p className="text-[10px] text-muted-foreground leading-tight">Analytics</p>
        </div>
      </div>

      {/* 导航菜单 */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                activeMenu === item.id
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </ScrollArea>

      {/* 底部返回 */}
      <div className="shrink-0 p-2 border-t border-border/50">
        <button
          onClick={() => navigate('/admin/pc')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回管理后台</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border/50 bg-card">
        <SidebarContent />
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <header className="shrink-0 h-14 border-b border-border/50 bg-card flex items-center px-4 gap-3">
          {/* 移动端菜单按钮 */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="w-4 h-4" />
                <span className="sr-only">打开菜单</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0 bg-card">
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold truncate">{currentTitle}</h2>
          </div>

          <div className="shrink-0 text-xs text-muted-foreground hidden sm:block">
            统计分析后台
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="animate-in fade-in duration-300" key={location.pathname}>
            {renderPage(location.pathname)}
          </div>
        </main>
      </div>
    </div>
  );
}
