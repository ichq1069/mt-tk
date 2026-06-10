import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const threshold = 80;
  const maxPull = 120;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 0 || isRefreshing) return;
    startY.current = e.touches[0].clientY;
    setIsPulling(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && window.scrollY <= 0) {
      // Resistance effect
      const distance = Math.min(maxPull, diff * 0.5);
      setPullDistance(distance);
      // Prevent default to stop native bounce
      if (diff > 10 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling || isRefreshing) return;
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    setIsPulling(false);
  };

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 pointer-events-none z-50"
        style={{ 
          height: threshold, 
          top: -threshold + pullDistance,
          opacity: pullDistance / threshold
        }}
      >
        <div className={cn(
          "bg-background/90 backdrop-blur-md shadow-lg rounded-full p-2 border border-border/40",
          isRefreshing && "animate-spin"
        )}>
          <RefreshCw 
            className="w-5 h-5 text-primary" 
            style={{ transform: `rotate(${pullDistance * 3}deg)` }} 
          />
        </div>
      </div>
      <div 
        className="transition-transform duration-200"
        style={{ transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'none' }}
      >
        {children}
      </div>
    </div>
  );
}
