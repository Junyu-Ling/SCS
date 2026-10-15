/**
 * 前端访问 Vercel Functions（/api/*）的唯一入口。
 * - 管理员身份靠 HttpOnly Cookie（浏览器自动携带，JS 读不到）。
 * - 学生身份靠结账时验证邮箱拿到的 verifyToken，通过 X-Verify-Token 请求头发送。
 */

const PROFILE_KEY = 'scls_checkout_profile';

/** 读取这台设备上保存的 verifyToken（由 CheckoutProfileContext 写入） */
export function getStoredVerifyToken(): string {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { verifyToken?: unknown }) : null;
    return typeof parsed?.verifyToken === 'string' ? parsed.verifyToken : '';
  } catch {
    return '';
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** 附带学生的 verifyToken */
  student?: boolean;
  signal?: AbortSignal;
}

function currentLang(): 'en' | 'cn' {
  try {
    return localStorage.getItem('lang') === 'cn' ? 'cn' : 'en';
  } catch {
    return 'en';
  }
}

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'X-Lang': currentLang() };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.student) {
    const token = getStoredVerifyToken();
    if (token) headers['X-Verify-Token'] = token;
  }

  const response = await fetch(path, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, typeof data?.error === 'string' ? data.error : `HTTP ${response.status}`);
  }
  return data as T;
}
