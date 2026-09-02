import React from 'react';
import { useProducts } from '../hooks/useProducts';
import { useLanguage } from '../contexts/LanguageContext';
import { OptimizedImage } from './OptimizedImage';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2 } from 'lucide-react';

/**
 * 图片测试页面
 * 用于对比 OptimizedImage 和 ImageWithFallback 的显示效果
 */
export function ImageTestPage() {
  const { products, loading } = useProducts();
  const { language } = useLanguage();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">Image Display Test</h1>
      
      <div className="space-y-8">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <CardTitle>
                #{product.id} - {language === 'en' ? product.name.en : product.name.cn}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {product.images.length} image(s) from: {
                  product.images[0]?.includes('supabase.co/storage') ? 'Supabase Storage' :
                  product.images[0]?.startsWith('blob:') ? 'Blob URL' :
                  product.images[0]?.startsWith('data:') ? 'Data URL' :
                  'Figma Assets'
                }
              </p>
            </CardHeader>
            <CardContent>
              {product.images.length === 0 ? (
                <p className="text-muted-foreground">No images</p>
              ) : (
                <div className="space-y-6">
                  {product.images.map((imageUrl, idx) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="font-semibold text-sm">Image {idx + 1}</h4>
                      <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded mb-2 break-all">
                        {imageUrl.substring(0, 100)}...
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* OptimizedImage - 前台使用 */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium">OptimizedImage (前台)</p>
                          <div className="aspect-square bg-muted rounded overflow-hidden border">
                            <OptimizedImage
                              src={imageUrl}
                              alt={`${product.name.en} - ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        
                        {/* ImageWithFallback - 管理员使用 */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium">ImageWithFallback (管理员)</p>
                          <div className="aspect-square bg-muted rounded overflow-hidden border">
                            <ImageWithFallback
                              src={imageUrl}
                              alt={`${product.name.en} - ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
