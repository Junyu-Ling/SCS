import * as kv from "./kv_store.tsx";

/**
 * 商品数据结构
 * 与前端 Product 接口保持一致
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
  options?: Record<string, number>;
  sizeGuide?: Record<string, { en: string; cn: string }>;
  /** 颜色变体图片：key 与 options 对应 */
  colorImages?: Record<string, string[]>;
  /** 颜色中英文展示名 */
  colorLabels?: Record<string, { en: string; cn: string }>;
}

/**
 * 商品分类定义
 * 确保类别结构清晰，便于管理
 */
export const CATEGORIES = {
  apparel: { en: 'Apparel', cn: '服饰' },
  stationery: { en: 'Stationery', cn: '文具' },
  dailyUse: { en: 'Daily Use', cn: '日用品' },
  gift: { en: 'Gift', cn: '礼品' },
  sports: { en: 'Sports', cn: '运动' },
} as const;

/**
 * 商品标签定义
 */
export const TAGS = {
  hot: { en: 'Hot', cn: '热门' },
  new: { en: 'New', cn: '新品' },
} as const;

/**
 * 初始商品数据
 * 从前端 products.ts 迁移过来的数据
 * 注意: 图片数据存储在前端，后端不存储图片
 */
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: {
      en: 'SCLS T-Shirt',
      cn: 'SCLS T恤',
    },
    description: {
      en: 'Classic SCLS campus t-shirt, comfortable cotton fabric, perfect for daily wear.',
      cn: '经典SCLS校园T恤，舒适棉质面料,适合日常穿着。',
    },
    price: 65.0,
    images: [], // 图片在前端通过 product-images.ts 提供
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
      en: 'SCLS Hooded Sweatshirt',
      cn: 'SCLS连帽卫衣',
    },
    description: {
      en: 'Warm and cozy hoodie with SCLS logo, perfect for cooler weather.',
      cn: '温暖舒适的连帽卫衣，印有SCLS标志，适合凉爽天气。',
    },
    price: 120.0,
    images: [], // 图片在前端
    category: 'apparel',
    tags: ['apparel', 'hot'],
    options: {
      S: 0,
      M: 0,
      L: 5,
      XL: 1,
    },
    sizeGuide: {
      S: { en: 'Size S: Chest 100cm, Length 64cm', cn: 'S码：胸围100cm，衣长64cm' },
      M: { en: 'Size M: Chest 104cm, Length 66cm', cn: 'M码：胸围104cm，衣长66cm' },
      L: { en: 'Size L: Chest 108cm, Length 68cm', cn: 'L码：胸围108cm，衣长68cm' },
      XL: { en: 'Size XL: Chest 112cm, Length 70cm', cn: 'XL码：胸围112cm，衣长70cm' },
    },
  },
  {
    id: 13,
    name: {
      en: 'SCLS Crew Neck Sweatshirt',
      cn: 'SCLS圆领卫衣',
    },
    description: {
      en: 'Classic crew neck sweatshirt with SCLS logo, simple and stylish.',
      cn: '经典SCLS圆领卫衣，简约时尚。',
    },
    price: 90.0,
    images: [], // 图片在前端
    category: 'apparel',
    tags: ['apparel', 'new'],
    options: {
      S: 7,
      M: 3,
      L: 1,
      XL: 1,
    },
    sizeGuide: {
      S: { en: 'Size S: Chest 100cm, Length 64cm', cn: 'S码：胸围100cm，衣长64cm' },
      M: { en: 'Size M: Chest 104cm, Length 66cm', cn: 'M码：胸围104cm，衣长66cm' },
      L: { en: 'Size L: Chest 108cm, Length 68cm', cn: 'L码：胸围108cm，衣长68cm' },
      XL: { en: 'Size XL: Chest 112cm, Length 70cm', cn: 'XL码：胸围112cm，衣长70cm' },
    },
  },
  {
    id: 14,
    name: {
      en: 'SCLS Hooded Zip-up Sweatshirt',
      cn: 'SCLS连帽拉链卫衣',
    },
    description: {
      en: 'Convenient zip-up hoodie with SCLS logo, easy to wear.',
      cn: 'SCLS连帽拉链卫衣，穿脱方便。',
    },
    price: 130.0,
    images: [], // 图片在前端
    category: 'apparel',
    tags: ['apparel', 'new'],
    options: {
      S: 8,
      M: 4,
      L: 3,
      XL: 9,
    },
    sizeGuide: {
      S: { en: 'Size S: Chest 100cm, Length 64cm', cn: 'S码：胸围100cm，衣长64cm' },
      M: { en: 'Size M: Chest 104cm, Length 66cm', cn: 'M码：胸围104cm，衣长66cm' },
      L: { en: 'Size L: Chest 108cm, Length 68cm', cn: 'L码：胸围108cm，衣长68cm' },
      XL: { en: 'Size XL: Chest 112cm, Length 70cm', cn: 'XL码：胸围112cm，衣长70cm' },
    },
  },
  {
    id: 11,
    name: {
      en: 'SCLS Wide-leg Pants',
      cn: 'SCLS垂感长裤',
    },
    description: {
      en: 'Comfortable wide-leg pants, perfect for daily wear.',
      cn: '舒适垂感长裤，适合日常穿。',
    },
    price: 95.0,
    images: [], // 图片在前端
    category: 'apparel',
    tags: ['apparel'],
    options: {
      S: 0,
      M: 10,
      L: 6,
      XL: 13,
    },
    sizeGuide: {
      S: { en: 'Size S: Waist 66cm, Length 98cm', cn: 'S码：腰围66cm，裤长98cm' },
      M: { en: 'Size M: Waist 70cm, Length 100cm', cn: 'M码：腰围70cm，裤长100cm' },
      L: { en: 'Size L: Waist 74cm, Length 102cm', cn: 'L码：腰围74cm，裤长102cm' },
      XL: { en: 'Size XL: Waist 78cm, Length 104cm', cn: 'XL码：腰围78cm，裤长104cm' },
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
    images: [], // 图片在前端
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
      cn: '高级SCLS标志笔套装书写流畅。',
    },
    price: 15.0,
    images: [], // 图片在前端
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
    images: [], // 图片在前端
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
    images: [], // 图片在前端
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
    images: [], // 图片在前端
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
    images: [], // 图片在前端
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
    images: [], // 图片在前端
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
      cn: 'SCLS吉祥物和标志珐琅徽章套装',
    },
    price: 20.0,
    images: [], // 图片在前端
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
    images: [], // 图片在前端
    category: 'sports',
    tags: ['sports', 'new'],
  },
  {
    id: 16,
    name: {
      en: 'SCLS Cap',
      cn: 'SCLS棒球帽',
    },
    description: {
      en: 'SCLS signature baseball cap featuring the iconic SCLS logo on the front and three charming bird mascots embroidered on the back. Made from premium cotton, lightweight and breathable — perfect for outdoor activities and daily campus wear. Available in four exclusive colors.',
      cn: 'SCLS签名棒球帽，正面印有标志性SCLS Logo，后面绣有三只可爱小鸟吉祥物。优质棉质材料，轻盈透气，适合户外活动和日常校园穿着。提供四种专属配色。',
    },
    price: 30.0,
    images: [
      '/images/caps/cap-blue-front.png?v=20260903c',
      '/images/caps/cap-blue-back.png?v=20260903c',
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
        '/images/caps/cap-blue-front.png?v=20260903c',
        '/images/caps/cap-blue-back.png?v=20260903c',
      ],
      'Dark Green': [
        '/images/caps/cap-darkgreen-front.png?v=20260903c',
        '/images/caps/cap-darkgreen-back.png?v=20260903c',
      ],
      Khaki: [
        '/images/caps/cap-khaki-front.png?v=20260903c',
        '/images/caps/cap-khaki-back.png?v=20260903c',
      ],
      Teal: [
        '/images/caps/cap-teal-front.png?v=20260903c',
        '/images/caps/cap-teal-back.png?v=20260903c',
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

/**
 * 已初始化站点上仍需补齐的新种子商品 ID（仅当 product:{id} 不存在时写入，不覆盖管理员已有数据）
 */
export const ENSURE_IF_MISSING_PRODUCT_IDS: number[] = [16];

/**
 * 补齐缺失的新种子商品（可被启动初始化或管理员接口调用）
 */
export async function ensureMissingSeedProducts(): Promise<{ ensured: number; ids: number[] }> {
  const allIds = (await kv.get('product:_all_ids')) as number[] | null;
  const idSet = new Set<number>(Array.isArray(allIds) ? allIds : []);
  const ensuredIds: number[] = [];

  for (const ensureId of ENSURE_IF_MISSING_PRODUCT_IDS) {
    const seed = INITIAL_PRODUCTS.find((p) => p.id === ensureId);
    if (!seed) continue;
    const existing = await kv.get(`product:${ensureId}`);
    if (existing) continue;
    await kv.set(`product:${ensureId}`, seed);
    idSet.add(ensureId);
    ensuredIds.push(ensureId);
    console.log(`[INIT_PRODUCTS] ✅ Ensured missing seed product: ${seed.name.en} (ID: ${ensureId})`);
  }

  if (ensuredIds.length > 0) {
    await kv.set('product:_all_ids', [...idSet].sort((a, b) => a - b));
  }

  return { ensured: ensuredIds.length, ids: ensuredIds };
}

/** 服务端启动补丁等场景：读取种子商品快照（尺码、尺码说明） */
export function getSeedProductById(id: number): Product | undefined {
  return INITIAL_PRODUCTS.find((p) => p.id === id);
}

/**
 * 初始化商品数据到 KV Store
 * 只在数据不存在时初始化，避免重复
 * 优化：不再启动时全量查询，改为按需检查
 */
export async function initializeProducts() {
  try {
    console.log('[INIT_PRODUCTS] Starting products initialization...');
    
    // ✅ 只在完全没有初始化过时才写入初始商品
    // 一旦初始化完成，绝不再自动添加/覆盖任何商品，尊重管理员的所有操作（包括删除）
    const allIds = await kv.get('product:_all_ids');
    
    if (!allIds) {
        // 从未初始化过（product:_all_ids 不存在）
        console.log(`[INIT_PRODUCTS] First-time initialization, adding all products...`);
        let addedCount = 0;
        for (const product of INITIAL_PRODUCTS) {
            const key = `product:${product.id}`;
            await kv.set(key, product);
            addedCount++;
            console.log(`[INIT_PRODUCTS] ✅ Added product: ${product.name.en} (ID: ${product.id})`);
        }
        const allProductIds = INITIAL_PRODUCTS.map(p => p.id);
        await kv.set('product:_all_ids', allProductIds);
        console.log(`[INIT_PRODUCTS] ✅ First-time init complete: ${addedCount} products`);
    } else {
        // 已初始化过：ID 列表去重 + 仅补齐「明确列出的新种子」（不覆盖、不恢复管理员已删除的旧商品）
        let idSet = new Set<number>(Array.isArray(allIds) ? allIds : []);
        if (Array.isArray(allIds) && idSet.size !== allIds.length) {
            console.log(`[INIT_PRODUCTS] ⚠️ Deduplicating ID list: ${allIds.length} -> ${idSet.size}`);
            await kv.set('product:_all_ids', [...idSet]);
        }

        const { ensured } = await ensureMissingSeedProducts();
        const refreshedIds = (await kv.get('product:_all_ids')) as number[] | null;
        const finalCount = Array.isArray(refreshedIds) ? refreshedIds.length : idSet.size;
        console.log(`[INIT_PRODUCTS] ✅ Products already initialized (${finalCount} products)${ensured ? `, ensured ${ensured} new` : ''}.`);
    }

    // ✅ 分类完整性检查已移除：管理员现在通过下拉选择器编辑分类，
    // 不再需要自动覆盖。之前的逻辑会在每次服务器启动时把管理员修改的分类还原回初始值，
    // 导致分类修改"不生效"的严重 bug。
  } catch (error) {
    console.error('[INIT_PRODUCTS] Error initializing products:', error);
    console.error('[INIT_PRODUCTS] Server will continue despite initialization error');
  }
}