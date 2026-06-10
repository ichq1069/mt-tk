import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ShieldCheck, Users, Cloud, Monitor, Globe } from 'lucide-react';

export function AdminNav() {
  const links = [
    { path: '/admin/audit', icon: ShieldCheck, label: '审核' },
    { path: '/admin/users', icon: Users, label: '用户' },
    { path: '/admin/webmaster', icon: Globe, label: '工具' },
    { path: '/admin/pc', icon: Monitor, label: 'PC版' },
  ];

  return (
    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl mb-6">
      {links.map((link) => (
        <NavLink
          key={link.path}
          to={link.path}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-center gap-2 flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
              isActive 
                ? "bg-background text-primary shadow-sm" 
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            )
          }
        >
          <link.icon className="w-4 h-4" />
          <span>{link.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
