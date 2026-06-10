import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutSwitcher } from '@/components/layouts';
import { cn } from '@/lib/utils';
import { ViewLayout, ViewMode } from '@/lib/home-state';
import { SlidersHorizontal, Layers, X, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ContentCategory } from '@/types';

interface FilterBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: string) => void;
  viewLayout: ViewLayout;
  onLayoutChange: (layout: ViewLayout) => void;
  previewIndex: number;
  isCleared: boolean;
  categoryId: string;
  activeTagIds: string[];
  categories: ContentCategory[];
  allTags: any[];
  onRemoveCategory: () => void;
  onRemoveTag: (id: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  viewMode,
  onViewModeChange,
  viewLayout,
  onLayoutChange,
  previewIndex,
  isCleared,
  categoryId,
  activeTagIds,
  categories,
  allTags,
  onRemoveCategory,
  onRemoveTag
}) => {
  const isFeedOrPreview = viewLayout === 'feed' || previewIndex >= 0;

  return (
    <div className={cn(
      "fixed left-0 right-0 z-[1000] transition-all duration-300",
      isFeedOrPreview
        ? "top-14 pt-2 pb-4 px-4 bg-black border-b border-white/10" 
        : "top-14 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-2 pb-2 px-4 border-b border-border/50",
      viewLayout === 'feed' && "pointer-events-none",
      previewIndex >= 0 && "pointer-events-auto",
      isCleared && "opacity-0 pointer-events-none translate-y-[-100%]"
    )}>
      <div className={cn(
        "flex flex-col gap-2 transition-transform duration-300",
        isFeedOrPreview ? "max-w-[280px] mx-auto pointer-events-auto" : "max-w-5xl mx-auto",
        isCleared && "translate-y-[-20px]"
      )}>
        {/* 状态切换 Tabs - 占据独立一行 */}
        <div className="w-full">
          <Tabs value={viewMode} onValueChange={onViewModeChange} className="w-full">
            <TabsList className={cn(
              "grid w-full grid-cols-3 rounded-xl p-1 shadow-2xl",
              isFeedOrPreview ? "bg-black/40 backdrop-blur-xl border border-white/10" : "bg-muted/50"
            )}>
              <TabsTrigger 
                value="latest" 
                className={cn(
                  "rounded-lg text-sm transition-all",
                  isFeedOrPreview ? "text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/20" : ""
                )}
              >
                最新
              </TabsTrigger>
              <TabsTrigger 
                value="recommended" 
                className={cn(
                  "rounded-lg text-sm font-bold transition-all",
                  isFeedOrPreview ? "text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/20" : ""
                )}
              >
                推荐
              </TabsTrigger>
              <TabsTrigger 
                value="random" 
                className={cn(
                  "rounded-lg text-sm transition-all",
                  isFeedOrPreview ? "text-white/60 data-[state=active]:text-white data-[state=active]:bg-white/20" : ""
                )}
              >
                随机
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 布局切换器 - 位于下方右侧 */}
        {viewLayout !== 'feed' && previewIndex < 0 && (
          <div className="flex justify-end mt-0.5">
            <LayoutSwitcher
              currentLayout={viewLayout}
              onLayoutChange={(newLayout) => onLayoutChange(newLayout as ViewLayout)}
              variant="compact"
            />
          </div>
        )}

        {/* 选中的筛选状态提示 */}
        {viewLayout === 'grid' && (categoryId !== 'all' || activeTagIds.length > 0) && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 animate-in slide-in-from-top-1 fade-in duration-200 border-t border-border/10">
            <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full text-[10px] font-black text-primary border border-primary/20 shadow-sm">
              <SlidersHorizontal className="w-3 h-3" />
              当前筛选
            </div>
            {categoryId !== 'all' && (
              <Badge variant="secondary" className="h-8 rounded-full text-[10px] font-bold bg-muted/60 hover:bg-muted/80 border-none shrink-0 px-3.5 flex items-center gap-2 text-foreground transition-all">
                <Layers className="w-3 h-3 opacity-50" />
                {categories.find(c => c.id === categoryId)?.name || '分类'}
                <X 
                  className="w-3.5 h-3.5 cursor-pointer opacity-40 hover:opacity-100 hover:text-red-500 ml-0.5" 
                  onClick={onRemoveCategory} 
                />
              </Badge>
            )}
            {activeTagIds.map(id => {
              const tag = allTags.find(t => t.id === id);
              return (
                <Badge key={id} variant="secondary" className="h-8 rounded-full text-[10px] font-bold bg-muted/60 hover:bg-muted/80 border-none shrink-0 px-3.5 flex items-center gap-2 text-foreground transition-all">
                  <Hash className="w-3 h-3 opacity-50" />
                  {tag ? tag.name : '标签'}
                  <X 
                    className="w-3.5 h-3.5 cursor-pointer opacity-40 hover:opacity-100 hover:text-red-500 ml-0.5" 
                    onClick={() => onRemoveTag(id)} 
                  />
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
