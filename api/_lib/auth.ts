import { createHmac, timingSafeEqual } from 'node:crypto';
import { command } from './redis.js';

// 无 Supabase 的身份体系（全部基于 AUTH_SECRET 的 HMAC-SHA256 签名，不依赖任何第三方服务）：
//
//   1) 管理员会话：HttpOnly + SameSite=Lax（线上再加 Secure）的签名 Cookie `scls_admin`，7 天有效。
//      管理员通过邮箱验证码登录（api/admin-session.ts）。每次请求都会重新检查该邮箱此刻仍是管理员
//      （被撤销后立即失效）。
//   2) 已验证邮箱令牌（verifyToken）：学生在结账时通过验证码验证邮箱后，由 api/verify-code.ts 签发，
//      30 天有效，保存在学生设备的 localStorage 里；下单 / 查看自己的订单都要出示它，
//      服务端据此确认"这个邮箱确实被验证过"。
//
// AUTH_SECRET：Vercel 环境变量，至少 32 位随机字符串。只有本地开发（没有 VERCEL 变量）才会使用开发用的兜底密钥。

export const INITIAL_ADMIN_EMAILS = [
  '202760149@stu.scls-sh.org',
  '202760107@stu.scls-sh.org',
  '202760102@stu.scls-sh.org',
];

export const ADMIN_COOKIE = 'scls_admin';
export const ADMIN_SESSION_SECONDS = 7 * 24 * 3600;
export const VERIFY_TOKEN_SECONDS = 30 * 24 * 3600;

const ADMIN_SET_KEY = 'shop:admins';

type TokenType = 'admin' | 'verify';
type TokenPayload = { t: TokenType; e: string; exp: number };

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (!process.env.VERCEL) return 'dev-only-insecure-auth-secret-do-not-use-in-production';
  throw new Error('AUTH_SECRET is not configured');
}

/** 配置检查：线上缺少 AUTH_SECRET 时给调用方一个明确的 503，而不是泄露细节 */
export function authConfigured(): boolean {
  try {
    getSecret();
    return true;
  } catch {
    return false;
  }
}

const b64 = (input: Buffer | string) => Buffer.from(input).toString('base64url');

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function signToken(type: TokenType, email: string, ttlSeconds: number): string {
  const payload: TokenPayload = { t: type, e: email, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = b64(JSON.stringify(payload));
  return `${body}.${sign(`${type}.${body}`)}`;
}

export function verifyToken(type: TokenType, token: unknown): { email: string; exp: number } | null {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    if (!safeEqual(sig, sign(`${type}.${body}`))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
    if (payload.t !== type || typeof payload.e !== 'string') return null;
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 < Date.now()) return null;
    return { email: payload.e, exp: payload.exp };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- 管理员名单

export async function getDynamicAdmins(): Promise<string[]> {
  const list = (await command('SMEMBERS', ADMIN_SET_KEY)) as string[] | null;
  return Array.isArray(list) ? list.map((e) => String(e).toLowerCase()) : [];
}

export async function getAllAdmins(): Promise<string[]> {
  return [...new Set([...INITIAL_ADMIN_EMAILS, ...(await getDynamicAdmins())])];
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const e = email.trim().toLowerCase();
  if (INITIAL_ADMIN_EMAILS.includes(e)) return true;
  return Number(await command('SISMEMBER', ADMIN_SET_KEY, e)) === 1;
}

export async function grantAdmin(email: string): Promise<void> {
  await command('SADD', ADMIN_SET_KEY, email.trim().toLowerCase());
}

export async function revokeAdmin(email: string): Promise<void> {
  await command('SREM', ADMIN_SET_KEY, email.trim().toLowerCase());
}

// ---------------------------------------------------------------- Cookie / 请求辅助

export function parseCookies(req: any): Record<string, string> {
  const header = String(req.headers?.cookie ?? '');
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function isHttps(req: any): boolean {
  return Boolean(process.env.VERCEL) || req.headers?.['x-forwarded-proto'] === 'https';
}

export function setAdminCookie(req: any, res: any, email: string): void {
  const token = signToken('admin', email, ADMIN_SESSION_SECONDS);
  const parts = [
    `${ADMIN_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${ADMIN_SESSION_SECONDS}`,
  ];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearAdminCookie(req: any, res: any): void {
  const parts = [`${ADMIN_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isHttps(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

/** 读取当前管理员会话；无效 / 过期 / 已被撤销 → null */
export async function getAdminSession(req: any): Promise<{ email: string } | null> {
  if (!authConfigured()) return null;
  const token = parseCookies(req)[ADMIN_COOKIE];
  const verified = verifyToken('admin', token);
  if (!verified) return null;
  if (!(await isAdminEmail(verified.email))) return null;
  return { email: verified.email };
}

/** 管理员接口入口：非 GET 请求还会校验 Origin（防 CSRF，叠加 SameSite=Lax） */
export async function requireAdmin(req: any, res: any): Promise<{ email: string } | null> {
  if (!authConfigured()) {
    res.status(503).json({ error: 'Server auth is not configured / 服务端未配置 AUTH_SECRET' });
    return null;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const origin = req.headers?.origin;
    const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
    if (origin && host) {
      let originHost = '';
      try {
        originHost = new URL(String(origin)).host;
      } catch {
        originHost = '';
      }
      if (originHost !== String(host)) {
        res.status(403).json({ error: 'Forbidden' });
        return null;
      }
    }
  }
  const session = await getAdminSession(req);
  if (!session) {
    res.status(401).json({ error: 'Admin sign-in required / 需要管理员登录' });
    return null;
  }
  return session;
}

/** 从请求头 X-Verify-Token 或 body.verifyToken 取出已验证邮箱 */
export function getVerifiedEmail(req: any, body?: any): string | null {
  const header = req.headers?.['x-verify-token'];
  const token = (Array.isArray(header) ? header[0] : header) || body?.verifyToken;
  return verifyToken('verify', token)?.email ?? null;
}
