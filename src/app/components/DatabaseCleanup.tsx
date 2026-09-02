import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { supabase } from '../../lib/supabaseClient';
import { clearProductsCache } from '../hooks/useProducts';
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw, Database } from 'lucide-react';

interface Product {
  id: number;
  name: { en: string; cn: string };
  images: string[];
}

/**
 * 数据库清理工具
 * 一键清理所有商品中的无效 blob URL
 */
export default function DatabaseCleanup() {
  const { language, t } = useLanguage();
  const { user, session } = useProfile();
  
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [affectedProducts, setAffectedProducts] = useState<Product[]>([]);
  
  // 加载商品数据
  useEffect(() => {
    loadProducts();
  }, []);
  
  const loadProducts = async () => {
    setLoading(true);
    try {
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(`${API_BASE}/products`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      
      const data = await response.json();
      const allProducts = data.products || [];
      setProducts(allProducts);
      
      // 查找包含 blob URL 的商品
      const affected = allProducts.filter((p: Product) => 
        p.images?.some(url => url.startsWith('blob:'))
      );
      setAffectedProducts(affected);
      
      console.log('[DatabaseCleanup] Loaded products:', allProducts.length);
      console.log('[DatabaseCleanup] Products with blob URLs:', affected.length);
      
    } catch (error) {
      console.error('[DatabaseCleanup] Error loading products:', error);
      toast.error(t('Failed to load products', '加载商品失败'));
    } finally {
      setLoading(false);
    }
  };
  
  // 一键清理
  const handleCleanup = async () => {
    if (!user || !session) {
      toast.error(t('Please log in as admin', '请以管理员身份登录'));
      window.location.hash = '#/admin';
      return;
    }
    
    if (affectedProducts.length === 0) {
      toast.info(t('No products need cleaning', '没有需要清理的商品'));
      return;
    }
    
    setCleaning(true);
    try {
      // 获取 fresh session
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !freshSession?.access_token) {
        throw new Error('Session expired');
      }
      
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(
        `${API_BASE}/admin/refresh-image-urls?_auth_token=${encodeURIComponent(freshSession.access_token)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clean database');
      }
      
      const data = await response.json();
      console.log('[DatabaseCleanup] Cleanup result:', data);
      
      // 清除缓存并重新加载
      clearProductsCache();
      await loadProducts();
      
      toast.success(
        t(
          `✅ Successfully cleaned ${data.updated} products! Page will reload in 2 seconds.`,
          `✅ 成功清理了 ${data.updated} 个商品！页面将在 2 秒后重新加载。`
        ),
        { duration: 5000 }
      );
      
      // 2 秒后刷新页面
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('[DatabaseCleanup] Error cleaning database:', error);
      toast.error(
        t(
          error instanceof Error ? error.message : 'Failed to clean database',
          error instanceof Error ? error.message : '清理数据库失败'
        )
      );
    } finally {
      setCleaning(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            {t('Loading database status...', '正在加载数据库状态...')}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">
              {t('Database Cleanup Tool', '数据库清理工具')}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {t(
              'This tool cleans up invalid blob URLs from the database and restores proper image references.',
              '此工具可清理数据库中的无效 blob URL，并恢复正确的图片引用。'
            )}
          </p>
        </div>
        
        {/* Status Card */}
        <div className="bg-card rounded-xl shadow-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {t('Database Status', '数据库状态')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Products */}
            <div className="bg-background rounded-lg p-4 border border-border">
              <div className="text-sm text-muted-foreground mb-1">
                {t('Total Products', '总商品数')}
              </div>
              <div className="text-3xl font-bold text-foreground">
                {products.length}
              </div>
            </div>
            
            {/* Affected Products */}
            <div className={`rounded-lg p-4 border ${
              affectedProducts.length > 0
                ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900'
                : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
            }`}>
              <div className="text-sm text-muted-foreground mb-1">
                {t('Products with Issues', '有问题的商品')}
              </div>
              <div className={`text-3xl font-bold ${
                affectedProducts.length > 0
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {affectedProducts.length}
              </div>
            </div>
            
            {/* Clean Products */}
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
              <div className="text-sm text-muted-foreground mb-1">
                {t('Clean Products', '正常商品')}
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {products.length - affectedProducts.length}
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Section */}
        {affectedProducts.length > 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-xl shadow-lg border border-yellow-200 dark:border-yellow-900 p-6 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  {t('Action Required', '需要操作')}
                </h3>
                <p className="text-yellow-800 dark:text-yellow-200 mb-4">
                  {t(
                    `Found ${affectedProducts.length} products with invalid blob URLs in the database. These URLs are temporary and will cause image loading failures.`,
                    `发现 ${affectedProducts.length} 个商品在数据库中存储了无效的 blob URL。这些 URL 是临时的，会导致图片加载失败。`
                  )}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                  {t(
                    'Click the button below to automatically clean up these invalid URLs. Images will be restored using Figma assets.',
                    '点击下方按钮自动清理这些无效的 URL。图片将使用 Figma assets 恢复。'
                  )}
                </p>
                
                {/* Affected Products List */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                  <div className="text-sm font-medium mb-2 text-yellow-900 dark:text-yellow-100">
                    {t('Affected Products:', '受影响的商品：')}
                  </div>
                  <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                    {affectedProducts.map(p => (
                      <li key={p.id} className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-yellow-100 dark:bg-yellow-900/50 px-2 py-0.5 rounded">
                          #{p.id}
                        </span>
                        <span>{language === 'en' ? p.name.en : p.name.cn}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <Button
                  onClick={handleCleanup}
                  disabled={cleaning}
                  size="lg"
                  className="w-full md:w-auto bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {cleaning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('Cleaning...', '清理中...')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('Clean Database Now', '立即清理数据库')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl shadow-lg border border-green-200 dark:border-green-900 p-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                  {t('All Clean!', '一切正常！')}
                </h3>
                <p className="text-green-800 dark:text-green-200">
                  {t(
                    'No invalid blob URLs found in the database. All product images are properly configured.',
                    '数据库中未发现无效的 blob URL。所有商品图片配置正确。'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 p-4">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            {t('What are blob URLs?', '什么是 blob URL？')}
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
            {t(
              'Blob URLs are temporary browser-generated URLs (starting with "blob:") that only work in the current browser session. They should never be stored in a database.',
              'Blob URL 是浏览器生成的临时 URL（以 "blob:" 开头），仅在当前浏览器会话中有效。它们不应该被存储在数据库中。'
            )}
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t(
              'This cleanup tool removes these invalid URLs and ensures all products use permanent image references from Figma assets or Supabase Storage.',
              '此清理工具会删除这些无效的 URL，并确保所有商品使用来自 Figma assets 或 Supabase Storage 的永久图片引用。'
            )}
          </p>
        </div>
        
        {/* Navigation */}
        <div className="mt-8 flex gap-4">
          <Button
            onClick={() => window.location.hash = '#/admin'}
            variant="outline"
          >
            {t('← Back to Admin', '← 返回管理员面板')}
          </Button>
          <Button
            onClick={loadProducts}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('Refresh Status', '刷新状态')}
          </Button>
        </div>
      </div>
    </div>
  );
}
