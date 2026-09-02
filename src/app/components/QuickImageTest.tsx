import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { getProductImages } from '../data/product-images';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertCircle, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

/**
 * 快速图片测试组件
 * 显示数据库中的实际图片 URL 和是否包含 blob URL
 */
export function QuickImageTest() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4/products`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setProducts(data.products);
      } catch (error) {
        console.error('[QuickImageTest] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  const productsWithBlobUrls = products.filter(p => 
    p.images?.some((url: string) => url.startsWith('blob:'))
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">快速图片检测</h1>

      {/* 总结卡片 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>检测结果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>总商品数: {products.length}</span>
              </div>
              {productsWithBlobUrls.length > 0 ? (
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-600 font-semibold">
                    包含 Blob URL 的商品: {productsWithBlobUrls.length}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-green-600 font-semibold">
                    ✅ 所有商品图片 URL 都正常！
                  </span>
                </div>
              )}
            </div>
            
            {/* 如果有问题，显示清理按钮 */}
            {productsWithBlobUrls.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                      需要清理数据库
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      使用专用工具一键清理所有无效的 blob URL
                    </p>
                  </div>
                  <Button
                    onClick={() => window.location.hash = '#/database-cleanup'}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    立即清理
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 问题商品详情 */}
      {productsWithBlobUrls.length > 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">需要清理的商品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productsWithBlobUrls.map(product => (
                <div key={product.id} className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold">
                    #{product.id} - {product.name.en}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {product.name.cn}
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">数据库中的图片 URL:</p>
                    {product.images.map((url: string, idx: number) => (
                      <div key={idx} className="text-xs font-mono bg-muted p-2 rounded">
                        {url.startsWith('blob:') && (
                          <span className="text-red-600 font-bold mr-2">⚠️ BLOB</span>
                        )}
                        {url.substring(0, 80)}...
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium text-green-600">
                      ✅ Figma Assets 可用: {getProductImages(product.id).length > 0 ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">
                    修复建议
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    前往管理员面板 (#/admin)，点击 "Refresh Image URLs" 按钮来清理这些无效的 blob URL。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 所有商品列表 */}
      <Card>
        <CardHeader>
          <CardTitle>所有商品图片状态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {products.map(product => {
              const hasBlobUrl = product.images?.some((url: string) => url.startsWith('blob:'));
              const hasValidImages = product.images?.some((url: string) => 
                url.startsWith('http') && url.includes('supabase.co/storage')
              );
              const hasFigmaAssets = getProductImages(product.id).length > 0;

              return (
                <div key={product.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <span className="font-medium">#{product.id}</span>
                    <span className="mx-2">-</span>
                    <span>{product.name.en}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasBlobUrl && (
                      <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded">
                        ⚠️ Blob URL
                      </span>
                    )}
                    {hasValidImages && (
                      <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100 rounded">
                        ✅ Storage
                      </span>
                    )}
                    {hasFigmaAssets && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 rounded">
                        📦 Figma Assets
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}