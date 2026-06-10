import React, { useEffect, useState } from 'react';
import { api } from '@/db/api';
import type { MediaItem } from '@/types';
import { Loader2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';

interface RelatedContentProps {
  mediaId: string;
  onItemClick: (item: MediaItem) => void;
}

export function RelatedContent({ mediaId, onItemClick }: RelatedContentProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      setLoading(true);
      try {
        const { data } = await api.getRelatedMedia(mediaId, 6);
        setItems(data || []);
      } catch (e) {
        console.error('Failed to fetch related media:', e);
      } finally {
        setLoading(false);
      }
    };

    if (mediaId) fetchRelated();
  }, [mediaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center p-8 text-white/40 text-sm italic">
        暂无相关推荐
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-bold text-white/90">相关推荐</h4>
      </div>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-4 pb-4">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="w-32 flex-shrink-0 cursor-pointer group active:scale-95 transition-transform"
              onClick={() => onItemClick(item)}
            >
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/10 relative">
                <ProtectedMedia 
                  src={item.thumbnail_url || item.url} 
                  type="image" 
                  isThumbnail={true}
                  ruleKey="写-网"
                  className="w-full h-full object-contain transition-transform group-hover:scale-110"
                />
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-white/60 mt-1.5 truncate px-1">
                {item.title || '相关推荐'}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
