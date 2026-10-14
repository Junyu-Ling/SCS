// Product data for SCLS Campus Shop
// Images are now served from /public/images/ directory for faster loading
// To use: Copy all images from GitHub (https://github.com/Miyeon-0131/SCS) to /public/images/

// Import product images
import tshirtImg1 from 'figma:asset/dd46c3d3f595f43d63775735882bbed305873c23.webp';
import tshirtImg2 from 'figma:asset/428da5a97c5e98c146b65fa191b129fb49ded0bd.webp';
import tshirtImg3 from 'figma:asset/23501a92f35c2415411b12df200c48f716cf3286.webp';
import hoodieImg1 from 'figma:asset/d42fdc6bcb5a6e9d0a49823104a2d6f3b5225722.webp';
import hoodieImg2 from 'figma:asset/d74de6d290d5aa5ec889f2eac2b2cf68d1dc5358.webp';
import hoodieImg3 from 'figma:asset/be21fed9c6ebc5cf80a9d74d9bf9ad07e2ef90b8.webp';
import sweatpantsImg1 from 'figma:asset/564b88ed4ed1f4dedf30b851972d030685c053e4.png';
import sweatpantsImg2 from 'figma:asset/fb4a0fdf748137ea7e7f01589cac1b7a38a7e5ed.png';
import sweatpantsImg3 from 'figma:asset/4353c402ccd208c18d2d10411f0f7e38249a2c03.png';
import giftImg1 from 'figma:asset/d38bc22a74fde3d9a82439bd3d7aeda270de798c.webp';
import giftImg2 from 'figma:asset/c1135af98ba4e3cb0996a86c5df919292603c01d.webp';
import giftImg3 from 'figma:asset/649596a8ef5bc1b413c8fba82d7412f69299388a.webp';
import toteBagImg1 from 'figma:asset/737da13b16947dd686e7e6fda1be7cd3dd17ae96.webp';
import toteBagImg2 from 'figma:asset/53e36bcd4c5cbb8394593f628495c1fa9943d32d.webp';
import toteBagImg3 from 'figma:asset/aab0d9cbe45ab7bfcd5a18c814d42a6664935f19.webp';
import waterBottleImg1 from 'figma:asset/9a152af0759793263b1f851da6bee0eedf95be9d.webp';
import waterBottleImg2 from 'figma:asset/4e7c7288924dd6cfbe06533d973354b4e9653bb7.webp';
import waterBottleImg3 from 'figma:asset/bb385fea240b1b4cb0f59aae00308a89dc3ea5d9.webp';
import frisbeeImg from 'figma:asset/7de16ac9b3eb56f7577a37846f121b0b78bf10fd.png';

// Stationery images
import notebookImg1 from 'figma:asset/dc8073f8d24e7b789aeb66caf11741cc73b2d616.webp';
import notebookImg2 from 'figma:asset/d6822a54b5fc3ee28ab986ec47aff2ad72e4ec17.webp';
import notebookImg3 from 'figma:asset/37fdde20170ec6e029986b39ccc50531120b2758.webp';
import notebook2Img1 from 'figma:asset/fb9fdb3d4fd0581431afe7fc6766553e2c7aa435.webp';
import notebook2Img2 from 'figma:asset/b9b453443dbf39d062fcdd36e3770eb8fec1a045.png';
import notebook2Img3 from 'figma:asset/a3c1b13c326b4281da9c465dd15619ed1f309980.webp';
import notebook3Img1 from 'figma:asset/eb492350dd19e2d25489793ed87a662b0c1e28fb.webp';
import notebook3Img2 from 'figma:asset/3419fa39eb2841e93c7d08dcc77c6a45b1772abb.webp';
import notebook3Img3 from 'figma:asset/1273b0472a7e88bd20398a0aba1cd447ef44369e.webp';
import pencilImg1 from 'figma:asset/055c9a771c83675fbeb5969825e1f413647fecc6.webp';
import pencilImg2 from 'figma:asset/1d2787111099f975bf65336c833b7f2ee9b47147.webp';
import pencilImg3 from 'figma:asset/4e95071896d9d65b5f64c7377136ddb2f825404e.webp';
import looseLeafImg1 from 'figma:asset/7b835e1f0149c598c5e5ba2a424ccb02070633e2.webp';
import looseLeafImg2 from 'figma:asset/fb286fefa9238350a7ffcbeae8d165c1f8e87fc9.webp';
import looseLeafImg3 from 'figma:asset/d343d9da90100a6b5cc97428e040b9643c7ce221.webp';

import { CATALOG_BY_ID } from './catalog';

// Helper function to get local image URL from public folder
export const getLocalImageUrl = (path: string) => `/images/${path}?v=20260903lg`;

// Keep GitHub URL as fallback
const GITHUB_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/Miyeon-0131/SCS/main';
export const getGitHubImageUrl = (path: string) => `${GITHUB_IMAGE_BASE_URL}/${path}`;

// Product interface
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

/** 名称 / 描述 / 价格 / 分类 / 标签 / 初始库存都来自 catalog.ts（唯一数据源），这里只补图片、尺码表和颜色变体 */
type ProductExtras = Pick<Product, 'images' | 'sizeGuide' | 'colorImages' | 'colorLabels'>;

function fromCatalog(id: number, extras: ProductExtras): Product {
  const entry = CATALOG_BY_ID[id];
  return {
    id: entry.id,
    name: { ...entry.name },
    description: { ...entry.description },
    price: entry.price,
    category: entry.category,
    tags: [...entry.tags],
    available: entry.available,
    ...(entry.options ? { options: { ...entry.options } } : {}),
    ...extras,
  };
}

const APPAREL_TOP_SIZE_GUIDE = {
  S: { en: 'Size S: Chest 100cm, Length 64cm', cn: 'S码：胸围100cm，衣长64cm' },
  M: { en: 'Size M: Chest 104cm, Length 66cm', cn: 'M码：胸围104cm，衣长66cm' },
  L: { en: 'Size L: Chest 108cm, Length 68cm', cn: 'L码：胸围108cm，衣长68cm' },
  XL: { en: 'Size XL: Chest 112cm, Length 70cm', cn: 'XL码：胸围112cm，衣长70cm' },
};

// All products data（顺序 = 前台默认顺序）
export const products: Product[] = [
  fromCatalog(16, {
    images: [
      getLocalImageUrl('caps/cap-blue-front.webp'),
      getLocalImageUrl('caps/cap-blue-back.webp'),
    ],
    colorImages: {
      Blue: [
        getLocalImageUrl('caps/cap-blue-front.webp'),
        getLocalImageUrl('caps/cap-blue-back.webp'),
      ],
      'Dark Green': [
        getLocalImageUrl('caps/cap-darkgreen-front.webp'),
        getLocalImageUrl('caps/cap-darkgreen-back.webp'),
      ],
      Khaki: [
        getLocalImageUrl('caps/cap-khaki-front.webp'),
        getLocalImageUrl('caps/cap-khaki-back.webp'),
      ],
      Teal: [
        getLocalImageUrl('caps/cap-teal-front.webp'),
        getLocalImageUrl('caps/cap-teal-back.webp'),
      ],
    },
    colorLabels: {
      Blue: { en: 'Blue', cn: '蓝色' },
      'Dark Green': { en: 'Dark Green', cn: '墨绿' },
      Khaki: { en: 'Khaki', cn: '卡其' },
      Teal: { en: 'Teal', cn: '天蓝' },
    },
    sizeGuide: {
      'One Size': {
        en: 'One size · adjustable strap, fits most adults',
        cn: '均码 · 可调节帽围，适合大多数成人',
      },
    },
  }),
  // 线上真实 ID：1 圆领卫衣、2 连帽拉链卫衣、15 连帽卫衣（照片原先存在 Supabase Storage，已搬到 public/images/apparel/）
  fromCatalog(1, { images: [tshirtImg1, tshirtImg2, tshirtImg3], sizeGuide: APPAREL_TOP_SIZE_GUIDE }),
  fromCatalog(15, {
    images: [
      getLocalImageUrl('apparel/hooded-sweatshirt-1.jpg'),
      getLocalImageUrl('apparel/hooded-sweatshirt-2.jpg'),
    ],
    sizeGuide: APPAREL_TOP_SIZE_GUIDE,
  }),
  fromCatalog(2, { images: [hoodieImg1, hoodieImg2, hoodieImg3], sizeGuide: APPAREL_TOP_SIZE_GUIDE }),
  fromCatalog(11, {
    images: [sweatpantsImg1, sweatpantsImg2, sweatpantsImg3],
    sizeGuide: {
      S: { en: 'Size S: Waist 66cm, Length 98cm', cn: 'S码：腰围66cm，裤长98cm' },
      M: { en: 'Size M: Waist 70cm, Length 100cm', cn: 'M码：腰围70cm，裤长100cm' },
      L: { en: 'Size L: Waist 74cm, Length 102cm', cn: 'L码：腰围74cm，裤长102cm' },
      XL: { en: 'Size XL: Waist 78cm, Length 104cm', cn: 'XL码：腰围78cm，裤长104cm' },
    },
  }),
  fromCatalog(3, { images: [notebookImg1, notebookImg2, notebookImg3] }),
  fromCatalog(4, { images: [notebook2Img1, notebook2Img2, notebook2Img3] }),
  fromCatalog(5, { images: [notebook3Img1, notebook3Img2, notebook3Img3] }),
  fromCatalog(10, { images: [looseLeafImg1, looseLeafImg2, looseLeafImg3] }),
  fromCatalog(9, { images: [pencilImg1, pencilImg2, pencilImg3] }),
  fromCatalog(6, { images: [toteBagImg1, toteBagImg2, toteBagImg3] }),
  fromCatalog(7, { images: [waterBottleImg1, waterBottleImg2, waterBottleImg3] }),
  fromCatalog(12, { images: [frisbeeImg] }),
  fromCatalog(8, { images: [giftImg1, giftImg2, giftImg3] }),
];

// Get product by ID
export const getProductById = (id: number): Product | undefined => {
  return products.find(product => product.id === id);
};

// Get products by category
export const getProductsByCategory = (category: string): Product[] => {
  return products.filter(product => product.category === category);
};

// Get products by tag
export const getProductsByTag = (tag: string): Product[] => {
  return products.filter(product => product.tags.includes(tag));
};

// Get featured products (products with 'hot' or 'new' tags)
export const getFeaturedProducts = (): Product[] => {
  return products.filter(product =>
    product.tags.includes('hot') || product.tags.includes('new')
  );
};
