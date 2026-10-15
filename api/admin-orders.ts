import { CATALOG, CATALOG_BY_ID } from '../src/app/data/catalog.js';
import { readBody } from './_lib/http.js';
import { requireAdmin } from './_lib/auth.js';
import { fail, methodNotAllowed, rateLimitIp } from './_lib/guards.js';
import { requestLang, tr } from './_lib/lang.js';
import {
  deleteOrders,
  getOrder,
  isCompleted,
  listAllOrders,
  nextOrderNumber,
  round2,
  saveOrder,
  type Order,
} from './_lib/shop.js';

// 管理员订单接口（需要管理员 Cookie）
//   GET    /api/admin-orders                  全部订单
//   GET    /api/admin-orders?stats=7d|30d|90d 销售统计
//   PATCH  /api/admin-orders {orderId, status: 'pending'|'completed'|'cancelled'}
//   POST   /api/admin-orders {productId?, productName, option?, quantity, unitPrice?, amount} 录入线下订单
//   DELETE /api/admin-orders?scope=completed|all 清空已完成 / 全部订单

const STATUSES = ['pending', 'completed', 'cancelled'] as const;
const dayKey = (iso: string) => new Date(new Date(iso).getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);

function salesStats(orders: Order[], range: string) {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const now = Date.now();
  const start = now - days * 86400000;
  const prevStart = start - days * 86400000;
  const live = orders.filter((o) => o.status !== 'cancelled');
  const current = live.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= start && t <= now;
  });
  const previous = live.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return t >= prevStart && t < start;
  });

  const sum = (list: Order[]) => list.reduce((s, o) => s + (o.total || 0), 0);
  const totalRevenue = round2(sum(current));
  const prevRevenue = sum(previous);
  const growth = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : 0);

  const products = new Map<string, { id: number; name: string; sales: number; revenue: number }>();
  const byDay = new Map<string, { revenue: number; orders: number }>();
  const byCategory = new Map<string, number>();
  let categoryTotal = 0;
  for (const order of current) {
    const day = dayKey(order.createdAt);
    const d = byDay.get(day) ?? { revenue: 0, orders: 0 };
    d.revenue += order.total || 0;
    d.orders += 1;
    byDay.set(day, d);
    for (const item of order.items ?? []) {
      const line = item.price * item.quantity;
      const p = products.get(`${item.id}|${item.name}`) ?? { id: item.id, name: item.name, sales: 0, revenue: 0 };
      p.sales += item.quantity;
      p.revenue += line;
      products.set(`${item.id}|${item.name}`, p);
      const category = item.category || 'Other';
      byCategory.set(category, (byCategory.get(category) ?? 0) + line);
      categoryTotal += line;
    }
  }

  return {
    totalRevenue,
    totalOrders: current.length,
    totalProducts: CATALOG.length,
    totalCustomers: new Set(orders.filter((o) => !o.isOffline).map((o) => o.userEmail)).size,
    revenueGrowth: growth(totalRevenue, prevRevenue),
    ordersGrowth: growth(current.length, previous.length),
    topProducts: [...products.values()]
      .map((p) => ({ ...p, revenue: round2(p.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    revenueByDay: [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        revenue: round2(v.revenue),
        orders: v.orders,
      })),
    categoryDistribution: [...byCategory.entries()]
      .map(([name, value]) => ({ name, value: categoryTotal > 0 ? Math.round((value / categoryTotal) * 1000) / 10 : 0 }))
      .sort((a, b) => b.value - a.value),
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (!['GET', 'PATCH', 'POST', 'DELETE'].includes(req.method)) {
      methodNotAllowed(res, ['GET', 'PATCH', 'POST', 'DELETE']);
      return;
    }
    const session = await requireAdmin(req, res);
    if (!session) return;
    if (!(await rateLimitIp(req, res, 'admin-orders', 300, 600))) return;

    if (req.method === 'GET') {
      const orders = await listAllOrders();
      const range = typeof req.query?.stats === 'string' ? req.query.stats : '';
      if (range) {
        res.status(200).json(salesStats(orders, range));
        return;
      }
      res.status(200).json({ orders });
      return;
    }

    if (req.method === 'PATCH') {
      const body = readBody(req);
      const order = typeof body?.orderId === 'string' ? await getOrder(body.orderId) : null;
      if (!order) {
        res.status(404).json({ error: tr(requestLang(req), 'Order not found', '订单不存在') });
        return;
      }
      if (!STATUSES.includes(body?.status)) {
        res.status(400).json({ error: tr(requestLang(req), 'Invalid status', '状态无效') });
        return;
      }
      const updated: Order = {
        ...order,
        status: body.status,
        completed: body.status === 'completed',
        updatedAt: new Date().toISOString(),
        updatedBy: session.email,
      };
      await saveOrder(updated);
      res.status(200).json({ success: true, order: updated });
      return;
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      const productId = Number(body?.productId) || 0;
      const catalogEntry = CATALOG_BY_ID[productId];
      const name = String(body?.productName ?? catalogEntry?.name.en ?? '').trim().slice(0, 120);
      const option = String(body?.option ?? '').trim().slice(0, 40);
      const quantity = Number(body?.quantity);
      const amount = Number(body?.amount);
      if (!name || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000 || !(amount >= 0) || amount > 1_000_000) {
        res.status(400).json({ error: tr(requestLang(req), 'Missing or invalid fields', '缺少或无效的字段') });
        return;
      }
      const unitPrice = round2(amount / quantity);
      const orderNumber = await nextOrderNumber();
      const order: Order = {
        id: `offline:${orderNumber}-${Math.random().toString(36).slice(2, 8)}`,
        orderNumber,
        userId: 'offline',
        userEmail: 'offline@store.com',
        items: [
          {
            id: productId,
            commodityId: productId,
            name,
            nameCn: catalogEntry?.name.cn ?? name,
            category: catalogEntry?.category ?? 'Other',
            option,
            quantity,
            price: unitPrice,
          },
        ],
        total: round2(amount),
        status: 'completed',
        completed: true,
        createdAt: new Date().toISOString(),
        createdBy: session.email,
        isOffline: true,
        contactInfo: { real_name: 'Offline Customer', class_name: 'N/A', role: 'offline' },
      };
      await saveOrder(order);
      res.status(200).json({ success: true, orderId: order.id, orderNumber, order });
      return;
    }

    // DELETE
    const scope = typeof req.query?.scope === 'string' ? req.query.scope : '';
    if (scope !== 'completed' && scope !== 'all') {
      res.status(400).json({ error: 'scope must be completed or all' });
      return;
    }
    const all = await listAllOrders();
    const targets = scope === 'all' ? all : all.filter(isCompleted);
    const deletedCount = await deleteOrders(targets);
    res.status(200).json({ success: true, deletedCount });
  } catch (error) {
    fail(res, 'admin-orders', error, req);
  }
}
