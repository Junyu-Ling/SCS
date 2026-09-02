import { Skeleton } from '../ui/skeleton';

/**
 * 商品卡片骨架屏
 * 用于商品列表加载状态
 */
export function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border">
      {/* 图片骨架 */}
      <Skeleton className="w-full aspect-square" />
      
      {/* 内容骨架 */}
      <div className="p-4 space-y-3">
        {/* 商品名称 */}
        <Skeleton className="h-5 w-3/4" />
        
        {/* 价格 */}
        <Skeleton className="h-6 w-1/3" />
        
        {/* 按钮 */}
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

/**
 * 商品列表骨架屏
 * 显示多个商品卡片的加载状态
 */
export function ProductListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
