import { CATALOG_BY_ID } from '../src/app/data/catalog.js';
import { readBody } from './_lib/http.js';
import { requireAdmin } from './_lib/auth.js';
import { command } from './_lib/redis.js';
import { fail, methodNotAllowed, rateLimitIp } from './_lib/guards.js';
import { K_PRODUCT_STATE, getMergedProducts, mergeState, parseJson, type ProductState } from './_lib/shop.js';

// 商品运行时状态（售罄开关 / 库存）。价格、名称、分类不在这里——它们只在 src/app/data/catalog.ts。
//   GET   /api/products                 公开：[{ id, available, options? }]
//   PATCH /api/products  (管理员)       { id, available?, options? } 修改某个商品的状态

const MAX_STOCK = 100000;

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      res.status(200).json({ products: await getMergedProducts() });
      return;
    }

    if (req.method === 'PATCH') {
      const session = await requireAdmin(req, res);
      if (!session) return;
      if (!(await rateLimitIp(req, res, 'products-patch', 120, 600))) return;

      const body = readBody(req);
      const id = Number(body?.id);
      const entry = CATALOG_BY_ID[id];
      if (!Number.isInteger(id) || !entry) {
        res.status(404).json({ error: 'Unknown product / 商品不存在' });
        return;
      }

      const current = (parseJson<ProductState>(await command('HGET', K_PRODUCT_STATE, String(id))) ?? {}) as ProductState;
      const next: ProductState = { ...current };

      if (body?.available !== undefined) {
        if (typeof body.available !== 'boolean') {
          res.status(400).json({ error: 'available must be a boolean' });
          return;
        }
        next.available = body.available;
      }

      if (body?.options !== undefined) {
        const incoming = body.options;
        if (!entry.options || typeof incoming !== 'object' || incoming === null || Array.isArray(incoming)) {
          res.status(400).json({ error: 'This product has no options / 该商品没有可调整的选项' });
          return;
        }
        const options: Record<string, number> = { ...(current.options ?? {}) };
        for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
          const qty = Number(value);
          if (!(key in entry.options) || !Number.isInteger(qty) || qty < 0 || qty > MAX_STOCK) {
            res.status(400).json({ error: `Invalid option "${key}" / 选项或库存无效` });
            return;
          }
          options[key] = qty;
        }
        next.options = options;
      }

      await command('HSET', K_PRODUCT_STATE, String(id), JSON.stringify(next));
      res.status(200).json({ ok: true, product: mergeState(entry, next) });
      return;
    }

    methodNotAllowed(res, ['GET', 'PATCH']);
  } catch (error) {
    fail(res, 'products', error);
  }
}
