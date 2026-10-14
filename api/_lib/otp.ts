import { timingSafeEqual } from 'node:crypto';
import { command } from './redis.js';

const MAX_ATTEMPTS = 5;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export type OtpResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * 校验邮箱验证码（由 send-code 写入 Redis 的 code:<email>）。
 * 每个验证码最多尝试 5 次；成功后立即作废。verify-code 与 admin-session 共用。
 */
export async function checkCode(email: string, code: string): Promise<OtpResult> {
  const key = `code:${email}`;
  const raw = await command('GET', key);
  if (!raw) {
    return { ok: false, status: 400, error: 'Code expired, please request a new one / 验证码已过期，请重新获取' };
  }

  const record = JSON.parse(String(raw)) as { code: string; attempts: number };

  if (record.attempts >= MAX_ATTEMPTS) {
    await command('DEL', key);
    return { ok: false, status: 429, error: 'Too many attempts, please request a new code / 尝试次数过多，请重新获取验证码' };
  }

  if (!safeEqual(record.code, code)) {
    await command('SET', key, JSON.stringify({ ...record, attempts: record.attempts + 1 }), 'EX', 600);
    return { ok: false, status: 400, error: 'Wrong code, please try again / 验证码错误，请重试' };
  }

  await command('DEL', key);
  return { ok: true };
}
