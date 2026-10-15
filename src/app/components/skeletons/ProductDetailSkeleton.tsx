import { Skeleton } from '../ui/skeleton';

/**
 * 商品详情页骨架屏
 * 用于商品详情页加载状态
 */
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* 左侧 - 图片 */}
          <div className="space-y-4">
            {/* 主图 */}
            <Skeleton className="w-full aspect-square rounded-lg" />
            
            {/* 缩略图 */}
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="w-20 h-20 rounded" />
              ))}
            </div>
          </div>
          
          {/* 右侧 - 信息 */}
          <div className="space-y-6">
            {/* 商品名称 */}
            <div className="space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
            </div>
            
            {/* 价格 */}
            <Skeleton className="h-10 w-32" />
            
            {/* 描述 */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            
            {/* 数量选择器 */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-12 w-32" />
            </div>
            
            {/* 按钮 */}
            <div className="flex gap-3">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 w-12" />
            </div>
            
            {/* 商品信息 */}
            <div className="space-y-3 pt-6 border-t border-border">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
