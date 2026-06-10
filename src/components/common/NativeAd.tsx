import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAds } from '@/contexts/AdContext';
import { ProtectedMedia } from './ProtectedMedia';

export interface NativeAdProps {
  id: string;
  ad_id?: string;
  title?: string;
  description?: string;
  image_url: string;
  cta_text?: string;
  cta_url?: string;
  type?: 'card' | 'banner';
  className?: string;
  category?: string;
  badge_text?: string;
  theme_color?: string;
  badge_position?: string;
  image_rule?: string;
}

export const NativeAd: React.FC<NativeAdProps> = ({
  id,
  ad_id,
  title = '',
  description = '',
  image_url,
  cta_text = '了解更多',
  cta_url = '#',
  type = 'card',
  className,
  category = '推荐',
  badge_text = '广告',
  theme_color,
  badge_position = 'top-right',
  image_rule = '首瀑'
}) => {
  const { logAdEvent } = useAds();
  const realAdId = ad_id || id;

  const getBadgePositionClass = (pos: string) => {
    switch (pos) {
      case 'top-left': return 'top-2 left-2';
      case 'top-right': return 'top-2 right-2';
      case 'bottom-left': return 'bottom-2 left-2';
      case 'bottom-right': return 'bottom-2 right-2';
      default: return 'top-2 right-2';
    }
  };

  React.useEffect(() => {
    if (realAdId) {
      logAdEvent(realAdId, 'impression');
    }
  }, [realAdId, logAdEvent]);

  const handleAdClick = (e: React.MouseEvent) => {
    if (realAdId) {
      logAdEvent(realAdId, 'click');
    }
  };

  const imageUrl = image_url;
  const ctaUrl = cta_url;
  const ctaText = cta_text;

  // 如果没有图片 URL 或 ID，则不渲染（防止占位符显示）
  if (!imageUrl || !id) return null;

  if (type === 'banner') {
    return (
      <div 
        className={cn(
          "relative w-full rounded-2xl overflow-hidden bg-muted/30 border border-border/50 group transition-all hover:border-primary/30",
          className
        )}
      >
        <div className="flex flex-col md:flex-row items-center gap-6 p-6">
          <div className="w-full md:w-1/3 aspect-video rounded-xl overflow-hidden relative shadow-lg bg-black/90">
            <ProtectedMedia 
              src={imageUrl} 
              type="image"
              alt={title} 
              isThumbnail={true}
              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
              ruleKey={image_rule}
              hideAdminLabel={true}
            />
            <div className={cn("absolute z-10", getBadgePositionClass(badge_position))}>
              <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-md border-none text-[10px] px-1.5 py-0" style={theme_color ? { backgroundColor: theme_color } : {}}>{badge_text}</Badge>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Tag className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-wider">{category}</span>
            </div>
            {title && <h3 className="text-xl font-black tracking-tight leading-tight">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>}
            <Button 
              asChild 
              className="rounded-full px-6 font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              onClick={handleAdClick}
            >
              <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                {ctaText}
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        "overflow-hidden border-border/40 hover:border-primary/30 transition-all duration-300 group h-full flex flex-col bg-slate-900/40 backdrop-blur-sm",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-950">
        <ProtectedMedia 
          src={imageUrl} 
          type="image"
          alt={title} 
          isThumbnail={true}
          className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" 
          ruleKey={image_rule}
          hideAdminLabel={true}
        />
        <div className={cn("absolute z-10", getBadgePositionClass(badge_position))}>
          <Badge variant="secondary" className="bg-black/70 text-white backdrop-blur-md border-white/20 text-[10px] px-2 py-0.5 h-6 font-black uppercase tracking-widest shadow-lg" style={theme_color ? { backgroundColor: theme_color } : {}}>{badge_text}</Badge>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center">
           <Button 
            asChild 
            size="sm"
            className="rounded-full w-full font-black bg-primary text-primary-foreground shadow-xl"
            onClick={handleAdClick}
          >
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
              {ctaText}
            </a>
          </Button>
        </div>
      </div>
      <CardContent className="p-4 flex-1 flex flex-col gap-2.5 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-primary">
          <Tag className="w-3.5 h-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">{category}</span>
        </div>
        {title && <h4 className="text-sm font-black tracking-tight line-clamp-1 group-hover:text-primary transition-colors text-white">{title}</h4>}
        {description && <p className="text-[12px] text-white/70 line-clamp-2 leading-relaxed flex-1 font-medium">{description}</p>}
        
        <div className="pt-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full h-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 p-0 border border-primary/20"
            onClick={handleAdClick}
          >
            {ctaText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
