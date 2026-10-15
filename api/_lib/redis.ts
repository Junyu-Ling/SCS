// 极简 Redis 客户端：生产环境走 Upstash（Vercel Marketplace 里的 Upstash Redis / KV）REST 接口，
// 没配置环境变量时退回进程内存（仅用于本地开发，Vercel 上每个实例互相独立，不能当真实存储用）。

type Arg = string | number;
type Command = Arg[];

const REST_URL = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim();
const REST_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim();

export const hasRedis = Boolean(REST_URL && REST_TOKEN);

/** 线上（Vercel）必须用共享 Redis；否则每个 Serverless 实例各有一份内存，发码后校验必然“找不到”。 */
export function redisConfigured(): boolean {
  return hasRedis || !process.env.VERCEL;
}

// ---------- 内存回退实现 ----------
type Entry = { value: unknown; expiresAt?: number };
const memory: Map<string, Entry> = (() => {
  const g = globalThis as typeof globalThis & { __sclsMemoryRedis?: Map<string, Entry> };
  if (!g.__sclsMemoryRedis) g.__sclsMemoryRedis = new Map<string, Entry>();
  return g.__sclsMemoryRedis;
})();

function memGet(key: string): Entry | undefined {
  const entry = memory.get(key);
  if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return undefined;
  }
  return entry;
}

function memExec(cmd: Command): unknown {
  const [name, ...rest] = cmd;
  const op = String(name).toUpperCase();
  const key = String(rest[0]);

  switch (op) {
    case 'GET':
      return (memGet(key)?.value as string | undefined) ?? null;
    case 'SET': {
      let nx = false;
      let ttlSeconds: number | undefined;
      for (let i = 2; i < rest.length; i += 1) {
        const opt = String(rest[i]).toUpperCase();
        if (opt === 'NX') {
          nx = true;
          continue;
        }
        if (opt === 'XX') continue;
        if (opt === 'EX' || opt === 'PX') {
          const rawTtl = Number(rest[i + 1]);
          i += 1;
          if (Number.isFinite(rawTtl) && rawTtl > 0) {
            ttlSeconds = opt === 'PX' ? rawTtl / 1000 : rawTtl;
          }
          continue;
        }
      }
      if (nx && memGet(key)) return null;
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
      memory.set(key, { value: String(rest[1]), expiresAt });
      return 'OK';
    }
    case 'DEL': {
      let removed = 0;
      for (const k of rest) if (memory.delete(String(k))) removed += 1;
      return removed;
    }
    case 'INCR': {
      const current = Number(memGet(key)?.value ?? 0) + 1;
      const prev = memGet(key);
      memory.set(key, { value: String(current), expiresAt: prev?.expiresAt });
      return current;
    }
    case 'EXPIRE': {
      const entry = memGet(key);
      if (entry) entry.expiresAt = Date.now() + Number(rest[1]) * 1000;
      return entry ? 1 : 0;
    }
    case 'SADD': {
      const set = (memGet(key)?.value as Set<string> | undefined) ?? new Set<string>();
      const before = set.size;
      for (const member of rest.slice(1)) set.add(String(member));
      memory.set(key, { value: set });
      return set.size - before;
    }
    case 'SREM': {
      const set = memGet(key)?.value as Set<string> | undefined;
      if (!set) return 0;
      let removed = 0;
      for (const member of rest.slice(1)) if (set.delete(String(member))) removed += 1;
      return removed;
    }
    case 'SMEMBERS':
      return [...((memGet(key)?.value as Set<string> | undefined) ?? [])];
    case 'SISMEMBER':
      return (memGet(key)?.value as Set<string> | undefined)?.has(String(rest[1])) ? 1 : 0;
    case 'HSET': {
      const hash = (memGet(key)?.value as Map<string, string> | undefined) ?? new Map<string, string>();
      let added = 0;
      for (let i = 1; i + 1 < rest.length; i += 2) {
        if (!hash.has(String(rest[i]))) added += 1;
        hash.set(String(rest[i]), String(rest[i + 1]));
      }
      memory.set(key, { value: hash });
      return added;
    }
    case 'HGET':
      return (memGet(key)?.value as Map<string, string> | undefined)?.get(String(rest[1])) ?? null;
    case 'HMGET': {
      const hash = memGet(key)?.value as Map<string, string> | undefined;
      return rest.slice(1).map((field) => hash?.get(String(field)) ?? null);
    }
    case 'HGETALL': {
      // 与 Upstash REST 一致：返回 [field, value, field, value, ...]
      const hash = memGet(key)?.value as Map<string, string> | undefined;
      return hash ? [...hash.entries()].flat() : [];
    }
    case 'HDEL': {
      const hash = memGet(key)?.value as Map<string, string> | undefined;
      if (!hash) return 0;
      let removed = 0;
      for (const field of rest.slice(1)) if (hash.delete(String(field))) removed += 1;
      return removed;
    }
    case 'HLEN':
      return ((memGet(key)?.value as Map<string, string> | undefined)?.size ?? 0) as number;
    case 'SCARD':
      return ((memGet(key)?.value as Set<string> | undefined)?.size ?? 0) as number;
    case 'ZADD': {
      const zset = (memGet(key)?.value as Map<string, number> | undefined) ?? new Map<string, number>();
      zset.set(String(rest[2]), Number(rest[1]));
      memory.set(key, { value: zset });
      return 1;
    }
    case 'ZREMRANGEBYSCORE': {
      const zset = memGet(key)?.value as Map<string, number> | undefined;
      if (!zset) return 0;
      const max = Number(rest[2]);
      let removed = 0;
      for (const [member, score] of zset) {
        if (score <= max) {
          zset.delete(member);
          removed += 1;
        }
      }
      return removed;
    }
    case 'ZCARD':
      return ((memGet(key)?.value as Map<string, number> | undefined)?.size ?? 0) as number;
    default:
      throw new Error(`Unsupported memory command: ${op}`);
  }
}

// ---------- 对外接口 ----------
export async function pipeline(commands: Command[]): Promise<unknown[]> {
  if (!hasRedis) {
    return commands.map(memExec);
  }

  const res = await fetch(`${REST_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis request failed: ${res.status}`);

  const data = (await res.json()) as { result?: unknown; error?: string }[];
  return data.map((item) => {
    if (item.error) throw new Error(item.error);
    return item.result;
  });
}

export async function command(...args: Command): Promise<unknown> {
  const [result] = await pipeline([args]);
  return result;
}
