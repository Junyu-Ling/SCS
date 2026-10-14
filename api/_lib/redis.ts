// 极简 Redis 客户端：生产环境走 Upstash（Vercel Marketplace 里的 Upstash Redis / KV）REST 接口，
// 没配置环境变量时退回进程内存（仅用于本地开发，Vercel 上每个实例互相独立，不能当真实存储用）。

type Arg = string | number;
type Command = Arg[];

const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

export const hasRedis = Boolean(REST_URL && REST_TOKEN);

// ---------- 内存回退实现 ----------
type Entry = { value: unknown; expiresAt?: number };
const memory = new Map<string, Entry>();

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
      const opts = rest.slice(2).map((v) => String(v).toUpperCase());
      if (opts.includes('NX') && memGet(key)) return null;
      const exIdx = opts.indexOf('EX');
      const expiresAt = exIdx >= 0 ? Date.now() + Number(rest[2 + exIdx + 1]) * 1000 : undefined;
      memory.set(key, { value: String(rest[1]), expiresAt });
      return 'OK';
    }
    case 'DEL':
      memory.delete(key);
      return 1;
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
      set.add(String(rest[1]));
      memory.set(key, { value: set });
      return set.size - before;
    }
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
