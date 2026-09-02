// Product data for SCLS Campus Shop
// Images are now served from /public/images/ directory for faster loading
// To use: Copy all images from GitHub (https://github.com/Miyeon-0131/SCS) to /public/images/

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
import notebook2Img1 from 'figma:asset/fb9fdb3d4fd0581431afe7fc6766553e2c7aa435.png';
import notebook2Img2 from 'figma:asset/b9b453443dbf39d062fcdd36e3770eb8fec1a045.png';
import notebook2Img3 from 'figma:asset/a3c1b13c326b4281da9c465dd15619ed1f309980.png';
import notebook3Img1 from 'figma:asset/eb492350dd19e2d25489793ed87a662b0c1e28fb.png';
import notebook3Img2 from 'figma:asset/3419fa39eb2841e93c7d08dcc77c6a45b1772abb.png';
import notebook3Img3 from 'figma:asset/1273b0472a7e88bd20398a0aba1cd447ef44369e.png';
import pencilImg1 from 'figma:asset/055c9a771c83675fbeb5969825e1f413647fecc6.png';
import pencilImg2 from 'figma:asset/1d2787111099f975bf65336c833b7f2ee9b47147.png';
import pencilImg3 from 'figma:asset/4e95071896d9d65b5f64c7377136ddb2f825404e.png';
import looseLeafImg1 from 'figma:asset/7b835e1f0149c598c5e5ba2a424ccb02070633e2.png';
import looseLeafImg2 from 'figma:asset/fb286fefa9238350a7ffcbeae8d165c1f8e87fc9.png';
import looseLeafImg3 from 'figma:asset/d343d9da90100a6b5cc97428e040b9643c7ce221.png';

// Helper function to get local image URL from public folder
export const getLocalImageUrl = (path: string) => `/images/${path}`;

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

// All products data
export const products: Product[] = [
  {
    id: 1,
    name: {
      en: 'SCLS T-Shirt',
      cn: 'SCLS T恤',
    },
    description: {
      en: 'Classic SCLS campus t-shirt, comfortable cotton fabric, perfect for daily wear.',
      cn: '经典SCLS校园T恤，舒适棉质面料，适合日常穿着。',
    },
    price: 65.0,
    images: [
      tshirtImg1,
      tshirtImg2,
      tshirtImg3,
    ],
    category: 'apparel',
    tags: ['apparel', 'new'],
    options: {
      S: 20,
      M: 25,
      L: 20,
      XL: 15,
    },
    sizeGuide: {
      S: { en: 'Size S: Chest 94cm, Length 66cm', cn: 'S码：胸围94cm，衣长66cm' },
      M: { en: 'Size M: Chest 98cm, Length 68cm', cn: 'M码：胸围98cm，衣长68cm' },
      L: { en: 'Size L: Chest 102cm, Length 70cm', cn: 'L码：胸围102cm，衣长70cm' },
      XL: { en: 'Size XL: Chest 106cm, Length 72cm', cn: 'XL码：胸围106cm，衣长72cm' },
    },
  },
  {
    id: 2,
    name: {
      en: 'SCLS Hoodie',
      cn: 'SCLS卫衣',
    },
    description: {
      en: 'Warm and cozy hoodie with SCLS logo, perfect for cooler weather.',
      cn: '温暖舒适的连帽卫衣，印有SCLS标志，适合凉爽天气。',
    },
    price: 120.0,
    images: [
      hoodieImg1,
      hoodieImg2,
      hoodieImg3,
    ],
    category: 'apparel',
    tags: ['apparel', 'hot'],
    options: {
      S: 15,
      M: 20,
      L: 18,
      XL: 12,
    },
    sizeGuide: {
      S: { en: 'Size S: Chest 100cm, Length 64cm', cn: 'S码：胸围100cm，衣长64cm' },
      M: { en: 'Size M: Chest 104cm, Length 66cm', cn: 'M码：胸围104cm，衣长66cm' },
      L: { en: 'Size L: Chest 108cm, Length 68cm', cn: 'L码：胸围108cm，衣长68cm' },
      XL: { en: 'Size XL: Chest 112cm, Length 70cm', cn: 'XL码：胸围112cm，衣长70cm' },
    },
  },
  {
    id: 3,
    name: {
      en: 'SCLS Notebook',
      cn: 'SCLS笔记本',
    },
    description: {
      en: 'High-quality notebook with SCLS branding, perfect for taking notes in class.',
      cn: '高品质SCLS品牌笔记本，适合课堂记笔记。',
    },
    price: 25.0,
    images: [
      notebookImg1,
      notebookImg2,
      notebookImg3,
    ],
    category: 'stationery',
    tags: ['stationery', 'new'],
  },
  {
    id: 4,
    name: {
      en: 'SCLS Pen Set',
      cn: 'SCLS笔套装',
    },
    description: {
      en: 'Set of premium pens with SCLS logo, smooth writing experience.',
      cn: '高级SCLS标志笔套装，书写流畅。',
    },
    price: 15.0,
    images: [
      notebook2Img1,
      notebook2Img2,
      notebook2Img3,
    ],
    category: 'stationery',
    tags: ['stationery'],
  },
  {
    id: 5,
    name: {
      en: 'SCLS Premium Notebook',
      cn: 'SCLS高级笔记本',
    },
    description: {
      en: 'Premium quality notebook with SCLS school landmark design, available in multiple colors.',
      cn: '高级品质笔记本，带有SCLS学校地标设计，多种颜色可选。',
    },
    price: 30.0,
    images: [
      notebook3Img1,
      notebook3Img2,
      notebook3Img3,
    ],
    category: 'stationery',
    tags: ['stationery', 'new'],
  },
  {
    id: 9,
    name: {
      en: 'SCLS Pencils',
      cn: 'SCLS铅笔',
    },
    description: {
      en: 'Premium wooden pencils with SCLS logo, perfect for writing and sketching.',
      cn: '带有SCLS标志的高级木质铅笔，适合书写和素描。',
    },
    price: 10.0,
    images: [
      pencilImg1,
      pencilImg2,
      pencilImg3,
    ],
    category: 'stationery',
    tags: ['stationery'],
  },
  {
    id: 10,
    name: {
      en: 'SCLS Loose Leaf Paper',
      cn: 'SCLS活页纸',
    },
    description: {
      en: 'High-quality loose leaf paper refill, compatible with standard binders.',
      cn: '高品质活页纸替芯，适配标准活页本。',
    },
    price: 8.0,
    images: [
      looseLeafImg1,
      looseLeafImg2,
      looseLeafImg3,
    ],
    category: 'stationery',
    tags: ['stationery'],
  },
  {
    id: 6,
    name: {
      en: 'SCLS Tote Bag',
      cn: 'SCLS帆布袋',
    },
    description: {
      en: 'Eco-friendly tote bag with SCLS design, perfect for carrying books and essentials.',
      cn: '环保SCLS设计帆布袋，适合携带书籍和必需品。',
    },
    price: 35.0,
    images: [
      toteBagImg1,
      toteBagImg2,
      toteBagImg3,
    ],
    category: 'dailyUse',
    tags: ['dailyUse', 'new'],
  },
  {
    id: 7,
    name: {
      en: 'SCLS Water Bottle',
      cn: 'SCLS水瓶',
    },
    description: {
      en: 'Insulated water bottle with SCLS branding, keeps drinks cold or hot for hours.',
      cn: '带SCLS标志的保温水瓶，可保持饮料冷热数小时。',
    },
    price: 45.0,
    images: [
      waterBottleImg1,
      waterBottleImg2,
      waterBottleImg3,
    ],
    category: 'dailyUse',
    tags: ['dailyUse', 'hot'],
  },
  {
    id: 8,
    name: {
      en: 'SCLS Badge Set',
      cn: 'SCLS徽章套装',
    },
    description: {
      en: 'Collection of enamel badges featuring SCLS mascots and symbols.',
      cn: 'SCLS吉祥物和标志珐琅徽章套装。',
    },
    price: 20.0,
    images: [
      giftImg1,
      giftImg2,
      giftImg3,
    ],
    category: 'gift',
    tags: ['gift', 'new'],
  },
  {
    id: 12,
    name: {
      en: 'SCLS Frisbee',
      cn: 'SCLS飞盘',
    },
    description: {
      en: 'High-quality frisbee with SCLS mascot design, perfect for outdoor activities and campus fun.',
      cn: '带有SCLS吉祥物图案的高品质飞盘，适合户外活动和校园娱乐。',
    },
    price: 35.0,
    images: [
      frisbeeImg,
    ],
    category: 'sports',
    tags: ['sports', 'new'],
  },
  {
    id: 11,
    name: {
      en: 'SCLS Sweatpants',
      cn: 'SCLS运动裤',
    },
    description: {
      en: 'Comfortable sweatpants with SCLS logo, perfect for sports and casual wear.',
      cn: '舒适的SCLS标志运动裤，适合运动和休闲穿着。',
    },
    price: 95.0,
    images: [
      sweatpantsImg1,
      sweatpantsImg2,
      sweatpantsImg3,
    ],
    category: 'apparel',
    tags: ['apparel'],
    options: {
      S: 18,
      M: 22,
      L: 20,
      XL: 16,
    },
    sizeGuide: {
      S: { en: 'Size S: Waist 66cm, Length 98cm', cn: 'S码：腰围66cm，裤长98cm' },
      M: { en: 'Size M: Waist 70cm, Length 100cm', cn: 'M码：腰围70cm，裤长100cm' },
      L: { en: 'Size L: Waist 74cm, Length 102cm', cn: 'L码：腰围74cm，裤长102cm' },
      XL: { en: 'Size XL: Waist 78cm, Length 104cm', cn: 'XL码：腰围78cm，裤长104cm' },
    },
  },
  {
    // id 16：避开线上已有商品（15 为 Hooded Sweatshirt）及种子 13/14
    id: 16,
    name: {
      en: 'SCLS Cap',
      cn: 'SCLS棒球帽',
    },
    description: {
      en: 'SCLS signature baseball cap featuring the iconic SCLS logo on the front and three charming bird mascots embroidered on the back. Made from premium cotton, lightweight and breathable — perfect for outdoor activities and daily campus wear. Available in four exclusive colors.',
      cn: 'SCLS签名棒球帽，正面印有标志性SCLS Logo，后面绣有三只可爱小鸟吉祥物。优质棉质材料，轻盈透气，适合户外活动和日常校园穿着。提供四种专属配色。',
    },
    price: 80.0,
    images: [
      getLocalImageUrl('caps/cap-blue-front.png'),
      getLocalImageUrl('caps/cap-blue-back.png'),
    ],
    category: 'apparel',
    tags: ['apparel', 'new'],
    options: {
      Blue: 20,
      'Dark Green': 20,
      Khaki: 20,
      Teal: 20,
    },
    colorImages: {
      Blue: [
        getLocalImageUrl('caps/cap-blue-front.png'),
        getLocalImageUrl('caps/cap-blue-back.png'),
      ],
      'Dark Green': [
        getLocalImageUrl('caps/cap-darkgreen-front.png'),
        getLocalImageUrl('caps/cap-darkgreen-back.png'),
      ],
      Khaki: [
        getLocalImageUrl('caps/cap-khaki-front.png'),
        getLocalImageUrl('caps/cap-khaki-back.png'),
      ],
      Teal: [
        getLocalImageUrl('caps/cap-teal-front.png'),
        getLocalImageUrl('caps/cap-teal-back.png'),
      ],
    },
    colorLabels: {
      Blue: { en: 'Blue', cn: '蓝色' },
      'Dark Green': { en: 'Dark Green', cn: '墨绿' },
      Khaki: { en: 'Khaki', cn: '卡其' },
      Teal: { en: 'Teal', cn: '天蓝' },
    },
  },
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