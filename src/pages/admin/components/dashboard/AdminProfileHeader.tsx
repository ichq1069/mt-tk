import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface AdminProfileHeaderProps {
  profile: any;
}

export const AdminProfileHeader: React.FC<AdminProfileHeaderProps> = ({ profile }) => {
  return (
    <div className="flex items-center gap-3">
      <Button 
        variant="ghost" 
        size="icon" 
        className="rounded-2xl h-11 w-11 relative text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
        onClick={() => toast.info('暂无新通知')}
      >
        <Bell className="w-5 h-5" />
        <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-11 pl-2 pr-4 rounded-2xl gap-3 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center text-xs font-black shadow-lg shadow-primary/20">
              {profile?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-black text-slate-700">{profile?.username || 'Admin'}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{profile?.role || 'System'}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 border-slate-100 shadow-2xl shadow-slate-200/50">
          <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">我的账户</DropdownMenuLabel>
          <DropdownMenuItem className="rounded-xl h-10 gap-3 font-bold text-slate-600 focus:bg-primary/5 focus:text-primary cursor-pointer">
            <User className="w-4 h-4" />
            个人资料
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-xl h-10 gap-3 font-bold text-slate-600 focus:bg-primary/5 focus:text-primary cursor-pointer">
            <Settings className="w-4 h-4" />
            偏好设置
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-slate-100 my-2 mx-1" />
          <DropdownMenuItem className="rounded-xl h-10 gap-3 font-bold text-red-500 focus:bg-red-50 focus:text-red-600 cursor-pointer">
            <LogOut className="w-4 h-4" />
            安全退出
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
