import { CATALOG_BY_ID } from '../src/app/data/catalog.js';
import { readBody } from './_lib/http.js';
import { authConfigured, getVerifiedEmail } from './_lib/auth.js';
import { fail, methodNotAllowed, rateLimitIp } from './_lib/guards.js';
import { sendOrderEmails } from './_lib/orderMail.js';
import {
  deleteOrders,
  getOrder,
  getProductStates,
  isCompleted,
  listOrdersByEmail,
  mergeState,
  nextOrderNumber,
  round2,
  saveOrder,
  type Order,
  type OrderItem,
} from './_lib/shop.js';

// 学生端订单接口。身份 = 结账时通过邮箱验证码拿到的 verifyToken（请求头 X-Verify-Token）。
//   POST   /api/orders  { items:[{commodityId, option, quantity}], contactInfo:{real_name, class_name, note} }
//                       价格一律由服务端按 catalog.ts 重新计算，客户端传来的 price / total 被忽略；
//                       保存后发送确认邮件（学生）+ 通知邮件（管理员）。
//   GET    /api/orders  我的订单
//   PATCH  /api/orders  { orderId, status:'cancelled' } 取消自己的未完成订单
//   DELETE /api/orders  删除自己已完成的订单

const MAX_LINES = 30;
const MAX_QTY = 20;

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (!authConfigured()) {
      res.status(503).json({ error: 'Server auth is not configured / 服务端未配置 AUTH_SECRET' });
      return;
    }
    if (!['POST', 'GET', 'PATCH', 'DELETE'].includes(req.method)) {
      methodNotAllowed(res, ['POST', 'GET', 'PATCH', 'DELETE']);
      return;
    }

    const body = req.method === 'GET' ? {} : readBody(req);
    const email = getVerifiedEmail(req, body);
    if (!email) {
      res.status(401).json({ error: 'Email verification required / 请先验证邮箱' });
      return;
    }

    if (req.method === 'GET') {
      if (!(await rateLimitIp(req, res, 'orders-get', 120, 600))) return;
      res.status(200).json({ orders: await listOrdersByEmail(email) });
      return;
    }

    if (req.method === 'DELETE') {
      if (!(await rateLimitIp(req, res, 'orders-del', 30, 600))) return;
      const mine = (await listOrdersByEmail(email)).filter(isCompleted);
      res.status(200).json({ success: true, deletedCount: await deleteOrders(mine) });
      return;
    }

    if (req.method === 'PATCH') {
      if (!(await rateLimitIp(req, res, 'orders-patch', 30, 600))) return;
      const order = typeof body?.orderId === 'string' ? await getOrder(body.orderId) : null;
      if (!order || order.userEmail !== email) {
        res.status(404).json({ error: 'Order not found / 订单不存在' });
        return;
      }
      if (body?.status !== 'cancelled' || order.status !== 'pending') {
        res.status(400).json({ error: 'Only pending orders can be cancelled / 只能取消未完成的订单' });
        return;
      }
      const updated: Order = { ...order, status: 'cancelled', completed: false, updatedAt: new Date().toISOString() };
      await saveOrder(updated);
      res.status(200).json({ success: true, order: updated });
      return;
    }

    // ---- POST 下单
    if (!(await rateLimitIp(req, res, 'orders-post', 10, 600))) return;

    const realName = clean(body?.contactInfo?.real_name, 50);
    const className = clean(body?.contactInfo?.class_name, 50);
    const note = clean(body?.contactInfo?.note, 500);
    if (!realName || !className) {
      res.status(400).json({ error: 'Real name and class are required / 请填写姓名和班级' });
      return;
    }

    const lines = Array.isArray(body?.items) ? body.items : [];
    if (lines.length === 0 || lines.length > MAX_LINES) {
      res.status(400).json({ error: 'Invalid items / 商品列表无效' });
      return;
    }

    const states = await getProductStates();
    const merged = new Map<string, OrderItem>();
    for (const line of lines) {
      const id = Number(line?.commodityId ?? line?.id);
      const entry = CATALOG_BY_ID[id];
      const quantity = Number(line?.quantity);
      if (!entry || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) {
        res.status(400).json({ error: 'Invalid item / 商品或数量无效' });
        return;
      }
      if (!mergeState(entry, states[id]).available) {
        res.status(409).json({ error: `Sold out: ${entry.name.en} / 已售罄：${entry.name.cn}` });
        return;
      }
      let option = '';
      if (entry.options) {
        option = clean(line?.option, 40);
        if (!(option in entry.options)) {
          res.status(400).json({ error: `Please choose an option for ${entry.name.en} / 请选择${entry.name.cn}的规格` });
          return;
        }
      }
      const key = `${id}|${option}`;
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += quantity;
        if (existing.quantity > MAX_QTY) {
          res.status(400).json({ error: 'Quantity too large / 数量过多' });
          return;
        }
      } else {
        merged.set(key, {
          id,
          commodityId: id,
          name: entry.name.en,
          nameCn: entry.name.cn,
          category: entry.category,
          option,
          quantity,
          price: entry.price, // 价格只来自代码里的目录
        });
      }
    }

    const items = [...merged.values()];
    const total = round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const orderNumber = await nextOrderNumber();
    const order: Order = {
      id: `${orderNumber}-${Math.random().toString(36).slice(2, 8)}`,
      orderNumber,
      userId: `guest:${email}`,
      userEmail: email,
      items,
      total,
      status: 'pending',
      completed: false,
      createdAt: new Date().toISOString(),
      contactInfo: { real_name: realName, class_name: className, note, email },
    };
    await saveOrder(order);

    // 邮件失败不影响订单；在 Vercel 上必须 await，否则函数返回后进程会被冻结
    await sendOrderEmails({
      id: order.orderNumber,
      createdAt: order.createdAt,
      buyer: { realName, email, className, note },
      items: items.map((item) => {
        const kind = CATALOG_BY_ID[item.commodityId]?.optionKind;
        return {
          name: item.name,
          color: kind === 'color' ? item.option : null,
          size: kind === 'size' ? item.option : null,
          quantity: item.quantity,
          price: item.price,
        };
      }),
      total,
    });

    res.status(200).json({ success: true, orderId: order.id, orderNumber, total });
  } catch (error) {
    fail(res, 'orders', error);
  }
}
