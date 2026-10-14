import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  CHECKOUT_CLASSES,
  SCHOOL_EMAIL_DOMAINS,
  SCHOOL_EMAIL_RE,
  useCheckoutProfile,
  type CheckoutProfile,
} from '../contexts/CheckoutProfileContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

type CheckoutProfileFormProps = {
  value: CheckoutProfile;
  onChange: (next: CheckoutProfile) => void;
  showNote?: boolean;
};

const RESEND_SECONDS = 60;

async function postJson(path: string, body: unknown) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data } as { ok: boolean; data: { error?: string; devCode?: string } };
}

export default function CheckoutProfileForm({
  value,
  onChange,
  showNote = true,
}: CheckoutProfileFormProps) {
  const { t } = useLanguage();
  const { checkoutProfile, bindVerifiedEmail } = useCheckoutProfile();

  // 邮箱一旦验证就绑定在这台设备上，输入框锁定
  const locked = checkoutProfile.emailVerified && checkoutProfile.email !== '';

  // 邮箱 = 用户名 + 下拉选择的学校后缀
  const [local, setLocal] = useState(() => (value.email.split('@')[0] ?? '').trim());
  const [domain, setDomain] = useState<string>(() => {
    const d = value.email.split('@')[1]?.trim().toLowerCase();
    return SCHOOL_EMAIL_DOMAINS.find((item) => item === d) ?? SCHOOL_EMAIL_DOMAINS[0];
  });
  const composedEmail = local ? `${local}@${domain}` : '';
  const emailValue = locked ? checkoutProfile.email : composedEmail;

  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const update = (patch: Partial<CheckoutProfile>) => {
    onChange({ ...value, ...patch });
  };

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const emailIsSchool = SCHOOL_EMAIL_RE.test(emailValue.trim().toLowerCase());
  const emailLooksValid = emailIsSchool;

  const handleEmailChange = (nextLocal: string, nextDomain: string) => {
    const cleanLocal = nextLocal.split('@')[0].replace(/\s/g, '');
    setLocal(cleanLocal);
    setDomain(nextDomain);
    update({ email: cleanLocal ? `${cleanLocal}@${nextDomain}` : '', emailVerified: false });
    setCodeSent(false);
    setCode('');
  };

  const handleSendCode = async () => {
    if (!emailLooksValid || sending || cooldown > 0) return;
    setSending(true);
    try {
      const { ok, data } = await postJson('/api/send-code', { email: emailValue.trim() });
      if (!ok) {
        toast.error(data.error || t('Failed to send the code', '验证码发送失败'));
        return;
      }
      setCodeSent(true);
      setCooldown(RESEND_SECONDS);
      toast.success(t('Code sent, please check your inbox', '验证码已发送，请查收邮箱'));
      if (data.devCode) toast.info(`Dev code: ${data.devCode}`);
    } catch {
      toast.error(t('Network error, please try again', '网络异常，请稍后重试'));
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(code) || verifying) return;
    setVerifying(true);
    try {
      const { ok, data } = await postJson('/api/verify-code', { email: emailValue.trim(), code });
      if (!ok) {
        toast.error(data.error || t('Verification failed', '验证失败'));
        return;
      }
      bindVerifiedEmail({ ...value, email: emailValue.trim() });
      onChange({ ...value, email: emailValue.trim().toLowerCase(), emailVerified: true });
      setCodeSent(false);
      setCode('');
      toast.success(t('Email verified and bound to this device', '邮箱已验证，并绑定到这台设备'));
    } catch {
      toast.error(t('Network error, please try again', '网络异常，请稍后重试'));
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="checkout-email">
            {t('Step 1 · School email', '第 1 步 · 学校邮箱')}
          </Label>
          {locked ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#174D3D]">
              <BadgeCheck className="h-3.5 w-3.5" />
              {t('Verified', '已验证')}
            </span>
          ) : null}
        </div>

        {locked ? (
          <Input
            id="checkout-email"
            value={emailValue}
            disabled
            className="h-10 min-w-0 rounded-xl disabled:bg-[#EEF4F1] disabled:text-[#174D3D] disabled:opacity-100"
          />
        ) : (
          <div className="flex items-center gap-2">
            <Input
              id="checkout-email"
              value={local}
              autoComplete="username"
              onChange={(e) => handleEmailChange(e.target.value, domain)}
              placeholder={t('Username', '邮箱用户名')}
              className="h-10 min-w-0 flex-1 rounded-xl"
            />
            <Select value={domain} onValueChange={(next) => handleEmailChange(local, next)}>
              <SelectTrigger
                aria-label={t('Email domain', '邮箱后缀')}
                className="h-10 w-[172px] shrink-0 rounded-xl"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_EMAIL_DOMAINS.map((item) => (
                  <SelectItem key={item} value={item}>
                    @{item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!locked ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleSendCode}
            disabled={!emailLooksValid || sending || cooldown > 0}
            className="h-10 w-full rounded-xl border-[#174D3D] text-[#174D3D] hover:bg-[#EEF4F1]"
          >
            {cooldown > 0
              ? t(`Resend in ${cooldown}s`, `${cooldown} 秒后可重新发送`)
              : codeSent
                ? t('Resend code', '重新发送验证码')
                : t('Send code', '发送验证码')}
          </Button>
        ) : null}

        {locked ? (
          <p className="text-xs leading-[1.6] text-[#4A5E55]">
            {t(
              'This email is verified and bound to this device. It can no longer be changed.',
              '该邮箱已验证并绑定在这台设备上，不能再修改。'
            )}
          </p>
        ) : (
          <p className="text-xs leading-[1.6] text-[#4A5E55]">
            {t(
              'Students use @stu.scls-sh.org, teachers use @scls-sh.org. Verify it first, then fill in the rest. Once verified it is bound and cannot be changed.',
              '学生选 @stu.scls-sh.org，老师选 @scls-sh.org。先验证邮箱，再填写其他信息；验证后将被绑定，不能再修改。'
            )}
          </p>
        )}
        {!locked && emailValue.trim() !== '' && !emailIsSchool ? (
          <p className="text-xs leading-[1.6] text-red-600">
            {t(
              'Only @scls-sh.org or @stu.scls-sh.org emails are supported.',
              '仅支持 @scls-sh.org 或 @stu.scls-sh.org 结尾的邮箱。'
            )}
          </p>
        ) : null}

        {!locked && codeSent ? (
          <div className="flex items-center gap-2 pt-1">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder={t('6-digit code', '6 位验证码')}
              className="h-10 min-w-0 flex-1 rounded-xl tracking-[0.3em]"
            />
            <Button
              type="button"
              onClick={handleVerify}
              disabled={code.length !== 6 || verifying}
              className="h-10 shrink-0 rounded-xl px-4"
            >
              {t('Verify', '验证')}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="checkout-name">
          {t('Step 2 · Real name', '第 2 步 · 真实姓名')}
        </Label>
        <Input
          id="checkout-name"
          value={value.realName}
          disabled={!locked}
          onChange={(e) => update({ realName: e.target.value })}
          placeholder={
            locked ? t('Your name', '请输入真实姓名') : t('Verify your email first', '请先验证邮箱')
          }
          className="h-10 rounded-xl disabled:cursor-not-allowed disabled:bg-[#F3F5F4]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="checkout-class">{t('Class', '班级')}</Label>
        <Select
          value={value.className || undefined}
          disabled={!locked}
          onValueChange={(className) => update({ className })}
        >
          <SelectTrigger id="checkout-class" className="h-10 rounded-xl disabled:cursor-not-allowed disabled:bg-[#F3F5F4]">
            <SelectValue placeholder={t('Select class', '请选择班级')} />
          </SelectTrigger>
          <SelectContent>
            {CHECKOUT_CLASSES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showNote ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checkout-note">
            {t('Note (optional)', '留言（可选）')}
          </Label>
          <Textarea
            id="checkout-note"
            value={value.note}
            disabled={!locked}
            onChange={(e) => update({ note: e.target.value })}
            placeholder={t('Anything we should know', '有需要说明的可以写在这里')}
            className="min-h-[88px] rounded-xl"
          />
        </div>
      ) : null}
    </div>
  );
}
