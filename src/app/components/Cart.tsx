import { X, Trash2, ChevronRight, ShoppingBag, Plus, Minus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';
import { useState } from 'react';

export default function Cart() {
  const { t } = useLanguage();
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    getTotalPrice,
    toggleItemSelection,
    selectAll,
    selectedIds,
    submitOrder,
  } = useCart();

  const [updatingQuantity, setUpdatingQuantity] = useState<string | null>(null);

  const allSelectableChecked = cartItems.length > 0 && 
    cartItems.filter(item => item.canBuy).every(item => selectedIds.has(item.id));

  const handleSubmit = async () => {
    const selectedItems = cartItems.filter(item => selectedIds.has(item.id));
    if (selectedItems.length === 0) {
      toast.error(t('No items selected', '未选择商品'));
      return;
    }
    
    await submitOrder();
    setIsCartOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Cart Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[90vw] md:w-[500px] bg-card shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0 bg-card">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-card-foreground">{t('Cart', '购物车')}</h2>
              {cartItems.length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {cartItems.length}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 hover:bg-accent rounded-full transition-colors touch-manipulation"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cartItems.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-card-foreground mb-2">
                  {t('Your cart is empty', '购物车为空')}
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {t('Add some products to get started', '添加商品开始购物')}
                </p>
                <Button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t('Continue Shopping', '继续购物')}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex gap-3 p-3 border border-border rounded-lg transition-all duration-300 ${
                      !item.canBuy ? 'bg-muted/50 opacity-60' : 'bg-card hover:shadow-md'
                    }`}
                    style={{
                      animation: `slideIn 0.3s ease-out ${index * 0.05}s both`
                    }}
                  >
                    {/* Checkbox */}
                    <div className="flex items-start pt-1 flex-shrink-0">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                        disabled={!item.canBuy}
                        className="touch-manipulation"
                      />
                    </div>

                    {/* Image */}
                    <div className="w-20 h-20 flex-shrink-0 bg-muted rounded overflow-hidden">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-card-foreground line-clamp-2 mb-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {item.option && item.option !== 'Default' ? `${item.option} · ` : ''}×{item.quantity}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-base font-semibold text-primary">
                          ¥{(item.price * item.quantity).toFixed(2)}
                        </span>
                        {!item.canBuy && (
                          <span className="text-xs text-destructive">
                            {t('Out of stock', '已售罄')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 hover:bg-destructive/10 rounded-full transition-colors touch-manipulation self-start"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Only show when there are items */}
          {cartItems.length > 0 && (
            <div className="border-t border-border bg-card p-4 flex-shrink-0">
              {/* Select All */}
              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  checked={allSelectableChecked}
                  onCheckedChange={() => selectAll(!allSelectableChecked)}
                  className="touch-manipulation"
                />
                <span className="text-sm text-card-foreground">
                  {t('Select All', '全选')}
                </span>
              </div>

              {/* Total with animation */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-base text-card-foreground">{t('Total', '总计')}:</span>
                <span 
                  className="text-2xl font-bold text-primary transition-all duration-300"
                  key={getTotalPrice()}
                  style={{ animation: 'priceUpdate 0.3s ease-out' }}
                >
                  ¥{getTotalPrice().toFixed(2)}
                </span>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleSubmit}
                disabled={selectedIds.size === 0}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base font-medium transition-all duration-200 hover:shadow-lg"
              >
                {t('Reserve', '提交预定')} ({selectedIds.size})
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes priceUpdate {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>

      {/* Cart Toggle Button (when closed) */}
      {!isCartOpen && cartItems.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-3 rounded-l-lg shadow-lg hover:bg-primary/90 transition-colors z-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </>
  );
}