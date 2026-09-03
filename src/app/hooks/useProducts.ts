import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { getProductImages, isValidImageUrl } from '../data/product-images';
import { products as localProducts } from '../data/products';
import { preloadProductThumbnails } from './useImagePreloader';

/**
 * 商品数据结构
 * 与后端保持一致
 */
export interface Product {
  id: number;
  name: {
    en: string;
    cn: string;
  };
  description: {
    en: string;
    cn: string;
  };
  price: number;
  images: string[];
  category: string;
  tags: string[];
  available?: boolean;
  options?: Record<string, number>;
  sizeGuide?: Record<string, { en: string; cn: string }>;
  /** 颜色变体图片映射：key 为颜色选项名（与 options 的 key 对应），value 为该颜色的图片数组 */
  colorImages?: Record<string, string[]>;
  /** 颜色标签映射：key 为颜色选项名，value 为颜色的中英文展示名 */
  colorLabels?: Record<string, { en: string; cn: string }>;
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;

// ========== 全局状态 ==========
// 内存缓存
let productsCache: { data: Product[]; timestamp: number } | null = null;
// 请求去重
let ongoingRequest: Promise<Product[]> | null = null;
// 订阅者：每个 useProducts 实例注册一个 setState 函数
const subscribers = new Set<(products: Product[]) => void>();
// 单商品缓存
let singleProductCache = new Map<number, { data: Product; timestamp: number }>();
// 全局版本号：每次 clearProductsCache 递增，强制跳过去重
let globalVersion = 0;

/**
 * 处理商品图片：过滤无效 URL，回退到本地 Figma assets
 */
function processProductImages(product: Product): Product {
  const images = product.images || [];

  // 过滤无效 URL
  const validImages = images.filter(isValidImageUrl);

  if (validImages.length > 0) {
    return { ...product, images: validImages };
  }

  // 回退到本地 Figma assets
  const localImages = getProductImages(product.id);
  return { ...product, images: localImages };
}

/**
 * 服饰商品尺码规整：
 *   1. options 为空（undefined/null/{}）→ 用本地兜底模板补 S/M/L/XL，每个尺码库存 0
 *   2. options 仅有 Default 一键 → 按种子比例拆到 S/M/L/XL
 *   3. 其余情况（已有多尺码）→ 不动
 */
function normalizeApparelDefaultOnlyOptions(product: Product): Product {
  if (product.category !== 'apparel') return product;

  const opts = product.options;
  const isEmpty =
    opts === undefined ||
    opts === null ||
    (typeof opts === 'object' && Object.keys(opts).length === 0);
  const isDefaultOnly =
    !isEmpty &&
    typeof opts === 'object' &&
    Object.keys(opts!).length === 1 &&
    Object.keys(opts!)[0] === 'Default';

  if (!isEmpty && !isDefaultOnly) return product;

  const fallback = localProducts.find((p) => p.id === product.id && p.category === 'apparel');
  if (!fallback?.options) return product;
  const tmplKeys = Object.keys(fallback.options).filter((k) => k !== 'Default');
  if (tmplKeys.length === 0) return product;

  // 空 options：每个尺码都设为 0（还原种子结构，方便管理员编辑库存）
  if (isEmpty) {
    return {
      ...product,
      options: Object.fromEntries(tmplKeys.map((k) => [k, 0])),
      sizeGuide: product.sizeGuide ?? fallback.sizeGuide,
    };
  }

  // Default-only：把总量按比例拆给各尺码
  if (tmplKeys.length <= 1) return product;

  const total = Math.max(0, Math.round(Number(opts!['Default']) || 0));
  const tmpl = fallback.options;
  let weights = tmplKeys.map((k) => Math.max(0, Math.round(Number((tmpl as Record<string, number>)[k]) || 0)));
  const sumW = weights.reduce((a, b) => a + b, 0);
  let distributed: Record<string, number>;

  if (sumW <= 0) {
    const each = Math.floor(total / tmplKeys.length);
    let rem = total - each * tmplKeys.length;
    distributed = Object.fromEntries(tmplKeys.map((k, i) => [k, each + (i < rem ? 1 : 0)]));
  } else {
    const raw = weights.map((w) => total * (w / sumW));
    const floors = raw.map(Math.floor);
    let rem = total - floors.reduce((a, b) => a + b, 0);
    const order = tmplKeys.map((_, i) => i).sort(
      (a, b) => (raw[b] - Math.floor(raw[b])) - (raw[a] - Math.floor(raw[a])),
    );
    const vals = [...floors];
    for (let j = 0; j < rem; j++) vals[order[j % order.length]]++;
    distributed = Object.fromEntries(tmplKeys.map((k, i) => [k, vals[i]]));
  }

  return {
    ...product,
    options: distributed,
    sizeGuide: product.sizeGuide ?? fallback.sizeGuide,
  };
}

/** 用本地种子补齐颜色变体；帽子等静态资源以仓库最新图和价格为准 */
function enrichColorVariantsFromLocal(product: Product): Product {
  const local = localProducts.find((p) => p.id === product.id);
  if (!local) return product;
  const next: Product = {
    ...product,
    colorImages: local.colorImages ?? product.colorImages,
    colorLabels: local.colorLabels ?? product.colorLabels,
  };
  if (local.colorImages) {
    next.images = local.images;
    next.price = local.price;
    next.sizeGuide = local.sizeGuide ?? product.sizeGuide;
  }
  return next;
}

/** 合并 API 列表中缺失的本地种子商品（如新上架帽子尚未写入 KV） */
function mergeLocalOnlyProducts(apiProducts: Product[]): Product[] {
  const ids = new Set(apiProducts.map((p) => p.id));
  const extras = localProducts
    .filter((p) => !ids.has(p.id))
    .map((p) => finalizeProduct(p));
  if (extras.length === 0) return apiProducts;
  return [...apiProducts, ...extras].sort((a, b) => a.id - b.id);
}

/** 图片处理 + 服饰 Default 占位拆尺码 */
export function finalizeProduct(product: Product): Product {
  return normalizeApparelDefaultOnlyOptions(
    processProductImages(enrichColorVariantsFromLocal(product)),
  );
}

/**
 * 从后端 API 拉取最新商品列表（纯函数，无副作用）
 */
async function fetchFromAPI(): Promise<Product[]> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(`${API_BASE}/products`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return mergeLocalOnlyProducts((data.products || []).map(finalizeProduct));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[PRODUCTS] Fetch attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error('Failed to fetch products after retries');
}

/**
 * 核心拉取函数：带去重和缓存更新
 * @param forceNew - 为 true 时强制发起新请求，忽略正在进行的请求
 */
async function doFetch(forceNew = false): Promise<Product[]> {
  // 如果有正在进行的请求且不强制，直接复用
  if (ongoingRequest && !forceNew) {
    return ongoingRequest;
  }

  // 如果强制刷新，废弃旧请求
  if (forceNew) {
    ongoingRequest = null;
  }

  const request = (async () => {
    // Retry up to 3 times with exponential backoff for transient failures
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 1000 * attempt)); // 1s, 2s backoff
        }
        return await fetchFromAPI();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[useProducts] Fetch attempt ${attempt + 1}/3 failed:`, lastError.message);
      }
    }
    throw lastError;
  })().then((products) => {
    // 更新缓存
    productsCache = { data: products, timestamp: Date.now() };
    // 更新单商品缓存
    products.forEach(p => {
      singleProductCache.set(p.id, { data: p, timestamp: Date.now() });
    });
    // 预加载缩略图
    preloadProductThumbnails(products);
    return products;
  }).finally(() => {
    // 只有当当前 ongoingRequest 仍是此次请求时才清除
    if (ongoingRequest === request) {
      ongoingRequest = null;
    }
  });

  ongoingRequest = request;
  return request;
}

/**
 * 广播最新数据到所有订阅者
 */
function broadcastToSubscribers(products: Product[]) {
  subscribers.forEach(setter => {
    try { setter(products); } catch (e) { /* ignore */ }
  });
}

// ========== 公开 API ==========

/**
 * Hook: 从后端 API 获取所有商品
 * 使用 stale-while-revalidate 策略：先显示缓存，后台刷新
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>(() =>
    (productsCache?.data ?? localProducts).map(finalizeProduct));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 注册订阅者
    subscribers.add(setProducts);

    // 初始拉取
    const init = async () => {
      try {
        // 先应用缓存
        if (productsCache?.data) {
          setProducts(productsCache.data.map(finalizeProduct));
        }
        // 后台拉取最新
        const fresh = await doFetch();
        setProducts(fresh);
        setError(null);
      } catch (err) {
        console.error('[useProducts] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    init();

    // 监听全局刷新事件
    const handleRefresh = async () => {
      try {
        const fresh = await doFetch(true); // 强制新请求
        setProducts(fresh);
      } catch (err) {
        console.error('[useProducts] Refresh error:', err);
      }
    };
    window.addEventListener('products-force-refresh', handleRefresh);

    return () => {
      subscribers.delete(setProducts);
      window.removeEventListener('products-force-refresh', handleRefresh);
    };
  }, []);

  return { products, loading, error };
}

/**
 * 管理员更新商品后调用：立即更新本地缓存 + 通知所有组件
 * 这是一个同步操作，不涉及网络请求
 */
export function updateProductInCache(updatedProduct: Product) {
  const processed = finalizeProduct(updatedProduct);

  // 更新列表缓存
  if (productsCache?.data) {
    const idx = productsCache.data.findIndex(p => p.id === processed.id);
    if (idx !== -1) {
      // 保留原图片如果新数据没有图片
      const original = productsCache.data[idx];
      if (processed.images.length === 0 && original.images.length > 0) {
        processed.images = original.images;
      }
      productsCache.data[idx] = processed;
    }
  }

  // 更新单商品缓存
  singleProductCache.set(processed.id, { data: processed, timestamp: Date.now() });

  // 更新本地兜底数据
  const localIdx = localProducts.findIndex(p => p.id === processed.id);
  if (localIdx !== -1) {
    localProducts[localIdx] = { ...localProducts[localIdx], ...processed };
  }

  // 立即通知所有订阅者（用当前缓存数据，无需等网络）
  if (productsCache?.data) {
    broadcastToSubscribers([...productsCache.data]);
  }
}

/**
 * 清除缓存并强制所有组件从后端重新拉取最新数据
 * 这是确保管理员修改后前端同步的核心函数
 */
export function clearProductsCache() {
  console.log('[useProducts] Clearing cache and forcing refresh...');

  // 递增版本号
  globalVersion++;

  // 使缓存过期（但不清空，留作 stale 显示）
  if (productsCache) productsCache.timestamp = 0;
  singleProductCache.forEach(v => { v.timestamp = 0; });

  // 废弃进行中的请求
  ongoingRequest = null;

  // 触发所有组件强制刷新（发起新的网络请求）
  window.dispatchEvent(new CustomEvent('products-force-refresh'));

  // 跨标签页通知
  localStorage.setItem('products-cache-cleared', String(Date.now()));
}

/**
 * Hook: 从后端 API 获取单个商品
 * 监听缓存清除事件，实时更新
 */
export function useProduct(id: number) {
  const getInitial = (): Product | null => {
    if (!id) return null;
    const cached = singleProductCache.get(id);
    if (cached) return finalizeProduct(cached.data);
    if (productsCache?.data) {
      const found = productsCache.data.find(p => p.id === id);
      if (found) return finalizeProduct(found);
    }
    const local = localProducts.find(p => p.id === id);
    return local ? finalizeProduct(local) : null;
  };

  const [product, setProduct] = useState<Product | null>(getInitial());
  const [loading, setLoading] = useState(!getInitial());
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!id) { setLoading(false); return; }

    try {
      const response = await fetch(`${API_BASE}/products/${id}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        // 404：回退本地种子（如新帽子尚未写入 KV）
        if (response.status === 404) {
          const local = localProducts.find(p => p.id === id);
          if (local) {
            const processed = finalizeProduct(local);
            singleProductCache.set(id, { data: processed, timestamp: Date.now() });
            setProduct(processed);
            setError(null);
            return;
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const processed = finalizeProduct(data.product);

      // 更新缓存
      singleProductCache.set(id, { data: processed, timestamp: Date.now() });

      // 同步到列表缓存
      if (productsCache?.data) {
        const idx = productsCache.data.findIndex(p => p.id === id);
        if (idx !== -1) productsCache.data[idx] = processed;
      }

      setProduct(processed);
      setError(null);
    } catch (err) {
      console.error(`[useProduct] Error fetching product ${id}:`, err);
      const local = localProducts.find(p => p.id === id);
      if (local) {
        const processed = finalizeProduct(local);
        setProduct(processed);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // 先应用缓存
    const cached = getInitial();
    if (cached) setProduct(cached);

    // 后台拉取最新
    fetchProduct();

    // 监听刷新事件
    const handleRefresh = () => { fetchProduct(); };
    window.addEventListener('products-force-refresh', handleRefresh);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'products-cache-cleared') handleRefresh();
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('products-force-refresh', handleRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchProduct]);

  return { product, loading, error };
}

/**
 * 辅助函数：按分类筛选商品
 */
export function getProductsByCategory(products: Product[], category: string): Product[] {
  return products.filter(product => product.category === category)
    .sort((a, b) => {
      const nameCompare = a.name.en.localeCompare(b.name.en);
      return nameCompare !== 0 ? nameCompare : a.id - b.id;
    });
}

/**
 * 辅助函数：按标签筛选商品
 */
export function getProductsByTag(products: Product[], tag: string): Product[] {
  return products.filter(product => product.tags.includes(tag))
    .sort((a, b) => {
      const nameCompare = a.name.en.localeCompare(b.name.en);
      return nameCompare !== 0 ? nameCompare : a.id - b.id;
    });
}

/**
 * 辅助函数：获取热门/新品商品
 */
export function getFeaturedProducts(products: Product[]): Product[] {
  return products.filter(product =>
    product.tags.includes('hot') || product.tags.includes('new')
  );
}