import { Search, X, Clock, Filter, DollarSign, Tag } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { useProducts, Product } from '../hooks/useProducts';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useDebounce } from '../hooks/useDebounce';

interface SearchBoxProps {
  className?: string;
}

export default function EnhancedSearchBox({ className }: SearchBoxProps) {
  const { language, t } = useLanguage();
  const { user } = useProfile();
  const { products } = useProducts();
  const [searchValue, setSearchValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>('search-history', []);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<{ min: number; max: number }>({ min: 0, max: 10000 });
  const [showFilters, setShowFilters] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // 使用防抖优化搜索性能
  const debouncedSearch = useDebounce(searchValue, 300);

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 获取所有分类
  const categories = ['all', ...new Set(products.map(p => p.category))];

  // 搜索和筛选商品
  const filteredProducts = products.filter(product => {
    // 文本搜索
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      const nameEn = product.name.en.toLowerCase();
      const nameCn = product.name.cn.toLowerCase();
      if (!nameEn.includes(query) && !nameCn.includes(query)) {
        return false;
      }
    }

    // 分类筛选
    if (selectedCategory !== 'all' && product.category !== selectedCategory) {
      return false;
    }

    // 价格筛选
    if (product.price < priceRange.min || product.price > priceRange.max) {
      return false;
    }

    return true;
  }).slice(0, 8); // 限制结果数量

  const handleSearch = (value: string) => {
    if (!user) {
      toast.error(t('Please log in to use the search function', '请登录后使用搜索功能'));
      setTimeout(() => { window.location.hash = '/login'; }, 1500);
      return;
    }
    setSearchValue(value);
    setShowResults(value.trim().length > 0 || showFilters);
  };

  const handleProductClick = (product: Product) => {
    // 添加到搜索历史
    if (searchValue.trim()) {
      const newHistory = [searchValue, ...searchHistory.filter(h => h !== searchValue)].slice(0, 10);
      setSearchHistory(newHistory);
    }
    
    setSearchValue('');
    setShowResults(false);
    setShowFilters(false);
    window.location.hash = `#/detail?id=${product.id}`;
  };

  const clearSearch = () => {
    setSearchValue('');
    setShowResults(false);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    toast.success(t('Search history cleared', '搜索历史已清空'));
  };

  const useHistoryItem = (item: string) => {
    setSearchValue(item);
    handleSearch(item);
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setPriceRange({ min: 0, max: 10000 });
  };

  const hasActiveFilters = selectedCategory !== 'all' || priceRange.min > 0 || priceRange.max < 10000;

  return (
    <div className={`relative ${className}`} ref={searchContainerRef}>
      <div className="flex items-center bg-card rounded h-10 px-3 border border-border">
        <Search className="w-5 h-5 text-muted-foreground mr-2 flex-shrink-0" />
        <Input
          type="text"
          placeholder={language === 'en' ? 'Search products...' : '搜索商品...'}
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowResults(true)}
          className="h-full border-0 bg-transparent text-sm p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
        />
        
        {/* Filter Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-1.5 rounded transition-colors ml-2 ${
            hasActiveFilters ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
          }`}
          title={t('Filters', '筛选')}
        >
          <Filter className="w-4 h-4" />
        </button>

        {searchValue && (
          <button
            onClick={clearSearch}
            className="p-1 hover:bg-accent rounded transition-colors ml-1"
            aria-label={language === 'en' ? 'Clear search' : '清除搜索'}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[500px] overflow-y-auto">
          {/* Filters Section */}
          {showFilters && (
            <div className="p-4 border-b border-border space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {t('Filters', '筛选条件')}
                </h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs h-7"
                  >
                    {t('Clear All', '清空')}
                  </Button>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {t('Category', '分类')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <Badge
                      key={cat}
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat === 'all' ? t('All', '全部') : cat}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {t('Price Range', '价格区间')}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder={t('Min', '最低')}
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder={t('Max', '最高')}
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: parseFloat(e.target.value) || 10000 })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Search History */}
          {!searchValue.trim() && searchHistory.length > 0 && (
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t('Search History', '搜索历史')}
                </h4>
                <button
                  onClick={clearHistory}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t('Clear', '清空')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => useHistoryItem(item)}
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {filteredProducts.length > 0 ? (
            <div>
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors border-b border-border last:border-b-0"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-muted">
                      {product.images?.[0] && (
                        <ImageWithFallback
                          src={product.images[0]}
                          alt={language === 'en' ? product.name.en : product.name.cn}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {language === 'en' ? product.name.en : product.name.cn}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {product.category}
                        </Badge>
                        <span className="text-sm font-semibold text-primary">
                          ¥{product.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (debouncedSearch.trim() || hasActiveFilters) ? (
            <div className="px-4 py-8 text-center">
              <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('No products found', '未找到商品')}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
