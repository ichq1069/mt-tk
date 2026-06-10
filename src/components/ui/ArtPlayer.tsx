import React, { useEffect, useRef } from 'react';
import Artplayer from 'artplayer';

interface ArtPlayerProps {
  option: any;
  className?: string;
  getInstance?: (art: Artplayer) => void;
}

export default function ArtPlayer({ option, className, getInstance, ...rest }: ArtPlayerProps) {
  const artRef = useRef<HTMLDivElement>(null);
  const artInstanceRef = useRef<Artplayer | null>(null);

  useEffect(() => {
    // 过滤掉不合法的参数，特别是 Artplayer 对对象属性的严格类型检查
    const sanitizedOption = { ...option };
    
    // 删除 undefined 属性，防止 Artplayer 严格类型校验报错
    Object.keys(sanitizedOption).forEach(key => {
      if (sanitizedOption[key] === undefined) {
        delete sanitizedOption[key];
      }
    });
    
    // Artplayer 中必须是对象的属性，如果是布尔值则删除
    const objectRequiredFields = ['subtitle', 'layers', 'contextmenu', 'controls', 'settings', 'moreVideoAttr', 'quality', 'thumbnails', 'highlight'];
    
    objectRequiredFields.forEach(field => {
      if (typeof sanitizedOption[field] === 'boolean') {
        delete sanitizedOption[field];
      }
    });

    const art = new Artplayer({
      ...sanitizedOption,
      container: artRef.current!,
    } as any);

    artInstanceRef.current = art;

    if (getInstance && typeof getInstance === 'function') {
      getInstance(art);
    }

    return () => {
      if (art && art.destroy) {
        art.destroy(false);
      }
    };
  }, []);

  // 响应 autoplay 变化
  useEffect(() => {
    if (artInstanceRef.current) {
      if (option.autoplay) {
        artInstanceRef.current.play().catch(() => {});
      } else {
        artInstanceRef.current.pause();
      }
    }
  }, [option.autoplay]);
  // 响应 muted 变化
  useEffect(() => {
    if (artInstanceRef.current) {
      artInstanceRef.current.muted = !!option.muted;
    }
  }, [option.muted]);


  return <div ref={artRef} className={className} {...rest}></div>;
}
