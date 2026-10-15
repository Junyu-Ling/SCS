import { randomInt } from 'node:crypto';
import { command, redisConfigured } from './_lib/redis.js';
import { mailConfigured, sendMail } from './_lib/mail.js';
import { renderVerifyEmail } from './_lib/mailTemplates.js';
import { EMAIL_RE, SCHOOL_EMAIL_RE, clientIp, normalizeEmail, readBody } from './_lib/http.js';
import { OTP_STORE_UNAVAILABLE, saveCode } from './_lib/otp.js';

// POST { email } -> 给该邮箱发 6 位验证码（10 分钟有效，同一邮箱 60 秒内只能发一次，同一 IP 每小时最多 20 次）

const COOLDOWN_SECONDS = 60;
const IP_LIMIT_PER_HOUR = 20;

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const email = normalizeEmail(readBody(req)?.email);
  if (!EMAIL_RE.test(email) || email.length > 200) {
    res.status(400).json({ error: 'Please enter a valid email / 请输入有效邮箱' });
    return;
  }
  if (!SCHOOL_EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'Only @scls-sh.org or @stu.scls-sh.org emails are allowed / 仅支持 @scls-sh.org 或 @stu.scls-sh.org 邮箱' });
    return;
  }

  try {
    if (!redisConfigured()) {
      res.status(503).json({ error: OTP_STORE_UNAVAILABLE });
      return;
    }

    const ipKey = `code:ip:${clientIp(req)}`;
    const ipCount = Number(await command('INCR', ipKey));
    if (ipCount === 1) await command('EXPIRE', ipKey, 3600);
    if (ipCount > IP_LIMIT_PER_HOUR) {
      res.status(429).json({ error: 'Too many requests, try again later / 请求过于频繁，请稍后再试' });
      return;
    }

    const cooldown = await command('SET', `code:cooldown:${email}`, '1', 'EX', String(COOLDOWN_SECONDS), 'NX');
    if (cooldown === null) {
      res.status(429).json({ error: 'Please wait a minute before requesting another code / 请 1 分钟后再重新获取验证码' });
      return;
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await saveCode(email, code);

    if (!mailConfigured()) {
      // 本地开发没配发信服务时，把验证码打在终端里，方便调试；线上（有 VERCEL 变量）绝不返回验证码
      if (!process.env.VERCEL) {
        console.log(`[send-code] (dev, no mail transport) ${email} -> ${code}`);
        res.status(200).json({ ok: true, devCode: code });
        return;
      }
      res.status(503).json({ error: 'Email service is not configured / 邮件服务尚未配置' });
      return;
    }

    await sendMail({ to: email, ...renderVerifyEmail(code) });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[send-code]', error);
    res.status(500).json({ error: 'Failed to send the code, please try again / 验证码发送失败，请稍后重试' });
  }
}
