import { command } from './redis.js';
import { clientIp } from './http.js';
import { requestLang, tr } from './lang.js';

/** 固定窗口限流：同一个 key 在 windowSeconds 内最多 limit 次。超出返回 false。 */
export async function allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const count = Number(await command('INCR', key));
  if (count === 1) await command('EXPIRE', key, windowSeconds);
  return count <= limit;
}

/** 按 IP 限流；被拒绝时已经写好 429 响应并返回 false */
export async function rateLimitIp(
  req: any,
  res: any,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const ok = await allow(`rl:${bucket}:${clientIp(req)}`, limit, windowSeconds);
  if (!ok) {
    res.status(429).json({ error: tr(requestLang(req), 'Too many requests, try again later', '请求过于频繁，请稍后再试') });
  }
  return ok;
}

/** 生产环境不向客户端暴露异常细节 */
export function fail(res: any, tag: string, error: unknown, req?: any) {
  console.error(`[${tag}]`, error);
  res.status(500).json({ error: tr(requestLang(req), 'Server error', '服务器错误') });
}

export function methodNotAllowed(res: any, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: 'Method not allowed' });
}
