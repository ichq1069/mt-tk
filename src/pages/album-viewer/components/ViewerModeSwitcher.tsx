import React from 'react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, BookOpen, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewerMode = 'gallery' | 'book' | 'tiktok';

interface ViewerModeSwitcherProps {
  mode: ViewerMode;
  onModeChange: (mode: ViewerMode) => void;
}

export const ViewerModeSwitcher: React.FC<ViewerModeSwitcherProps> = ({
  mode,
  onModeChange
}) => {
  const modes: { id: ViewerMode; icon: React.ElementType }[] = [
    { id: 'gallery', icon: LayoutGrid },
    { id: 'book', icon: BookOpen },
    { id: 'tiktok', icon: Smartphone }
  ];

  return (
    <div className="bg-black/40 backdrop-blur-md px-1 py-1 rounded-full flex gap-1 pointer-events-auto">
      {modes.map((m) => {
        const Icon = m.icon;
        return (
          <Button
            key={m.id}
            variant="ghost"
            size="icon"
            className={cn(
              "w-8 h-8 rounded-full transition-all",
              mode === m.id ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
            )}
            onClick={() => onModeChange(m.id)}
          >
            <Icon className="w-4 h-4" />
          </Button>
        );
      })}
    </div>
  );
};
