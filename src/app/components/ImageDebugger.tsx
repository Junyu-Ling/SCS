import React, { useState, useEffect } from 'react';
import { useProducts } from '../hooks/useProducts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

/**
 * 🔍 图片调试工具
 * 用于诊断商品图片 URL 问题
 */
export function ImageDebugger() {
  const { products, loading } = useProducts();
  const [testResults, setTestResults] = useState<Record<number, {
    url: string;
    status: 'loading' | 'success' | 'error';
    error?: string;
  }[]>>({});
  const [testing, setTesting] = useState(false);

  const testImageUrl = async (url: string): Promise<{ status: 'success' | 'error'; error?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        console.log('✅ Image loaded successfully:', url);
        resolve({ status: 'success' });
      };
      
      img.onerror = (e) => {
        console.error('❌ Image load failed:', url, e);
        resolve({ 
          status: 'error', 
          error: 'Failed to load image'
        });
      };
      
      // 设置超时
      const timeout = setTimeout(() => {
        console.warn('⏱️ Image load timeout:', url);
        resolve({ 
          status: 'error', 
          error: 'Timeout'
        });
      }, 10000);
      
      img.src = url;
      
      // 清除超时
      img.onload = () => {
        clearTimeout(timeout);
        resolve({ status: 'success' });
      };
    });
  };

  const testAllImages = async () => {
    setTesting(true);
    const results: Record<number, any[]> = {};

    for (const product of products) {
      if (!product.images || product.images.length === 0) {
        results[product.id] = [];
        continue;
      }

      const productResults = [];
      for (const imageUrl of product.images) {
        productResults.push({
          url: imageUrl,
          status: 'loading' as const
        });
      }
      results[product.id] = productResults;
      setTestResults({ ...results });

      // 测试每个图片
      for (let i = 0; i < product.images.length; i++) {
        const imageUrl = product.images[i];
        const result = await testImageUrl(imageUrl);
        productResults[i] = {
          url: imageUrl,
          ...result
        };
        setTestResults({ ...results });
      }
    }

    setTesting(false);
  };

  if (loading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Loading products...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 Image URL Debugger</span>
          <Button 
            onClick={testAllImages} 
            disabled={testing}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing...' : 'Test All Images'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length === 0 ? (
          <p className="text-center text-muted-foreground">No products found</p>
        ) : (
          products.map((product) => (
            <div key={product.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  #{product.id} - {product.name.en}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {product.images?.length || 0} images
                </span>
              </div>

              {product.images && product.images.length > 0 ? (
                <div className="space-y-2">
                  {product.images.map((url, idx) => {
                    const result = testResults[product.id]?.[idx];
                    
                    return (
                      <div 
                        key={idx} 
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded text-sm"
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {!result && <AlertCircle className="w-4 h-4 text-gray-400" />}
                          {result?.status === 'loading' && (
                            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                          )}
                          {result?.status === 'success' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {result?.status === 'error' && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>

                        {/* URL Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-xs break-all mb-1">
                            {url}
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>
                              Type: {
                                url.startsWith('data:') ? '📄 Base64' :
                                url.startsWith('blob:') ? '🔗 Blob' :
                                url.includes('supabase.co/storage') ? '☁️ Storage' :
                                url.startsWith('http') ? '🌐 External' :
                                url.startsWith('/') ? '📂 Local' :
                                '❓ Unknown'
                              }
                            </span>
                            {url.includes('supabase.co/storage') && (
                              <span>
                                | {url.includes('/public/') ? '🔓 Public' : '🔒 Private'}
                              </span>
                            )}
                          </div>
                          {result?.error && (
                            <div className="text-red-500 text-xs mt-1">
                              Error: {result.error}
                            </div>
                          )}
                        </div>

                        {/* Preview */}
                        {result?.status === 'success' && (
                          <img 
                            src={url} 
                            alt={`Preview ${idx}`}
                            className="w-16 h-16 object-cover rounded border"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No images</p>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
