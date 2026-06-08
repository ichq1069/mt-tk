import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { cn } from '@/lib/utils';
import type { PhotoAlbum } from '@/types';

interface BookshelfViewProps {
  albums: PhotoAlbum[];
  hasAccessMap: Record<string, boolean>;
  isPendingMap: Record<string, boolean>;
  onView: (id: string) => void;
  onRequest: (id: string) => void;
  ads: React.ReactNode[];
}

const BOOKS_PER_SHELF = 5;

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  albums,
  hasAccessMap,
  isPendingMap,
  onView,
  onRequest,
  ads
}) => {
  // 将图集按书架层分组
  const shelves: PhotoAlbum[][] = [];
  for (let i = 0; i < albums.length; i += BOOKS_PER_SHELF) {
    shelves.push(albums.slice(i, i + BOOKS_PER_SHELF));
  }

  return (
    <div className="space-y-8">
      {shelves.map((shelf, shelfIndex) => (
        <div key={shelfIndex} className="relative">
          {/* 书架层板顶部 */}
          <div
            className="h-3 w-full rounded-sm mb-1"
            style={{
              background: 'linear-gradient(to bottom, #8B7355 0%, #6B5344 40%, #5C4033 100%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)'
            }}
          />

          {/* 书本排列区域 */}
          <div className="flex items-end justify-start gap-3 px-4 py-3 min-h-[220px] md:min-h-[260px]">
            {shelf.map((album, bookIndex) => {
              const hasAccess = hasAccessMap[album.id] ?? true;
              const isPending = isPendingMap[album.id] ?? false;
              const globalIndex = shelfIndex * BOOKS_PER_SHELF + bookIndex;

              return (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: globalIndex * 0.04, duration: 0.4 }}
                  className={cn(
                    "flex-shrink-0 w-[calc(20%-12px)] min-w-[100px] max-w-[160px] cursor-pointer group",
                    !hasAccess && "opacity-80"
                  )}
                  onClick={() => hasAccess ? onView(album.id) : onRequest(album.id)}
                >
                  {/* 书本主体 */}
                  <div className="relative">
                    {/* 书页厚度（右侧白色边） */}
                    <div
                      className="absolute -right-1 top-1 bottom-0 w-1.5 rounded-r-sm"
                      style={{
                        background: 'linear-gradient(to right, #f0f0f0, #e0e0e0)',
                        boxShadow: '1px 0 2px rgba(0,0,0,0.08)'
                      }}
                    />

                    {/* 封面 */}
                    <div
                      className={cn(
                        "relative aspect-[2/3] rounded-l-md rounded-r-sm overflow-hidden shadow-md transition-all duration-300",
                        "group-hover:shadow-xl group-hover:-translate-y-2"
                      )}
                      style={{
                        boxShadow: '2px 4px 8px rgba(0,0,0,0.18), -1px 0 0 rgba(0,0,0,0.05)'
                      }}
                    >
                      {/* 书脊效果 */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-2 z-10"
                        style={{
                          background: 'linear-gradient(to right, rgba(0,0,0,0.25), rgba(0,0,0,0.08), transparent)'
                        }}
                      />

                      {/* 封面图 */}
                      {album.cover_url ? (
                        <ProtectedMedia
                          src={album.cover_url}
                          isThumbnail={true}
                          type="image"
                          alt={album.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                      )}

                      {/* 顶部标签 */}
                      <div className="absolute top-2 right-2 z-10">
                        <Badge className="bg-black/50 backdrop-blur-sm border-white/10 text-white font-black text-[9px] py-0.5 px-2 rounded-full">
                          {album.photo_count}P
                        </Badge>
                      </div>

                      {!hasAccess && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                          <div className="w-8 h-8 rounded-full bg-destructive/90 flex items-center justify-center shadow-lg">
                            <Lock className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      )}

                      {isPending && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
                          <Badge className="bg-amber-500/90 text-white font-black text-[9px] py-1 px-2 rounded-full">
                            审核中
                          </Badge>
                        </div>
                      )}

                      {/* 底部渐变遮罩 */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent z-10" />

                      {/* 书名（封底底部） */}
                      <div className="absolute bottom-0 inset-x-0 p-2 z-20">
                        <h4 className="text-white font-bold text-[10px] leading-tight line-clamp-2 text-center drop-shadow-md">
                          {album.title}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* 下方书名（层板上方） */}
                  <div className="mt-2 px-0.5">
                    <p className="text-[10px] font-semibold text-foreground/80 line-clamp-1 text-center group-hover:text-primary transition-colors">
                      {album.title}
                    </p>
                    {album.album_type && (
                      <p className="text-[9px] text-muted-foreground text-center mt-0.5">
                        {album.album_type}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* 填充空位保持对齐 */}
            {Array.from({ length: BOOKS_PER_SHELF - shelf.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex-shrink-0 w-[calc(20%-12px)] min-w-[100px] max-w-[160px]" />
            ))}
          </div>

          {/* 书架层板底部 */}
          <div
            className="h-4 w-full rounded-sm mt-0"
            style={{
              background: 'linear-gradient(to bottom, #5C4033 0%, #4A3728 50%, #3D2E22 100%)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.25), inset 0 -1px 0 rgba(255,255,255,0.08)'
            }}
          />

          {/* 广告位 */}
          {(shelfIndex + 1) % 2 === 0 && ads.length > 0 && (
            <div className="mt-6 mb-2">
              {ads[shelfIndex % ads.length]}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
