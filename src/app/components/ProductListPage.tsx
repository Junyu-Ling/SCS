import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { useProducts, getProductsByCategory, getProductsByTag, compareProductsByNewFirst, Product, clearProductsCache } from '../hooks/useProducts';
import { useInventory } from '../hooks/useInventory';
import { Package, Loader2 } from 'lucide-react';
import { ProductCard } from './ProductCard';

export default function ProductListPage() {
  // Hook order: useLanguage, useProfile, useProducts, useInventory, useState, useEffect
  const { language, t } = useLanguage();
  const { user, loading: authLoading } = useProfile();
  const { products, loading: productsLoading } = useProducts();
  const { isStocked } = useInventory();
  const [filterType, setFilterType] = useState<string>('all');

  // ✅ 页面可见时自动刷新 + 定时轮询，确保管理员修改后用户端实时同步
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearProductsCache(); // 切回前台时强制刷新
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 每 15 秒静默轮询最新商品数据
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        clearProductsCache();
      }
    }, 15000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
    };
  }, []);

  // 分类类型的 filter（使用 category 字段匹配，确保新增商品不因缺少 tag 而消失）
  const CATEGORY_FILTERS = new Set(['apparel', 'stationery', 'gift', 'dailyUse', 'sports']);

  // ✅ 使用 useMemo 缓存过滤结果，避免不必要的计算
  const filteredProducts = useMemo(() => {
    const hash = window.location.hash;

    let result: Product[];
    if (hash.includes('/tag/')) {
      const filterValue = hash.split('/tag/')[1];
      if (CATEGORY_FILTERS.has(filterValue)) {
        // 分类页：按 category 字段过滤，保证新增商品（tags 可能为空）也能显示
        result = getProductsByCategory(products, filterValue);
      } else {
        // 标签页（hot / new 等）：按 tags 过滤
        result = getProductsByTag(products, filterValue);
      }
    } else {
      result = products;
    }

    // New 排在每个类别最前，其余按英文名稳定排序
    return [...result].sort(compareProductsByNewFirst);
  }, [products, filterType]);

  // ✅ 合并 hash change 监听逻辑
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('/tag/')) {
        const tag = hash.split('/tag/')[1];
        setFilterType(tag);
      } else {
        setFilterType('all');
      }
    };

    // 初始化时执行一次
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // ✅ 使用 useCallback 缓存回调函数
  const handleProductClick = useCallback((productId: number) => {
    window.location.hash = `/detail?id=${productId}`;
  }, []);

  const getCategoryTitle = (filter: string) => {
    const titles: Record<string, { en: string; cn: string }> = {
      apparel: { en: 'Apparel', cn: '服饰' },
      stationery: { en: 'Stationery', cn: '文具' },
      gift: { en: 'Gift', cn: '礼品' },
      dailyUse: { en: 'Daily Use', cn: '日用品' },
      sports: { en: 'Sports', cn: '运动' },
      hot: { en: 'Hot Products', cn: '热门商品' },
      new: { en: 'New Arrivals', cn: '新品上架' },
    };
    return titles[filter] || { en: 'Products', cn: '商品' };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Page Title */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl text-foreground mb-1 sm:mb-2">
            {language === 'en' ? getCategoryTitle(filterType).en : getCategoryTitle(filterType).cn}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {filteredProducts.length} {t('products', '件商品')}
          </p>
        </div>

        {/* Product Grid - 使用优化的 ProductCard 组件 */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                language={language}
                isStocked={product.available ?? isStocked(product.id)}
                onClick={handleProductClick}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              {t('No products found in this category.', '该分类下暂无商品。')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}