import { useState, useEffect } from 'react';

/**
 * 自定义 Hook: 防抖
 * 延迟更新值，用于优化搜索等场景
 * 
 * @param value - 要防抖的值
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
