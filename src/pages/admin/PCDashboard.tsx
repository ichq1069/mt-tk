import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/db/api';
import { rbacApi } from "@/db/rbac";
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Cloud,
  Server,
  Shield,
  Monitor, 
  LogOut, 
  Loader2, 
  ShieldAlert, 
  LayoutDashboard, 
  FileCheck, 
  Users as UsersIcon, 
  Settings, 
  BarChart3, 
  Trophy, 
  Image as ImageIcon, 
  Flame, 
  Settings2, 
  Bell, 
  Key, 
  Search, 
  FolderOpen,
  Database as DatabaseIcon, 
  FileCode2, 
  Menu, 
  UserPlus, 
  Network, 
  Megaphone,
  Tag as TagIcon, 
  Folder as Folder, 
  ListFilter, 
  ChevronRight, 
  ChevronDown, 
  Trash2,
  CirclePlay as CirclePlay, 
  Smartphone, 
  Globe, 
  Copy, 
  Package,
  Gift,
  Hash, 
  Star, 
  Zap,
  RefreshCcw,
  Crown, 
  CalendarCheck, 
  MapPin, 
  TrendingUp as TrendingUpIcon,
  MessageSquare,
  FileText,
  Calendar,
  Activity
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { QRCodeDataUrl } from "@/components/ui/qrcodedataurl";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import { APP_VERSION } from '@/constants/version';


// 导入所有业务组件（使用懒加载优化性能，仅在点击对应标签时加载对应组件）
import { lazy, Suspense } from 'react';

const PointsSection = lazy(() => import('./components/PointsSection').then(m => ({ default: m.PointsSection })));
const ContentSection = lazy(() => import('./components/ContentSection').then(m => ({ default: m.ContentSection })));
const ReportsSection = lazy(() => import('./components/ReportsSection').then(m => ({ default: m.ReportsSection })));
const AlbumRequestsSection = lazy(() => import('./components/AlbumRequestsSection').then(m => ({ default: m.AlbumRequestsSection })));
const DashboardSection = lazy(() => import('./components/DashboardSection').then(m => ({ default: m.DashboardSection })));
const RankingSection = lazy(() => import('./components/RankingSection').then(m => ({ default: m.RankingSection })));
const DataCenterSection = lazy(() => import('./components/DataCenterSection').then(m => ({ default: m.DataCenterSection })));
const UsersSection = lazy(() => import('./components/UsersSection').then(m => ({ default: m.UsersSection })));
const NotificationsSection = lazy(() => import('./components/NotificationsSection').then(m => ({ default: m.NotificationsSection })));
const UserFieldsSection = lazy(() => import('./components/UserFieldsSection').then(m => ({ default: m.UserFieldsSection })));
const StorageSection = lazy(() => import('./components/StorageSection').then(m => ({ default: m.StorageSection })));
const StoragePage = lazy(() => import('./Storage'));
const DomainSettingsSection = lazy(() => import('./components/DomainSettingsSection').then(m => ({ default: m.DomainSettingsSection })));
const MediaLibrarySection = lazy(() => import('./components/MediaLibrarySection').then(m => ({ default: m.MediaLibrarySection })));
const AdsSection = lazy(() => import('./components/AdsSection').then(m => ({ default: m.AdsSection })));
const InvitesSection = lazy(() => import('./components/InvitesSection').then(m => ({ default: m.InvitesSection })));
const UserNetworkSection = lazy(() => import('./components/UserNetworkSection').then(m => ({ default: m.UserNetworkSection })));
const RedemptionCodesSection = lazy(() => import('./components/RedemptionCodesSection').then(m => ({ default: m.RedemptionCodesSection })));
const DatabaseSection = lazy(() => import('./components/DatabaseSection').then(m => ({ default: m.DatabaseSection })));
const TagsSection = lazy(() => import('./components/TagsSection').then(m => ({ default: m.TagsSection })));
const PlayerSection = lazy(() => import('./components/PlayerSection').then(m => ({ default: m.PlayerSection })));
const NavigationSection = lazy(() => import('./components/NavigationSection').then(m => ({ default: m.NavigationSection })));
const CategoriesSection = lazy(() => import('./components/CategoriesSection').then(m => ({ default: m.CategoriesSection })));
const CategoryContentSection = lazy(() => import('./components/CategoryContentSection').then(m => ({ default: m.CategoryContentSection })));
const WebmasterSection = lazy(() => import('./components/WebmasterSection').then(m => ({ default: m.WebmasterSection })));
const ProfileSettingsSection = lazy(() => import('./components/ProfileSettingsSection').then(m => ({ default: m.ProfileSettingsSection })));
const DuplicatesSection = lazy(() => import('./components/DuplicatesSection').then(m => ({ default: m.DuplicatesSection })));
const GrowthSection = lazy(() => import('./components/GrowthSection').then(m => ({ default: m.GrowthSection })));
const RanksManagementSection = lazy(() => import('./components/RanksManagementSection').then(m => ({ default: m.RanksManagementSection })));
const SpecialIdsManagementSection = lazy(() => import('./components/SpecialIdsManagementSection').then(m => ({ default: m.SpecialIdsManagementSection })));
const BadgesManagementSection = lazy(() => import('./components/BadgesManagementSection').then(m => ({ default: m.BadgesManagementSection })));
const MiniProgramSection = lazy(() => import('./components/MiniProgramSection').then(m => ({ default: m.MiniProgramSection })));
const MiniProgramLogsSection = lazy(() => import('./components/MiniProgramLogsSection').then(m => ({ default: m.MiniProgramLogsSection })));
const DigitalIdConfigSection = lazy(() => import('./components/DigitalIdConfigSection').then(m => ({ default: m.DigitalIdConfigSection })));
const SigninManagementSection = lazy(() => import('./components/SigninManagementSection').then(m => ({ default: m.SigninManagementSection })));
const AdminQuickSearch = lazy(() => import('./components/AdminQuickSearch').then(m => ({ default: m.AdminQuickSearch })));
const WechatManagementSection = lazy(() => import('./components/WechatManagementSection').then(m => ({ default: m.WechatManagementSection })));
const WechatDraftSection = lazy(() => import('./components/WechatDraftSection').then(m => ({ default: m.WechatDraftSection })));
const WechatKeywordsSection = lazy(() => import('./components/WechatKeywordsSection').then(m => ({ default: m.WechatKeywordsSection })));
const WechatFollowSection = lazy(() => import('./components/WechatFollowSection').then(m => ({ default: m.WechatFollowSection })));
const WechatAutoSection = lazy(() => import('./components/WechatAutoSection').then(m => ({ default: m.WechatAutoSection })));
const WechatMenuSettingsSection = lazy(() => import('./components/WechatMenuSettingsSection').then(m => ({ default: m.WechatMenuSettingsSection })));
const WechatMessagesSection = lazy(() => import('./components/WechatMessagesSection').then(m => ({ default: m.WechatMessagesSection })));
const AlbumsSection = lazy(() => import('./components/AlbumsSection').then(m => ({ default: m.AlbumsSection })));
const AlbumPhotosSection = lazy(() => import('./components/AlbumPhotosSection').then(m => ({ default: m.AlbumPhotosSection })));
const RandomBeautySection = lazy(() => import('./components/RandomBeautySection').then(m => ({ default: m.RandomBeautySection })));
const WechatFansSection = lazy(() => import('./components/WechatFansSection').then(m => ({ default: m.WechatFansSection })));
const WechatNotificationsSection = lazy(() => import('./components/WechatNotificationsSection').then(m => ({ default: m.WechatNotificationsSection })));
const DailyGallerySection = lazy(() => import('./components/DailyGallerySection').then(m => ({ default: m.DailyGallerySection })));
const FeedbacksSection = lazy(() => import('./components/FeedbacksSection').then(m => ({ default: m.FeedbacksSection })));
const FastLevelingSection = lazy(() => import('./components/FastLevelingSection').then(m => ({ default: m.FastLevelingSection })));
const RecommendationSection = lazy(() => import('./components/RecommendationSection').then(m => ({ default: m.RecommendationSection })));
const PromotionDIYSection = lazy(() => import('./components/PromotionDIYSection').then(m => ({ default: m.PromotionDIYSection })));
const GuidesManagementSection = lazy(() => import('./components/GuidesManagementSection').then(m => ({ default: m.GuidesManagementSection })));
const SystemStatusSection = lazy(() => import('./components/SystemStatusSection').then(m => ({ default: m.SystemStatusSection })));
const ZoneramaLibrarySection = lazy(() => import('./components/ZoneramaLibrarySection').then(m => ({ default: m.ZoneramaLibrarySection })));
const ProxyManagementSection = lazy(() => import('./components/ProxyManagementSection').then(m => ({ default: m.ProxyManagementSection })));
const AppManagementSection = lazy(() => import('./components/AppManagementSection').then(m => ({ default: m.AppManagementSection })));
const PerformanceMonitor = lazy(() => import('./PerformanceMonitor'));
const EasterEggManagement = lazy(() => import('./components/EasterEggManagement').then(m => ({ default: m.EasterEggManagement })));

const StarHuntManagement = lazy(() => import('./components/StarHuntManagement').then(m => ({ default: m.StarHuntManagement })));

   const BuildSection = lazy(() => import('./components/BuildSection').then(m => ({ default: m.BuildSection })));


// 为了在 PCDashboard 中使用，创建一个包装组件
const PerformanceMonitorSection = () => (
  <Suspense fallback={<div className="p-8 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
    <PerformanceMonitor />
  </Suspense>
);



// 侧边栏菜单项组件
function SidebarItem({ 
  icon, 
  label, 
  active, 
  onClick, 
  badge,
  rightElement,
  isSubItem = false,
  className
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void; 
  badge?: number;
  rightElement?: React.ReactNode;
  isSubItem?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all relative group",
        active 
          ? (isSubItem ? 'bg-white/10 text-white font-bold shadow-sm' : 'bg-primary text-white shadow-lg font-black scale-[1.02]')
          : 'text-slate-400 hover:bg-white/5 hover:text-white',
        className
      )}
    >
      <span className={cn(
        "shrink-0 transition-transform duration-300", 
        isSubItem && "opacity-70 scale-90",
        active && !isSubItem && "scale-110"
      )}>{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge && badge > 0 && (
        <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[20px] text-center animate-pulse">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {rightElement}
      
      {/* 激活指示条 */}
      {active && !isSubItem && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
      )}
    </button>
  );
}

// 侧边栏内容组件
function SidebarContentComponent({ 
  onMenuClick, 
  menuGroups, 
  canAccess, 
  activeMenu, 
  setActiveMenu, 
  expandedGroups,
  toggleGroup,
  profile, 
  user, 
  signOut,
  isOpen,
  onToggle
}: { 
  onMenuClick?: () => void;
  menuGroups: any[];
  canAccess: (perm: string) => boolean;
  activeMenu: string;
  setActiveMenu: (id: string) => void;
  expandedGroups: string[];
  toggleGroup: (id: string) => void;
  profile: any;
  user: any;
  signOut: () => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 展平菜单项以供搜索
  const allMenuItems = React.useMemo(() => {
    const flat: any[] = [];
    menuGroups.forEach(group => {
      group.items.forEach((item: any) => {
        if (canAccess(item.perm)) {
          flat.push({ ...item, groupLabel: group.label, groupId: group.id });
          if (item.children) {
            item.children.forEach((child: any) => {
              flat.push({ ...child, parentId: item.id, parentLabel: item.label, groupLabel: group.label, groupId: group.id });
            });
          }
        }
      });
    });
    return flat;
  }, [menuGroups, canAccess]);

  const filteredItems = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allMenuItems.filter(item => 
      item.label.toLowerCase().includes(query) || 
      (item.parentLabel && item.parentLabel.toLowerCase().includes(query)) ||
      (item.groupLabel && item.groupLabel.toLowerCase().includes(query))
    ).slice(0, 8);
  }, [allMenuItems, searchQuery]);

  const handleSelectResult = (item: any) => {
    if (item.groupId) {
      if (!expandedGroups.includes(item.groupId)) toggleGroup(item.groupId);
    }
    if (item.parentId) {
      if (!expandedGroups.includes(item.parentId)) toggleGroup(item.parentId);
    }
    setActiveMenu(item.id);
    setSearchQuery('');
    setShowResults(false);
    onMenuClick?.();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'upload') {
      setActiveMenu('upload_settings');
    }
  }, [location.pathname]);


  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative shadow-2xl">
      {/* 折叠/展开按钮 - PC 端固定在侧边栏右侧边缘 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className={cn(
          "absolute top-4 -right-4 z-50 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-xl hover:bg-slate-50 hover:shadow-2xl transition-all duration-300",
          "hidden md:flex items-center justify-center"
        )}
        title={isOpen ? "收起侧边栏" : "展开侧边栏"}
      >
        <Menu className={cn("w-4 h-4 text-slate-700 transition-transform duration-300", isOpen ? "rotate-180" : "")} />
      </Button>

      <div className="p-6 border-b border-white/10 space-y-4">
        <div>
          <h1 className="text-xl font-black text-white">管理后台 <span className="text-[10px] font-normal opacity-70 ml-1">{APP_VERSION}</span></h1>
          <p className="text-xs text-slate-400 mt-1">全站数据管理 · {APP_VERSION}</p>
        </div>

        {/* 菜单搜索框 */}
        <div className="relative group/search">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 group-focus-within/search:text-primary transition-colors">
            <Search className="w-3.5 h-3.5" />
          </div>
          <Input 
            placeholder="快速查找菜单..." 
            className="h-9 pl-9 rounded-xl bg-white/5 border-white/10 text-xs text-white placeholder:text-slate-500 focus-visible:ring-primary focus-visible:bg-white/10 transition-all focus:outline-none"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
          />

          {/* 搜索结果下拉列表 */}
          {showResults && filteredItems.length > 0 && (
            <>
              <div 
                className="fixed inset-0 z-[60]" 
                onClick={() => setShowResults(false)}
              />
              <Card className="absolute top-full left-0 right-0 mt-2 z-[70] bg-slate-800 border-white/10 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-1">
                  {filteredItems.map(item => (
                    <button
                      key={item.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-white/10 group transition-all"
                      onClick={() => handleSelectResult(item)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-200">{item.label}</div>
                        <div className="text-[9px] text-slate-500 truncate">{item.groupLabel} {item.parentLabel ? `> ${item.parentLabel}` : ''}</div>
                      </div>
                      <ChevronRight className="w-3 h-3 text-slate-600" />
                    </button>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
        {menuGroups.map((group, groupIndex) => {
          const visibleItems = group.items.filter((item: any) => canAccess(item.perm));
          if (visibleItems.length === 0) return null;
          
          const groupExpanded = expandedGroups.includes(group.id);

          return (
            <div key={groupIndex} className="space-y-3">
              <button 
                onClick={() => toggleGroup(group.id)}
                className="w-full px-4 py-1.5 flex items-center justify-between hover:text-white transition-all group/label"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                  <span className="text-sm font-black uppercase tracking-wider text-slate-200 group-hover/label:text-white transition-colors">
                    {group.label}
                  </span>
                </div>
                {groupExpanded ? <ChevronDown className="w-4 h-4 text-slate-500 group-hover/label:text-white transition-colors" /> : <ChevronRight className="w-4 h-4 text-slate-500 group-hover/label:text-white transition-colors" />}
              </button>
              
              {groupExpanded && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  {visibleItems.map((item: any) => {
                    const hasChildren = item.children && item.children.length > 0;
                    const isExpanded = expandedGroups.includes(item.id);
                    const isActive = activeMenu === item.id || (hasChildren && item.children.some((c: any) => c.id === activeMenu));

                    return (
                      <div key={item.id} className="space-y-1">
                        <SidebarItem 
                          icon={item.icon} 
                          label={item.label} 
                          active={isActive}
                          onClick={() => {
                            if (hasChildren) {
                              toggleGroup(item.id);
                            } else if (item.path) {
                              navigate(item.path);
                            } else {
                              setActiveMenu(item.id);
                              onMenuClick?.();
                            }
                          }}
                          badge={item.badge && item.badge > 0 ? item.badge : undefined}
                          rightElement={hasChildren ? (isExpanded ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />) : undefined}
                          className="font-bold text-sm"
                        />
                        
                        {hasChildren && isExpanded && (
                          <div className="ml-4 pl-3 border-l border-white/10 space-y-1 mt-1 animate-in slide-in-from-left-2 duration-200">
                            {item.children.map((child: any) => (
                              <SidebarItem 
                                key={child.id}
                                icon={child.icon} 
                                label={child.label} 
                                active={activeMenu === child.id}
                                onClick={() => {
                                  if (child.path) {
                                    navigate(child.path);
                                  } else {
                                    setActiveMenu(child.id);
                                    onMenuClick?.();
                                  }
                                }}
                                isSubItem
                                className="font-medium text-[11px]"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* PC 端特有：手机版入口二维码 (使用 CSS 隐藏而非 DOM 卸载，保持渲染树稳定) */}
      <div className="hidden lg:flex mx-4 mb-4 p-4 bg-white/5 rounded-2xl border border-white/10 flex-col items-center shrink-0 backdrop-blur-sm">
        <p className="text-[10px] font-bold text-white mb-2 opacity-70">扫码访问手机版</p>
        <div className="bg-white p-1.5 rounded-xl shadow-sm">
          <QRCodeDataUrl 
            text={window.location.origin} 
            width={100} 
          />
        </div>
        <p className="text-[9px] text-slate-400 mt-2 text-center leading-tight">使用手机扫码<br/>随时随地管理系统</p>
      </div>

      <div className="p-4 border-t border-white/10 mt-auto bg-slate-900/20">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 shadow-sm overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-black text-sm shrink-0 shadow-lg">
            {profile?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-white">{profile?.username}</p>
            <p className="text-xs text-slate-400 truncate text-[10px]">{user?.email}</p>
          </div>
        </div>
    </div>
    </div>
  );
}

import { AdminSidebar } from './components/dashboard/AdminSidebar';
import { StatsHeader } from './components/dashboard/StatsHeader';
import { AdminProfileHeader } from './components/dashboard/AdminProfileHeader';

export default function PCDashboard() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { tab } = useParams();
  const [searchParams] = useSearchParams();
  
  const activeMenu = useMemo(() => {
    return tab || localStorage.getItem('admin_active_menu') || 'dashboard';
  }, [tab]);

  const setActiveMenu = (id: string) => {
    localStorage.setItem('admin_active_menu', id);
    navigate(`/admin/pc/${id}?t=${Date.now()}`);
  };

  useEffect(() => {
    if (tab === 'badge_tasks') {
      navigate('/admin/pc/badges', { replace: true });
      return;
    }
    if (!tab) {
      const savedMenu = localStorage.getItem('admin_active_menu') || 'dashboard';
      navigate(`/admin/pc/${savedMenu}?t=${Date.now()}`, { replace: true });
    }
  }, [tab, navigate]);

  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const [expandedGroups, setExpandedGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('admin_expanded_groups');
      if (saved) return JSON.parse(saved);
      // 默认展开所有一级菜单
      return ['overview', 'content', 'system_ranks', 'users', 'wechat', 'system'];
    } catch {
      return ['overview', 'content', 'system_ranks', 'users', 'wechat', 'system'];
    }
  });

  const version = APP_VERSION;

  useEffect(() => {
    const checkVersion = () => {
      const savedVersion = localStorage.getItem('app_version');
      if (savedVersion && savedVersion !== APP_VERSION) {
        localStorage.setItem('app_version', APP_VERSION);
      } else if (!savedVersion) {
        localStorage.setItem('app_version', APP_VERSION);
      }
    };
    checkVersion();
  }, []);

  useEffect(() => {
    localStorage.setItem('admin_expanded_groups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  // 当 activeMenu 变化时保存到 localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'upload') {
      setActiveMenu('upload_settings');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('admin_active_menu', activeMenu);
  }, [activeMenu]);

  // 保存用户名到 localStorage 供日志系统使用
  useEffect(() => {
    if (profile?.username) {
      localStorage.setItem('admin_username', profile.username);
    }
  }, [profile]);

  // 移除之前复杂的全屏逻辑，采用更简单直接的 CSS
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const [isMobile, setIsMobile] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => {
    // 从 localStorage 读取用户偏好，PC 端默认展开，移动端默认收起
    const saved = localStorage.getItem('admin_sidebar_open');
    if (saved !== null) return saved === 'true';
    return window.innerWidth >= 768; // PC 端默认展开
  });
  const [stats, setStats] = useState({ pending: 0, pending_reports: 0, pending_album_requests: 0 });
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  // 当 isDrawerOpen 变化时保存到 localStorage
  useEffect(() => {
    localStorage.setItem('admin_sidebar_open', String(isDrawerOpen));
  }, [isDrawerOpen]);

  // 获取统计数据
  const fetchStats = async () => {
    const s = await api.getAdminStats();
    if (!s.error) {
      setStats({
        pending: Number(s.pending),
        pending_reports: Number(s.pending_reports || 0),
        pending_album_requests: Number(s.pending_album_requests || 0)
      });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // 检测是否是 PC 端，如果屏幕很大但是还是白屏，可能是因为某些样式问题
  const [isPC, setIsPC] = useState(window.innerWidth >= 768);

  // 获取权限
  useEffect(() => {
    const fetchPerms = async () => {
      // 如果 AuthContext 还在加载，保持 loadingPerms 为 true
      if (authLoading) return;

      if (!user) {
        setLoadingPerms(false);
        return;
      }
      
      // 如果没有获取到用户配置，可能是鉴权失败或仍在加载
      if (!profile) return;
      
      // 如果是超级管理员，立即释放渲染
      if (profile?.role === 'admin') {
        setLoadingPerms(false);
        // 这里不需要 return，继续往下走获取权限列表以备后用
      }

      const timer = setTimeout(() => {
        setLoadingPerms(false);
      }, 3000); // 3 秒超时，避免无限阻塞

      try {
        const { permissions: p } = await rbacApi.getCurrentUserPermissions(user.id);
        const permList = p || [];
        setPermissions(permList);
        
        // 检查当前 localStorage 中的菜单是否仍然有权访问
        const savedMenu = localStorage.getItem('admin_active_menu');
        const hasAccessToSaved = savedMenu && (profile?.role === 'admin' || permList.includes(`admin_${savedMenu.toLowerCase()}`));

        if (!hasAccessToSaved) {
          if (profile?.role === 'admin') {
            setActiveMenu('dashboard');
          } else if (permList.length > 0) {
            const firstAdminPerm = permList.find((perm: string) => perm.startsWith('admin_'));
            if (firstAdminPerm) {
              const menu = firstAdminPerm.split('_')[1];
              setActiveMenu(menu);
            } else {
              setActiveMenu(''); 
            }
          }
        }
      } catch (e) {
        console.error('[PCDashboard] 获取权限异常:', e);
      } finally {
        clearTimeout(timer);
        setLoadingPerms(false);
      }
    };
    fetchPerms();
  }, [user, profile, authLoading]);

  // 当 authLoading 为 true 且 loadingPerms 为 false 时，重新设置 loadingPerms
  useEffect(() => {
    if (authLoading && !loadingPerms) {
      setLoadingPerms(true);
    }
  }, [authLoading]);

  // 设备检测逻辑修改
  useEffect(() => {
    let lastWidth = window.innerWidth;
    const checkDevice = () => {
      const screenWidth = window.innerWidth;
      // 只有宽度发生显著变化时才更新（避免由于样式注入引起的微小变化触发重绘）
      if (Math.abs(screenWidth - lastWidth) < 10) return;
      lastWidth = screenWidth;

      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const nextIsMobile = isMobileDevice && screenWidth < 768;
      const nextIsPC = !nextIsMobile;

      // 只有状态真正变化时才更新，防止触发不必要的重绘
      setIsMobile(prev => prev !== nextIsMobile ? nextIsMobile : prev);
      setIsPC(prev => prev !== nextIsPC ? nextIsPC : prev);
    };
    
    // 初始化时执行一次
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenWidth = window.innerWidth;
    if (isMobileDevice && screenWidth < 768) {
      setIsMobile(true);
      setIsPC(false);
    } else {
      setIsMobile(false);
      setIsPC(true);
    }

    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const canAccess = (perm: string) => profile?.role === 'admin' || permissions.includes(perm);

  // 菜单项定义 - 采用层级结构
  const menuGroups: any[] = [
    {
      id: 'overview',
      label: '运营概览',
      items: [
        { id: 'dashboard', label: '控制台', icon: <LayoutDashboard className="w-4 h-4" />, perm: 'admin_dashboard' },
        { id: 'datacenter', label: '数据中心', icon: <BarChart3 className="w-4 h-4" />, perm: 'admin_datacenter' },
        { id: 'ranking', label: '收藏榜单', icon: <Trophy className="w-4 h-4" />, perm: 'admin_ranking' },
        { id: 'content', label: '审核中心', icon: <FileCheck className="w-4 h-4" />, perm: 'admin_audit', badge: (stats.pending || 0) + (stats.pending_reports || 0) },
      ]
    },
    {
      id: 'task_center',
      label: '待办中心',
      items: [
        { id: 'content', label: '内容审核', icon: <FileCheck className="w-4 h-4" />, perm: 'admin_audit', badge: stats.pending || 0 },
        { id: 'reports', label: '举报投诉', icon: <ShieldAlert className="w-4 h-4" />, perm: 'admin_audit', badge: stats.pending_reports || 0 },
        { id: 'album_requests', label: '权限申请', icon: <Key className="w-4 h-4" />, perm: 'admin_library', badge: stats.pending_album_requests },
      ]
    },
    {
      id: 'fast_tools',
      label: '极速分类',
      items: [
        { id: 'fo_categorize', label: '壁纸分类', icon: <ImageIcon className="w-4 h-4" />, perm: 'admin_library', path: '/fast-organize?mode=categorize' },
        { id: 'fo_audit', label: '图集划分', icon: <Shield className="w-4 h-4" />, perm: 'admin_library', path: '/fast-organize?mode=audit' },
        { id: 'fo_staging', label: '草稿清理', icon: <DatabaseIcon className="w-4 h-4" />, perm: 'admin_library', path: '/fast-organize?mode=staging' },
        { id: 'fo_daily', label: '每日图集清理', icon: <Calendar className="w-4 h-4" />, perm: 'admin_library', path: '/fast-organize?mode=daily_gallery' },
        { id: 'fo_dedupe', label: '查重清理', icon: <Copy className="w-4 h-4" />, perm: 'admin_library', path: '/fast-organize?mode=dedupe' },
      ]
    },
    {
      id: 'content',
      label: '运营中心',
      items: [
        { 
          id: 'media_manage', 
          label: '壁纸管理', 
          icon: <ImageIcon className="w-4 h-4" />, 
          perm: 'admin_library',
          children: [
            { id: 'library', label: '壁纸库', icon: <ImageIcon className="w-3.5 h-3.5" />, perm: 'admin_library' },
            { id: 'staging', label: '中间库', icon: <DatabaseIcon className="w-3.5 h-3.5" />, perm: 'admin_library' },
            { id: 'recycle_bin', label: '回收站', icon: <Trash2 className="w-3.5 h-3.5" />, perm: 'admin_library' },
            { id: 'duplicates', label: '重复查重', icon: <Copy className="w-3.5 h-3.5" />, perm: 'admin_library' },
          ]
        },
        { 
          id: 'album_manage', 
          label: '写真库', 
          icon: <FolderOpen className="w-4 h-4" />, 
          perm: 'admin_library',
          children: [
            { id: 'albums', label: '写真管理', icon: <FolderOpen className="w-3.5 h-3.5" />, perm: 'admin_library' },
            { id: 'album_photos', label: '写真库管理', icon: <ImageIcon className="w-3.5 h-3.5" />, perm: 'admin_library' },
            { id: 'fast_leveling', label: '极速分级', icon: <Zap className="w-3.5 h-3.5" />, perm: 'admin_library' },
          ]
        },
        { id: 'zonerama_library', label: 'Zonerama 库', icon: <Cloud className="w-4 h-4" />, perm: 'admin_library' },
        { id: 'daily_gallery', label: '每日图集', icon: <Calendar className="w-4 h-4" />, perm: 'admin_library' },
        { 
          id: 'taxonomy', 
          label: '分类标签', 
          icon: <Folder className="w-4 h-4" />, 
          perm: 'admin_categories',
          children: [
            { id: 'categories', label: '分类中心', icon: <Settings2 className="w-3.5 h-3.5" />, perm: 'admin_categories' },
            { id: 'tags', label: '标签池', icon: <TagIcon className="w-3.5 h-3.5" />, perm: 'admin_tags' },
          ]
        },
        { id: 'recommendation', label: '智能推荐', icon: <Zap className="w-4 h-4" />, perm: 'admin_audit' },
      ]
    },
    {
      id: 'growth_group',
      label: '成长体系',
      items: [
        { 
          id: 'growth_manage', 
          label: '成长等级', 
          icon: <TrendingUpIcon className="w-4 h-4" />, 
          perm: 'admin_points',
          children: [
            { id: 'growth', label: '成长记录', icon: <TrendingUpIcon className="w-3.5 h-3.5" />, perm: 'admin_points' },
            { id: 'ranks', label: '等级配置', icon: <Trophy className="w-3.5 h-3.5" />, perm: 'admin_points' },
          ]
        },
        { 
          id: 'currency_manage', 
          label: '积分财富', 
          icon: <Flame className="w-4 h-4" />, 
          perm: 'admin_points',
          children: [
            { id: 'points', label: '积分管理', icon: <Flame className="w-3.5 h-3.5" />, perm: 'admin_points' },
            { id: 'star_hunt', label: '寻找特控⭐', icon: <Star className="w-3.5 h-3.5 text-yellow-500" />, perm: 'admin_points' },
            { id: 'easter_eggs', label: '全局彩蛋', icon: <Gift className="w-3.5 h-3.5" />, perm: 'admin_points' },
            { id: 'redemption', label: '兑换码', icon: <Key className="w-3.5 h-3.5" />, perm: 'admin_invites' },
          ]
        },
        { 
          id: 'engagement_manage', 
          label: '互动激励', 
          icon: <CalendarCheck className="w-4 h-4" />, 
          perm: 'admin_points',
          children: [
            { id: 'checkin', label: '签到配置', icon: <CalendarCheck className="w-3.5 h-3.5" />, perm: 'admin_points' },
            { id: 'badges', label: '勋章管理', icon: <Crown className="w-3.5 h-3.5" />, perm: 'admin_points' },
          ]
        },
        { 
          id: 'id_manage', 
          label: '靓号铺子', 
          icon: <Star className="w-4 h-4" />, 
          perm: 'admin_points',
          children: [
            { id: 'specialIds', label: '靓号池', icon: <Star className="w-3.5 h-3.5" />, perm: 'admin_points' },
            { id: 'idConfig', label: '分配规则', icon: <Hash className="w-3.5 h-3.5" />, perm: 'admin_points' },
          ]
        },
      ]
    },
    {
      id: 'ecosystem',
      label: '生态对接',
      items: [
        { 
          id: 'wechat_mp', 
          label: '微信公众号', 
          icon: <MessageSquare className="w-4 h-4" />, 
          perm: 'admin_storage',
          children: [
            { id: 'wechat', label: '接口配置', icon: <Settings className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'wechat_messages', label: '消息记录', icon: <MessageSquare className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'wechat_fans', label: '粉丝列表', icon: <UsersIcon className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'wechat_keywords', label: '关键词', icon: <Hash className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'wechat_auto', label: '回复策略', icon: <Zap className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'wechat_menu_settings', label: '菜单DIY', icon: <Menu className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'wechat_draft', label: '草稿箱', icon: <FileText className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'wechat_notifications', label: '模板通知', icon: <Bell className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'random_beauty', label: '随机美图', icon: <Flame className="w-3.5 h-3.5" />, perm: 'admin_storage' },
          ]
        },
        { 
          id: 'miniprogram_manage', 
          label: '微信小程序', 
          icon: <Smartphone className="w-4 h-4" />, 
          perm: 'admin_storage',
          children: [
            { id: 'miniprogram', label: '接口配置', icon: <Settings className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'mp_logs', label: '记录流水', icon: <ListFilter className="w-3.5 h-3.5" />, perm: 'admin_storage' },
          ]
        },
      ]
    },
    {
      id: 'app_management',
      label: 'App管理',
      items: [
        { id: 'app_manage', label: 'App配置', icon: <Smartphone className="w-4 h-4" />, perm: 'admin_storage' },
      ]
    },
    {
      id: 'users',
      label: '用户管理',
      items: [
        { id: 'users', label: '用户与权限', icon: <UsersIcon className="w-4 h-4" />, perm: 'admin_users' },
        { id: 'invites', label: '邀请码', icon: <UserPlus className="w-4 h-4" />, perm: 'admin_invites' },
        { id: 'userFields', label: '资料项配置', icon: <Settings2 className="w-4 h-4" />, perm: 'admin_userfields' },
        { id: 'guides', label: '文档手册', icon: <FileText className="w-4 h-4" />, perm: 'admin_dashboard' },
      ]
    },
    {
      id: 'marketing',
      label: '营销展示',
      items: [
        { id: 'promotion_diy', label: '宣传页 DIY', icon: <LayoutDashboard className="w-4 h-4" />, perm: 'admin_storage' },
        { id: 'ads', label: '广告位管理', icon: <Monitor className="w-4 h-4" />, perm: 'admin_ads' },
      ]
    },
    {
      id: 'proxy',
      label: '综合代理',
      items: [
        { 
          id: 'proxy_group', 
          label: '代理与缓存', 
          icon: <RefreshCcw className="w-4 h-4" />, 
          perm: 'admin_storage',
          children: [
            { id: 'proxy_addr', label: '代理地址', icon: <Globe className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'proxy_rules', label: '处理规则', icon: <Settings2 className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'proxy_security', label: '安全策略', icon: <Shield className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'proxy_display', label: '缩略水印', icon: <ImageIcon className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'proxy_domains', label: '排除缓存', icon: <Globe className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'proxy_tools', label: '测试工具', icon: <Zap className="w-3.5 h-3.5" />, perm: 'admin_storage' },
          ]
        },
      ]
    },
    {
      id: 'maintenance',
      label: '运维开发',
      items: [
        { id: 'feedbacks', label: '反馈中心', icon: <MessageSquare className="w-4 h-4" />, perm: 'admin_dashboard' },
        { id: 'performance', label: '性能监控', icon: <TrendingUpIcon className="w-4 h-4" />, perm: 'admin_dashboard' },
        { id: 'analytics', label: '统计分析', icon: <BarChart3 className="w-4 h-4" />, perm: 'admin_dashboard', path: '/admin/analytics' },
        { 
          id: 'infra_manage', 
          label: '基础设施', 
          icon: <Cloud className="w-4 h-4" />, 
          perm: 'admin_storage',
          children: [
            { id: 'storage', label: '基本参数', icon: <Settings className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'r2_config', label: 'R2 存储', icon: <Cloud className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'sql_tool', label: 'SQL 工具', icon: <FileCode2 className="w-3.5 h-3.5" />, perm: 'admin_db' },
             { id: 'builds', label: '构建中心', icon: <Package className="w-3.5 h-3.5" />, perm: 'admin_storage' },

            { id: 'db_optimize', label: '维护优化', icon: <DatabaseIcon className="w-3.5 h-3.5" />, perm: 'admin_db' },
          ]
        },
        { 
          id: 'webmaster_tools', 
          label: '站长工具', 
          icon: <Globe className="w-4 h-4" />, 
          perm: 'admin_storage',
          children: [
            { id: 'status', label: '系统状态', icon: <Activity className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'webmaster', label: '短代码管理', icon: <FileCode2 className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'parse_import', label: '解析导入', icon: <Search className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'data_sync', label: '配置同步', icon: <RefreshCcw className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'stat_tool', label: '统计配置', icon: <BarChart3 className="w-3.5 h-3.5" />, perm: 'admin_storage' },
            { id: 'domains', label: '域名映射', icon: <Globe className="w-3.5 h-3.5" />, perm: 'admin_storage' },
          ]
        },
        { id: 'navigation', label: '导航栏配置', icon: <Smartphone className="w-4 h-4" />, perm: 'admin_storage' },
        { id: 'player', label: '播放器设置', icon: <CirclePlay className="w-4 h-4" />, perm: 'admin_storage' },
        { id: 'notifications', label: '通知模板', icon: <Bell className="w-4 h-4" />, perm: 'admin_notifications' },
      ]
    }
  ];

  if (loadingPerms) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50/50 p-6 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-6" />
        <h3 className="text-lg font-black text-foreground">管理权限校验中</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">正在连接安全网关获取您的管理权限配置，请稍候...<br/>(网络环境较差时可能需要 3-5 秒)</p>
        <div className="mt-8 flex gap-4">
          <Button variant="ghost" onClick={() => window.location.reload()} className="text-xs text-muted-foreground underline">
            刷新页面
          </Button>
          <Button variant="ghost" onClick={() => navigate('/')} className="text-xs text-muted-foreground underline">
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  // 判定是否有权访问任何一个管理功能
  const hasAnyAdminAccess = profile?.role === 'admin' || permissions.some(p => p.startsWith('admin_'));

  // 当前页面标题
  const flatMenuItems = menuGroups.flatMap(g => 
    g.items.flatMap((i: any) => i.children ? [i, ...i.children] : [i])
  );
  const currentTitle = flatMenuItems.find(m => m.id === activeMenu)?.label || '管理后台';

  // 统一布局：不再根据设备类型分 return，避免 DOM 重建导致的 Portal 错误
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-slate-50 selection:bg-primary/10">
      {/* 侧边栏：采用抽屉式设计，支持 PC 和 H5 */}
      <aside className={cn(
        "w-64 bg-card border-r border-border/40 flex flex-col shrink-0 overflow-hidden transition-all duration-300 shadow-2xl fixed inset-y-0 left-0 z-[100010] md:relative min-h-0",
        !isDrawerOpen ? "-translate-x-full md:translate-x-0 md:w-0" : "translate-x-0"
      )}>
        <SidebarContentComponent 
          menuGroups={menuGroups}
          canAccess={canAccess}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          profile={profile}
          user={user}
          signOut={signOut}
          onMenuClick={() => {
            // 移动端点击菜单后自动关闭
            if (window.innerWidth < 768) {
              setIsDrawerOpen(false);
            }
          }}
          isOpen={isDrawerOpen}
          onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
        />
      </aside>

      {/* PC 端侧边栏切换按钮 - 固定在左侧，侧边栏关闭时显示 */}
      {!isDrawerOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDrawerOpen(true)}
          className={cn(
            "fixed top-4 left-4 z-40 w-10 h-10 rounded-full bg-card border border-border shadow-lg hover:bg-primary/10 hover:text-primary transition-all duration-300",
            "hidden md:flex items-center justify-center"
          )}
          title="展开侧边栏"
        >
          <Menu className="w-5 h-5" />
        </Button>
      )}

      {/* 全局抽屉遮罩（仅移动端显示） */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-[100009] transition-all duration-300 md:hidden",
          isDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative">
        {/* 顶部导航 */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-border/40 flex items-center justify-between px-4 md:px-8 shrink-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "rounded-xl h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors",
                isDrawerOpen && "md:hidden"
              )}
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <h1 className="text-base md:text-xl font-black text-primary truncate max-w-[150px] md:max-w-none flex items-center gap-2">
              {currentTitle}
              <Badge variant="outline" className="text-[10px] h-5 bg-primary/5 text-primary border-primary/20 font-mono">v{version}</Badge>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <AdminQuickSearch 
                menuGroups={menuGroups as any} 
                canAccess={canAccess} 
                onSelect={(id: string, tab?: string) => {
                  const allFlat = menuGroups.flatMap(g => 
                    g.items.flatMap((i: any) => i.children ? [i, ...i.children] : [i])
                  );
                  const item = allFlat.find((i: any) => i.id === id);
                  if (item?.parentId) {
                    if (!expandedGroups.includes(item.parentId)) {
                      toggleGroup(item.parentId);
                    }
                  } else {
                    const parentOfChild = (menuGroups.flatMap(g => g.items) as any[]).find((i: any) => i.children?.some((c: any) => c.id === id));
                    if (parentOfChild && !expandedGroups.includes(parentOfChild.id)) {
                      toggleGroup(parentOfChild.id);
                    }
                  }
                  setActiveMenu(id);
                  if (tab) setActiveTab(tab);
                }} 
              />
            </div>

            <div className="h-8 w-px bg-border/40 hidden md:block" />

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer group hover:bg-slate-100 p-1 rounded-xl transition-all">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-bold text-foreground leading-none">{profile?.username}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{profile?.role === 'admin' ? '超级管理员' : '运营人员'}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    {profile?.username?.charAt(0).toUpperCase()}
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl border-none p-1.5 animate-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuLabel className="px-3 py-2 text-xs font-black text-slate-400 uppercase tracking-wider">账号管理</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/')} className="rounded-xl px-3 py-2.5 cursor-pointer flex items-center gap-3 focus:bg-primary/5 focus:text-primary transition-all">
                  <Smartphone className="w-4 h-4" />
                  <span className="font-bold text-sm">返回首页</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveMenu('profile_settings')} className="rounded-xl px-3 py-2.5 cursor-pointer flex items-center gap-3 focus:bg-primary/5 focus:text-primary transition-all">
                  <Key className="w-4 h-4" />
                  <span className="font-bold text-sm">修改密码</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5 bg-slate-100" />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate('/login'); }} className="rounded-xl px-3 py-2.5 cursor-pointer flex items-center gap-3 text-red-500 focus:bg-red-50 focus:text-red-600 transition-all">
                  <LogOut className="w-4 h-4" />
                  <span className="font-bold text-sm">退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
          <div className="p-4 md:p-8 w-full">
            <ErrorBoundary>
              {!hasAnyAdminAccess ? (
                /* 权限受限提示 */
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-white rounded-3xl border border-dashed border-border p-8 md:p-12 shadow-sm">
                  <ShieldAlert className="w-16 h-16 md:w-20 md:h-20 text-muted-foreground mb-6 opacity-20" />
                  <h2 className="text-xl md:text-2xl font-black text-foreground">管理权限受限</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs">您当前登录的账号暂无此管理后台的任何操作权限，请联系超级管理员进行配置。</p>
                  <div className="flex gap-4 mt-8">
                    <Button variant="outline" onClick={() => navigate('/')} className="rounded-2xl px-6 h-11 font-bold">
                      返回首页
                    </Button>
                    <Button variant="default" onClick={async () => { await signOut(); navigate('/login'); }} className="rounded-2xl px-6 h-11 font-bold">
                      切换账号
                    </Button>
                  </div>
                </div>
              ) : (
                /* 业务组件区域 */
                <div className="w-full" key={activeMenu + (searchParams.get('t') || '')}>
                  {/* 使用条件渲染，避免所有组件同时挂载导致性能问题和冲突 */}
                  <Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" /></div>}>
                    {activeMenu === 'dashboard' && canAccess('admin_dashboard') && <DashboardSection setActiveMenu={setActiveMenu} />}
                    {activeMenu === 'datacenter' && canAccess('admin_datacenter') && <DataCenterSection />}
                    {activeMenu === 'user_stats' && canAccess('admin_datacenter') && <DataCenterSection defaultTab="visits" />}
                    {activeMenu === 'ranking' && canAccess('admin_ranking') && <RankingSection />}
                    {activeMenu === 'content' && canAccess('admin_audit') && <ContentSection stats={stats} onAction={fetchStats} />}
                    {activeMenu === 'reports' && canAccess('admin_audit') && <ContentSection stats={stats} onAction={fetchStats} initialTab="reports" />}
                    {activeMenu === 'album_requests' && canAccess('admin_library') && <AlbumRequestsSection />}
                    {activeMenu === 'library' && canAccess('admin_library') && <MediaLibrarySection />}
                    {activeMenu === 'staging' && canAccess('admin_library') && <MediaLibrarySection defaultStatus="staging" />}
                    {activeMenu === 'recycle_bin' && canAccess('admin_library') && <MediaLibrarySection defaultStatus="deleted" />}
                    {activeMenu === 'duplicates' && canAccess('admin_library') && <DuplicatesSection />}
                    {activeMenu === 'albums' && canAccess('admin_library') && <AlbumsSection />}
                    {activeMenu === 'album_photos' && canAccess('admin_library') && <AlbumPhotosSection />}
                    {activeMenu === 'zonerama_library' && canAccess('admin_library') && <ZoneramaLibrarySection />}
                    {activeMenu === 'daily_gallery' && canAccess('admin_library') && <DailyGallerySection />}
                    {activeMenu === 'fast_leveling' && canAccess('admin_library') && <FastLevelingSection />}
                    {activeMenu === 'users' && canAccess('admin_users') && <UsersSection />}
                    {activeMenu === 'userFields' && canAccess('admin_userfields') && <UserFieldsSection />}
                    {activeMenu === 'points' && canAccess('admin_points') && <PointsSection />}
                    {activeMenu === 'easter_eggs' && canAccess('admin_points') && <EasterEggManagement />}
                    {activeMenu === 'growth' && canAccess('admin_points') && <GrowthSection />}
                    {activeMenu === 'ranks' && canAccess('admin_points') && <RanksManagementSection />}
                    {activeMenu === 'specialIds' && canAccess('admin_points') && <SpecialIdsManagementSection />}
                    {activeMenu === 'idConfig' && canAccess('admin_points') && <DigitalIdConfigSection />}
                    {activeMenu === 'checkin' && canAccess('admin_points') && <SigninManagementSection />}
                    {activeMenu === 'badges' && canAccess('admin_points') && <BadgesManagementSection defaultTab="list" />}
                    {activeMenu === 'star_hunt' && canAccess('admin_points') && <StarHuntManagement />}

                    {activeMenu === 'categories' && canAccess('admin_categories') && <CategoriesSection defaultTab="management" />}
                    {activeMenu === 'category_content' && canAccess('admin_categories') && <CategoriesSection defaultTab="content" />}
                    {activeMenu === 'tags' && canAccess('admin_tags') && <TagsSection />}
                    {activeMenu === 'recommendation' && canAccess('admin_audit') && <RecommendationSection />}
                    
                    {activeMenu === 'redemption' && canAccess('admin_invites') && <RedemptionCodesSection />}
                    {activeMenu === 'invites' && canAccess('admin_invites') && <InvitesSection />}
                    {activeMenu === 'guides' && canAccess('admin_dashboard') && <GuidesManagementSection />}
                    {activeMenu === 'feedbacks' && canAccess('admin_dashboard') && <FeedbacksSection />}

                    {activeMenu === 'wechat' && canAccess('admin_storage') && <WechatManagementSection />}
                    {activeMenu === 'wechat_draft' && canAccess('admin_storage') && <WechatDraftSection />}
                    {activeMenu === 'wechat_fans' && canAccess('admin_storage') && <WechatFansSection />}
                    {activeMenu === 'wechat_keywords' && canAccess('admin_storage') && <WechatKeywordsSection />}
                    {activeMenu === 'wechat_auto' && canAccess('admin_storage') && <WechatAutoSection />}
                    {activeMenu === 'wechat_menu_settings' && canAccess('admin_storage') && <WechatMenuSettingsSection />}
                    {activeMenu === 'wechat_notifications' && canAccess('admin_storage') && <WechatNotificationsSection />}
                    {activeMenu === 'random_beauty' && canAccess('admin_storage') && <RandomBeautySection />}
                    {activeMenu === 'data_sync' && canAccess('admin_storage') && <WebmasterSection defaultTab="data_sync" />}

                    {activeMenu === 'wechat_messages' && canAccess('admin_storage') && <WechatMessagesSection />}
                    {activeMenu === 'wechat_follow' && canAccess('admin_storage') && <WechatFollowSection />}
                    {activeMenu === 'miniprogram' && canAccess('admin_storage') && <MiniProgramSection />}
                    {activeMenu === 'mp_logs' && canAccess('admin_storage') && <MiniProgramLogsSection />}

                    {activeMenu === 'promotion_diy' && canAccess('admin_storage') && <PromotionDIYSection />}
                    {activeMenu === 'ads' && canAccess('admin_ads') && <AdsSection />}

                    {activeMenu === 'performance' && canAccess('admin_dashboard') && <PerformanceMonitorSection />}
                    {activeMenu === 'storage' && canAccess('admin_storage') && <StorageSection defaultTab="basic" />}
                    {activeMenu === 'r2_config' && canAccess('admin_storage') && <StoragePage defaultTab="r2" />}
                    {(activeMenu === 'proxy_addr' || activeMenu === 'proxy_rules' || activeMenu === 'proxy_security' || 
                      activeMenu === 'proxy_display' || activeMenu === 'proxy_domains' || activeMenu === 'proxy_tools' || 
                      activeMenu === 'comprehensive_proxy') && canAccess('admin_storage') && (
                      <ProxyManagementSection 
                        defaultTab={
                          activeMenu === 'proxy_addr' ? 'proxy' :
                          activeMenu === 'proxy_rules' ? 'processing' :
                          activeMenu === 'proxy_security' ? 'security' :
                          activeMenu === 'proxy_display' ? 'display' :
                          activeMenu === 'proxy_domains' ? 'domains_cache' :
                          activeMenu === 'proxy_tools' ? 'tools' : 'proxy'
                        } 
                      />
                    )}
                    {activeMenu === 'baota_deploy' && canAccess('admin_storage') && <StoragePage defaultTab="baota" />}
                    {activeMenu === 'sql_tool' && canAccess('admin_db') && <StoragePage defaultTab="sql" />}
                     { activeMenu === 'builds' && canAccess('admin_storage') && <BuildSection />}

                    {activeMenu === 'db_optimize' && canAccess('admin_db') && <StoragePage defaultTab="db_optimize" />}
                    {activeMenu === 'parse_import' && canAccess('admin_storage') && <WebmasterSection defaultTab="parse_import" />}
                    {activeMenu === 'webmaster' && canAccess('admin_storage') && <WebmasterSection defaultTab="paths" />}
                    {activeMenu === 'status' && canAccess('admin_storage') && <SystemStatusSection />}
                    {activeMenu === 'stat_tool' && canAccess('admin_storage') && <WebmasterSection defaultTab="global_assets" />}
                    {activeMenu === 'domains' && canAccess('admin_storage') && <DomainSettingsSection />}
                    {activeMenu === 'navigation' && canAccess('admin_storage') && <NavigationSection />}
                    {activeMenu === 'player' && canAccess('admin_storage') && <PlayerSection />}
                    {activeMenu === 'notifications' && canAccess('admin_notifications') && <NotificationsSection />}
                    {activeMenu === 'profile_settings' && <ProfileSettingsSection />}
                    {activeMenu === 'app_manage' && canAccess('admin_storage') && <AppManagementSection />}
                  </Suspense>
                  
                  {/* 路径与短代码等特殊映射 */}
                  {activeMenu === 'keyword_replacement' && canAccess('admin_storage') && <WebmasterSection defaultTab="replacements" />}
                  
                  {/* 后备兜底显示：如果当前 activeMenu 没有权限渲染 */}
                  {activeMenu && !canAccess(`admin_${activeMenu.toLowerCase()}`) && activeMenu !== 'dashboard' && (
                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-12">
                      <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
                      <p className="text-muted-foreground font-medium">您无权访问当前选中的模块</p>
                      <Button variant="ghost" onClick={() => setActiveMenu('dashboard')} className="mt-4 text-xs underline">返回主控制台</Button>
                    </div>
                  )}
                </div>
              )}
            </ErrorBoundary>
          </div>

        </main>
      </div>
    </div>
  );
}

