import nodemailer from 'nodemailer';

// 发信方式二选一（按环境变量自动选择）：
//   1) SMTP：SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS（可选 SMTP_FROM）——QQ、163、学校邮箱都能用，能发给任何人
//   2) Resend：RESEND_API_KEY（可选 MAIL_FROM）——需要在 Resend 验证自己的域名后才能发给其他人

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY);
}

export async function sendMail(options: { to: string; subject: string; html: string; text?: string }) {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `SCLS Campus Shop <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return;
  }

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'SCLS Campus Shop <onboarding@resend.dev>',
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
