import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { OTPInput } from './OTPInput';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const SCHOOL_EMAIL_RE = /^[^\s@]+@(stu\.)?scls-sh\.org$/;

/**
 * 管理员登录：邮箱验证码 → 服务端签发 HttpOnly 会话 Cookie（7 天）。
 * 学生不需要登录（下单时只验证邮箱）。
 */
export default function AuthPage() {
  const { t } = useLanguage();
  const { refreshProfile, isAdmin, loading } = useProfile();

  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!loading && isAdmin) window.location.hash = '/admin';
  }, [loading, isAdmin]);

  const normalized = email.trim().toLowerCase();
  const emailOk = SCHOOL_EMAIL_RE.test(normalized);

  const sendCode = async () => {
    if (!emailOk || busy || cooldown > 0) return;
    setBusy(true);
    try {
      const data = await api<{ devCode?: string }>('/api/send-code', { method: 'POST', body: { email: normalized } });
      setStep('code');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success(t('Code sent, please check your inbox', '验证码已发送，请查收邮箱'));
      if (data.devCode) toast.info(`Dev code: ${data.devCode}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Failed to send the code', '验证码发送失败'));
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    if (code.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    try {
      await api('/api/admin-session', { method: 'POST', body: { email: normalized, code } });
      await refreshProfile();
      toast.success(t('Signed in', '登录成功'));
      window.location.hash = '/admin';
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setStep('email');
        setCode('');
      }
      toast.error(err instanceof Error ? err.message : t('Sign-in failed', '登录失败'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 bg-[#F7FAF8]">
      <Card className="w-full max-w-md rounded-2xl border border-[#D6E2DC] shadow-none">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF4F1] text-[#174D3D]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>{t('Admin sign in', '管理员登录')}</CardTitle>
          <CardDescription>
            {step === 'email'
              ? t('Enter your admin school email to receive a 6-digit code.', '输入管理员学校邮箱，我们会发送 6 位验证码。')
              : t(`We sent a code to ${normalized}.`, `验证码已发送到 ${normalized}。`)}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {step === 'email' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-email">{t('School email', '学校邮箱')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void sendCode()}
                  placeholder="name@stu.scls-sh.org"
                  className="h-11 rounded-xl pl-9"
                />
              </div>
              {email !== '' && !emailOk ? (
                <p className="text-xs text-red-600">
                  {t('Only @scls-sh.org or @stu.scls-sh.org emails are supported.', '仅支持 @scls-sh.org 或 @stu.scls-sh.org 邮箱。')}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <OTPInput length={CODE_LENGTH} value={code} onChange={setCode} disabled={busy} />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {step === 'email' ? (
            <Button onClick={() => void sendCode()} disabled={!emailOk || busy} className="h-11 w-full rounded-xl">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Send code', '发送验证码')}
            </Button>
          ) : (
            <>
              <Button onClick={() => void login()} disabled={code.length !== CODE_LENGTH || busy} className="h-11 w-full rounded-xl">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('Sign in', '登录')}
              </Button>
              <div className="flex w-full items-center justify-between">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-[#4A5E55] hover:text-[#174D3D]"
                  onClick={() => {
                    setStep('email');
                    setCode('');
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('Change email', '更换邮箱')}
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || busy}
                  className="text-xs text-[#4A5E55] hover:text-[#174D3D] disabled:opacity-50"
                  onClick={() => void sendCode()}
                >
                  {cooldown > 0 ? t(`Resend in ${cooldown}s`, `${cooldown} 秒后可重新发送`) : t('Resend code', '重新发送验证码')}
                </button>
              </div>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
