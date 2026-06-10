import React from 'react';
import { TriangleAlert, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DailyGalleryRestricted: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in zoom-in duration-700">
      <div className="relative">
        <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl flex items-center justify-center border border-rose-100 dark:border-rose-900/30">
          <TriangleAlert className="w-12 h-12 text-rose-500" />
        </div>
      </div>
      <div className="space-y-3 max-w-[280px]">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">访问受限</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
          抱歉，根据相关政策要求，该内容暂时不支持在微信内部直接访问。
        </p>
      </div>
      <div className="w-full max-w-[280px] p-6 rounded-3xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
          您可以点击右上角 <span className="text-primary font-black">“在浏览器打开”</span> 或复制当前链接到其他浏览器进行访问。
        </p>
      </div>
    </div>
  );
};
