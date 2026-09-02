import { Skeleton } from '../ui/skeleton';

/**
 * 订单卡片骨架屏
 * 用于订单列表加载状态
 */
export function OrderCardSkeleton() {
  return (
    <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 border border-border">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        {/* 预定号 */}
        <Skeleton className="h-5 w-32" />
        
        {/* 状态 */}
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      
      <div className="space-y-3">
        {/* 商品项目 */}
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-16 h-16 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

/**
 * 订单列表骨架屏
 * 显示多个订单的加载状态
 */
export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <OrderCardSkeleton key={index} />
      ))}
    </div>
  );
}
