import { command } from './redis.js';
import { CATALOG_BY_ID, type CatalogEntry } from '../../src/app/data/catalog.js';

/*
 * ============================================================================
 *  数据模型（Upstash Redis；本地开发没配 Redis 时使用内存兜底）
 * ============================================================================
 *  价格 / 名称 / 分类：只在代码里（src/app/data/catalog.ts），Redis 不存也不覆盖。
 *
 *  shop:orders                 HASH   field = 订单 id，value = 订单 JSON
 *                                     { id, orderNumber, userEmail, items[], total, status,
 *                                       completed, createdAt, updatedAt?, contactInfo{...},
 *                                       isOffline?, createdBy? }
 *                                     status: pending | completed | cancelled
 *  shop:orders:email:<email>   SET    该邮箱的订单 id（"我的订单"用）
 *  shop:orderseq:<YYYYMMDD>    STRING 当天预定号序号（INCR 原子递增，2 天后过期；日期按北京时间）
 *  shop:product-state          HASH   field = 商品 id，value = JSON { available?: boolean, options?: {选项: 库存} }
 *                                     只保存管理员改过的运行时状态（售罄开关 / 库存）
 *  shop:aboutus                STRING About Us 页面内容 JSON
 *  shop:admins                 SET    后加的管理员邮箱（初始管理员写在 api/_lib/auth.ts，不可撤销）
 *  code:<email>                STRING 邮箱验证码 { code, attempts }，10 分钟过期（api/send-code.ts）
 *  code:cooldown:<email>       STRING 发码冷却（60 秒）
 *  rl:<bucket>:<ip>            STRING IP 限流计数
 *  stats:*                     访问 / 在线统计（api/stats.ts）
 * ============================================================================
 */

export const K_ORDERS = 'shop:orders';
export const K_PRODUCT_STATE = 'shop:product-state';
export const K_ABOUT = 'shop:aboutus';
export const kOrdersByEmail = (email: string) => `shop:orders:email:${email}`;

export type OrderItem = {
  id: number; // 商品 id
  commodityId: number;
  name: string; // 英文名（下单时的快照）
  nameCn: string;
  category: string;
  option: string; // 尺码 / 颜色；没有选项的商品为空串
  quantity: number;
  price: number; // 单价（来自 catalog.ts）
};

export type Order = {
  id: string;
  orderNumber: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  createdBy?: string;
  isOffline?: boolean;
  contactInfo: { real_name: string; class_name: string; note?: string; email?: string; role?: string };
};

export type ProductState = { available?: boolean; options?: Record<string, number> };

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function parseJson<T>(raw: unknown): T | null {
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** HGETALL（Upstash 返回 [field, value, ...] 扁平数组）→ 对象 */
export async function hgetall(key: string): Promise<Record<string, string>> {
  const flat = (await command('HGETALL', key)) as unknown;
  const out: Record<string, string> = {};
  if (Array.isArray(flat)) {
    for (let i = 0; i + 1 < flat.length; i += 2) out[String(flat[i])] = String(flat[i + 1]);
  } else if (flat && typeof flat === 'object') {
    for (const [k, v] of Object.entries(flat as Record<string, unknown>)) out[k] = String(v);
  }
  return out;
}

// ---------------------------------------------------------------- 商品运行时状态

export async function getProductStates(): Promise<Record<number, ProductState>> {
  const all = await hgetall(K_PRODUCT_STATE);
  const out: Record<number, ProductState> = {};
  for (const [id, raw] of Object.entries(all)) {
    const entry = CATALOG_BY_ID[Number(id)];
    if (!entry) continue; // 目录里没有的商品 id 一律忽略（防止旧数据"复活"幽灵商品）
    const state = parseJson<ProductState>(raw);
    if (state) out[entry.id] = state;
  }
  return out;
}

export function mergeState(entry: CatalogEntry, state?: ProductState) {
  const options = entry.options ? { ...entry.options, ...(state?.options ?? {}) } : undefined;
  // 只保留目录里存在的选项键
  if (options && entry.options) {
    for (const key of Object.keys(options)) if (!(key in entry.options)) delete options[key];
  }
  return {
    id: entry.id,
    available: typeof state?.available === 'boolean' ? state.available : entry.available,
    ...(options ? { options } : {}),
  };
}

export async function getMergedProducts() {
  const states = await getProductStates();
  return Object.values(CATALOG_BY_ID).map((entry) => mergeState(entry, states[entry.id]));
}

// ---------------------------------------------------------------- 订单

/** 北京时间 YYYYMMDD */
export function shanghaiDatePrefix(date = new Date()): string {
  const shifted = new Date(date.getTime() + 8 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10).replace(/-/g, '');
}

export async function nextOrderNumber(): Promise<string> {
  const prefix = shanghaiDatePrefix();
  const key = `shop:orderseq:${prefix}`;
  const seq = Number(await command('INCR', key));
  if (seq === 1) await command('EXPIRE', key, 172800);
  return `${prefix}${String(seq).padStart(3, '0')}`;
}

export async function saveOrder(order: Order): Promise<void> {
  await command('HSET', K_ORDERS, order.id, JSON.stringify(order));
  if (order.userEmail && !order.isOffline) await command('SADD', kOrdersByEmail(order.userEmail), order.id);
}

export async function getOrder(id: string): Promise<Order | null> {
  return parseJson<Order>(await command('HGET', K_ORDERS, id));
}

export async function deleteOrders(orders: Order[]): Promise<number> {
  let deleted = 0;
  for (const order of orders) {
    deleted += Number(await command('HDEL', K_ORDERS, order.id)) > 0 ? 1 : 0;
    if (order.userEmail) await command('SREM', kOrdersByEmail(order.userEmail), order.id);
  }
  return deleted;
}

export async function listAllOrders(): Promise<Order[]> {
  const all = await hgetall(K_ORDERS);
  return Object.values(all)
    .map((raw) => parseJson<Order>(raw))
    .filter((o): o is Order => Boolean(o && o.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listOrdersByEmail(email: string): Promise<Order[]> {
  const ids = ((await command('SMEMBERS', kOrdersByEmail(email))) as string[] | null) ?? [];
  if (ids.length === 0) return [];
  const raws = (await command('HMGET', K_ORDERS, ...ids)) as (string | null)[];
  return raws
    .map((raw) => parseJson<Order>(raw))
    .filter((o): o is Order => Boolean(o && o.id && o.userEmail === email))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const isCompleted = (o: Order) => o.status === 'completed' || o.completed === true;
