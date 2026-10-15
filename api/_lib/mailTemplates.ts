// 邮件模板（纯函数，无副作用）。
// 邮件客户端安全：table 布局 + 内联 CSS，无外部资源 / 字体 / 脚本；所有元素显式写背景色与文字色（深色模式友好）。
// 所有动态字符串都会经过 HTML 转义。

// ---------------------------------------------------------------- 类型

export type MailOrderItem = {
  name: string;
  color?: string | null;
  size?: string | null;
  quantity: number;
  price: number; // 单价（元）
};

export type MailOrder = {
  id: string | number;
  createdAt?: string | number | Date | null;
  buyer: {
    realName?: string | null;
    email?: string | null;
    className?: string | null;
    note?: string | null;
  };
  items: MailOrderItem[];
  total?: number | null; // 不传则按 items 自动汇总
};

export type RenderedMail = { subject: string; html: string; text: string };

// ---------------------------------------------------------------- 常量

const DEFAULT_ADMIN_EMAILS = ['202760149@stu.scls-sh.org', '202760107@stu.scls-sh.org', '202760102@stu.scls-sh.org'];

export function parseEmailList(value: string | undefined | null): string[] {
  return (value ?? '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

// 下单通知固定发给这三位初始管理员。ADMIN_NOTIFY_EMAILS 只能追加收件人，不能把他们换成一个人。
// 用 process.env[name] 在发信时读取，避免构建期把变量内联成空字符串或单个地址。
export function adminNotifyRecipients(): string[] {
  const fromEnv = parseEmailList(process.env['ADMIN_NOTIFY_EMAILS']);
  return [...new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv])];
}

const CODE_TTL_MINUTES = 10;

const ADMIN_CONTACT = { name: 'Junyu Ling 🐭', email: '202760149@stu.scls-sh.org' };

const C = {
  green: '#174D3D',
  mint: '#A8D5C2',
  tint: '#EEF4F1',
  muted: '#4A5E55',
  ink: '#10231C',
  line: '#D8E5DE',
  white: '#FFFFFF',
  onGreenSoft: '#CFE8DC',
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace";

// ---------------------------------------------------------------- 工具函数

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const escMultiline = (value: unknown) => escapeHtml(value).replace(/\r\n|\r|\n/g, '<br />');

// 邮件标题里不能有换行 / 控制字符
const cleanLine = (value: unknown, max = 80) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, max);

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const qtyOf = (item: MailOrderItem) => Math.max(0, Math.floor(num(item.quantity)));

function money(value: number): string {
  const n = Math.round(value * 100) / 100;
  return `¥${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

function orderTotal(order: MailOrder): number {
  if (order.total != null && Number.isFinite(Number(order.total))) return num(order.total);
  return (order.items ?? []).reduce((sum, it) => sum + num(it.price) * qtyOf(it), 0);
}

function orderLabel(order: MailOrder): string {
  const id = cleanLine(order.id, 64);
  return id.length > 12 ? `#${id.slice(0, 8).toUpperCase()}` : `#${id}`;
}

// 按北京时间（UTC+8）格式化，不依赖运行环境的时区 / ICU
function formatTime(value: MailOrder['createdAt']): string {
  const d = value == null || value === '' ? new Date() : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const s = new Date(d.getTime() + 8 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${s.getUTCFullYear()}-${p(s.getUTCMonth() + 1)}-${p(s.getUTCDate())} ${p(s.getUTCHours())}:${p(s.getUTCMinutes())} (UTC+8)`;
}

function itemVariant(item: MailOrderItem): string {
  return [item.color, item.size]
    .map((v) => cleanLine(v, 40))
    .filter(Boolean)
    .join(' · ');
}

// ---------------------------------------------------------------- 公共 HTML 片段

type LayoutOptions = { title: string; subtitle?: string; preheader: string; body: string };

function layout({ title, subtitle, preheader, body }: LayoutOptions): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>SCS &middot; SCLS Campus Shop</title>
</head>
<body style="margin:0;padding:0;background-color:${C.tint};color:${C.ink};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.tint};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.tint}" style="background-color:${C.tint};">
<tr><td align="center" style="padding:24px 12px;background-color:${C.tint};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-collapse:separate;border-spacing:0;">
    <tr><td bgcolor="${C.green}" style="background-color:${C.green};border-radius:16px 16px 0 0;padding:26px 24px 24px 24px;font-family:${FONT};">
      <div style="font-size:12px;line-height:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.mint};">SCS &middot; SCLS Campus Shop</div>
      <div style="margin-top:12px;font-size:22px;line-height:30px;font-weight:700;color:${C.white};">${title}</div>${
        subtitle
          ? `
      <div style="margin-top:4px;font-size:15px;line-height:22px;color:${C.onGreenSoft};">${subtitle}</div>`
          : ''
      }
    </td></tr>
    <tr><td bgcolor="${C.white}" style="background-color:${C.white};padding:26px 24px 8px 24px;font-family:${FONT};font-size:15px;line-height:24px;color:${C.ink};border-left:1px solid ${C.line};border-right:1px solid ${C.line};">
${body}
    </td></tr>
    <tr><td bgcolor="${C.white}" style="background-color:${C.white};padding:0 24px 26px 24px;font-family:${FONT};border-left:1px solid ${C.line};border-right:1px solid ${C.line};border-bottom:1px solid ${C.line};border-radius:0 0 16px 16px;">
      <div style="height:1px;line-height:1px;font-size:1px;background-color:${C.line};margin:0 0 16px 0;">&nbsp;</div>
      <div style="font-size:12px;line-height:18px;color:${C.muted};">SCLS Campus Shop &middot; 学校内部校园商店<br />This is an automated message, please do not reply to it directly. 这是一封系统自动发送的邮件，请勿直接回复。</div>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

// 英文主句 + 中文辅句
function para(en: string, zh?: string, extraStyle = ''): string {
  return `<p style="margin:0 0 16px 0;color:${C.ink};${extraStyle}">${en}${
    zh ? `<br /><span style="font-size:13.5px;line-height:21px;color:${C.muted};">${zh}</span>` : ''
  }</p>`;
}

function contactCard(): string {
  const mail = escapeHtml(ADMIN_CONTACT.email);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;border-collapse:separate;border-spacing:0;">
  <tr><td bgcolor="${C.tint}" style="background-color:${C.tint};border-left:4px solid ${C.green};border-radius:8px;padding:14px 18px;font-family:${FONT};">
    <div style="font-size:13px;line-height:20px;color:${C.muted};">Need help? Contact our IT administrator<br />需要帮助？请联系 IT 管理员</div>
    <div style="margin-top:6px;font-size:20px;line-height:28px;font-weight:700;color:${C.green};">${escapeHtml(ADMIN_CONTACT.name)}</div>
    <div style="margin-top:2px;font-size:15px;line-height:24px;word-break:break-all;"><a href="mailto:${mail}" style="color:${C.green};text-decoration:underline;">${mail}</a></div>
  </td></tr>
</table>`;
}

function signOff(): string {
  return `<p style="margin:24px 0 0 0;color:${C.ink};">We wish you a pleasant experience and a wonderful day ahead 😊<br />
<span style="font-size:13.5px;line-height:21px;color:${C.muted};">祝您购物愉快，度过美好的一天 😊</span></p>
<p style="margin:16px 0 20px 0;color:${C.ink};">Best regards,<br /><strong style="color:${C.green};">The SCS (SCLS Campus Shop) Team ❤</strong></p>`;
}

const TEXT_CONTACT = `Need help? Contact our IT administrator / 需要帮助？请联系 IT 管理员\n${ADMIN_CONTACT.name} - ${ADMIN_CONTACT.email}`;

// ---------------------------------------------------------------- 1. 验证码邮件

export function renderVerifyEmail(code: string): RenderedMail {
  const safeCode = escapeHtml(code);
  const plainCode = cleanLine(code, 20);

  const body = `
${para(
  `Thank you for registering with <strong>SCS (SCLS Campus Shop)</strong>. We're delighted to have you join our campus community.`,
  `感谢您注册 <strong>SCS (SCLS Campus Shop)</strong>，欢迎加入我们的校园社区。`,
)}
${para('To activate your account, please use the verification code below:', '请使用下方验证码激活您的账号：')}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;border-collapse:separate;border-spacing:0;">
  <tr><td align="center" bgcolor="${C.tint}" style="background-color:${C.tint};border:2px dashed ${C.mint};border-radius:12px;padding:20px 12px 18px 12px;font-family:${FONT};">
    <div style="font-family:${MONO};font-size:34px;line-height:42px;font-weight:700;letter-spacing:8px;padding-left:8px;color:${C.green};">${safeCode}</div>
    <div style="margin-top:8px;font-size:13px;line-height:20px;color:${C.muted};">Valid for ${CODE_TTL_MINUTES} minutes &middot; ${CODE_TTL_MINUTES} 分钟内有效</div>
  </td></tr>
</table>
${para('Please enter this code in the app or website to complete your registration.', '请在网站中输入此验证码，完成注册。')}
<p style="margin:0;font-size:13.5px;line-height:21px;color:${C.muted};">This verification code will expire in ${CODE_TTL_MINUTES} minutes. If it expires, please request a new one.<br />验证码将在 ${CODE_TTL_MINUTES} 分钟后失效，失效后请重新获取。</p>
${contactCard()}
<p style="margin:24px 0 0 0;color:${C.ink};">If you did not create this account, you may safely ignore this email.<br />
<span style="font-size:13.5px;line-height:21px;color:${C.muted};">如果这不是您本人的操作，请直接忽略这封邮件。</span></p>
${signOff()}`;

  const html = layout({
    title: 'Welcome to SCS (SCLS Campus Shop) ❤',
    subtitle: '欢迎来到 SCS 校园商店',
    preheader: `Your verification code is ${plainCode} (valid for ${CODE_TTL_MINUTES} minutes). 您的验证码是 ${plainCode}。`,
    body,
  });

  const text = [
    'Welcome to SCS (SCLS Campus Shop) ❤ / 欢迎来到 SCS 校园商店',
    '',
    "Thank you for registering with SCS (SCLS Campus Shop). We're delighted to have you join our campus community.",
    '感谢您注册 SCS (SCLS Campus Shop)，欢迎加入我们的校园社区。',
    '',
    'To activate your account, please use the verification code below:',
    '请使用下方验证码激活您的账号：',
    '',
    `    ${plainCode}`,
    '',
    `Valid for ${CODE_TTL_MINUTES} minutes. / ${CODE_TTL_MINUTES} 分钟内有效。`,
    'Please enter this code in the app or website to complete your registration. If it expires, please request a new one.',
    '请在网站中输入此验证码完成注册；失效后请重新获取。',
    '',
    TEXT_CONTACT,
    '',
    'If you did not create this account, you may safely ignore this email. / 如果这不是您本人的操作，请直接忽略这封邮件。',
    '',
    'We wish you a pleasant experience and a wonderful day ahead 😊',
    'Best regards,',
    'The SCS (SCLS Campus Shop) Team ❤',
  ].join('\n');

  return { subject: `SCS 验证码 / Verification code: ${plainCode}`, html, text };
}

// ---------------------------------------------------------------- 订单表格（学生 / 管理员共用）

function itemsTable(items: MailOrderItem[], total: number, compact: boolean): string {
  const pad = compact ? '8px 4px' : '12px 4px';
  const fs = compact ? 13 : 14;
  const th = (label: string, align: 'left' | 'right' | 'center', width?: string) =>
    `<th align="${align}" ${width ? `width="${width}" ` : ''}style="padding:8px 4px;background-color:${C.tint};font-family:${FONT};font-size:11px;line-height:16px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${C.muted};text-align:${align};">${label}</th>`;

  const rows = items
    .map((item) => {
      const q = qtyOf(item);
      const unit = num(item.price);
      const variant = itemVariant(item);
      return `<tr>
    <td valign="top" style="padding:${pad};border-bottom:1px solid ${C.line};font-family:${FONT};font-size:${fs}px;line-height:20px;color:${C.ink};background-color:${C.white};"><strong>${escapeHtml(cleanLine(item.name, 120))}</strong>${
      `<br /><span style="font-size:12px;line-height:18px;color:${C.muted};">${escapeHtml(variant ? `${variant} · ` : '')}${money(unit)} each 每件</span>`
    }</td>
    <td valign="top" align="center" style="padding:${pad};border-bottom:1px solid ${C.line};font-family:${FONT};font-size:${fs}px;line-height:20px;color:${C.ink};background-color:${C.white};">&times;${q}</td>
    <td valign="top" align="right" style="padding:${pad};border-bottom:1px solid ${C.line};font-family:${FONT};font-size:${fs}px;line-height:20px;font-weight:700;color:${C.ink};background-color:${C.white};white-space:nowrap;">${money(unit * q)}</td>
  </tr>`;
    })
    .join('\n  ');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0;">
  <tr>${th('Item 商品', 'left')}${th('Qty<br />数量', 'center', '44')}${th('Total<br />小计', 'right', '64')}</tr>
  ${rows}
  <tr><td colspan="3" align="right" style="padding:14px 4px 4px 4px;font-family:${FONT};background-color:${C.white};">
    <span style="font-size:13px;line-height:20px;color:${C.muted};">Total 合计&nbsp;&nbsp;</span><span style="font-size:${compact ? 20 : 24}px;line-height:30px;font-weight:700;color:${C.green};">${money(total)}</span>
  </td></tr>
</table>`;
}

function itemsText(items: MailOrderItem[]): string {
  return items
    .map((it) => {
      const q = qtyOf(it);
      const variant = itemVariant(it);
      return `- ${cleanLine(it.name, 120)}${variant ? ` (${variant})` : ''} x${q}  ${money(num(it.price))} = ${money(num(it.price) * q)}`;
    })
    .join('\n');
}

// ---------------------------------------------------------------- 2. 学生订单确认邮件

export function renderOrderConfirmationEmail(order: MailOrder): RenderedMail {
  const items = order.items ?? [];
  const total = orderTotal(order);
  const label = orderLabel(order);
  const name = cleanLine(order.buyer?.realName, 60);
  const className = cleanLine(order.buyer?.className, 60);
  const note = String(order.buyer?.note ?? '').trim();
  const created = formatTime(order.createdAt);

  const infoRow = (en: string, zh: string, value: string) =>
    `<tr>
      <td valign="top" width="1" style="white-space:nowrap;padding:6px 16px 6px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};">${en} ${zh}</td>
      <td valign="top" style="padding:6px 0;font-family:${FONT};font-size:14px;line-height:20px;font-weight:600;color:${C.ink};">${value}</td>
    </tr>`;

  const info = [
    infoRow('Order', '订单号', `<span style="font-family:${MONO};color:${C.green};">${escapeHtml(label)}</span>`),
    name ? infoRow('Name', '姓名', escapeHtml(name)) : '',
    className ? infoRow('Class', '班级', escapeHtml(className)) : '',
    created ? infoRow('Placed', '下单时间', escapeHtml(created)) : '',
  ].join('');

  const body = `
${para(
  `Hi${name ? ` <strong>${escapeHtml(name)}</strong>` : ''}, thank you for your order at <strong>SCS (SCLS Campus Shop)</strong>! We have received your reservation.`,
  `${name ? `${escapeHtml(name)}，` : ''}感谢您在 <strong>SCS (SCLS Campus Shop)</strong>下单！我们已收到您的预订。`,
)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px 0;border-collapse:separate;border-spacing:0;">
  <tr><td bgcolor="${C.tint}" style="background-color:${C.tint};border:1px solid ${C.line};border-radius:12px;padding:10px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${info}</table>
  </td></tr>
</table>
<div style="margin:0 0 8px 0;font-family:${FONT};font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.green};">Your items &middot; 订单商品</div>
${itemsTable(items, total, false)}
${
  note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0 0;border-collapse:separate;border-spacing:0;">
  <tr><td bgcolor="${C.tint}" style="background-color:${C.tint};border-radius:8px;padding:12px 16px;font-family:${FONT};font-size:14px;line-height:21px;color:${C.ink};"><span style="font-size:12px;color:${C.muted};">Your note 您的备注</span><br />${escMultiline(note)}</td></tr>
</table>`
    : ''
}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 0 0;border-collapse:separate;border-spacing:0;">
  <tr><td bgcolor="${C.white}" style="background-color:${C.white};border:2px dashed ${C.mint};border-radius:12px;padding:14px 18px;font-family:${FONT};font-size:14px;line-height:22px;color:${C.ink};">
    <strong style="color:${C.green};">📦 Pickup / 取货说明</strong><br />
    This is a campus pickup reservation. We will contact you at this email address with pickup details once your items are ready.<br />
    <span style="font-size:13px;line-height:21px;color:${C.muted};">这是校内自取预订。商品准备好后，我们会通过此邮箱联系您，告知取货安排。请保留此邮件作为凭证。</span>
  </td></tr>
</table>
${contactCard()}
<p style="margin:24px 0 0 0;color:${C.ink};">If you did not place this order, please let us know right away.<br />
<span style="font-size:13.5px;line-height:21px;color:${C.muted};">如果这不是您本人下的订单，请立即联系我们。</span></p>
${signOff()}`;

  const html = layout({
    title: 'Order received 🎉',
    subtitle: `订单已收到 · ${escapeHtml(label)}`,
    preheader: `We received your order ${label} (${money(total)}). 我们已收到您的订单。`,
    body,
  });

  const text = [
    `Order received 🎉 / 订单已收到 (${label})`,
    '',
    `Hi${name ? ` ${name}` : ''}, thank you for your order at SCS (SCLS Campus Shop)! We have received your reservation.`,
    '感谢您在 SCS (SCLS Campus Shop)下单！我们已收到您的预订。',
    '',
    `Order / 订单号: ${label}`,
    name ? `Name / 姓名: ${name}` : '',
    className ? `Class / 班级: ${className}` : '',
    created ? `Placed / 下单时间: ${created}` : '',
    '',
    'Items / 订单商品:',
    itemsText(items),
    `Total / 合计: ${money(total)}`,
    note ? `\nYour note / 您的备注: ${note}` : '',
    '',
    'Pickup / 取货说明: This is a campus pickup reservation. We will contact you at this email address with pickup details once your items are ready.',
    '这是校内自取预订。商品准备好后，我们会通过此邮箱联系您，告知取货安排。',
    '',
    TEXT_CONTACT,
    '',
    'If you did not place this order, please let us know right away. / 如果这不是您本人下的订单，请立即联系我们。',
    '',
    'We wish you a pleasant experience and a wonderful day ahead 😊',
    'Best regards,',
    'The SCS (SCLS Campus Shop) Team ❤',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n');

  return { subject: `SCS 订单确认 / Order confirmation ${label}`, html, text };
}

// ---------------------------------------------------------------- 3. 管理员通知邮件

export function renderAdminOrderNotificationEmail(order: MailOrder): RenderedMail {
  const items = order.items ?? [];
  const total = orderTotal(order);
  const label = orderLabel(order);
  const name = cleanLine(order.buyer?.realName, 60) || '(unknown)';
  const className = cleanLine(order.buyer?.className, 60) || '-';
  const email = cleanLine(order.buyer?.email, 200);
  const note = String(order.buyer?.note ?? '').trim();
  const created = formatTime(order.createdAt);
  const count = items.reduce((s, it) => s + qtyOf(it), 0);

  const row = (k: string, v: string) =>
    `<tr>
      <td valign="top" width="1" style="white-space:nowrap;padding:5px 16px 5px 0;font-family:${FONT};font-size:12px;line-height:20px;color:${C.muted};">${k}</td>
      <td valign="top" style="padding:5px 0;font-family:${FONT};font-size:14px;line-height:20px;font-weight:600;color:${C.ink};">${v}</td>
    </tr>`;

  const emailHtml = email
    ? `<a href="mailto:${escapeHtml(email)}" style="color:${C.green};text-decoration:underline;">${escapeHtml(email)}</a>`
    : '-';

  const body = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;border-collapse:separate;border-spacing:0;">
  <tr><td bgcolor="${C.tint}" style="background-color:${C.tint};border:1px solid ${C.line};border-radius:12px;padding:8px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${row('Order 订单', `<span style="font-family:${MONO};color:${C.green};">${escapeHtml(label)}</span>`)}
      ${row('Name 姓名', escapeHtml(name))}
      ${row('Class 班级', escapeHtml(className))}
      ${row('Email 邮箱', emailHtml)}
      ${created ? row('Time 时间', escapeHtml(created)) : ''}
    </table>
  </td></tr>
</table>
${itemsTable(items, total, true)}
${
  note
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 0 0;border-collapse:separate;border-spacing:0;">
  <tr><td bgcolor="${C.tint}" style="background-color:${C.tint};border-left:4px solid ${C.mint};border-radius:8px;padding:10px 14px;font-family:${FONT};font-size:14px;line-height:21px;color:${C.ink};"><span style="font-size:12px;color:${C.muted};">Note 备注</span><br />${escMultiline(note)}</td></tr>
</table>`
    : ''
}
<p style="margin:20px 0 20px 0;font-size:12px;line-height:18px;color:${C.muted};">Reply to the buyer directly at the email above to arrange pickup. 如需安排取货，请直接联系上方邮箱。</p>`;

  const html = layout({
    title: `🛒 New order ${escapeHtml(label)}`,
    subtitle: `${escapeHtml(name)} · ${count} item${count === 1 ? '' : 's'} · ${money(total)}`,
    preheader: `${name} (${className}) placed an order: ${money(total)}`,
    body,
  });

  const text = [
    `New order ${label} / 新订单`,
    `Name / 姓名: ${name}`,
    `Class / 班级: ${className}`,
    `Email / 邮箱: ${email || '-'}`,
    created ? `Time / 时间: ${created}` : '',
    '',
    itemsText(items),
    `Total / 合计: ${money(total)}`,
    note ? `\nNote / 备注: ${note}` : '',
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n');

  return { subject: `[SCS] New order ${label} · ${cleanLine(name, 40)} · ${money(total)}`, html, text };
}
