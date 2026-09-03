// Product image imports for SCLS Campus Shop
// This file exports the actual imported image URLs

// Import product images
import tshirtImg1 from 'figma:asset/dd46c3d3f595f43d63775735882bbed305873c23.png';
import tshirtImg2 from 'figma:asset/428da5a97c5e98c146b65fa191b129fb49ded0bd.png';
import tshirtImg3 from 'figma:asset/23501a92f35c2415411b12df200c48f716cf3286.png';
import hoodieImg1 from 'figma:asset/d42fdc6bcb5a6e9d0a49823104a2d6f3b5225722.png';
import hoodieImg2 from 'figma:asset/d74de6d290d5aa5ec889f2eac2b2cf68d1dc5358.png';
import hoodieImg3 from 'figma:asset/be21fed9c6ebc5cf80a9d74d9bf9ad07e2ef90b8.png';
import sweatpantsImg1 from 'figma:asset/564b88ed4ed1f4dedf30b851972d030685c053e4.png';
import sweatpantsImg2 from 'figma:asset/fb4a0fdf748137ea7e7f01589cac1b7a38a7e5ed.png';
import sweatpantsImg3 from 'figma:asset/4353c402ccd208c18d2d10411f0f7e38249a2c03.png';
import giftImg1 from 'figma:asset/d38bc22a74fde3d9a82439bd3d7aeda270de798c.png';
import giftImg2 from 'figma:asset/c1135af98ba4e3cb0996a86c5df919292603c01d.png';
import giftImg3 from 'figma:asset/649596a8ef5bc1b413c8fba82d7412f69299388a.png';
import toteBagImg1 from 'figma:asset/737da13b16947dd686e7e6fda1be7cd3dd17ae96.png';
import toteBagImg2 from 'figma:asset/53e36bcd4c5cbb8394593f628495c1fa9943d32d.png';
import toteBagImg3 from 'figma:asset/aab0d9cbe45ab7bfcd5a18c814d42a6664935f19.png';
import waterBottleImg1 from 'figma:asset/9a152af0759793263b1f851da6bee0eedf95be9d.png';
import waterBottleImg2 from 'figma:asset/4e7c7288924dd6cfbe06533d973354b4e9653bb7.png';
import waterBottleImg3 from 'figma:asset/bb385fea240b1b4cb0f59aae00308a89dc3ea5d9.png';
import frisbeeImg from 'figma:asset/7de16ac9b3eb56f7577a37846f121b0b78bf10fd.png';

// Stationery images
import notebookImg1 from 'figma:asset/dc8073f8d24e7b789aeb66caf11741cc73b2d616.png';
import notebookImg2 from 'figma:asset/d6822a54b5fc3ee28ab986ec47aff2ad72e4ec17.png';
import notebookImg3 from 'figma:asset/37fdde20170ec6e029986b39ccc50531120b2758.png';
import penSetImg1 from 'figma:asset/fb9fdb3d4fd0581431afe7fc6766553e2c7aa435.png';
import penSetImg2 from 'figma:asset/b9b453443dbf39d062fcdd36e3770eb8fec1a045.png';
import penSetImg3 from 'figma:asset/a3c1b13c326b4281da9c465dd15619ed1f309980.png';
import premiumNotebookImg1 from 'figma:asset/eb492350dd19e2d25489793ed87a662b0c1e28fb.png';
import premiumNotebookImg2 from 'figma:asset/3419fa39eb2841e93c7d08dcc77c6a45b1772abb.png';
import premiumNotebookImg3 from 'figma:asset/1273b0472a7e88bd20398a0aba1cd447ef44369e.png';
import pencilImg1 from 'figma:asset/055c9a771c83675fbeb5969825e1f413647fecc6.png';
import pencilImg2 from 'figma:asset/1d2787111099f975bf65336c833b7f2ee9b47147.png';
import pencilImg3 from 'figma:asset/4e95071896d9d65b5f64c7377136ddb2f825404e.png';
import looseLeafImg1 from 'figma:asset/7b835e1f0149c598c5e5ba2a424ccb02070633e2.png';
import looseLeafImg2 from 'figma:asset/fb286fefa9238350a7ffcbeae8d165c1f8e87fc9.png';
import looseLeafImg3 from 'figma:asset/d343d9da90100a6b5cc97428e040b9643c7ce221.png';

/**
 * Product images mapping by product ID
 * Maps product ID to array of image URLs
 */
export const productImages: Record<number, string[]> = {
  1: [tshirtImg1, tshirtImg2, tshirtImg3],
  2: [hoodieImg1, hoodieImg2, hoodieImg3],
  3: [notebookImg1, notebookImg2, notebookImg3],
  4: [penSetImg1, penSetImg2, penSetImg3],
  5: [premiumNotebookImg1, premiumNotebookImg2, premiumNotebookImg3],
  6: [toteBagImg1, toteBagImg2, toteBagImg3],
  7: [waterBottleImg1, waterBottleImg2, waterBottleImg3],
  8: [giftImg1, giftImg2, giftImg3],
  9: [pencilImg1, pencilImg2, pencilImg3],
  10: [looseLeafImg1, looseLeafImg2, looseLeafImg3],
  11: [sweatpantsImg1, sweatpantsImg2, sweatpantsImg3],
  12: [frisbeeImg],
  16: [
    '/images/caps/cap-blue-front.png?v=20260903w',
    '/images/caps/cap-blue-back.png?v=20260903w',
  ],
};

/**
 * 判断图片 URL 是否可在浏览器中加载
 */
export function isValidImageUrl(url: string): boolean {
  if (typeof url !== 'string' || !url.trim()) return false;
  if (url.startsWith('blob:')) return false;
  if (url.includes('/_assets/')) return false;
  // 管理员误存的开发路径，浏览器无法直接访问
  if (url.includes('/src/assets/')) return false;
  if (url.startsWith('figma:asset/')) return false;
  return (
    url.startsWith('http') ||
    url.startsWith('data:') ||
    url.startsWith('/images/') ||
    url.startsWith('/assets/')
  );
}

/**
 * Get images for a specific product ID
 */
export function getProductImages(productId: number): string[] {
  const images = productImages[productId];
  if (!images || images.length === 0) {
    // 只对已知旧商品 ID 发出警告
    if (productId <= 16) {
      console.warn(`[getProductImages] No images found for legacy product ID ${productId}`);
    }
    return [];
  }
  return images;
}