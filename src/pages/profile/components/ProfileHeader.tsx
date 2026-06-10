import React from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, Bell, Settings, LogOut } from 'lucide-react';

interface ProfileHeaderProps {
  isAdmin: boolean;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  onOpenPreferences: () => void;
  onOpenNotificationPrefs: () => void;
  NotificationBadge: React.FC;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isAdmin,
  onNavigate,
  onSignOut,
  onOpenPreferences,
  onOpenNotificationPrefs,
  NotificationBadge
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40 h-14 flex items-center justify-between px-4 transition-all">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-black tracking-tight text-foreground drop-shadow-sm select-none">个人中心</h1>
      </div>
      <div className="flex items-center gap-1">
        {isAdmin && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onNavigate('/admin/pc')}
            className="rounded-full text-slate-700 hover:bg-slate-100 active:scale-90 transition-all"
          >
            <BarChart3 className="w-5 h-5" />
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onOpenPreferences}
          className="rounded-full text-slate-700 hover:bg-slate-100 active:scale-90 transition-all"
        >
          <Settings className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => onNavigate('/notifications')}
          className="rounded-full relative text-slate-700 hover:bg-slate-100 active:scale-90 transition-all"
          onContextMenu={(e) => {
            e.preventDefault();
            onOpenNotificationPrefs();
          }}
          title="点击查看通知，长按设置偏好"
        >
          <Bell className="w-5 h-5" />
          <NotificationBadge />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onSignOut}
          className="rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 active:scale-90 transition-all"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
