/**
 * 商品目录（价格 / 名称 / 分类的唯一数据源）
 *
 * - 这里不 import 任何图片资源，所以前端（src/app/data/products.ts）和
 *   Vercel 函数（api/orders.ts 等，服务端按这张表重新计算订单价格）都可以直接引用。
 * - 价格只能在这里改：后端不再保存也不再覆盖价格，管理员界面也不能改价。
 * - 库存 / 是否售罄是"运行时状态"，存在 Redis（api/products.ts），这里只放初始默认值。
 *
 * 标价依据：店主提供的价格表（标价列）。
 */

export interface CatalogEntry {
  id: number;
  name: { en: string; cn: string };
  description: { en: string; cn: string };
  /** 单价（人民币，元）。唯一数据源 */
  price: number;
  category: 'apparel' | 'stationery' | 'dailyUse' | 'gift' | 'sports';
  tags: string[];
  /** 初始是否可售；false = 显示 SOLD OUT。管理员可在后台覆盖（存 Redis） */
  available: boolean;
  /** 选项（尺码 / 颜色）及初始库存。没有选项的商品不写 */
  options?: Record<string, number>;
}

export const CATALOG: CatalogEntry[] = [
  // ---------- Apparel ----------
  {
    id: 16,
    name: { en: 'SCLS Cap', cn: 'SCLS棒球帽' },
    description: {
      en: 'SCLS signature baseball cap featuring the iconic SCLS logo on the front and three charming bird mascots embroidered on the back. Made from premium cotton, lightweight and breathable — perfect for outdoor activities and daily campus wear. Available in four exclusive colors.',
      cn: 'SCLS签名棒球帽，正面印有标志性SCLS Logo，后面绣有三只可爱小鸟吉祥物。优质棉质材料，轻盈透气，适合户外活动和日常校园穿着。提供四种专属配色。',
    },
    price: 30.0, // 不在价格表上，沿用原价，待店主确认
    category: 'apparel',
    tags: ['apparel', 'new'],
    available: true,
    options: { Blue: 20, 'Dark Green': 20, Khaki: 20, Teal: 20 },
  },
  {
    id: 1,
    name: { en: 'Crew Neck Sweatshirt', cn: '圆领卫衣' },
    description: {
      en: 'Classic crew neck sweatshirt, comfortable cotton fabric, perfect for daily wear.',
      cn: '经典圆领卫衣，舒适棉质面料，适合日常穿着。',
    },
    price: 140.0,
    category: 'apparel',
    tags: ['apparel', 'hot'],
    available: true,
    options: { S: 20, M: 25, L: 20, XL: 15 },
  },
  {
    id: 15,
    name: { en: 'Hooded Sweatshirt', cn: '连帽卫衣' },
    description: {
      en: 'Warm and cozy hoodie with SCLS logo, perfect for cooler weather.',
      cn: '温暖舒适的连帽卫衣，印有SCLS标志，适合凉爽天气。',
    },
    price: 140.0,
    category: 'apparel',
    tags: ['apparel', 'hot'],
    available: true,
    options: { S: 0, M: 0, L: 0, XL: 0 },
  },
  {
    id: 2,
    name: { en: 'Hooded Zip-up Sweatshirt', cn: '连帽拉链卫衣' },
    description: {
      en: 'Warm and cozy zip-up hoodie with SCLS logo, perfect for cooler weather.',
      cn: '温暖舒适的连帽拉链卫衣，印有SCLS标志，穿脱方便。',
    },
    price: 160.0,
    category: 'apparel',
    tags: ['apparel'],
    available: true,
    options: { S: 0, M: 0, L: 5, XL: 1 },
  },
  {
    id: 11,
    name: { en: 'Wide-leg Pants', cn: '垂感长裤' },
    description: {
      en: 'Comfortable wide-leg pants, perfect for daily wear.',
      cn: '舒适垂感长裤，适合日常穿着。',
    },
    price: 110.0,
    category: 'apparel',
    tags: ['apparel'],
    available: true,
    options: { S: 0, M: 10, L: 6, XL: 13 },
  },

  // ---------- Stationery ----------
  {
    id: 3,
    name: { en: 'A4 Lined Dark Green Notebook', cn: 'A4线装墨绿笔记本' },
    description: {
      en: 'Notebook with SCLS landmark, perfect for note-taking.',
      cn: '印有SCLS地标图案的笔记本，适合记笔记。',
    },
    price: 30.0,
    category: 'stationery',
    tags: ['stationery'],
    available: true,
  },
  {
    id: 4,
    name: { en: 'B5 Lined Notebook', cn: 'B5横线笔记本' },
    description: {
      en: 'Set of premium pens with SCLS logo, smooth writing experience.',
      cn: '高级SCLS标志笔套装，书写流畅。',
    },
    price: 30.0, // 不在价格表上，沿用原价，待店主确认
    category: 'stationery',
    tags: ['stationery'],
    available: true,
  },
  {
    id: 5,
    name: { en: 'B5 Morandi Green Loose-leaf Notebook', cn: 'B5线装墨绿笔记本' },
    description: {
      en: 'Loose leaf notebook with SCLS school landmark design.',
      cn: '印有SCLS学校地标设计的活页笔记本。',
    },
    price: 35.0,
    category: 'stationery',
    tags: ['stationery'],
    available: true,
  },
  {
    id: 10,
    name: { en: 'Loose-leaf Notebook Refill', cn: '活页本替芯' },
    description: {
      en: 'Loose leaf paper refill, compatible with B5 binders.',
      cn: '活页纸替芯，适配B5活页本。',
    },
    price: 1.0,
    category: 'stationery',
    tags: ['stationery'],
    available: true,
  },
  {
    id: 9,
    name: { en: 'School Emblem Printed Pencil', cn: 'SCLS印花铅笔' },
    description: {
      en: 'Wooden pencils with SCLS logo, perfect for writing and sketching.',
      cn: '带有SCLS标志的木质铅笔，适合书写和素描。',
    },
    price: 1.0,
    category: 'stationery',
    tags: ['stationery'],
    available: true,
  },

  // ---------- Daily Use ----------
  {
    id: 6,
    name: { en: 'Dark Green Printed White Canvas Tote Bag', cn: '墨绿印花白帆布包' },
    description: {
      en: 'Eco-friendly tote bag with SCLS design, perfect for carrying books and essentials.',
      cn: '环保SCLS设计帆布袋，适合携带书籍和必需品。',
    },
    price: 16.0,
    category: 'dailyUse',
    tags: ['dailyUse'],
    available: true,
  },
  {
    id: 7,
    name: { en: 'SCS X ArteZone Cup', cn: 'ArteZone小雅联名水杯' },
    description: {
      en: 'The straw cup with Club Artezone logo, simply designed, convenient to use.',
      cn: '印有ArteZone社团标志的吸管杯，设计简约，使用方便。',
    },
    price: 4.5,
    category: 'dailyUse',
    tags: ['dailyUse'],
    available: true,
  },

  // ---------- Sports ----------
  {
    id: 12,
    name: { en: 'New Year Lion Dance Frisbee', cn: '新年舞狮飞盘' },
    description: {
      en: 'High-quality frisbee with SCLS mascot design, perfect for outdoor activities and campus fun.',
      cn: '带有SCLS吉祥物图案的高品质飞盘，适合户外活动和校园娱乐。',
    },
    price: 90.0,
    category: 'sports',
    tags: ['sports'],
    available: false, // 目前售罄
  },

  // ---------- Gift ----------
  {
    id: 8,
    name: { en: 'Triangle Fridge Magnet', cn: '三角冰箱贴' },
    description: {
      en: 'Fridge magnets featuring SCLS symbols.',
      cn: '印有SCLS标志的冰箱贴。',
    },
    price: 4.8,
    category: 'gift',
    tags: ['gift'],
    available: true,
  },
];

export const CATALOG_BY_ID: Record<number, CatalogEntry> = Object.fromEntries(
  CATALOG.map((entry) => [entry.id, entry]),
);

/** 按商品 ID 取价格；不在目录里返回 undefined */
export function getCatalogPrice(id: number): number | undefined {
  return CATALOG_BY_ID[id]?.price;
}
