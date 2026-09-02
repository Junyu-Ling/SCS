import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useProfile } from './ProfileContext';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { supabase } from '../../lib/supabaseClient';

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
  submitOrder: () => Promise<boolean>;                // 提交预定
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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { user, profile, session } = useProfile();

  /**
   * 从 localStorage 加载购物车
   * 支持登录和未登录用户
   */
  useEffect(() => {
    // 使用通用购物车 key 或用户专属 key
    const cartKey = user ? `cart_${user.id}` : 'cart_guest';
    const savedCart = localStorage.getItem(cartKey);
    
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        console.log(`[CART] Loaded from localStorage (${user ? 'user' : 'guest'}):`, items.length, 'items');
        setCartItems(items);
      } catch (error) {
        console.error('[CART] Error parsing saved cart:', error);
        setCartItems([]);
      }
    } else {
      console.log(`[CART] No saved cart found (${user ? 'user' : 'guest'})`);
      // Don't clear cart items if this is initial load
      if (cartItems.length === 0) {
        setCartItems([]);
      }
    }
  }, [user]);

  /**
   * 自动保存购物车到 localStorage
   * 当购物车内容改变时自动保存
   * 支持登录和未登录用户
   */
  useEffect(() => {
    const cartKey = user ? `cart_${user.id}` : 'cart_guest';
    localStorage.setItem(cartKey, JSON.stringify(cartItems));
    console.log(`[CART] Saved to localStorage (${user ? 'user' : 'guest'}):`, cartItems.length, 'items');
  }, [cartItems, user]);

  /**
   * 同步购物车
   * 实际上只是触发一次保存到 localStorage
   */
  const syncCart = async () => {
    if (!user) {
      console.log('[CART] Not syncing - user not logged in');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 300));
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
   * - 验证登录状态
   * - 验证选中商品
   * - 调用后端 API 保存预定到 KV Store
   * - 清除已提交的商品
   */
  const submitOrder = async () => {
    // 1. 验证登录状态
    if (!user) {
      toast.error('Please log in to submit reservation / 请先登录提交预定');
      return false;
    }

    // 2. 获取最新的 session（确保 token 是最新的）
    console.log('[CART] ========== STARTING ORDER SUBMISSION ==========');
    console.log('[CART] Getting fresh session...');
    const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('[CART] Session error:', sessionError);
      toast.error('Session error, please try again / 会话错误，请重试');
      return false;
    }
    
    if (!freshSession?.access_token) {
      console.error('[CART] No valid session or access_token found after refresh');
      toast.error('Session expired, please log in again / 会话过期，请重新登录');
      return false;
    }
    
    console.log('[CART] Fresh session obtained');
    console.log('[CART] Token length:', freshSession.access_token.length);
    console.log('[CART] Session expires at:', freshSession.expires_at ? new Date(freshSession.expires_at * 1000).toISOString() : 'unknown');
    console.log('[CART] Current time:', new Date().toISOString());

    // 3. 验证选中商品
    const itemsToBuy = getSelectedItems();
    if (itemsToBuy.length === 0) {
      toast.error('Please select items to checkout / 请选择要结算的商品');
      return false;
    }

    // 4. 验证用户资料
    if (!profile) {
      toast.error('Profile not loaded / 个人信息未加载');
      return false;
    }

    try {
      console.log('[CART] Preparing order submission...');
      console.log('[CART] User ID:', user.id);
      console.log('[CART] User email:', user.email);
      const total = getTotalPrice();

      // 5. 调用后端 API 提交订单
      // 使用标准 fetch（不通过 Edge Function 路由）
      const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
      
      const requestBody = {
        items: itemsToBuy,
        total,
        contactInfo: {
          real_name: profile.real_name,
          class_name: profile.class_name,
          role: profile.role,
        },
      };
      
      console.log('[CART] Request URL:', `${API_BASE}/orders`);
      console.log('[CART] Request method: POST');
      console.log('[CART] Request body items count:', itemsToBuy.length);
      
      // 使用 publicAnonKey 作为基础认证，然后在 body 中传递用户 token
      const requestHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,  // 使用 anon key 通过网关
      };
      
      // 在 body 中包含 access token
      const requestBodyWithAuth = {
        ...requestBody,
        _auth_token: freshSession.access_token,  // 在 body 中传递用户 token
      };
      
      console.log('[CART] Using anon key for gateway, user token in body');
      console.log('[CART] Sending request to backend...');
      
      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBodyWithAuth),
      });

      console.log('[CART] Response received!');
      console.log('[CART] Response status:', response.status);
      console.log('[CART] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CART] Error response text:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        console.error('[CART] Order submission failed:', response.status, errorData);
        
        if (response.status === 401) {
          toast.error('Authentication failed / 认证失败，请重新登录');
        } else {
          toast.error(`Order submission failed: ${errorData.error || errorData.message || 'Unknown error'} / 订单提交失败`);
        }
        return false;
      }

      const result = await response.json();
      console.log('[CART] Order submitted successfully:', result);
      console.log('[CART] ========== ORDER SUBMISSION COMPLETE ==========');

      // 6. 清除已提交的商品
      setCartItems(prev => prev.filter(item => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      
      toast.success('Reservation submitted successfully! / 预定提交成功！');
      return true;
    } catch (error) {
      console.error('[CART] Order submission exception:', error);
      console.error('[CART] Exception message:', error instanceof Error ? error.message : String(error));
      toast.error(`Order submission error: ${error instanceof Error ? error.message : 'Unknown error'} / 订单提交错误`);
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