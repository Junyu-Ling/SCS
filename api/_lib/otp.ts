import { timingSafeEqual } from 'node:crypto';
import { normalizeEmail } from './http.js';
import { command, redisConfigured } from './redis.js';

export const CODE_TTL_SECONDS = 600;
const MAX_ATTEMPTS = 5;

export const OTP_MISSING = 'No verification code found, please request a new one / 未找到验证码，请先获取';
export const OTP_EXPIRED = 'Code expired, please request a new one / 验证码已过期，请重新获取';
export const OTP_WRONG = 'Wrong code, please try again / 验证码错误，请重试';
export const OTP_TOO_MANY = 'Too many attempts, please request a new code / 尝试次数过多，请重新获取验证码';
export const OTP_STORE_UNAVAILABLE = 'Verification storage is not configured / 验证码存储未配置';

type OtpRecord = { code: string; attempts: number; exp: number };

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function otpKey(email: string): string {
  return `code:${normalizeEmail(email)}`;
}

function remainingTtlSeconds(exp: number): number {
  return Math.max(1, Math.ceil((exp - Date.now()) / 1000));
}

function parseRecord(raw: unknown): OtpRecord | null {
  if (raw == null || raw === '') return null;
  try {
    const record = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Partial<OtpRecord>;
    if (!record || typeof record.code !== 'string') return null;
    return {
      code: record.code,
      attempts: Number(record.attempts) || 0,
      exp: Number(record.exp) || 0,
    };
  } catch {
    return null;
  }
}

export async function saveCode(email: string, code: string): Promise<void> {
  if (!redisConfigured()) {
    throw new Error(OTP_STORE_UNAVAILABLE);
  }

  const key = otpKey(email);
  const payload = JSON.stringify({
    code,
    attempts: 0,
    exp: Date.now() + CODE_TTL_SECONDS * 1000,
  } satisfies OtpRecord);

  const result = await command('SET', key, payload, 'EX', String(CODE_TTL_SECONDS));
  if (result !== 'OK') {
    throw new Error('Failed to persist verification code');
  }

  const stored = parseRecord(await command('GET', key));
  if (!stored || !safeEqual(stored.code, code)) {
    throw new Error('Verification code was not persisted');
  }
}

export type OtpResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * 校验邮箱验证码（由 send-code 写入 Redis 的 code:<normalized-email>）。
 * 每个验证码最多尝试 5 次；成功后立即作废。verify-code 与 admin-session 共用。
 */
export async function checkCode(email: string, code: string): Promise<OtpResult> {
  if (!redisConfigured()) {
    return { ok: false, status: 503, error: OTP_STORE_UNAVAILABLE };
  }

  const key = otpKey(email);
  const record = parseRecord(await command('GET', key));
  if (!record) {
    return { ok: false, status: 400, error: OTP_MISSING };
  }

  if (record.exp > 0 && record.exp <= Date.now()) {
    await command('DEL', key);
    return { ok: false, status: 400, error: OTP_EXPIRED };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await command('DEL', key);
    return { ok: false, status: 429, error: OTP_TOO_MANY };
  }

  const submitted = typeof code === 'string' ? code.trim() : '';
  if (!safeEqual(record.code, submitted)) {
    const next = { ...record, attempts: record.attempts + 1 };
    await command('SET', key, JSON.stringify(next), 'EX', String(remainingTtlSeconds(record.exp || Date.now() + CODE_TTL_SECONDS * 1000)));
    return { ok: false, status: 400, error: OTP_WRONG };
  }

  await command('DEL', key);
  return { ok: true };
}
