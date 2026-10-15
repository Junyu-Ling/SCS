import { EMAIL_RE, SCHOOL_EMAIL_RE, normalizeEmail, readBody } from './_lib/http.js';
import { INITIAL_ADMIN_EMAILS, getDynamicAdmins, grantAdmin, requireAdmin, revokeAdmin } from './_lib/auth.js';
import { fail, methodNotAllowed, rateLimitIp } from './_lib/guards.js';
import { requestLang, tr } from './_lib/lang.js';

// 管理员名单（需要管理员 Cookie）
//   GET    /api/admin-users                 [{ email, initial }]
//   POST   /api/admin-users {email}         授予管理员（仅限学校邮箱）
//   DELETE /api/admin-users {email}         撤销管理员；初始管理员（写在代码里）不可撤销

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
      methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
      return;
    }
    const session = await requireAdmin(req, res);
    if (!session) return;
    if (!(await rateLimitIp(req, res, 'admin-users', 60, 600))) return;

    if (req.method === 'GET') {
      const dynamic = await getDynamicAdmins();
      const admins = [
        ...INITIAL_ADMIN_EMAILS.map((email) => ({ email, initial: true })),
        ...dynamic.filter((e) => !INITIAL_ADMIN_EMAILS.includes(e)).map((email) => ({ email, initial: false })),
      ];
      res.status(200).json({ admins });
      return;
    }

    const email = normalizeEmail(readBody(req)?.email);
    if (!EMAIL_RE.test(email) || !SCHOOL_EMAIL_RE.test(email)) {
      res.status(400).json({ error: tr(requestLang(req), 'Please enter a school email', '请输入学校邮箱') });
      return;
    }

    if (req.method === 'POST') {
      await grantAdmin(email);
      res.status(200).json({ ok: true });
      return;
    }

    if (INITIAL_ADMIN_EMAILS.includes(email)) {
      res.status(400).json({ error: tr(requestLang(req), 'Initial admins cannot be revoked', '初始管理员不能被撤销') });
      return;
    }
    await revokeAdmin(email);
    res.status(200).json({ ok: true });
  } catch (error) {
    fail(res, 'admin-users', error, req);
  }
}
