import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { SheetHeader, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { ContentCategory } from '@/types';
import { MediaType } from '@/lib/home-state';

interface FilterContentProps {
  mediaType: MediaType;
  onMediaTypeChange: (type: MediaType) => void;
  categories: ContentCategory[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  activeTagIds: string[];
  allTags: any[];
  onTagToggle: (tagId: string) => void;
  onClearFilters: () => void;
  getRainbowColor: (index: number, isSelected?: boolean) => any;
  onDone: () => void;
}

export const FilterContent: React.FC<FilterContentProps> = ({
  mediaType,
  onMediaTypeChange,
  categories,
  categoryId,
  onCategoryChange,
  activeTagIds,
  allTags,
  onTagToggle,
  onClearFilters,
  getRainbowColor,
  onDone
}) => {
  return (
    <>
      <SheetHeader className="mb-6">
        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4 opacity-30" />
        <SheetTitle className="text-center text-2xl font-black tracking-tight">内容发现</SheetTitle>
        <SheetDescription className="text-center">通过分类或类型深度探索</SheetDescription>
      </SheetHeader>

      <div className="space-y-8">
        {/* 媒体类型筛选 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-4 bg-primary rounded-full" />
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">作品类型</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'all', name: '全部作品', icon: LayoutGrid },
              { id: 'image', name: '图集内容', icon: ImageIcon },
              { id: 'video', name: '视频内容', icon: VideoIcon },
            ].map((t) => (
              <div 
                key={t.id}
                onClick={() => onMediaTypeChange(t.id as MediaType)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                  mediaType === t.id 
                    ? "bg-primary/10 border-primary text-primary shadow-sm" 
                    : "bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground"
                )}
              >
                <t.icon className="w-6 h-6" />
                <span className="text-[10px] font-bold">{t.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 分类筛选 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-4 bg-primary rounded-full" />
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">内容分类</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={categoryId === 'all' ? 'default' : 'outline'}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border-border/50",
                categoryId === 'all' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted"
              )}
              onClick={() => onCategoryChange('all')}
            >
              全部
            </Badge>
            <Badge
              variant={categoryId === 'none' ? 'default' : 'outline'}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border-border/50",
                categoryId === 'none' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted"
              )}
              onClick={() => onCategoryChange('none')}
            >
              无分类
            </Badge>
            {categories.map((cat, idx) => (
              <Badge
                key={cat.id}
                variant={categoryId === cat.id ? 'default' : 'outline'}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border-border/50"
                )}
                style={categoryId === cat.id ? {} : getRainbowColor(idx)}
                onClick={() => onCategoryChange(cat.id)}
              >
                {cat.name}
              </Badge>
            ))}
          </div>
        </section>

        {/* 热门标签 */}
        {allTags.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-4 bg-primary rounded-full" />
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">热门标签</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 20).map((tag) => (
                <Badge
                  key={tag.id}
                  variant={activeTagIds.includes(tag.id) ? 'default' : 'outline'}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all border-border/40",
                    activeTagIds.includes(tag.id) ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" : "bg-muted/30 hover:bg-muted"
                  )}
                  onClick={() => onTagToggle(tag.id)}
                >
                  # {tag.name}
                </Badge>
              ))}
            </div>
          </section>
        )}

        <div className="pt-4 grid grid-cols-2 gap-3">
          <SheetClose asChild>
            <Button 
              variant="outline" 
              className="rounded-2xl h-12 font-bold border-border/50"
              onClick={onClearFilters}
            >
              重置全部
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button 
              className="rounded-2xl h-12 font-bold shadow-lg shadow-primary/20"
              onClick={onDone}
            >
              完成筛选
            </Button>
          </SheetClose>
        </div>
      </div>
    </>
  );
};
