import React, { memo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, ExternalLink, Flame } from 'lucide-react';
import type { Ad } from '@/types';
import { api } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedMedia } from '@/components/common/ProtectedMedia';
import { cn } from '@/lib/utils';

export const AdCard = memo(function AdCard({ ad }: { ad: Ad & { ad_id?: string } }) {
  const { profile } = useAuth();
  
  const realAdId = ad.ad_id || ad.id;

  useEffect(() => {
    if (realAdId) {
      api.logAdEvent(realAdId, 'impression', profile?.id, profile?.mp_openid || profile?.wechat_openid).catch(console.error);
      
      // 处理单页仅显示一次逻辑
      if (ad.show_once_per_page) {
        sessionStorage.setItem(`ad_shown_once_${realAdId}`, 'true');
      }
    }
  }, [realAdId, profile?.id, ad.show_once_per_page]);

  if (!ad.image_url && !ad.title && !ad.content && !ad.description) return null;

  const handleClick = () => {
    if (realAdId) {
      api.logAdEvent(realAdId, 'click', profile?.id, profile?.mp_openid || profile?.wechat_openid).catch(console.error);
    }
    
    const url = ad.cta_url || ad.link;
    if (url) {
      if (url.startsWith('http')) {
        window.open(url, '_blank');
      } else {
        window.open(url, '_blank');
      }
    }
  };

  const getBadgePositionClass = (pos: string) => {
    switch (pos) {
      case 'top-left': return 'top-2 left-2';
      case 'top-right': return 'top-2 right-2';
      case 'bottom-left': return 'bottom-2 left-2';
      case 'bottom-right': return 'bottom-2 right-2';
      default: return 'top-2 right-2';
    }
  };

  return (
    <Card 
      className="overflow-hidden border border-border/20 shadow-xl rounded-[1.5rem] bg-card flex flex-col relative animate-in fade-in zoom-in-95 duration-500 cursor-pointer group h-full"
      onClick={handleClick}
    >
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-muted/20 flex-1">
        {/* DIY 标签 (保留功能，但样式向参考图靠拢) */}
        {ad.badge_text && (
          <Badge 
            className={cn(
              "absolute z-20 bg-primary border-none font-black text-[9px] px-2 py-0.5 rounded-lg uppercase tracking-widest shadow-lg transition-all",
              getBadgePositionClass(ad.badge_position || 'top-right')
            )}
            style={ad.theme_color ? { backgroundColor: ad.theme_color } : {}}
          >
            {ad.badge_text}
          </Badge>
        )}

        {ad.image_url ? (
          <ProtectedMedia
            src={ad.image_url}
            type="image"
            alt={ad.title || 'ad'}
            isThumbnail={true}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
            ruleKey={ad.image_rule || "写-封"}
            hideAdminLabel={true}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
            <ImageIcon className="w-10 h-10" />
          </div>
        )}
        
        {/* 热度统计 (右上角) - 参考图1 */}
        <div className="absolute top-2 right-2 z-10 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1.5 border border-white/10 shadow-lg pointer-events-none">
          <Flame className="w-3 h-3 text-orange-500 fill-current" />
          <span className="text-[10px] text-white font-black">0</span>
        </div>

        {/* 底部信息遮罩 (参考图1) */}
        {(ad.title || ad.created_at) && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none z-10 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              {ad.title && (
                <h4 className="text-white text-[11px] font-black line-clamp-1 drop-shadow-lg tracking-tight flex-1">
                  {ad.title}
                </h4>
              )}
              <ExternalLink className="w-3 h-3 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
            {ad.created_at && (
              <p className="text-white/60 text-[9px] font-medium tabular-nums drop-shadow-md">
                {new Date(ad.created_at || Date.now()).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }).replace(/\//g, '-')}
              </p>
            )}
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-[5]" />
      </div>
    </Card>
  );
});
