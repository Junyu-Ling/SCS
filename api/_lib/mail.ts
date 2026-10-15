import nodemailer from 'nodemailer';

// 发信方式二选一（按环境变量自动选择）：
//   1) SMTP：SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS（可选 SMTP_FROM）——QQ、163、学校邮箱都能用，能发给任何人
//   2) Resend：RESEND_API_KEY（可选 MAIL_FROM）——需要在 Resend 验证自己的域名后才能发给其他人

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

export function mailConfigured(): boolean {
  return Boolean(env('SMTP_HOST') || env('RESEND_API_KEY'));
}

export async function sendMail(options: { to: string; subject: string; html: string; text?: string }) {
  const smtpHost = env('SMTP_HOST');
  if (smtpHost) {
    const port = Number(env('SMTP_PORT') || 465);
    const user = env('SMTP_USER');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure: port === 465,
      auth: { user, pass: env('SMTP_PASS') },
    });
    await transporter.sendMail({
      from: env('SMTP_FROM') || `SCLS Campus Shop <${user}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return;
  }

  const resendKey = env('RESEND_API_KEY');
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env('MAIL_FROM') || 'SCLS Campus Shop <onboarding@resend.dev>',
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    }
    return;
  }

  throw new Error('No mail transport configured');
}
