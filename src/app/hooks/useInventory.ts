import { useState, useEffect } from 'react';

const INVENTORY_STORAGE_KEY = 'inventory';

export function useInventory() {
  const [availability, setAvailability] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  // 从 localStorage 加载库存状态
  useEffect(() => {
    try {
      const savedInventory = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (savedInventory) {
        const parsed = JSON.parse(savedInventory);
        setAvailability(parsed);
        console.log('[INVENTORY] Loaded from localStorage:', parsed);
      }
    } catch (err) {
      console.error('[INVENTORY] Failed to load from localStorage', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const isStocked = (id: number) => availability[id] ?? true;

  /**
   * 切换商品库存状态
   * 保存到 localStorage
   */
  const toggleStock = (id: number) => {
    setAvailability(prev => {
      const currentStatus = prev[id] ?? true; // 默认有货
      const newAvailability = {
        ...prev,
        [id]: !currentStatus
      };
      
      // 保存到 localStorage
      try {
        localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(newAvailability));
        console.log('[INVENTORY] Saved to localStorage:', newAvailability);
      } catch (err) {
        console.error('[INVENTORY] Failed to save to localStorage', err);
      }
      
      return newAvailability;
    });
  };

  return { availability, loading, isStocked, toggleStock };
}