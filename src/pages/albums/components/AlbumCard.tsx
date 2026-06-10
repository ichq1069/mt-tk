import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Image as ImageIcon, ChevronRight } from 'lucide-react';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { cn } from '@/lib/utils';
import type { PhotoAlbum } from '@/types';

interface AlbumCardProps {
  album: PhotoAlbum;
  index: number;
  hasAccess: boolean;
  isPending: boolean;
  onView: (id: string) => void;
  onRequest: (id: string) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  album,
  index,
  hasAccess,
  isPending,
  onView,
  onRequest
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className={cn(
          "group overflow-hidden rounded-[2rem] border-border/40 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer",
          !hasAccess && "grayscale-[0.5] opacity-90"
        )}
        onClick={() => hasAccess ? onView(album.id) : onRequest(album.id)}
      >
        <CardContent className="p-0">
          <div className="aspect-[4/5] relative overflow-hidden">
            <ProtectedMedia 
              src={album.cover_url || ''} 
              isThumbnail={true}
              type="image"
              alt={album.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
            
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <Badge className="bg-black/40 backdrop-blur-md border-white/10 text-white font-black text-[10px] py-1 px-3 rounded-full">
                {album.photo_count}P
              </Badge>
              {!hasAccess && (
                <Badge variant="destructive" className="font-black text-[10px] py-1 px-3 rounded-full shadow-lg">
                  <Lock className="w-3 h-3 mr-1" />
                  未解锁
                </Badge>
              )}
            </div>

            {album.album_type && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-primary/90 text-primary-foreground font-black text-[10px] py-1 px-3 rounded-full shadow-lg">
                  {album.album_type}
                </Badge>
              </div>
            )}
          </div>

          <div className="p-6 space-y-3">
            <div className="space-y-1">
              <h3 className="text-lg font-black tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                {album.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                {album.description || '暂无描述'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {hasAccess ? (
                <div className="inline-flex items-center justify-center rounded-2xl h-9 px-4 font-black text-[10px] tracking-widest uppercase bg-primary text-primary-foreground shadow hover:brightness-110 transition-all">
                  立即浏览
                  <ChevronRight className="w-3.5 h-3.5 ml-1.5" />
                </div>
              ) : (
                <div 
                  className={cn(
                    "inline-flex items-center justify-center rounded-2xl h-9 px-4 font-black text-[10px] tracking-widest uppercase transition-all",
                    isPending ? "bg-secondary text-secondary-foreground" : "border border-primary/20 text-primary hover:bg-primary/10"
                  )}
                >
                  {isPending ? '审核中' : '申请解锁'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
