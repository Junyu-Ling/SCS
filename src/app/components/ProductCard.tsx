import React from 'react';
import { Package } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import { Product } from '../hooks/useProducts';
import { getProductImages } from '../data/product-images';

interface ProductCardProps {
  product: Product;
  language: 'en' | 'cn';
  isStocked: boolean;
  onClick: (id: number) => void;
  t: (en: string, cn: string) => string;
}

/**
 * 🚀 优化的商品卡片组件
 * 使用 React.memo 防止不必要的重新渲染
 */
export const ProductCard = React.memo(({
  product,
  language,
  isStocked,
  onClick,
  t,
}: ProductCardProps) => {
  const fallbackImages = getProductImages(product.id);
  const primaryImage = product.images?.[0] || fallbackImages[0];
  const fallbackImage = fallbackImages[0];

  return (
    <div
      onClick={() => onClick(product.id)}
      className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer group border border-border"
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-white overflow-hidden">
        {primaryImage ? (
          <OptimizedImage
            src={primaryImage}
            fallbackSrc={fallbackImage && fallbackImage !== primaryImage ? fallbackImage : undefined}
            alt={language === 'en' ? product.name.en : product.name.cn}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Sold Out Overlay */}
        {!isStocked && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <span className="bg-white/90 text-black px-3 py-1 text-sm font-bold uppercase rounded shadow-sm">
              {t('Sold Out', '售罄')}
            </span>
          </div>
        )}
        
        {/* Tags */}
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex flex-col gap-1">
          {product.tags && product.tags.includes('hot') && (
            <span className="bg-red-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
              {t('HOT', '热门')}
            </span>
          )}
          {product.tags && product.tags.includes('new') && (
            <span className="bg-green-600 text-white text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
              {t('NEW', '新品')}
            </span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-2.5 sm:p-3 md:p-4">
        <h3 className="text-sm sm:text-base md:text-lg mb-1 sm:mb-2 line-clamp-1 text-card-foreground">
          {language === 'en' ? product.name.en : product.name.cn}
        </h3>
        <p className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">
          {language === 'en' ? product.description.en : product.description.cn}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-primary text-base sm:text-lg md:text-xl">
            ¥{product.price.toFixed(2)}
          </span>
          {product.options && (
            <span className="text-muted-foreground text-xs sm:text-sm">
              {Object.keys(product.options).length} {t('sizes', '个尺码')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数：只有这些属性变化时才重新渲染
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price === nextProps.product.price && // ✅ 增加对价格的监听
    prevProps.product.name.en === nextProps.product.name.en &&
    prevProps.product.name.cn === nextProps.product.name.cn &&
    prevProps.product.description.en === nextProps.product.description.en &&
    prevProps.product.description.cn === nextProps.product.description.cn &&
    prevProps.product.category === nextProps.product.category &&
    prevProps.product.available === nextProps.product.available && // ✅ 增加对 available 属性的监听
    prevProps.language === nextProps.language &&
    prevProps.isStocked === nextProps.isStocked &&
    JSON.stringify(prevProps.product.images) === JSON.stringify(nextProps.product.images) &&
    JSON.stringify(prevProps.product.tags) === JSON.stringify(nextProps.product.tags) &&
    JSON.stringify(prevProps.product.options) === JSON.stringify(nextProps.product.options)
  );
});

ProductCard.displayName = 'ProductCard';