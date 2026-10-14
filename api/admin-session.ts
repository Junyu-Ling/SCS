import { EMAIL_RE, SCHOOL_EMAIL_RE, normalizeEmail, readBody } from './_lib/http.js';
import { authConfigured, clearAdminCookie, getAdminSession, isAdminEmail, setAdminCookie } from './_lib/auth.js';
import { checkCode } from './_lib/otp.js';
import { fail, methodNotAllowed, rateLimitIp } from './_lib/guards.js';

// 管理员会话（邮箱验证码登录 → HttpOnly 签名 Cookie，7 天）
//   GET    /api/admin-session                当前是否已登录：{ admin, email? }
//   POST   /api/admin-session {email, code}  先用 /api/send-code 给管理员邮箱发码，再在这里校验并登录
//   DELETE /api/admin-session                退出登录

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const session = await getAdminSession(req);
      res.status(200).json(session ? { admin: true, email: session.email } : { admin: false });
      return;
    }

    if (req.method === 'DELETE') {
      clearAdminCookie(req, res);
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method !== 'POST') {
      methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
      return;
    }

    if (!authConfigured()) {
      res.status(503).json({ error: 'Server auth is not configured / 服务端未配置 AUTH_SECRET' });
      return;
    }
    if (!(await rateLimitIp(req, res, 'admin-login', 15, 600))) return;

    const body = readBody(req);
    const email = normalizeEmail(body?.email);
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!EMAIL_RE.test(email) || !SCHOOL_EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
      res.status(400).json({ error: 'Invalid email or code / 邮箱或验证码格式不正确' });
      return;
    }

    const result = await checkCode(email, code);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    if (!(await isAdminEmail(email))) {
      res.status(403).json({ error: 'This email is not an admin / 该邮箱不是管理员' });
      return;
    }

    setAdminCookie(req, res, email);
    res.status(200).json({ ok: true, admin: true, email });
  } catch (error) {
    fail(res, 'admin-session', error);
  }
}
