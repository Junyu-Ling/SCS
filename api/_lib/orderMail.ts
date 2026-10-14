import { mailConfigured, sendMail } from './mail';
import {
  ADMIN_NOTIFY_EMAILS,
  renderAdminOrderNotificationEmail,
  renderOrderConfirmationEmail,
  type MailOrder,
} from './mailTemplates';

export type OrderMailResult = {
  // 未配置发信服务时为 true（只记录日志，不发送）
  skipped: boolean;
  sent: number;
  failed: number;
  results: { kind: 'student' | 'admin'; to: string; ok: boolean; error?: string }[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 下单后发送：学生确认邮件 + 管理员通知邮件（给每位管理员单独发一封）。
// 永远不会抛异常——邮件失败不能影响订单本身。调用方可以 `await sendOrderEmails(order)`，
// 在 Vercel 上需要 await（函数返回后进程会被冻结），否则邮件可能发不出去。
export async function sendOrderEmails(order: MailOrder): Promise<OrderMailResult> {
  const empty: OrderMailResult = { skipped: false, sent: 0, failed: 0, results: [] };

  try {
    if (!mailConfigured()) {
      console.warn(`[order-mail] mail transport not configured, skipping emails for order ${String(order?.id)}`);
      return { ...empty, skipped: true };
    }

    const jobs: { kind: 'student' | 'admin'; to: string; run: () => Promise<void> }[] = [];

    const studentEmail = String(order.buyer?.email ?? '').trim().toLowerCase();
    if (EMAIL_RE.test(studentEmail)) {
      jobs.push({
        kind: 'student',
        to: studentEmail,
        run: () => sendMail({ to: studentEmail, ...renderOrderConfirmationEmail(order) }),
      });
    } else {
      console.warn(`[order-mail] order ${String(order?.id)} has no valid buyer email, skipping student confirmation`);
    }

    const adminMail = renderAdminOrderNotificationEmail(order);
    for (const to of new Set(ADMIN_NOTIFY_EMAILS)) {
      jobs.push({ kind: 'admin', to, run: () => sendMail({ to, ...adminMail }) });
    }

    const settled = await Promise.allSettled(jobs.map((job) => job.run()));

    const results = settled.map((s, i) => {
      const { kind, to } = jobs[i];
      if (s.status === 'fulfilled') return { kind, to, ok: true };
      const error = s.reason instanceof Error ? s.reason.message : String(s.reason);
      console.error(`[order-mail] failed to send ${kind} mail to ${to}:`, error);
      return { kind, to, ok: false, error };
    });

    const sent = results.filter((r) => r.ok).length;
    return { skipped: false, sent, failed: results.length - sent, results };
  } catch (error) {
    // 理论上不会到这里（例如模板渲染遇到异常的订单数据）；兜底保证不抛出
    console.error('[order-mail] unexpected error:', error);
    return { ...empty, failed: 1, results: [{ kind: 'admin', to: '', ok: false, error: String(error) }] };
  }
}
