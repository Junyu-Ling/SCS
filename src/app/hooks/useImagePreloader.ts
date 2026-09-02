import { useEffect, useRef } from 'react';
import { productImages } from '../data/product-images';
import { categoryImageList } from '../data/category-images';

// Track globally which images have been preloaded to avoid duplicate work across re-renders
const preloadedUrls = new Set<string>();

/**
 * Preload a single image URL via browser Image object.
 * Returns a promise that resolves when loaded (or rejects on error).
 */
function preloadImage(url: string): Promise<void> {
  if (!url || preloadedUrls.has(url)) return Promise.resolve();
  preloadedUrls.add(url);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * Preload images from a list of product objects returned by the API.
 * Only preloads the first image of each product (the thumbnail shown in the list).
 */
export function preloadProductThumbnails(products: { images?: string[] }[]) {
  if (!products || products.length === 0) return;

  const urls = products
    .map(p => p.images?.[0])
    .filter((url): url is string => !!url && !preloadedUrls.has(url));

  if (urls.length === 0) return;

  // Preload in batches of 4, no idle-callback delay — use a short setTimeout
  // so as not to block the first paint but still start quickly
  let i = 0;
  const BATCH_SIZE = 4;

  function loadBatch() {
    const batch = urls.slice(i, i + BATCH_SIZE);
    if (batch.length === 0) return;
    Promise.all(batch.map(preloadImage)).then(() => {
      i += BATCH_SIZE;
      if (i < urls.length) {
        setTimeout(loadBatch, 16);
      }
    });
  }

  loadBatch();
}

/**
 * Hook: preloads category images (TagsPage) and all local product thumbnails
 * as soon as the component mounts. Runs only once.
 */
export function useImagePreloader() {
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    // 1. Immediately preload category images
    categoryImageList.forEach(url => preloadImage(url));

    // 2. Preload all local product first-images immediately in batches
    const allFirstImages: string[] = [];
    for (const [, images] of Object.entries(productImages)) {
      if (images[0]) {
        allFirstImages.push(images[0]);
      }
    }

    let idx = 0;
    const BATCH = 4;

    function loadNext() {
      const batch = allFirstImages.slice(idx, idx + BATCH);
      if (batch.length === 0) return;
      Promise.all(batch.map(preloadImage)).then(() => {
        idx += BATCH;
        if (idx < allFirstImages.length) {
          setTimeout(loadNext, 16);
        }
      });
    }

    loadNext();
  }, []);
}
