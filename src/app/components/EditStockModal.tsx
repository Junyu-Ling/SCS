import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Product } from '../hooks/useProducts';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { clearProductsCache, updateProductInCache } from '../hooks/useProducts';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface EditStockModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  /** 传入接口返回的最新商品，便于管理员表格立即刷新 */
  onUpdate: (updated?: Product) => void;
}

export function EditStockModal({ product, isOpen, onClose, onUpdate }: EditStockModalProps) {
  const { language, t } = useLanguage();
  const [stockData, setStockData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      if (product.options && Object.keys(product.options).length > 0) {
        setStockData({ ...product.options });
      } else if (product.category === 'apparel') {
        // Initialize default sizes for apparel if no options exist
        setStockData({
          S: 0,
          M: 0,
          L: 0,
          XL: 0
        });
      } else {
        // For non-apparel, initialize with Default stock if empty
        setStockData({ 'Default': 0 });
      }
    } else {
      setStockData({});
    }
  }, [product]);

  const handleInputChange = (size: string, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setStockData(prev => ({
        ...prev,
        [size]: numValue
      }));
    } else if (value === '') {
       // Handle empty input temporarily
       setStockData(prev => ({
        ...prev,
        [size]: 0
      }));
    }
  };

  const handleSubmit = async () => {
    if (!product) return;

    setLoading(true);
    try {
      const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !freshSession?.access_token) {
        toast.error(t('Session expired — please log in again', '会话已过期，请重新登录'));
        return;
      }

      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      const response = await fetch(`${API_BASE}/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          options: stockData,
          _auth_token: freshSession.access_token
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update stock');
      }

      const data = await response.json();

      toast.success(t('Stock updated successfully', '库存更新成功'));

      const updated = data.product as Product | undefined;
      if (updated) {
        const normalized: Product = {
          ...updated,
          price: typeof updated.price === 'string' ? parseFloat(updated.price) : Number(updated.price),
        };
        updateProductInCache(normalized);
        clearProductsCache();
        onUpdate(normalized);
      } else {
        clearProductsCache();
        onUpdate();
      }

      onClose();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error(t('Failed to update stock', '更新库存失败'));
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  const title = language === 'en' ? `Update Stock: ${product.name.en}` : `更新库存: ${product.name.cn}`;
  const description = language === 'en' ? 'Modify the stock quantity.' : '修改库存数量。';
  
  // Determine if we should show simple stock or variant stock
  const isVariantProduct = product.category === 'apparel' || Object.keys(stockData).length > 1 || (Object.keys(stockData).length === 1 && Object.keys(stockData)[0] !== 'Default');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isVariantProduct ? (
            Object.entries(stockData).map(([size, quantity]) => (
              <div key={size} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={`stock-${size}`} className="text-right">
                  {size}
                </Label>
                <Input
                  id={`stock-${size}`}
                  type="number"
                  value={quantity}
                  onChange={(e) => handleInputChange(size, e.target.value)}
                  className="col-span-3"
                  min={0}
                />
              </div>
            ))
          ) : (
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock-default" className="text-right">
                  {t('Quantity', '数量')}
                </Label>
                <Input
                  id="stock-default"
                  type="number"
                  value={stockData['Default'] || 0}
                  onChange={(e) => handleInputChange('Default', e.target.value)}
                  className="col-span-3"
                  min={0}
                />
             </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('Cancel', '取消')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Save Changes', '保存更改')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
