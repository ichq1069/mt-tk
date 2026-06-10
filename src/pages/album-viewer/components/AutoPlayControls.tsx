import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlayCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoPlayControlsProps {
  isAutoPlay: boolean;
  onAutoPlayChange: (active: boolean) => void;
  autoPlayInterval: number;
  onIntervalChange: (interval: number) => void;
  mode: string;
}

export const AutoPlayControls: React.FC<AutoPlayControlsProps> = ({
  isAutoPlay,
  onAutoPlayChange,
  autoPlayInterval,
  onIntervalChange,
  mode
}) => {
  if (mode === 'gallery') return null;

  return (
    <div className="flex items-center gap-2 pointer-events-auto">
      {isAutoPlay && (
        <div className="absolute right-4 bottom-28 z-[100] transition-all duration-500">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAutoPlayChange(false)}
            className="h-10 px-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center gap-2 group hover:bg-black/60 transition-all shadow-lg pointer-events-auto"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary animate-ping absolute" />
              <div className="w-2 h-2 rounded-full bg-primary relative" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">自动播放中</span>
            <div className="w-px h-3 bg-white/20 mx-1" />
            <X className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
          </Button>
        </div>
      )}

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "rounded-full h-8 w-8 bg-black/20 backdrop-blur-md",
              isAutoPlay && "text-primary bg-primary/10"
            )}
          >
            <PlayCircle className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-2xl bg-slate-900/95 backdrop-blur-xl border-white/10 p-2 text-white">
          <div className="px-3 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">自动播放</span>
              <Switch
                checked={isAutoPlay}
                onCheckedChange={onAutoPlayChange}
              />
            </div>
            {isAutoPlay && (
              <div className="flex gap-1.5 p-1 bg-white/5 rounded-lg">
                {[3000, 5000, 7000].map((t) => (
                  <Button
                    key={t}
                    variant={autoPlayInterval === t ? "default" : "ghost"}
                    size="sm"
                    className="flex-1 h-7 text-[10px] font-bold rounded-md"
                    onClick={() => onIntervalChange(t)}
                  >
                    {t/1000}s
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
