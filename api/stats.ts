import { pipeline } from './_lib/redis.js';
import { readBody } from './_lib/http.js';

// 累计独立访客 / 当前在线：
//   POST { visitorId } 心跳（前端每 25 秒一次），GET 只读。
//   total  = 累计独立访客 UV（Redis SET stats:seen 的基数，见过的不同 visitorId）。
//            不是 PV、不是当日、不是当前在线。
//   online = 最近 60 秒内有心跳的 visitorId 数。

const ONLINE_TTL_MS = 60_000;
const VISITOR_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    const now = Date.now();
    const commands: (string | number)[][] = [
      ['ZREMRANGEBYSCORE', 'stats:online', '-inf', now - ONLINE_TTL_MS],
    ];

    if (req.method === 'POST') {
      const visitorId = String(readBody(req)?.visitorId ?? '').trim();
      if (!VISITOR_ID_RE.test(visitorId)) {
        res.status(400).json({ error: 'Invalid visitorId' });
        return;
      }
      commands.push(['SADD', 'stats:seen', visitorId], ['ZADD', 'stats:online', now, visitorId]);
    } else if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    commands.push(['SCARD', 'stats:seen'], ['ZCARD', 'stats:online']);
    const results = await pipeline(commands);
    const total = Number(results[results.length - 2]) || 0;
    const online = Number(results[results.length - 1]) || 0;

    res.status(200).json({ total, online });
  } catch (error) {
    console.error('[stats]', error);
    res.status(503).json({ error: 'Stats unavailable' });
  }
}
