import React, { useEffect, useRef, useState } from 'react';
import { Replayer } from 'rrweb';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Loader2 } from 'lucide-react';
import 'rrweb/dist/rrweb.min.css';

interface SessionPlayerProps {
  events: any[];
  className?: string;
}

export function SessionPlayer({ events, className }: SessionPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<Replayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !events || events.length < 2) return;

    try {
      // 清空容器
      containerRef.current.innerHTML = '';
      
      const replayer = new Replayer(events, {
        root: containerRef.current,
        unpackFn: (data: any) => data, // 如果使用了 pack，这里需要对应的 unpack
      });

      replayerRef.current = replayer;
      setIsReady(true);

      replayer.on('state-change', (states: any) => {
        // states.status: 0-stopped, 1-playing, 2-paused, 3-done
        setIsPlaying(states.status === 1);
      });

      return () => {
        replayer.pause();
        replayerRef.current = null;
      };
    } catch (err) {
      console.error('Failed to initialize rrweb replayer:', err);
    }
  }, [events]);

  const togglePlay = () => {
    if (!replayerRef.current) return;
    if (isPlaying) {
      replayerRef.current.pause();
    } else {
      replayerRef.current.play();
    }
  };

  const restart = () => {
    if (!replayerRef.current) return;
    replayerRef.current.pause();
    replayerRef.current.play(0);
  };

  if (!events || events.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 bg-muted/20 rounded-2xl text-muted-foreground text-sm">
        录像数据不足
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <div 
        ref={containerRef} 
        className="w-full h-[400px] bg-slate-100 rounded-2xl overflow-hidden border border-muted"
        style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}
      />
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur text-white rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-white/10 text-white rounded-full"
          onClick={togglePlay}
          disabled={!isReady}
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-white/10 text-white rounded-full"
          onClick={restart}
          disabled={!isReady}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <div className="text-[10px] font-mono px-2 opacity-60">
          SESSION REPLAY
        </div>
      </div>

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/10 rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
