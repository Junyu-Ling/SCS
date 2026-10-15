import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import { useCheckoutProfile, type CheckoutProfile } from './CheckoutProfileContext';
import { getCatalogPrice } from '../data/catalog';

/**
 * 购物车商品类型定义
 */
export interface CartItem {
  id: string;              // 购物车项 ID（前端生成）
  commodityId: number;     // 商品 ID
  name: string;            // 商品名称（根据语言选择）
  price: number;           // 单价
  quantity: number;        // 数量
  option: string;          // 选项（如颜色、尺寸等）
  image: string;           // 商品图片 URL
  repertory: number;       // 库存
  canBuy: boolean;         // 是否可购买
}

/**
 * CartContext 类型定义
 * 提供全局购物车状态管理
 */
interface CartContextType {
  cartItems: CartItem[];                              // 购物车商品列表
  isCartOpen: boolean;                                // 购物车侧栏是否打开
  setIsCartOpen: (open: boolean) => void;             // 设置购物车侧栏状态
  addToCart: (item: Omit<CartItem, 'id'>) => void;   // 添加商品到购物车
  removeFromCart: (id: string) => void;               // 从购物车移除商品
  updateQuantity: (id: string, quantity: number) => void;  // 更新商品数量
  getTotalPrice: () => number;                        // 获取选中商品总价
  getSelectedItems: () => CartItem[];                 // 获取选中的商品列表
  toggleItemSelection: (id: string) => void;          // 切换商品选中状态
  selectAll: (selected: boolean) => void;             // 全选/取消全选
  selectedIds: Set<string>;                           // 选中的商品 ID 集合
  submitOrder: (contact: CheckoutProfile) => Promise<boolean>;                // 提交预定
  clearCart: () => void;                              // 清空购物车
  syncCart: () => Promise<void>;                      // 手动同步购物车
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * CartProvider 组件
 * 提供全局购物车状态管理
 * - 购物车数据存储在 localStorage
 * - 用户登录后自动加载购物车
 * - 购物车修改自动保存到 localStorage
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { invalidateVerification } = useCheckoutProfile();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const savedCart = localStorage.getItem('cart_guest');
    if (savedCart) {
      try {
        // 旧版本存进 localStorage 的购物车可能带着过期单价：一律按代码里的价格表重新定价
        const parsed = JSON.parse(savedCart) as CartItem[];
        setCartItems(
          parsed.map((item) => {
            const catalogPrice = getCatalogPrice(item.commodityId);
            return catalogPrice === undefined ? item : { ...item, price: catalogPrice };
          }),
        );
      } catch (error) {
        console.error('[CART] Error parsing saved cart:', error);
        setCartItems([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart_guest', JSON.stringify(cartItems));
  }, [cartItems]);

  const syncCart = async () => {
    localStorage.setItem('cart_guest', JSON.stringify(cartItems));
  };

  /**
   * 添加商品到购物车
   * - 如果商品已存在（相同 commodityId 和 option），则增加数量
   * - 否则添加新商品
   */
  const addToCart = (item: Omit<CartItem, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36);
    const newItem: CartItem = { ...item, id };
    
    setCartItems((prev) => {
      // 检查是否已存在相同商品（相同 ID 和选项）
      const existingIndex = prev.findIndex(
        (i) => i.commodityId === item.commodityId && i.option === item.option
      );
      
      if (existingIndex > -1) {
        // 更新现有商品数量
        const updated = [...prev];
        updated[existingIndex].quantity += item.quantity;
        toast.success('Item quantity updated in cart');
        return updated;
      } else {
        // 添加新商品
        toast.success('Item added to cart');
        return [...prev, newItem];
      }
    });
  };

  /**
   * 从购物车移除商品
   */
  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    toast.success('Item removed from cart');
  };

  /**
   * 更新商品数量
   * 如果数量 <= 0，则移除商品
   */
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  /**
   * 清空购物车
   */
  const clearCart = () => {
    setCartItems([]);
    setSelectedIds(new Set());
  };

  /**
   * 切换商品选中状态
   */
  const toggleItemSelection = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * 全选/取消全选
   */
  const selectAll = (selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(cartItems.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  /**
   * 获取选中商品总价
   */
  const getTotalPrice = () => {
    return getSelectedItems()
      .reduce((total, item) => total + item.price * item.quantity, 0);
  };

  /**
   * 获取选中的商品列表
   */
  const getSelectedItems = () => {
    return cartItems.filter(item => selectedIds.has(item.id));
  };

  /**
   * 提交预定
   * - 验证选中商品与联系信息
   * - 调用后端 API 保存预定到 KV Store
   * - 邮件通知管理员
   * - 清除已提交的商品
   */
  const submitOrder = async (contact: CheckoutProfile) => {
    const itemsToBuy = getSelectedItems();
    if (itemsToBuy.length === 0) {
      toast.error('Please select items to checkout / 请选择要结算的商品');
      return false;
    }

    try {
      // 服务端会按代码里的价格表重新计算价格；这里只发送商品 ID / 选项 / 数量
      const result = await api<{ orderNumber: string; total: number }>('/api/orders', {
        method: 'POST',
        student: true,
        body: {
          items: itemsToBuy.map((item) => ({
            commodityId: item.commodityId,
            option: item.option === 'Default' ? '' : item.option,
            quantity: item.quantity,
          })),
          contactInfo: {
            real_name: contact.realName,
            class_name: contact.className,
            note: contact.note,
          },
        },
      });
      const total = result.total;
      try {
        const history = JSON.parse(localStorage.getItem('scls_local_orders') || '[]');
        history.unshift({
          orderNumber: result.orderNumber,
          total,
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('scls_local_orders', JSON.stringify(history.slice(0, 20)));
      } catch {
        /* ignore */
      }

      setCartItems(prev => prev.filter(item => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      
      toast.success('Reservation submitted successfully! / 预定提交成功！');
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        invalidateVerification();
        toast.error('Email verification expired, please verify again / 邮箱验证已过期，请重新验证');
        return false;
      }
      console.error('[CART] Order submission failed:', error);
      toast.error(`Order submission failed: ${error instanceof Error ? error.message : 'Unknown error'} / 订单提交失败`);
      return false;
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        getTotalPrice,
        getSelectedItems,
        toggleItemSelection,
        selectAll,
        selectedIds,
        submitOrder,
        clearCart,
        syncCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/**
 * useCart Hook
 * 在任何组件中使用此 Hook 获取购物车功能
 * 必须在 CartProvider 内部使用
 */
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}