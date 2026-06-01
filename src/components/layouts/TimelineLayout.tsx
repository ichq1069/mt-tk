import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar, Clock, Video, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutProps, TimelineGroup } from '@/types/layouts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';

function formatGroupDate(dateStr: string): { label: string; subLabel: string } {
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return { label: '未知时间', subLabel: '' };
    const now = new Date();
    const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    const isYesterday = format(date, 'yyyy-MM-dd') === format(new Date(now.getTime() - 86400000), 'yyyy-MM-dd');
    const isThisYear = date.getFullYear() === now.getFullYear();
    
    if (isToday) return { label: '今天', subLabel: format(date, 'MM月dd日 EEEE', { locale: zhCN }) };
    if (isYesterday) return { label: '昨天', subLabel: format(date, 'MM月dd日 EEEE', { locale: zhCN }) };
    if (isThisYear) return { label: format(date, 'MM月dd日', { locale: zhCN }), subLabel: format(date, 'EEEE', { locale: zhCN }) };
    return { label: format(date, 'yyyy年MM月dd日', { locale: zhCN }), subLabel: format(date, 'EEEE', { locale: zhCN }) };
  } catch {
    return { label: '未知时间', subLabel: '' };
  }
}

const TimelineItem = ({ item, itemIndex, groupIndex, onItemClick, onTagClick, onToggleFavorite, favorites }: any) => {
  const [active, setActive] = useState(groupIndex === 0 && itemIndex < 12);
  const ref = useRef<HTMLDivElement>(null);

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
      key={item.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: itemIndex * 0.03 }}
      className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted cursor-pointer"
      onClick={() => onItemClick?.(item, itemIndex)}
    >
      {active ? (
        <ProtectedMedia
          src={item.thumbnail_url || item.url}
          type="image"
          alt={item.title ?? ''}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          isThumbnail
          ruleKey="首瀑"
          priority={groupIndex === 0 && itemIndex < 6}
        />
      ) : (
        <div className="w-full h-full bg-muted/20 animate-pulse" />
      )}
      
      {/* 媒体类型标识 */}
      {item.type === 'video' && (
        <div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md rounded-full p-1">
          <Video className="w-3 h-3 text-white" />
        </div>
      )}
      
      {/* 悬停信息 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <p className="text-white text-xs font-bold truncate">{item.title}</p>
        {item.media_tags && item.media_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {item.media_tags.slice(0, 2).map((mt: any) => (
              <span
                key={mt.tag_id}
                className="text-[10px] text-white/80 bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick?.(mt.tag_id);
                }}
              >
                {mt.tags?.name || ''}
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

export function TimelineLayout({
  items,
  onItemClick,
  onTagClick,
  onToggleFavorite,
  favorites,
  loading,
  hasMore,
  onLoadMore,
  emptyText = '暂无内容',
  scrollParent,
  timelineDates
}: LayoutProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (date: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

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


  

  const groups = useMemo<TimelineGroup[]>(() => {
    const map = new Map<string, TimelineGroup>();
    
    items.forEach(item => {
      const date = item.created_at ? format(parseISO(item.created_at), 'yyyy-MM-dd') : 'unknown';
      if (!map.has(date)) {
        const { label, subLabel } = formatGroupDate(date);
        map.set(date, { date, label: `${label} ${subLabel}`, items: [] });
      }
      map.get(date)!.items.push(item);
    });
    
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [items]);

  if (loading && items.length === 0) {
    return (
      <div className="space-y-8 px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="aspect-[3/4] rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Calendar className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 pb-20 mt-4">
      {groups.map((group, groupIndex) => {
        const isCollapsed = collapsedGroups.has(group.date);
        
        return (
          <motion.section
            key={group.date}
            ref={(el) => { sectionRefs.current[group.date] = el; }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.05 }}
            className="space-y-4"
          >
            {/* 时间线标题 - 增加 top 偏移并支持收缩展开 */}
            <div 
              className="flex items-center gap-3 sticky top-[var(--header-offset,160px)] bg-background backdrop-blur-md z-[100] py-3 -mx-4 px-4 border-b border-border/30 cursor-pointer hover:bg-muted/30 transition-colors shadow-md"
              onClick={() => toggleGroup(group.date)}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-black tracking-tight">{group.label.split(' ')[0]}</h3>
                <p className="text-xs text-muted-foreground font-medium">{group.items.length} 个作品</p>
              </div>
              <div className="shrink-0 text-muted-foreground">
                {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </div>
            </div>

            {/* 内容网格 - 动画切换收缩展开 */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                    {group.items.map((item, itemIndex) => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        itemIndex={itemIndex}
                        groupIndex={groupIndex}
                        onItemClick={onItemClick}
                        onTagClick={onTagClick}
                        onToggleFavorite={onToggleFavorite}
                        favorites={favorites}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        );
      })}


      {/* 加载更多 */}
      {hasMore && (
        <div className="flex justify-center pt-4">
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
