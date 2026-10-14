import { EMAIL_RE, SCHOOL_EMAIL_RE, normalizeEmail, readBody } from './_lib/http.js';
import { authConfigured, signToken, VERIFY_TOKEN_SECONDS } from './_lib/auth.js';
import { checkCode } from './_lib/otp.js';

// POST { email, code } -> 校验验证码，每个验证码最多尝试 5 次，成功后立即作废。
// 成功时额外返回 verifyToken：HMAC 签名的"已验证邮箱"令牌（30 天），
// 前端保存在设备上，下单 / 查看自己的订单时出示，服务端据此确认邮箱确实验证过。

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = readBody(req);
  const email = normalizeEmail(body?.email);
  const code = typeof body?.code === 'string' ? body.code.trim() : '';

  if (!EMAIL_RE.test(email) || !SCHOOL_EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
    res.status(400).json({ error: 'Invalid email or code / 邮箱或验证码格式不正确' });
    return;
  }

  try {
    if (!authConfigured()) {
      res.status(503).json({ error: 'Server auth is not configured / 服务端未配置 AUTH_SECRET' });
      return;
    }

    const result = await checkCode(email, code);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.status(200).json({
      ok: true,
      email,
      verifyToken: signToken('verify', email, VERIFY_TOKEN_SECONDS),
    });
  } catch (error) {
    console.error('[verify-code]', error);
    res.status(500).json({ error: 'Verification failed, please try again / 验证失败，请稍后重试' });
  }
}
