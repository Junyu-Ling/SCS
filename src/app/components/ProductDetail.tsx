import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, HelpCircle, Package, Loader2, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useProfile } from '../contexts/ProfileContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { useProduct } from '../hooks/useProducts';
import { useInventory } from '../hooks/useInventory';
import { toast } from 'sonner';
import { OptimizedImage } from './OptimizedImage';

export default function ProductDetail() {
  const { language, t } = useLanguage();
  const { addToCart } = useCart();
  const { user } = useProfile();
  const { isStocked } = useInventory();
  
  // Get product ID from URL query parameters
  const getProductIdFromUrl = () => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.split('?')[1]);
    return parseInt(params.get('id') || '12');
  };

  const [productId, setProductId] = useState(getProductIdFromUrl);
  const { product: productData, loading, error } = useProduct(productId);

  // Update product when URL changes
  useEffect(() => {
    const handleHashChange = () => {
      setProductId(getProductIdFromUrl());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const maxQuantity = 99; // Default max quantity since we are not tracking inventory counts anymore

  // 是否为颜色变体商品
  const isColorVariant = !!(productData?.colorImages && Object.keys(productData.colorImages).length > 0);

  // 当前展示的有效图片（颜色变体商品根据选中颜色切换，普通商品用原始 images）
  const effectiveImages = isColorVariant && selectedSize && productData?.colorImages?.[selectedSize]
    ? productData.colorImages[selectedSize]
    : (productData?.images ?? []);

  // Initialize selected size
  useEffect(() => {
    if (productData && productData.options) {
      const firstSize = Object.keys(productData.options)[0];
      setSelectedSize(firstSize);
    }
  }, [productData]);

  useEffect(() => {
    if (productData && productData.options && selectedSize) {
      setQuantity(1);
      // 切换颜色时重置图片索引
      setCurrentImageIndex(0);
    }
  }, [selectedSize, productData]);

  useEffect(() => {
    if (effectiveImages.length > 0) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % effectiveImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [effectiveImages]);
  
  // Show loading state with skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-gray-600 text-lg">
            {t('Loading product...', '加载商品中...')}
          </p>
        </div>
      </div>
    );
  }

  // If product not found, show error
  if (error || !productData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl text-gray-900">{t('Product not found', '产品未找到')}</h1>
        <p className="text-gray-600 mt-2">{t('The product you are looking for does not exist.', '您查找的产品不存在。')}</p>
      </div>
    );
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + effectiveImages.length) % effectiveImages.length);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % effectiveImages.length);
  };

  const handleQuantityChange = (value: number) => {
    setQuantity(Math.max(1, Math.min(value, maxQuantity)));
  };

  const handleAddToCart = () => {
    if (!user) {
      toast.error(t('Please log in to add items to your cart.', '请登录以将商品添加到购物车。'));
      return;
    }
    addToCart({
      commodityId: productData.id,
      name: language === 'en' ? productData.name.en : productData.name.cn,
      price: productData.price,
      quantity,
      option: selectedSize,
      image: effectiveImages[0] || productData.images?.[0] || '',
      repertory: maxQuantity,
      canBuy: true,
    });
  };

  const isSoldOut = !(productData.available ?? isStocked(productData.id));

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8 lg:gap-12">
          {/* 主图：单张居中，避免横向滑轨把帽子裁到边上 */}
          <div className="flex flex-col gap-3">
          <div className="relative aspect-square bg-white rounded-lg overflow-hidden group border border-gray-100">
            {effectiveImages.length > 0 ? (
              <>
                <div 
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => {
                    setPreviewImageIndex(currentImageIndex);
                    setImagePreviewOpen(true);
                  }}
                >
                  <OptimizedImage
                    src={effectiveImages[currentImageIndex]}
                    alt={`${language === 'en' ? productData.name.en : productData.name.cn} - ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain object-center scale-[1.12]"
                  />
                </div>

                {/* Navigation Arrows - Only show if multiple images */}
                {effectiveImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-2 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                    </button>
                  </>
                )}

                {/* Image Indicators - Only show if multiple images */}
                {effectiveImages.length > 1 && (
                  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-10">
                    {effectiveImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all touch-manipulation ${
                          index === currentImageIndex ? 'bg-gray-800 w-4 sm:w-6' : 'bg-gray-300'
                        }`}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Package className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>
          {productData.sizeGuide && (
            <aside className="w-full rounded-lg border border-gray-100 bg-gray-50 p-3 sm:p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2">
                {t('Size', '尺码')}
              </p>
              <ul className="space-y-2">
                {Object.entries(productData.sizeGuide).map(([size, guide]) => (
                  <li key={size} className="text-xs sm:text-sm text-gray-700 leading-snug">
                    <span className="font-medium text-gray-900">{size}</span>
                    <span className="block text-gray-500 mt-0.5">
                      {language === 'en' ? guide.en : guide.cn}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col gap-4 sm:gap-5 md:gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 sm:mb-3 md:mb-4">
                <h1 className="text-2xl sm:text-3xl md:text-4xl text-gray-700">
                  {language === 'en' ? productData.name.en : productData.name.cn}
                </h1>
                {/* Product Tags */}
                {productData.tags && productData.tags.length > 0 && (
                  <div className="flex gap-1.5">
                    {productData.tags.includes('hot') && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
                        {t('HOT', '热门')}
                      </span>
                    )}
                    {productData.tags.includes('new') && (
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded font-medium">
                        {t('NEW', '新品')}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                <span className="font-medium">{t('Description:', '描述：')}</span>{' '}
                {language === 'en' ? productData.description.en : productData.description.cn}
              </p>
            </div>

            <div className="text-2xl sm:text-3xl text-black">
              {productData.price.toFixed(2)}CNY
            </div>

            {/* Color / Size Selection */}
            {productData.options && !(Object.keys(productData.options).length === 1 && Object.keys(productData.options)[0] === 'Default') && (
              <div>
                {isColorVariant ? (
                  /* 颜色变体选择器 */
                  <div>
                    <p className="text-sm text-gray-500 mb-2 sm:mb-3">
                      {t('Color:', '颜色：')}
                      <span className="font-medium text-gray-700 ml-1">
                        {selectedSize && productData.colorLabels?.[selectedSize]
                          ? (language === 'en' ? productData.colorLabels[selectedSize].en : productData.colorLabels[selectedSize].cn)
                          : selectedSize}
                      </span>
                    </p>
                    <div className="flex gap-2 sm:gap-3 flex-wrap">
                      {Object.keys(productData.options).map((colorKey) => {
                        const label = productData.colorLabels?.[colorKey];
                        const displayName = label
                          ? (language === 'en' ? label.en : label.cn)
                          : colorKey;
                        return (
                          <button
                            key={colorKey}
                            onClick={() => setSelectedSize(colorKey)}
                            title={displayName}
                            className={`px-4 py-2 sm:px-5 sm:py-2 rounded transition-colors text-sm sm:text-base touch-manipulation border-2 ${
                              selectedSize === colorKey
                                ? 'border-gray-700 bg-gray-700 text-white'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
                            }`}
                          >
                            {displayName}
                          </button>
                        );
                      })}
                    </div>
                    {productData.sizeGuide && (
                      <p className="text-sm text-gray-500 mt-3">
                        {t('Size:', '尺码：')}
                        <span className="font-medium text-gray-700 ml-1">
                          {language === 'en'
                            ? Object.values(productData.sizeGuide)[0].en
                            : Object.values(productData.sizeGuide)[0].cn}
                        </span>
                      </p>
                    )}
                  </div>
                ) : (
                  /* 普通尺码选择器 */
                  <div>
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      {productData.sizeGuide && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-gray-400 hover:text-gray-600 touch-manipulation">
                                <HelpCircle className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {Object.entries(productData.sizeGuide).map(([size, guide]) => (
                                <p key={size} className="text-sm mb-1">
                                  {language === 'en' ? guide.en : guide.cn}
                                </p>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="flex gap-2 sm:gap-3 flex-wrap">
                      {Object.keys(productData.options).map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`px-4 py-2 sm:px-5 sm:py-2 rounded transition-colors text-sm sm:text-base touch-manipulation ${
                            selectedSize === size
                              ? 'bg-gray-700 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isSoldOut ? (
              <>
                {/* Quantity Selection */}
                <div>
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded border-2 border-gray-300 touch-manipulation"
                    >
                      <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max={maxQuantity}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      className="w-14 h-9 sm:w-16 sm:h-10 text-center text-base sm:text-lg border-2 border-gray-300"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= maxQuantity}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded border-2 border-gray-300 touch-manipulation"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-5 sm:py-6 rounded-lg text-base sm:text-lg touch-manipulation"
                  size="lg"
                >
                  {t('Add to Cart', '加入购物车')}
                </Button>
              </>
            ) : (
              <div className="bg-gray-100 rounded-lg p-4 sm:p-5 md:p-6 text-center">
                <p className="text-gray-900 text-sm sm:text-base mb-1">
                  {t('Products are currently sold out', '产品目前已售罄')}
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {t('You may buy the next batch.', '你可以购买下一批货')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🖼️ 图片预览对话框 */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl w-full p-0 bg-black border-none">
          <DialogTitle className="sr-only">
            {t('Image Preview', '图片预览')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('Full size image preview', '全尺寸图片预览')}
          </DialogDescription>
          <div className="relative aspect-square w-full bg-black">
            {/* 关闭按钮 */}
            <button
              onClick={() => setImagePreviewOpen(false)}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors"
              aria-label="Close preview"
            >
              <X className="w-6 h-6 text-black" />
            </button>

            {/* 图片 */}
            {effectiveImages.length > 0 && (
              <>
                <img
                  src={effectiveImages[previewImageIndex]}
                  alt={`${language === 'en' ? productData.name.en : productData.name.cn} - ${previewImageIndex + 1}`}
                  className="w-full h-full object-contain"
                />

                {/* 导航按钮 - 只在多图时显示 */}
                {effectiveImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImageIndex((prev) => 
                          (prev - 1 + effectiveImages.length) % effectiveImages.length
                        );
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-7 h-7 text-black" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewImageIndex((prev) => 
                          (prev + 1) % effectiveImages.length
                        );
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-colors z-10"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-7 h-7 text-black" />
                    </button>

                    {/* 图片指示器 */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                      {effectiveImages.map((_, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImageIndex(index);
                          }}
                          className={`w-2 h-2 rounded-full transition-all ${
                            index === previewImageIndex ? 'bg-white w-6' : 'bg-white/50'
                          }`}
                          aria-label={`Go to image ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}