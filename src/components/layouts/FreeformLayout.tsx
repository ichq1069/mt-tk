import React, { useEffect, useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Video, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutProps } from '@/types/layouts';
import { Button } from '@/components/ui/button';

// 基于字符串生成确定性随机数
function seededRandom(str: string): () => number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return () => {
    h = (h * 16807 + 0) % 2147483647;
    return (h & 0x7fffffff) / 2147483647;
  };
}

function getRandomStyles(id: string) {
  const rand = seededRandom(id);
  const rotation = (rand() - 0.5) * 8;      // -4° ~ 4°
  const offsetX = (rand() - 0.5) * 16;     // -8px ~ 8px
  const offsetY = (rand() - 0.5) * 12;       // -6px ~ 6px
  const scale = 0.97 + rand() * 0.06;      // 0.97 ~ 1.03
  const zIndex = Math.floor(rand() * 5);   // 0 ~ 4
  return { rotation, offsetX, offsetY, scale, zIndex };
}

const FreeformItem = ({ item, itemIndex, onItemClick, onTagClick, onToggleFavorite, favorites }: any) => {
  const [active, setActive] = useState(itemIndex < 12);
  const ref = useRef<HTMLDivElement>(null);

  const styles = useMemo(() => getRandomStyles(item.id), [item.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: itemIndex * 0.04, type: 'spring', stiffness: 200, damping: 25 }}
      className="group relative rounded-2xl overflow-hidden bg-muted cursor-pointer"
      style={{
        rotate: styles.rotation,
        x: styles.offsetX,
        y: styles.offsetY,
        scale: styles.scale,
        zIndex: styles.zIndex,
        boxShadow: `${styles.offsetX * 0.5}px ${Math.abs(styles.offsetY)}px ${12 + styles.zIndex * 4}px rgba(0,0,0,0.08)`,
      }}
      whileHover={{
        rotate: 0,
        x: 0,
        y: 0,
        scale: 1.02,
        zIndex: 50,
        boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
      }}
      onClick={() => onItemClick?.(item, itemIndex)}
    >
      {active ? (
        <img
          src={item.thumbnail_url || item.url}
          alt={item.title ?? ''}
          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
          loading={itemIndex < 6 ? 'eager' : 'lazy'}
        />
      ) : (
        <div className="w-full aspect-[3/4] bg-muted/20 animate-pulse" />
      )}
      
      {/* 媒体类型标识 */}
      {item.type === 'video' && (
        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md rounded-full p-1">
          <Video className="w-3 h-3 text-white" />
        </div>
      )}
      
      {/* 常驻信息 */}
      <div className="p-2.5 space-y-1.5 bg-card/80 backdrop-blur-sm">
        <p className="text-xs font-bold text-foreground truncate leading-tight">{item.title}</p>
        {item.media_tags && item.media_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.media_tags.slice(0, 3).map((mt: any) => (
              <span
                key={mt.tag_id}
                className="text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-full cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(mt.tag_id, e);
                }}
              >
                #{mt.tags?.name || ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 收藏按钮 */}
      {onToggleFavorite && (
        <button
          className={cn(
            "absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all",
            favorites?.has(item.id) 
              ? "bg-red-500 text-white" 
              : "bg-black/30 text-white/70 hover:bg-black/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(item.id);
          }}
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      )}
    </motion.div>
  );
};

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
      { threshold: 0.1, rootMargin: '400px', root: null }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, loading]);

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Calendar className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-20 mt-4">
      {/* 双列错落排版 - 左宽右窄 */}
      <div className="flex gap-2 md:gap-3">
        <div className="w-[55%] flex flex-col gap-2 md:gap-3">
          {items.filter((_: any, i: number) => i % 2 === 0).map((item: any, idx: number) => (
            <FreeformItem
              key={item.id}
              item={item}
              itemIndex={idx * 2}
              onItemClick={onItemClick}
              onTagClick={onTagClick}
              onToggleFavorite={onToggleFavorite}
              favorites={favorites}
            />
          ))}
        </div>
        <div className="w-[45%] flex flex-col gap-2 md:gap-3">
          {items.filter((_: any, i: number) => i % 2 === 1).map((item: any, idx: number) => (
            <FreeformItem
              key={item.id}
              item={item}
              itemIndex={idx * 2 + 1}
              onItemClick={onItemClick}
              onTagClick={onTagClick}
              onToggleFavorite={onToggleFavorite}
              favorites={favorites}
            />
          ))}
        </div>
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-full px-6"
          >
            {loading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}
      <div ref={sentinelRef} className="h-10 w-full shrink-0" />
    </div>
  );
}
