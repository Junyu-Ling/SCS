import { readBody } from './_lib/http.js';
import { getAdminSession, requireAdmin } from './_lib/auth.js';
import { command } from './_lib/redis.js';
import { fail, methodNotAllowed, rateLimitIp } from './_lib/guards.js';
import { K_ABOUT, parseJson } from './_lib/shop.js';

// About Us 页面内容
//   GET /api/aboutus  公开：{ content, canEdit }（canEdit = 当前请求带着有效的管理员 Cookie）
//   PUT /api/aboutus  管理员：{ content: {...} } 保存

const MAX_BYTES = 200 * 1024;

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    if (req.method === 'GET') {
      const content = parseJson<Record<string, unknown>>(await command('GET', K_ABOUT));
      const session = await getAdminSession(req);
      res.status(200).json({ content: content ?? null, canEdit: Boolean(session) });
      return;
    }

    if (req.method === 'PUT') {
      const session = await requireAdmin(req, res);
      if (!session) return;
      if (!(await rateLimitIp(req, res, 'aboutus-put', 60, 600))) return;

      const content = readBody(req)?.content;
      if (!content || typeof content !== 'object' || Array.isArray(content)) {
        res.status(400).json({ error: 'Content must be a JSON object / 内容必须是 JSON 对象' });
        return;
      }
      const serialized = JSON.stringify(content);
      if (serialized.length > MAX_BYTES) {
        res.status(413).json({ error: 'Content too large / 内容过大' });
        return;
      }
      await command('SET', K_ABOUT, serialized);
      res.status(200).json({ ok: true });
      return;
    }

    methodNotAllowed(res, ['GET', 'PUT']);
  } catch (error) {
    fail(res, 'aboutus', error);
  }
}
