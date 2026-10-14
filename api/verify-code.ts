import { timingSafeEqual } from 'node:crypto';
import { command } from './_lib/redis';
import { EMAIL_RE, normalizeEmail, readBody } from './_lib/http';

// POST { email, code } -> 校验验证码，每个验证码最多尝试 5 次，成功后立即作废

const MAX_ATTEMPTS = 5;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = readBody(req);
  const email = normalizeEmail(body?.email);
  const code = typeof body?.code === 'string' ? body.code.trim() : '';

  if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'Invalid email or code / 邮箱或验证码格式不正确' });
    return;
  }

  try {
    const key = `code:${email}`;
    const raw = await command('GET', key);
    if (!raw) {
      res.status(400).json({ error: 'Code expired, please request a new one / 验证码已过期，请重新获取' });
      return;
    }

    const record = JSON.parse(String(raw)) as { code: string; attempts: number };

    if (record.attempts >= MAX_ATTEMPTS) {
      await command('DEL', key);
      res.status(429).json({ error: 'Too many attempts, please request a new code / 尝试次数过多，请重新获取验证码' });
      return;
    }

    if (!safeEqual(record.code, code)) {
      const ttl = 600;
      await command('SET', key, JSON.stringify({ ...record, attempts: record.attempts + 1 }), 'EX', ttl);
      res.status(400).json({ error: 'Wrong code, please try again / 验证码错误，请重试' });
      return;
    }

    await command('DEL', key);
    res.status(200).json({ ok: true, email });
  } catch (error) {
    console.error('[verify-code]', error);
    res.status(500).json({ error: 'Verification failed, please try again / 验证失败，请稍后重试' });
  }
}
