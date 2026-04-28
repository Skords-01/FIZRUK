import { useState, useCallback, type ImgHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

/**
 * Sergeant Design System — OptimizedImage
 *
 * Lazy-loaded image component with:
 * - Native lazy loading (loading="lazy")
 * - Automatic aspect ratio container to prevent layout shift
 * - Skeleton placeholder during load
 * - Error fallback state
 * - Optional blur-up effect on load
 * - Responsive srcSet support
 *
 * Usage:
 * ```tsx
 * <OptimizedImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   aspectRatio="16/9"
 *   sizes="(max-width: 640px) 100vw, 50vw"
 * />
 * ```
 */

export interface OptimizedImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "onLoad" | "onError"
> {
  /** Aspect ratio for the container (e.g., "16/9", "4/3", "1/1") */
  aspectRatio?: string;
  /** Show blur-up animation on load */
  blurOnLoad?: boolean;
  /** Custom fallback element when image fails to load */
  fallback?: React.ReactNode;
  /** Additional class for the wrapper container */
  wrapperClassName?: string;
  /** Callback when image loads */
  onImageLoad?: () => void;
  /** Callback when image fails to load */
  onImageError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  aspectRatio,
  blurOnLoad = true,
  fallback,
  wrapperClassName,
  className,
  onImageLoad,
  onImageError,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onImageLoad?.();
  }, [onImageLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onImageError?.();
  }, [onImageError]);

  if (hasError) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-panelHi text-muted rounded-lg",
          wrapperClassName,
        )}
        style={aspectRatio ? { aspectRatio } : undefined}
        role="img"
        aria-label={alt || "Image failed to load"}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden", wrapperClassName)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Skeleton placeholder */}
      {!isLoaded && (
        <div
          className={cn(
            "absolute inset-0 bg-line/30 animate-pulse",
            "motion-reduce:animate-none motion-reduce:bg-line/50",
          )}
          aria-hidden
        />
      )}

      {/* Actual image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "w-full h-full object-cover",
          blurOnLoad && !isLoaded && "blur-sm scale-105",
          blurOnLoad && isLoaded && "blur-0 scale-100",
          "transition-[filter,transform] duration-500 ease-out",
          "motion-reduce:transition-none motion-reduce:blur-0 motion-reduce:scale-100",
          className,
        )}
        {...props}
      />
    </div>
  );
}

/**
 * Avatar image with optimized loading and circular shape
 */
export function OptimizedAvatar({
  src,
  alt,
  size = 40,
  className,
  ...props
}: OptimizedImageProps & { size?: number }) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      aspectRatio="1/1"
      blurOnLoad={false}
      wrapperClassName={cn("rounded-full", className)}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}

/**
 * Hero/banner image with responsive sizing
 */
export function OptimizedHeroImage({
  src,
  alt,
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      aspectRatio="16/9"
      sizes="100vw"
      wrapperClassName={cn("w-full rounded-2xl", className)}
      {...props}
    />
  );
}

/**
 * Thumbnail image for lists/grids
 */
export function OptimizedThumbnail({
  src,
  alt,
  size = "md",
  className,
  ...props
}: OptimizedImageProps & { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      aspectRatio="1/1"
      blurOnLoad={false}
      wrapperClassName={cn("rounded-xl", sizeClasses[size], className)}
      {...props}
    />
  );
}
