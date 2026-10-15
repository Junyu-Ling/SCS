import { hasRedis, pipeline } from './_lib/redis.js';
import { readBody } from './_lib/http.js';

// 累计独立访客 / 当前在线：
//   POST { visitorId } 心跳（前端每 25 秒一次），GET 只读。
//   total  = 累计独立访客 UV（只增不减）。
//            Redis SET stats:seen 去重 + stats:uv_hw 高水位，避免实例切换回落。
//   online = 最近 60 秒内有心跳的 visitorId 数（可上可下）。

const ONLINE_TTL_MS = 60_000;
const VISITOR_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const SEEN_KEY = 'stats:seen';
const HW_KEY = 'stats:uv_hw';
const ONLINE_KEY = 'stats:online';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (!hasRedis() && (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview')) {
      // 无共享 Redis 时每个实例各算各的，UV 会乱跳——直接拒绝，避免展示错误累计值。
      res.status(503).json({ error: 'Shared Redis required for visitor stats' });
      return;
    }

    const now = Date.now();
    const commands: (string | number)[][] = [
      ['ZREMRANGEBYSCORE', ONLINE_KEY, '-inf', now - ONLINE_TTL_MS],
    ];

    if (req.method === 'POST') {
      const visitorId = String(readBody(req)?.visitorId ?? '').trim();
      if (!VISITOR_ID_RE.test(visitorId)) {
        res.status(400).json({ error: 'Invalid visitorId' });
        return;
      }
      commands.push(['SADD', SEEN_KEY, visitorId], ['ZADD', ONLINE_KEY, now, visitorId]);
    } else if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    commands.push(['SCARD', SEEN_KEY], ['GET', HW_KEY], ['ZCARD', ONLINE_KEY]);
    const results = await pipeline(commands);
    const scard = Number(results[results.length - 3]) || 0;
    const hwRaw = results[results.length - 2];
    const highWater = Number(hwRaw == null ? 0 : hwRaw) || 0;
    const online = Number(results[results.length - 1]) || 0;
    const total = Math.max(scard, highWater);

    // 高水位只升不降，跨实例/冷启动也不会把累计值抹掉。
    if (total > highWater) {
      await pipeline([['SET', HW_KEY, String(total)]]);
    }

    res.status(200).json({ total, online });
  } catch (error) {
    console.error('[stats]', error);
    res.status(503).json({ error: 'Stats unavailable' });
  }
}
