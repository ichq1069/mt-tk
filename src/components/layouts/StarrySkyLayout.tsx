import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ZoomIn, ZoomOut, RotateCcw, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutProps } from '@/types/layouts';
import { Button } from '@/components/ui/button';

interface StarNode {
  item: any;
  x: number;
  y: number;
  size: number;
  brightness: number;
  pulseDelay: number;
}

function generateStarField(items: LayoutProps['items']): StarNode[] {
  return items.map((item, index) => {
    const seed = item.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (n: number) => {
      const x = Math.sin(seed * n) * 10000;
      return x - Math.floor(x);
    };

    return {
      item,
      x: pseudoRandom(1) * 100,
      y: pseudoRandom(2) * 100,
      size: 40 + pseudoRandom(3) * 60, // 40-100px
      brightness: 0.6 + pseudoRandom(4) * 0.4,
      pulseDelay: pseudoRandom(5) * 3
    };
  });
}

export function StarrySkyLayout({
  items,
  onItemClick,
  onTagClick,
  onToggleFavorite,
  favorites,
  loading,
  hasMore,
  onLoadMore,
  emptyText = '暂无内容',
  scrollParent
}: LayoutProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || !onLoadMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: '400px',
        root: null
      }
    );

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, onLoadMore, loading]);

  
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const stars = useMemo(() => generateStarField(items), [items]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).closest('.starfield-bg')) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = { ...position };
      try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch (err) {}
    }
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition({ x: posStart.current.x + dx, y: posStart.current.y + dy });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    if (e.target instanceof HTMLElement) {
      try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
  }, []);

  useEffect(() => {
    const handleGlobalPointerUp = () => setIsDragging(false);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, []);

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Sparkles className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-12rem)] overflow-hidden bg-slate-950 rounded-3xl mx-4">
      {/* 星空背景 */}
      <div className="absolute inset-0">
        {/* 基础星空 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1e293b_0%,_#0f172a_100%)]" />
        
        {/* 星星点 */}
        {Array.from({ length: 100 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.5 + 0.2,
              animationDelay: Math.random() * 3 + 's',
              animationDuration: Math.random() * 2 + 2 + 's'
            }}
          />
        ))}

        {/* 星云效果 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* 控制栏 */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-white/20"
          onClick={() => setScale(prev => Math.min(3, prev + 0.2))}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-white/20"
          onClick={() => setScale(prev => Math.max(0.5, prev - 0.2))}
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-white/20"
          onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* 提示文字 */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-black/30 backdrop-blur-md rounded-full px-4 py-2 text-white/80 text-xs font-medium flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          拖拽探索星空 · 滚轮缩放 · 点击星辰查看详情
        </div>
      </div>

      {/* 可拖拽内容区域 */}
      <div
        ref={containerRef}
        className={cn(
          "starfield-bg absolute inset-0 cursor-grab active:cursor-grabbing touch-none",
          isDragging && "cursor-grabbing"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute inset-0 transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
        >
          {stars.map((star, index) => (
            <motion.div
              key={star.item.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: star.brightness, scale: 1 }}
              transition={{ delay: index * 0.03, type: 'spring', stiffness: 200 }}
              className="absolute cursor-pointer group"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItem(star.item);
              }}
            >
              {/* 光晕效果 */}
              <div 
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  background: `radial-gradient(circle, rgba(147, 197, 253, 0.3) 0%, transparent 70%)`,
                  width: star.size * 2,
                  height: star.size * 2,
                  left: -star.size * 0.5,
                  top: -star.size * 0.5,
                  animationDelay: `${star.pulseDelay}s`
                }}
              />
              
              {/* 内容卡片 */}
              <div 
                className="relative rounded-2xl overflow-hidden bg-slate-800/80 backdrop-blur-sm border border-white/10 shadow-xl transition-all duration-300 group-hover:scale-125 group-hover:z-50 group-hover:border-primary/50"
                style={{ width: star.size, height: star.size }}
              >
                <img
                  src={star.item.thumbnail_url ?? star.item.url ?? ''}
                  alt={star.item.title ?? ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                
                {/* 悬停标题 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                  <p className="text-white text-[8px] font-bold truncate leading-tight">
                    {star.item.title}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 选中详情弹窗 */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-sm w-full bg-slate-900/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60"
                onClick={() => setSelectedItem(null)}
              >
                <X className="w-4 h-4" />
              </button>
              
              <div className="aspect-[3/4] relative">
                <img
                  src={selectedItem.thumbnail_url ?? selectedItem.url ?? ''}
                  alt={selectedItem.title ?? ''}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
                  <h3 className="text-lg font-black text-white">{selectedItem.title}</h3>
                  
                  {selectedItem.media_tags && selectedItem.media_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.media_tags.map((mt: any) => (
                        <span
                          key={mt.tag_id}
                          className="text-xs text-white/80 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTagClick?.(mt.tag_id);
                            setSelectedItem(null);
                          }}
                        >
                          #{mt.tags?.name || ''}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 text-white/60 text-xs pt-1">
                    <span>👁 {selectedItem.view_count || 0}</span>
                    <span>♥ {selectedItem.favorite_count || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex gap-3">
                <Button
                  className="flex-1 rounded-xl"
                  onClick={() => {
                    onItemClick?.(selectedItem, items.findIndex(i => i.id === selectedItem.id));
                    setSelectedItem(null);
                  }}
                >
                  查看详情
                </Button>
                {onToggleFavorite && (
                  <Button
                    variant="outline"
                    className="rounded-xl px-4"
                    onClick={() => onToggleFavorite(selectedItem.id)}
                  >
                    <span className={favorites?.has(selectedItem.id) ? 'text-red-500' : ''}>
                      {favorites?.has(selectedItem.id) ? '♥' : '♡'}
                    </span>
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={sentinelRef} className="h-10 w-full shrink-0" />
    </div>
  );
}
