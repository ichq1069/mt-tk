import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  ImageIcon, 
  Compass, 
  Search, 
  LayoutGrid, 
  Image as VideoIcon, 
  SlidersHorizontal,
  Plus,
  Zap,
  MoreVertical,
  X,
  RefreshCw,
  RotateCcw,
  Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger, 
  SheetDescription, 
  SheetClose 
} from "@/components/ui/sheet";

interface HomeHeaderProps {
  viewLayout: string;
  previewIndex: number;
  isCleared: boolean;
  config: any;
  user: any;
  onBack: () => void;
  onOpenLogin: () => void;
  onNavigate: (path: string) => void;
  onToggleLayout: () => void;
  onOpenSearch: () => void;
  onToggleCleared: () => void;
  onReset: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
  mediaType: string;
  categoryId: string;
  activeTagIds: string[];
  onOpenFilterSheet: (open: boolean) => void;
  FilterContent: React.FC;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  viewLayout,
  previewIndex,
  isCleared,
  config,
  user,
  onBack,
  onOpenLogin,
  onNavigate,
  onToggleLayout,
  onOpenSearch,
  onToggleCleared,
  onReset,
  onRefresh,
  isAdmin,
  mediaType,
  categoryId,
  activeTagIds,
  onOpenFilterSheet,
  FilterContent
}) => {
  const isFeedOrPreview = viewLayout === 'feed' || previewIndex >= 0;

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-[1001] h-14 flex items-center justify-between px-4 transition-all duration-300",
      isFeedOrPreview
        ? "bg-black border-b border-white/10"
        : "bg-background/95 backdrop-blur-lg border-b border-border/40",
      viewLayout === 'feed' && "pointer-events-none",
      previewIndex >= 0 && "pointer-events-auto",
      isCleared && "opacity-0 pointer-events-none translate-y-[-100%]"
    )}>
      <div className={cn(
        "flex items-center gap-2 overflow-hidden transition-all duration-300 pointer-events-auto",
        isFeedOrPreview ? "text-white" : "text-foreground"
      )}>
        {isFeedOrPreview ? (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 mr-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        ) : config?.site_logo ? (
          <img src={config.site_logo} alt="Logo" className="w-8 h-8 rounded-lg object-contain shadow-sm" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <ImageIcon className="w-5 h-5" />
          </div>
        )}
        <h1 className="text-lg font-black tracking-tight truncate max-w-[150px]">
          {config?.site_title || '视觉赏析'} <span className={cn(
            "text-[10px] font-normal ml-1",
            viewLayout === 'feed' ? "text-white/50" : "opacity-70"
          )}>v3.0.0</span>
        </h1>
      </div>

      <div className={cn(
        "flex items-center gap-2",
        viewLayout === 'feed' ? "pointer-events-auto" : ""
      )}>
        {!user && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onOpenLogin}
            className={cn(
              "h-9 px-3 rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm shadow-primary/5",
              viewLayout === 'feed' ? "bg-black/20 backdrop-blur-md text-white border border-white/10" : "bg-primary/10 hover:bg-primary/20 text-primary"
            )}
          >
            登 录
          </Button>
        )}

        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-9 w-9 p-0 rounded-xl transition-all",
            viewLayout === 'feed' ? "bg-black/20 backdrop-blur-md text-white border border-white/10" : "bg-muted/50 hover:bg-muted"
          )}
          onClick={() => onNavigate('/discovery')}
        >
          <Compass className="w-4 h-4 text-primary" />
        </Button>

        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-9 w-9 p-0 rounded-xl transition-all",
            viewLayout === 'feed' ? "bg-black/20 backdrop-blur-md text-white border border-white/10" : "bg-muted/50 hover:bg-muted"
          )}
          onClick={onToggleLayout}
        >
          {viewLayout === 'grid' ? (
            <Layers className="w-4 h-4 text-primary" />
          ) : (
            <LayoutGrid className="w-4 h-4 text-primary" />
          )}
        </Button>

        {/* 筛选面板触发器 */}
        <Sheet onOpenChange={onOpenFilterSheet}>
          <SheetTrigger asChild>
            <div className="relative pointer-events-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-9 px-3 rounded-xl text-xs font-bold gap-2 transition-all",
                  viewLayout === 'feed' ? "bg-black/20 backdrop-blur-md text-white border border-white/10" : "bg-muted/50 hover:bg-muted"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                {mediaType === 'all' ? '筛选' : mediaType === 'image' ? '图集' : '视频'}
                {(categoryId !== 'all' || activeTagIds.length > 0) && (
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                )}
              </Button>
            </div>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[32px] px-6 pb-10 border-none bg-background/95 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
            <FilterContent />
          </SheetContent>
        </Sheet>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "h-9 w-9 p-0 rounded-xl transition-all",
                viewLayout === 'feed' ? "bg-black/20 backdrop-blur-md text-white border border-white/10" : "bg-muted/50 hover:bg-muted"
              )}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl border-border/40 backdrop-blur-xl">
            <DropdownMenuItem onSelect={onOpenSearch} className="h-11 rounded-xl gap-2 font-medium">
              <Search className="w-4 h-4 text-primary" />
              搜索作品
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onSelect={() => onNavigate('/upload')} className="h-11 rounded-xl gap-2 font-medium">
                <Plus className="w-4 h-4 text-primary" />
                分享新作品
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="my-1 bg-border/40" />
            <DropdownMenuItem onSelect={onToggleCleared} className="h-11 rounded-xl gap-2 font-medium">
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
              {isCleared ? '恢复界面' : '清爽模式'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onReset} className="h-11 rounded-xl gap-2 font-medium">
              <RotateCcw className="w-4 h-4 text-amber-500" />
              重置筛选
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRefresh} className="h-11 rounded-xl gap-2 font-medium">
              <RefreshCw className="w-4 h-4 text-emerald-500" />
              刷新页面
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
