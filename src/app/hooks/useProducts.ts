import { useState, useEffect } from 'react';
import { getProductImages, isValidImageUrl } from '../data/product-images';
import { products as localProducts } from '../data/products';
import { CATALOG_BY_ID } from '../data/catalog';
import { api } from '../../lib/api';
import { preloadProductThumbnails } from './useImagePreloader';

/**
 * 商品数据结构
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

/**
 * 商品列表 = 代码里的目录（data/catalog.ts + data/products.ts）+ 服务端保存的"运行时状态"
 * （是否售罄、尺码 / 颜色库存，见 /api/products）。
 *
 * - 名称、价格、分类、图片只来自代码，服务端无法覆盖。
 * - 服务端返回的、目录里不存在的商品 id 会被直接忽略，所以旧数据 / 缓存不会"复活"幽灵商品。
 */
type ProductState = { id: number; available?: boolean; options?: Record<string, number> };

// ========== 全局状态 ==========
let stateCache: Map<number, ProductState> | null = null;
let ongoingRequest: Promise<Map<number, ProductState>> | null = null;
const subscribers = new Set<(products: Product[]) => void>();

/** 过滤无效图片 URL，回退到本地资源 */
function processProductImages(product: Product): Product {
  const validImages = (product.images || []).filter(isValidImageUrl);
  if (validImages.length > 0) return { ...product, images: validImages };
  return { ...product, images: getProductImages(product.id) };
}

/** 图片处理 + 价格强制取代码目录里的价格 */
export function finalizeProduct(product: Product): Product {
  const withImages = processProductImages(product);
  const entry = CATALOG_BY_ID[product.id];
  return entry ? { ...withImages, price: entry.price } : withImages;
}

/** 目录商品 + 运行时状态 → 展示用商品 */
function buildProducts(): Product[] {
  return localProducts
    .filter((p) => CATALOG_BY_ID[p.id])
    .map((base) => {
      const merged = finalizeProduct(base as Product);
      const state = stateCache?.get(base.id);
      if (!state) return merged;
      const next: Product = { ...merged };
      if (typeof state.available === 'boolean') next.available = state.available;
      if (merged.options && state.options) {
        const options: Record<string, number> = { ...merged.options };
        for (const key of Object.keys(options)) {
          if (typeof state.options[key] === 'number') options[key] = state.options[key];
        }
        next.options = options;
      }
      return next;
    });
}

function broadcast() {
  const list = buildProducts();
  subscribers.forEach((setter) => {
    try {
      setter(list);
    } catch {
      /* ignore */
    }
  });
}

async function fetchState(): Promise<Map<number, ProductState>> {
  if (ongoingRequest) return ongoingRequest;
  const request = api<{ products: ProductState[] }>('/api/products')
    .then((data) => {
      const map = new Map<number, ProductState>();
      for (const item of data.products || []) {
        if (CATALOG_BY_ID[item.id]) map.set(item.id, item); // 忽略目录里没有的 id
      }
      stateCache = map;
      return map;
    })
    .finally(() => {
      if (ongoingRequest === request) ongoingRequest = null;
    });
  ongoingRequest = request;
  return request;
}

/** 强制重新向服务端拉取最新库存状态并通知所有组件 */
export async function refreshProductState() {
  try {
    ongoingRequest = null;
    await fetchState();
    broadcast();
  } catch (err) {
    console.warn('[useProducts] Failed to refresh product state:', err);
  }
}

/** 管理员改完库存 / 售罄状态后：先本地更新（立即生效），再向服务端确认 */
export function applyProductState(id: number, patch: { available?: boolean; options?: Record<string, number> }) {
  if (!CATALOG_BY_ID[id]) return;
  const map = stateCache ?? new Map<number, ProductState>();
  const current = map.get(id) ?? { id };
  map.set(id, {
    ...current,
    ...(patch.available !== undefined ? { available: patch.available } : {}),
    ...(patch.options ? { options: { ...(current.options ?? {}), ...patch.options } } : {}),
  });
  stateCache = map;
  broadcast();
}

/** 兼容旧调用：清缓存并重新拉取 */
export function clearProductsCache() {
  void refreshProductState();
}

/**
 * Hook: 获取所有商品（目录 + 服务端运行时状态）
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>(() => buildProducts());
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    subscribers.add(setProducts);
    let cancelled = false;

    fetchState()
      .then(() => {
        if (!cancelled) {
          setProducts(buildProducts());
          setError(null);
        }
      })
      .catch((err) => {
        // 服务端暂时不可用时仍显示目录里的默认状态
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load product status');
      });

    return () => {
      cancelled = true;
      subscribers.delete(setProducts);
    };
  }, []);

  useEffect(() => {
    if (products.length > 0) preloadProductThumbnails(products);
  }, [products]);

  return { products, loading, error };
}

/**
 * Hook: 获取单个商品
 */
export function useProduct(id: number) {
  const { products, loading, error } = useProducts();
  const product = id && CATALOG_BY_ID[id] ? products.find((p) => p.id === id) ?? null : null;
  return { product, loading, error: product ? null : error ?? (id ? 'Product not found' : null) };
}

/** New 商品排在同类最前，其余按英文名，ID 作为稳定次序 */
export function compareProductsByNewFirst(a: Product, b: Product): number {
  const aNew = a.tags?.includes('new') ? 0 : 1;
  const bNew = b.tags?.includes('new') ? 0 : 1;
  if (aNew !== bNew) return aNew - bNew;
  const nameCompare = a.name.en.localeCompare(b.name.en);
  return nameCompare !== 0 ? nameCompare : a.id - b.id;
}

/**
 * 辅助函数：按分类筛选商品
 */
export function getProductsByCategory(products: Product[], category: string): Product[] {
  return products.filter(product => product.category === category)
    .sort(compareProductsByNewFirst);
}

/**
 * 辅助函数：按标签筛选商品
 */
export function getProductsByTag(products: Product[], tag: string): Product[] {
  return products.filter(product => product.tags.includes(tag))
    .sort(compareProductsByNewFirst);
}

/**
 * 辅助函数：获取热门/新品商品
 */
export function getFeaturedProducts(products: Product[]): Product[] {
  return products.filter(product =>
    product.tags.includes('hot') || product.tags.includes('new')
  );
}
