import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMusic } from '@/contexts/MusicContext';
import { Music, SkipForward, SkipBack, Pause, Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const GlobalMusicPlayer: React.FC = () => {
  const { 
    isMusicPlaying, 
    setIsMusicPlaying, 
    currentMusic, 
    nextMusic, 
    prevMusic,
    musicList 
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClickTime = useRef<number>(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  if (!musicList || musicList.length === 0) return null;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleMainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const diff = now - lastClickTime.current;
    
    if (diff < 300) {
      // Double click
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
      }
      nextMusic();
      toast.info(`切换到: ${currentMusic?.title || '下一首'}`, {
        icon: '🎵',
        duration: 1000
      });
      lastClickTime.current = 0;
    } else {
      // Single click - wait to see if it's a double click
      lastClickTime.current = now;
      clickTimer.current = setTimeout(() => {
        handleToggle();
        clickTimer.current = null;
      }, 300);
    }
  };

  return (
    <div ref={containerRef} className="fixed right-0 top-1/2 -translate-y-1/2 z-[10005] flex items-center">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="bg-background/95 backdrop-blur-md border border-border shadow-2xl rounded-l-2xl p-4 mr-[-1px] min-w-[200px] flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {currentMusic?.title || '未知曲目'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentMusic?.artist || '未知艺术家'}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => setIsExpanded(false)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); prevMusic(); }}
              >
                <SkipBack className="h-5 w-5" />
              </Button>
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-10 w-10 rounded-full shadow-lg"
                onClick={(e) => { e.stopPropagation(); setIsMusicPlaying(!isMusicPlaying); }}
              >
                {isMusicPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 fill-current" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); nextMusic(); }}
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={isMusicPlaying ? { rotate: 360 } : { rotate: 0 }}
        transition={isMusicPlaying ? {
          rotate: {
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          },
          x: { type: 'spring', damping: 20, stiffness: 100 }
        } : {
          rotate: { duration: 0.5 },
          x: { type: 'spring', damping: 20, stiffness: 100 }
        }}
        style={{ x: isExpanded ? 0 : '66%' }}
        onClick={handleMainClick}
        className={cn(
          "relative flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer transition-transform hover:scale-105 active:scale-95",
          !isMusicPlaying && "opacity-80"
        )}
      >
        <Music className="h-6 w-6" />
        {isMusicPlaying && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-foreground"></span>
          </span>
        )}
      </motion.div>
    </div>
  );
};
