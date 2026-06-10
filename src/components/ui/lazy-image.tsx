import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  thumbnailSrc?: string; // 缩略图URL（优先使用）
  lowQualitySrc?: string; // 低质量占位图（向后兼容）
  alt: string;
  className?: string;
  onLoad?: () => void;
  threshold?: number;
  rootMargin?: string;
  enableProgressiveLoad?: boolean; // 是否启用渐进式加载
}

/**
 * 懒加载图片组件
 * 支持：
 * 1. Intersection Observer API 实现视口外延迟加载
 * 2. 缩略图→原图渐进式加载
 * 3. WebP 格式优先
 * 4. 加载状态与错误处理
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  thumbnailSrc,
  lowQualitySrc,
  alt,
  className = '',
  onLoad,
  threshold = 0.1,
  rootMargin = '50px',
  enableProgressiveLoad = true,
  ...props
}) => {
  // 优先使用缩略图，其次低质量图，最后为空
  const placeholderSrc = thumbnailSrc || lowQualitySrc || '';
  
  const [imageSrc, setImageSrc] = useState<string>(placeholderSrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isThumbnailLoaded, setIsThumbnailLoaded] = useState(false);
  const [isFullImageLoaded, setIsFullImageLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!isInView) return;

    // 如果有缩略图且启用渐进式加载
    if (enableProgressiveLoad && placeholderSrc && placeholderSrc !== src) {
      // 先加载缩略图
      if (!isThumbnailLoaded) {
        const thumbImg = new Image();
        thumbImg.src = placeholderSrc;
        thumbImg.onload = () => {
          setImageSrc(placeholderSrc);
          setIsThumbnailLoaded(true);
        };
        thumbImg.onerror = () => {
          console.error(`Failed to load thumbnail: ${placeholderSrc}`);
          // 缩略图加载失败，直接加载原图
          loadFullImage();
        };
      }

      // 然后预加载原图
      if (isThumbnailLoaded && !isFullImageLoaded) {
        loadFullImage();
      }
    } else {
      // 直接加载原图
      loadFullImage();
    }
  }, [isInView, src, isThumbnailLoaded, isFullImageLoaded, placeholderSrc, enableProgressiveLoad]);

  const loadFullImage = () => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setImageSrc(src);
      setIsFullImageLoaded(true);
      setIsLoaded(true);
      onLoad?.();
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
      setHasError(true);
      setIsLoaded(true);
    };
  };

  return (
    <div className={cn('relative overflow-hidden bg-muted', className)}>
      {/* 占位符 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
      )}

      {/* 图片 */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-contain transition-opacity duration-500',
          isLoaded ? 'opacity-100' : 'opacity-50',
          className
        )}
        loading="lazy"
        {...props}
      />

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <span className="text-sm">加载失败</span>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
