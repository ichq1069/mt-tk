import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, MoreVertical, Smartphone, BookOpen, LayoutGrid, Info } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { PhotoAlbum } from '@/types';

type ViewerMode = 'gallery' | 'book' | 'tiktok';

interface AlbumHeaderProps {
  album: PhotoAlbum | null;
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
  onBack: () => void;
  onShowInfo: () => void;
  isScrolled: boolean;
}

export const AlbumHeader: React.FC<AlbumHeaderProps> = ({
  album,
  mode,
  onModeChange,
  onBack,
  onShowInfo,
  isScrolled
}) => {
  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 transition-all duration-300",
      isScrolled || mode !== 'gallery' ? "bg-black/80 backdrop-blur-md border-b border-white/10" : "bg-transparent"
    )}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onBack}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-sm font-black text-white truncate max-w-[200px] leading-none mb-1">
            {album?.title || '加载中...'}
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
              {mode === 'gallery' ? '画廊模式' : mode === 'book' ? '翻页模式' : '沉浸模式'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-black/90 backdrop-blur-xl border-white/10 text-white p-2">
            <DropdownMenuItem 
              className={cn("h-11 rounded-xl gap-3 font-bold", mode === 'gallery' && "bg-white/10")}
              onClick={() => onModeChange('gallery')}
            >
              <LayoutGrid className="w-4 h-4 text-primary" /> 瀑布流画廊
            </DropdownMenuItem>
            <DropdownMenuItem 
              className={cn("h-11 rounded-xl gap-3 font-bold", mode === 'book' && "bg-white/10")}
              onClick={() => onModeChange('book')}
            >
              <BookOpen className="w-4 h-4 text-emerald-400" /> 沉浸翻页
            </DropdownMenuItem>
            <DropdownMenuItem 
              className={cn("h-11 rounded-xl gap-3 font-bold", mode === 'tiktok' && "bg-white/10")}
              onClick={() => onModeChange('tiktok')}
            >
              <Smartphone className="w-4 h-4 text-rose-400" /> 纵向沉浸
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="h-11 rounded-xl gap-3 font-bold" onClick={onShowInfo}>
              <Info className="w-4 h-4 text-blue-400" /> 图集详情
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
