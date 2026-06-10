import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  parseISO 
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Image, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LayoutProps, CalendarDay } from '@/types/layouts';
import { Button } from '@/components/ui/button';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function CalendarLayout({
  items,
  onItemClick,
  onTagClick,
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

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    const today = new Date();
    
    // 按日期分组内容
    const itemsByDate = new Map<string, typeof items>();
    items.forEach(item => {
      const dateStr = item.created_at ? item.created_at.split('T')[0] : '';
      if (!itemsByDate.has(dateStr)) itemsByDate.set(dateStr, []);
      itemsByDate.get(dateStr)!.push(item);
    });
    
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return {
        date: dateStr,
        day: day.getDate(),
        items: itemsByDate.get(dateStr) || [],
        isCurrentMonth: isSameMonth(day, currentDate),
        isToday: isSameDay(day, today)
      };
    });
  }, [currentDate, items]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return [];
    return calendarDays.find(d => d.date === selectedDate)?.items || [];
  }, [selectedDate, calendarDays]);

  const hasItemsInMonth = useMemo(() => {
    return calendarDays.some(d => d.isCurrentMonth && d.items.length > 0);
  }, [calendarDays]);

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Image className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-20">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-black tracking-tight">
            {format(currentDate, 'yyyy年MM月', { locale: zhCN })}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasItemsInMonth ? '本月有内容更新' : '本月暂无内容'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-bold text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <motion.div
            key={day.date}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.005 }}
            className={cn(
              "relative aspect-square rounded-xl cursor-pointer transition-all overflow-hidden",
              !day.isCurrentMonth && "opacity-30",
              day.isToday && "ring-2 ring-primary ring-offset-1",
              selectedDate === day.date 
                ? "bg-primary/10 border-2 border-primary" 
                : "bg-muted/30 hover:bg-muted/60 border-2 border-transparent"
            )}
            onClick={() => {
              if (day.items.length > 0) {
                setSelectedDate(day.date === selectedDate ? null : day.date);
              }
            }}
          >
            {/* 日期数字 */}
            <div className={cn(
              "absolute top-1.5 left-2 text-xs font-bold z-10",
              day.isToday ? "text-primary" : "text-muted-foreground",
              selectedDate === day.date && "text-primary"
            )}>
              {day.day}
            </div>

            {/* 内容缩略图 */}
            {day.items.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                {day.items.length === 1 ? (
                  <img
                    src={(day.items[0].thumbnail_url ?? day.items[0].url ?? '') as string}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-0.5 p-1 w-full h-full">
                    {day.items.slice(0, 4).map((item, i) => (
                      <img
                        key={i}
                        src={(item.thumbnail_url ?? item.url ?? '') as string}
                        alt=""
                        className="w-full h-full object-cover rounded-sm"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
                
                {/* 数量标识 */}
                {day.items.length > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                    {day.items.length}
                  </div>
                )}
                
                {/* 视频标识 */}
                {day.items.some(i => i.type === 'video') && (
                  <div className="absolute top-1 right-1">
                    <Video className="w-3 h-3 text-white drop-shadow-md" />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* 选中日期的详细内容 */}
      <AnimatePresence>
        {selectedDate && selectedDayItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black">
                {format(parseISO(selectedDate), 'MM月dd日', { locale: zhCN })} · {selectedDayItems.length} 个作品
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full"
                onClick={() => setSelectedDate(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {selectedDayItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-muted cursor-pointer"
                  onClick={() => onItemClick?.(item, index)}
                >
                  <img
                    src={(item.thumbnail_url ?? item.url ?? '') as string}
                    alt={item.title ?? ''}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <p className="text-white text-xs font-bold truncate">{item.title}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={sentinelRef} className="h-10 w-full shrink-0" />
    </div>
  );
}
