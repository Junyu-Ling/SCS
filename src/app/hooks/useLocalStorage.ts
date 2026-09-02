import { useState, useEffect } from 'react';

/**
 * 自定义 Hook: Local Storage
 * 持久化状态到浏览器本地存储
 * 
 * @param key - LocalStorage 的键名
 * @param initialValue - 初始值
 * @returns [value, setValue] 状态和更新函数
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // 从 localStorage 读取初始值
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // 更新 localStorage 和状态
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // 允许值是函数，类似 useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}
