export function readBody(req: any): any {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 只允许学校邮箱：@scls-sh.org（老师）或 @stu.scls-sh.org（学生）
export const SCHOOL_EMAIL_RE = /^[^\s@]+@(stu\.)?scls-sh\.org$/;

export function clientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : String(forwarded ?? '').split(',')[0];
  return (first || req.socket?.remoteAddress || 'unknown').trim();
}
