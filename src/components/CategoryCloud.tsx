import React, { useEffect, useState } from 'react';
import { api } from '@/db/api';
import type { ContentCategory } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Loader2, Folder, LayoutGrid } from 'lucide-react';
import { cn, getRainbowColor } from '@/lib/utils';

interface CategoryCloudProps {
  onCategoryClick: (category: ContentCategory) => void;
  activeCategoryId?: string;
}

export function CategoryCloud({ onCategoryClick, activeCategoryId }: CategoryCloudProps) {
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const { data } = await api.getCategoryCloud();
        setCategories(data || []);
      } catch (e) {
        console.error('Failed to fetch categories:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-24 rounded-3xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
        <LayoutGrid className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground font-medium">暂无可显示的分类</p>
      </div>
    );
  }

  const visibleCategories = categories.filter(c => c.is_visible !== false);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-2">
      {visibleCategories.map((cat, index) => {
        const count = cat.count || 0;
        const isActive = activeCategoryId === cat.id;
        const rainbowClass = getRainbowColor(cat.id, isActive);
        
        // 生成一个富有活力的渐变背景
        const gradients = [
          'from-pink-500 to-rose-400',
          'from-amber-400 to-orange-500',
          'from-emerald-400 to-teal-500',
          'from-blue-400 to-indigo-500',
          'from-violet-400 to-purple-500',
          'from-cyan-400 to-blue-500',
          'from-lime-400 to-green-500'
        ];
        const gradientClass = gradients[index % gradients.length];
        
        return (
          <div
            key={cat.id}
            className={cn(
              "group relative overflow-hidden cursor-pointer transition-all duration-500 hover:scale-105 active:scale-95 rounded-[2rem] p-4 flex flex-col justify-between h-32 border-2",
              isActive 
                ? "border-primary shadow-xl shadow-primary/20 ring-4 ring-primary/10" 
                : "border-transparent bg-muted/30 hover:bg-muted/50"
            )}
            onClick={() => onCategoryClick(cat)}
          >
            {/* 背景装饰 */}
            <div className={cn(
              "absolute -right-4 -bottom-4 w-20 h-20 rounded-full blur-2xl opacity-20 transition-all duration-500 group-hover:scale-150 bg-gradient-to-br",
              gradientClass
            )} />
            
            <div className="flex justify-between items-start z-10">
              <div className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:rotate-12 group-hover:scale-110",
                isActive ? "bg-primary text-white" : "bg-white dark:bg-zinc-800 shadow-sm"
              )}>
                <Folder className={cn("w-5 h-5", isActive ? "text-white" : "text-primary")} />
              </div>
              {count > 0 && (
                <span className={cn(
                  "text-[10px] px-2 py-1 rounded-full font-black tracking-wider",
                  isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                )}>
                  {count} P
                </span>
              )}
            </div>
            
            <div className="z-10">
              <h3 className={cn(
                "font-black text-sm tracking-tight transition-colors",
                isActive ? "text-primary" : "text-foreground"
              )}>
                {cat.name}
              </h3>
              <div className="h-1 w-8 rounded-full bg-primary/20 mt-1 transition-all duration-500 group-hover:w-16 group-hover:bg-primary" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
