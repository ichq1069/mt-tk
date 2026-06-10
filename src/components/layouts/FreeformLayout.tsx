import React, { useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image, Video, Heart, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutProps } from '@/types/layouts';

interface PositionedItem {
  item: any;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

function generateFreeformPositions(items: LayoutProps['items']): PositionedItem[] {
  const positions: PositionedItem[] = [];
  const containerWidth = 100; // percentage
  
  // 使用伪随机但确定性的布局算法
  items.forEach((item, index) => {
    const seed = item.id.charCodeAt(0) + item.id.charCodeAt(item.id.length - 1);
    const pseudoRandom = (n: number) => {
      const x = Math.sin(seed + n) * 10000;
      return x - Math.floor(x);
    };

    // 宽度范围：30% - 55%
    const width = 30 + pseudoRandom(index * 2) * 25;
    // 高度根据宽高比
    const aspectRatio = item.type === 'video' ? 16 / 9 : 3 / 4;
    const height = width / aspectRatio * 0.6; // 相对高度
    
    // 位置：在容器内随机分布，但保持一定间距
    const maxX = containerWidth - width;
    const x = pseudoRandom(index * 3) * maxX;
    const y = index * 8 + pseudoRandom(index * 5) * 15;
    
    // 轻微旋转
    const rotation = (pseudoRandom(index * 7) - 0.5) * 6;
    
    // z-index 交错
    const zIndex = Math.floor(pseudoRandom(index * 11) * 10);

    positions.push({
      item,
      index,
      x,
      y,
      width,
      height,
      rotation,
      zIndex
    });
  });

  return positions;
}

export function FreeformLayout({
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

  
  const positionedItems = useMemo(() => generateFreeformPositions(items), [items]);

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Image className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="relative px-4 pb-20 min-h-[80vh]">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-10 w-48 h-48 bg-secondary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* 自由排版内容 */}
      <div className="relative space-y-4">
        {positionedItems.map((pos, i) => (
          <motion.div
            key={pos.item.id}
            initial={{ opacity: 0, y: 30, rotate: pos.rotation + 5 }}
            animate={{ opacity: 1, y: 0, rotate: pos.rotation }}
            transition={{ delay: i * 0.06, type: 'spring', stiffness: 200, damping: 25 }}
            className={cn(
              "group relative cursor-pointer transition-all duration-300",
              "hover:z-50 hover:scale-105"
            )}
            style={{
              marginLeft: `${pos.x}%`,
              width: `${pos.width}%`,
              transform: `rotate(${pos.rotation}deg)`,
              zIndex: pos.zIndex
            }}
            onClick={() => onItemClick?.(pos.item, pos.index)}
          >
            <div className={cn(
              "relative overflow-hidden rounded-2xl bg-muted shadow-lg",
              "border border-border/30 hover:border-primary/30 transition-colors"
            )}>
              <div className="aspect-[3/4] relative">
                <img
                  src={pos.item.thumbnail_url ?? pos.item.url ?? ''}
                  alt={pos.item.title ?? ''}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  loading="lazy"
                />

                {/* 媒体类型标识 */}
                {pos.item.type === 'video' && (
                  <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md rounded-full p-1.5">
                    <Video className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                {/* 悬停信息 */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h3 className="text-white font-bold text-sm mb-1 truncate">
                    {pos.item.title}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/70 text-xs">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {pos.item.view_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {pos.item.favorite_count || 0}
                      </span>
                    </div>

                    {onToggleFavorite && (
                      <button
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                          favorites?.has(pos.item.id)
                            ? "bg-red-500 text-white"
                            : "bg-white/20 text-white hover:bg-white/30"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(pos.item.id);
                        }}
                      >
                        <Heart className="w-3.5 h-3.5" fill={favorites?.has(pos.item.id) ? 'currentColor' : 'none'} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 底部标签 */}
              {pos.item.media_tags && pos.item.media_tags.length > 0 && (
                <div className="p-2 bg-background/80 backdrop-blur-sm border-t border-border/20">
                  <div className="flex flex-wrap gap-1">
                    {pos.item.media_tags.slice(0, 2).map((mt: any) => (
                      <span
                        key={mt.tag_id}
                        className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full truncate max-w-[80px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTagClick?.(mt.tag_id);
                        }}
                      >
                        #{mt.tags?.name || ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <div ref={sentinelRef} className="h-10 w-full shrink-0" />
    </div>
  );
}
