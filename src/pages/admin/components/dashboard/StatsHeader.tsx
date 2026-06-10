import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users as UsersIcon, 
  FileCheck, 
  ImageIcon, 
  BarChart3,
  TrendingUp,
  Activity
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface StatsHeaderProps {
  stats: {
    users: number;
    pending: number;
    approved: number;
    favorites: number;
    dislikes: number;
    views: number;
  };
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({ stats }) => {
  const statItems = [
    { label: '注册用户', value: stats.users, icon: <UsersIcon className="w-5 h-5" />, color: 'bg-blue-500', textColor: 'text-blue-500' },
    { label: '待审内容', value: stats.pending, icon: <FileCheck className="w-5 h-5" />, color: 'bg-amber-500', textColor: 'text-amber-500' },
    { label: '已过审', value: stats.approved, icon: <ImageIcon className="w-5 h-5" />, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
    { label: '总浏览', value: stats.views, icon: <BarChart3 className="w-5 h-5" />, color: 'bg-indigo-500', textColor: 'text-indigo-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((stat, i) => (
        <Card key={i} className="rounded-[2rem] border-none shadow-sm overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-black tracking-tighter tabular-nums">{stat.value.toLocaleString()}</h3>
                  <div className={cn("flex items-center text-[10px] font-black", stat.textColor)}>
                    <TrendingUp className="w-3 h-3 mr-0.5" />
                    +2.5%
                  </div>
                </div>
              </div>
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110",
                stat.color
              )}>
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
