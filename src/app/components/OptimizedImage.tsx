import React, { useState, useEffect, useRef } from 'react';
import { cn } from './ui/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  /** 主图加载失败时回退 */
  fallbackSrc?: string;
  /** 加载前先模糊占位，再清晰呈现（避免灰屏） */
  blurUp?: boolean;
  /** blurUp 模式下外层容器 class */
  wrapperClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

/**
 * 高性能图片组件：模糊渐显、Supabase 重试与 fallback
 */
export function OptimizedImage({
  src,
  alt,
  priority = false,
  className = '',
  fallbackSrc,
  blurUp = false,
  wrapperClassName = '',
  onLoad,
  onError,
  ...rest
}: OptimizedImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setCurrentSrc(src);
    setRetryCount(0);
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  // 已缓存的图片（如预加载）直接视为加载完成
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoaded(false);

    if (retryCount === 0 && currentSrc.includes('supabase.co/storage')) {
      setRetryCount(1);
      const busted = currentSrc.includes('?')
        ? `${currentSrc}&t=${Date.now()}`
        : `${currentSrc}?t=${Date.now()}`;
      setCurrentSrc(busted);
      return;
    }

    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setRetryCount(0);
      return;
    }

    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div
        className={cn(
          'inline-block bg-gradient-to-br from-primary/20 to-secondary/20 text-center align-middle',
          blurUp ? wrapperClassName : className
        )}
        style={blurUp ? { width: '100%', height: '100%' } : undefined}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img src={ERROR_IMG_SRC} alt="Error loading image" />
        </div>
      </div>
    );
  }

  const imgEl = (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={cn(
        className,
        blurUp && [
          'transition-[opacity,filter,transform] duration-700 ease-out will-change-[opacity,filter,transform]',
          isLoaded
            ? 'opacity-100 blur-0 scale-100'
            : 'opacity-0 blur-2xl scale-[1.03]',
        ]
      )}
      onLoad={handleLoad}
      onError={handleError}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      {...rest}
    />
  );

  if (!blurUp) {
    return imgEl;
  }

  return (
    <div className={cn('relative overflow-hidden', wrapperClassName)}>
      {/* 品牌色渐变占位，避免灰屏 */}
      <div
        className={cn(
          'absolute inset-0 z-0 bg-gradient-to-br from-primary/35 via-[#2a6b55]/25 to-secondary/35',
          'transition-opacity duration-700 ease-out',
          isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
        aria-hidden
      />
      {/* 轻微 shimmer */}
      {!isLoaded && (
        <div
          className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"
          aria-hidden
        />
      )}
      <div className="relative z-[1] w-full h-full">{imgEl}</div>
    </div>
  );
}
