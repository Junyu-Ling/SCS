/**
 * 🚀 性能优化工具类
 * 提供防抖、节流、缓存等性能优化功能
 */

/**
 * 防抖函数（Debounce）
 * 在事件触发后延迟执行，如果在延迟期间再次触发，则重新计时
 * 
 * 适用场景：搜索框输入、窗口 resize 等
 * 
 * @param fn - 要执行的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数（Throttle）
 * 在指定时间内最多执行一次函数
 * 
 * 适用场景：滚动事件、鼠标移动等高频事件
 * 
 * @param fn - 要执行的函数
 * @param limit - 时间限制（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 简单内存缓存类
 * 带有过期时间和最大容量限制
 */
export class MemoryCache<K, V> {
  private cache = new Map<K, { value: V; expires: number }>();
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  /**
   * 设置缓存项
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttl - 过期时间（毫秒），默认 5 分钟
   */
  set(key: K, value: V, ttl: number = 5 * 60 * 1000): void {
    // 如果超过最大容量，删除最早的项
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl,
    });
  }
  
  /**
   * 获取缓存项
   * @param key - 缓存键
   * @returns 缓存值，如果不存在或已过期则返回 undefined
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    // 检查是否过期
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  /**
   * 删除缓存项
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 检查缓存项是否存在且未过期
   */
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }
}

/**
 * 请求去重器
 * 防止同时发起多个相同的网络请求
 */
export class RequestDeduplicator<T> {
  private pending = new Map<string, Promise<T>>();
  
  /**
   * 执行请求，如果已有相同请求正在进行，则等待其完成
   * @param key - 请求唯一标识
   * @param fn - 请求函数
   * @returns Promise
   */
  async execute(key: string, fn: () => Promise<T>): Promise<T> {
    // 检查是否有相同请求正在进行
    const existing = this.pending.get(key);
    if (existing) {
      console.log(`[RequestDeduplicator] Reusing pending request: ${key}`);
      return existing;
    }
    
    // 创建新请求
    console.log(`[RequestDeduplicator] Creating new request: ${key}`);
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });
    
    this.pending.set(key, promise);
    return promise;
  }
  
  /**
   * 清除所有待处理的请求
   */
  clear(): void {
    this.pending.clear();
  }
}

/**
 * 批量操作器
 * 将多个操作合并为一次执行
 */
export class Batcher<T> {
  private queue: T[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private processor: (items: T[]) => Promise<void>;
  private delay: number;
  
  constructor(processor: (items: T[]) => Promise<void>, delay: number = 100) {
    this.processor = processor;
    this.delay = delay;
  }
  
  /**
   * 添加项到批处理队列
   */
  add(item: T): void {
    this.queue.push(item);
    
    // 重置定时器
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.delay);
  }
  
  /**
   * 立即执行批处理
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }
    
    const items = [...this.queue];
    this.queue = [];
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    await this.processor(items);
  }
}

/**
 * 图片预加载器
 * 提前加载图片到浏览器缓存
 */
export class ImagePreloader {
  private loaded = new Set<string>();
  
  /**
   * 预加载单张图片
   */
  preload(src: string): Promise<void> {
    if (this.loaded.has(src)) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loaded.add(src);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }
  
  /**
   * 批量预加载图片
   */
  async preloadMultiple(sources: string[]): Promise<void> {
    const promises = sources
      .filter(src => !this.loaded.has(src))
      .map(src => this.preload(src));
    
    await Promise.all(promises);
  }
  
  /**
   * 清除已加载标记
   */
  clear(): void {
    this.loaded.clear();
  }
}

/**
 * 性能监控器
 * 用于测量代码执行时间
 */
export class PerformanceMonitor {
  private marks = new Map<string, number>();
  
  /**
   * 开始计时
   */
  start(label: string): void {
    this.marks.set(label, performance.now());
  }
  
  /**
   * 结束计时并返回耗时（毫秒）
   */
  end(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`[PerformanceMonitor] No start mark found for: ${label}`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.marks.delete(label);
    
    console.log(`[PerformanceMonitor] ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }
  
  /**
   * 测量函数执行时间
   */
  async measure<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

/**
 * 懒加载触发器
 * 基于 Intersection Observer
 */
export function createLazyLoader(
  callback: (element: Element) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry.target);
        }
      });
    },
    {
      rootMargin: '50px',
      threshold: 0.01,
      ...options,
    }
  );
}
