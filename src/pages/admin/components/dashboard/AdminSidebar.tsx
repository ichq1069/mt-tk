import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, Lock, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  perm: string;
  path?: string;
  children?: MenuItem[];
}

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

interface AdminSidebarProps {
  menuGroups: MenuGroup[];
  activeMenu: string;
  onMenuChange: (id: string) => void;
  openGroups: string[];
  onToggleGroup: (id: string) => void;
  hasPermission: (perm: string) => boolean;
  onLogout: () => void;
  profile: any;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  menuGroups,
  activeMenu,
  onMenuChange,
  openGroups,
  onToggleGroup,
  hasPermission,
  onLogout,
  profile
}) => {
  return (
    <aside className="w-72 bg-white border-r border-slate-100 flex flex-col h-full shrink-0 shadow-sm">
      <div className="p-8 border-b border-slate-50 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Lock className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter text-slate-800">控制中心</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Administrator</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm">
            {profile?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-700 truncate">{profile?.username || 'Admin User'}</p>
            <p className="text-[9px] font-bold text-primary uppercase tracking-tighter">{profile?.role || 'SYSTEM'}</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-6">
        <nav className="space-y-8">
          {menuGroups.map(group => {
            const visibleItems = group.items.filter(item => hasPermission(item.perm));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.id} className="space-y-3">
                <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-slate-200" />
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const isActive = activeMenu === item.id || item.children?.some(c => c.id === activeMenu);
                    const isOpen = openGroups.includes(item.id);

                    return (
                      <div key={item.id} className="space-y-1">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (item.children) {
                              onToggleGroup(item.id);
                            } else {
                              onMenuChange(item.id);
                            }
                          }}
                          className={cn(
                            "w-full h-11 justify-between px-4 rounded-xl transition-all duration-300 font-bold text-sm",
                            isActive ? "bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                              isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                            )}>
                              {item.icon}
                            </div>
                            {item.label}
                          </div>
                          {item.children && (
                            <div className={cn("transition-transform duration-300", isOpen && "rotate-180")}>
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          )}
                        </Button>
                        
                        {item.children && isOpen && (
                          <div className="pl-11 space-y-1 py-1 animate-in slide-in-from-top-2 duration-300">
                            {item.children.map(child => (
                              <button
                                key={child.id}
                                onClick={() => onMenuChange(child.id)}
                                className={cn(
                                  "w-full h-10 flex items-center gap-3 px-3 rounded-lg text-xs font-bold transition-all relative group",
                                  activeMenu === child.id ? "text-primary" : "text-slate-400 hover:text-slate-600"
                                )}
                              >
                                {activeMenu === child.id && (
                                  <motion.div layoutId="sidebar-active-indicator" className="absolute left-0 w-1 h-4 bg-primary rounded-full" />
                                )}
                                <div className={cn(
                                  "w-5 h-5 flex items-center justify-center transition-transform group-hover:scale-110",
                                  activeMenu === child.id ? "text-primary" : "text-slate-300"
                                )}>
                                  {child.icon}
                                </div>
                                {child.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="p-6 border-t border-slate-50">
        <Button 
          variant="outline" 
          onClick={onLogout}
          className="w-full h-11 rounded-2xl border-slate-200 text-slate-500 font-bold text-xs gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
          安全退出后台
        </Button>
      </div>
    </aside>
  );
};
