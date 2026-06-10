import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Heart, Eye, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutProps } from '@/types/layouts';
import { Button } from '@/components/ui/button';

interface CardStackProps {
  items: LayoutProps['items'];
  onItemClick?: (item: any, index: number) => void;
  onToggleFavorite?: (itemId: string) => void;
  favorites?: Set<string>;
}

function CardStack({ items, onItemClick, onToggleFavorite, favorites, onNearEnd }: CardStackProps & { onNearEnd?: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];
  const nextItem = items[(currentIndex + 1) % items.length];
  const prevItem = items[(currentIndex - 1 + items.length) % items.length];

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex(prev => {
      const next = (prev + 1) % items.length;
      if (next >= items.length - 3) onNearEnd?.();
      return next;
    });
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
  };

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      handlePrev();
    } else if (info.offset.x < -100) {
      handleNext();
    }
  };

  if (!currentItem) return null;

  return (
    <div className="relative w-full max-w-md mx-auto" style={{ perspective: '1000px' }}>
      {/* 背景层 - 下一张卡片 */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden bg-muted transform scale-95 translate-y-4 opacity-50">
        {nextItem && (
          <img
            src={(nextItem.thumbnail_url ?? nextItem.url ?? '') as string}
            alt=""
            className="w-full h-full object-cover blur-sm"
          />
        )}
      </div>

      {/* 主卡片 */}
      <div ref={constraintsRef} className="relative z-10">
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={currentItem.id}
            custom={direction}
            initial={{ x: direction > 0 ? 300 : -300, opacity: 0, rotateY: direction > 0 ? 15 : -15 }}
            animate={{ x: 0, opacity: 1, rotateY: 0 }}
            exit={{ x: direction > 0 ? -300 : 300, opacity: 0, rotateY: direction > 0 ? -15 : 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            onDragEnd={handleDragEnd}
            style={{ x, rotate, opacity }}
            className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-muted shadow-2xl cursor-grab active:cursor-grabbing"
          >
            <img
              src={(currentItem.thumbnail_url ?? currentItem.url ?? '') as string}
              alt={currentItem.title ?? ''}
              className="w-full h-full object-cover"
            />

            {/* 渐变遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* 顶部信息栏 */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
              <div className="bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 text-white text-xs font-bold">
                {currentIndex + 1} / {items.length}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20"
                onClick={() => onItemClick?.(currentItem, currentIndex)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>

            {/* 底部信息 */}
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
              <h3 className="text-xl font-black text-white tracking-tight leading-tight">
                {currentItem.title}
              </h3>
              
              {currentItem.media_tags && currentItem.media_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {currentItem.media_tags.map((mt: any) => (
                    <span
                      key={mt.tag_id}
                      className="text-xs text-white/80 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full"
                    >
                      #{mt.tags?.name || ''}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4 text-white/70 text-xs">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {currentItem.view_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" />
                    {currentItem.favorite_count || 0}
                  </span>
                </div>

                {onToggleFavorite && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-10 w-10 rounded-full backdrop-blur-md transition-all",
                      favorites?.has(currentItem.id)
                        ? "bg-red-500 text-white"
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}
                    onClick={() => onToggleFavorite(currentItem.id)}
                  >
                    <Heart className="w-5 h-5" fill={favorites?.has(currentItem.id) ? 'currentColor' : 'none'} />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 导航按钮 */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-2"
          onClick={handlePrev}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-full border-2"
          onClick={handleNext}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* 进度指示器 */}
      <div className="flex justify-center gap-1.5 mt-4">
        {items.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === currentIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
            )}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1);
              setCurrentIndex(index);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function StackedCardsLayout({
  items,
  onItemClick,
  onToggleFavorite,
  favorites,
  loading,
  hasMore,
  onLoadMore,
  emptyText = '暂无内容'
}: LayoutProps) {
  
  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Heart className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <CardStack
        items={items}
        onNearEnd={() => hasMore && !loading && onLoadMore?.()}
        onItemClick={onItemClick}
        onToggleFavorite={onToggleFavorite}
        favorites={favorites}
      />
    </div>
  );
}
