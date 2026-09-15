import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Loader2, Mail, GraduationCap, School } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { useLanguage } from '../contexts/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { OTPInput } from './OTPInput';

import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;

const CLASSES = [
  '高一（1）班', '高一（2）班',
  '高二（1）班', '高二（2）班',
  '高三（1）班', '高三（2）班',
];

const EMAIL_DOMAINS = {
  student: ['@stu.scls-sh.org', '@scls-sh.org'],
  teacher: ['@scls-sh.org'],
};

const CODE_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;

const emailSchema = z.object({
  role: z.enum(['student', 'teacher']),
  emailPrefix: z.string().min(1).regex(/^[a-zA-Z0-9._-]+$/),
  emailSuffix: z.string().min(1),
});

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().optional(),
  className: z.string().optional(),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;
type Step = 'email' | 'code' | 'profile';

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  return { ok: response.ok, status: response.status, payload };
}

function RoleSelection({
  selectedRole,
  onSelect,
  t,
}: {
  selectedRole: 'student' | 'teacher';
  onSelect: (role: 'student' | 'teacher') => void;
  t: (en: string, cn: string) => string;
}) {
  const roles = [
    { id: 'student' as const, icon: GraduationCap, label: t("I'm a Student", '我是学生') },
    { id: 'teacher' as const, icon: School, label: t("I'm a Teacher", '我是老师') },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted/50 border border-border/50">
      {roles.map(({ id, icon: Icon, label }) => {
        const active = selectedRole === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-all ${
              active
                ? 'bg-background text-primary shadow-sm ring-1 ring-border/60'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? 'text-primary' : ''}`} />
            <span className="truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function AuthPage() {
  const { t } = useLanguage();
  const { refreshProfile } = useProfile();

  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [boundEmail, setBoundEmail] = useState('');
  const [isNewBinding, setIsNewBinding] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { role: 'student', emailSuffix: EMAIL_DOMAINS.student[0] },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  const role = emailForm.watch('role');
  const cooldownTimer = useRef<number | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownTimer.current = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => {
      if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
    };
  }, [cooldown]);

  const requestCode = async (email: string) => {
    const { ok, status, payload } = await postJson('/send-verification-code', { email });

    if (!ok) {
      const fallback = status === 429
        ? t('Too many requests. Please try again later.', '操作过于频繁，请稍后再试')
        : t('Failed to send code. Please try again later.', '验证码发送失败，请稍后重试');
      toast.error(typeof payload?.error === 'string' && payload.error ? payload.error : fallback);
      return false;
    }

    setIsNewBinding(!!payload?.isNewUser);
    setCooldown(RESEND_COOLDOWN_SECONDS);
    toast.success(t('Verification code sent. Please check your inbox.', '验证码已发送，请查收邮件'));
    return true;
  };

  const onSubmitEmail = async (data: EmailFormValues) => {
    setIsLoading(true);
    try {
      const email = `${data.emailPrefix}${data.emailSuffix}`.toLowerCase();
      if (await requestCode(email)) {
        setBoundEmail(email);
        setVerificationCode('');
        setStep('code');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyCode = async () => {
    if (verificationCode.length !== CODE_LENGTH) return;

    setIsLoading(true);
    try {
      const { ok, payload } = await postJson('/verify-code', {
        email: boundEmail,
        code: verificationCode,
      });

      if (!ok || !payload?.session) {
        toast.error(
          typeof payload?.error === 'string' && payload.error
            ? payload.error
            : t('Verification failed. Please try again.', '验证失败，请重试')
        );
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });

      if (sessionError) {
        console.error('[AUTH] Failed to persist session:', sessionError);
        toast.error(t('Sign-in failed. Please try again.', '登录失败，请重试'));
        return;
      }

      await refreshProfile();

      if (payload.needsProfile) {
        setStep('profile');
        return;
      }

      toast.success(t('Signed in successfully', '登录成功'));
      window.location.hash = '/';
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitProfile = async (data: ProfileFormValues) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error(t('Session expired. Please verify again.', '会话已过期，请重新验证'));
        setStep('email');
        return;
      }

      const { ok, payload } = await postJson('/bind-profile', {
        real_name: `${data.lastName}${data.firstName}`,
        username: data.username,
        role,
        class_name: role === 'student' ? data.className : undefined,
        _auth_token: session.access_token,
      });

      if (!ok) {
        toast.error(
          typeof payload?.error === 'string' && payload.error
            ? payload.error
            : t('Failed to save profile', '资料保存失败')
        );
        return;
      }

      await refreshProfile();
      toast.success(t('Welcome to SCLS Campus Shop!', '欢迎加入 SCLS Campus Shop！'));
      window.location.hash = '/';
    } finally {
      setIsLoading(false);
    }
  };

  const backToEmail = () => {
    setStep('email');
    setVerificationCode('');
  };

  if (step === 'code') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-fit">
              <Mail className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              {isNewBinding
                ? t('Bind Your Email', '绑定你的邮箱')
                : t('Verify Your Email', '验证你的邮箱')}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {t(
                `Enter the ${CODE_LENGTH}-digit code we just emailed you.`,
                `请输入我们刚刚发送到邮箱的 ${CODE_LENGTH} 位验证码。`
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4 pt-4">
            <p className="text-muted-foreground">
              {t('Code sent to:', '验证码已发送至：')}
              <br />
              <span className="font-medium text-foreground block mt-1">{boundEmail}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="verification-code">{t('Verification Code', '验证码')}</Label>
              <OTPInput
                length={CODE_LENGTH}
                value={verificationCode}
                onChange={setVerificationCode}
                disabled={isLoading}
              />
            </div>
            <Button
              type="button"
              variant="link"
              className="text-xs h-auto p-0"
              disabled={isLoading || cooldown > 0}
              onClick={() => void requestCode(boundEmail)}
            >
              {cooldown > 0
                ? t(`Resend in ${cooldown}s`, `${cooldown} 秒后可重新发送`)
                : t('Resend code', '重新发送验证码')}
            </Button>
          </CardContent>
          <CardFooter className="flex-col gap-2 pt-2">
            <Button
              className="w-full"
              type="button"
              disabled={isLoading || verificationCode.length !== CODE_LENGTH}
              onClick={onVerifyCode}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('Continue', '继续')}
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={backToEmail} disabled={isLoading}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {t('Use another email', '换一个邮箱')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === 'profile') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-primary">
              {t('Complete Your Profile', '完善你的资料')}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {t(
                'Your email is bound. Tell us who you are so we can prepare your pickup.',
                '邮箱已绑定。请填写真实信息，以便我们安排取货。'
              )}
            </CardDescription>
          </CardHeader>
          <form onSubmit={profileForm.handleSubmit(onSubmitProfile)}>
            <CardContent className="space-y-4 pt-4">
              <p className="text-xs text-muted-foreground bg-muted/40 px-2.5 py-2 rounded-md border border-border/40 leading-relaxed">
                {t('Bound email: ', '已绑定邮箱：')}
                <span className="font-medium text-foreground">{boundEmail}</span>
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="lastName" className="text-xs font-medium text-foreground/80">
                    {t('Last Name', '姓')}
                  </Label>
                  <Input id="lastName" {...profileForm.register('lastName')} className="h-9 text-sm" />
                  {profileForm.formState.errors.lastName && (
                    <p className="text-[11px] text-destructive">{t('Please enter last name', '请输入姓')}</p>
                  )}
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="firstName" className="text-xs font-medium text-foreground/80">
                    {t('First Name', '名')}
                  </Label>
                  <Input id="firstName" {...profileForm.register('firstName')} className="h-9 text-sm" />
                  {profileForm.formState.errors.firstName && (
                    <p className="text-[11px] text-destructive">{t('Please enter first name', '请输入名')}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-medium text-foreground/80">
                  {t('Nickname (optional)', '昵称（可选）')}
                </Label>
                <Input id="username" {...profileForm.register('username')} className="h-9 text-sm" />
              </div>

              {role === 'student' && (
                <div className="space-y-1.5">
                  <Label htmlFor="className" className="text-xs font-medium text-foreground/80">
                    {t('Class', '班级')}
                  </Label>
                  <Select onValueChange={(val) => profileForm.setValue('className', val)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t('Select Class', '选择班级')} />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSES.map((cls) => (
                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('Finish', '完成绑定')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-page min-h-[calc(100vh-10vh)] flex items-center justify-center px-4 py-8 bg-[#f7faf8] font-sans antialiased">
      <Card className="w-full max-w-[380px] border border-border/50 bg-white/90 backdrop-blur-sm shadow-[0_8px_30px_rgba(23,77,61,0.08)] rounded-xl overflow-hidden">
        <CardHeader className="space-y-1 text-center pb-1 pt-7 px-6">
          <CardTitle className="text-xl font-semibold tracking-tight text-primary">
            SCLS Campus Shop
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            {t(
              'Sign in with your school email — no password needed',
              '使用学校邮箱登录，无需密码'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-4 min-w-0">
          <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-4 min-w-0">
            <RoleSelection
              selectedRole={role}
              onSelect={(r) => {
                emailForm.setValue('role', r);
                emailForm.setValue('emailSuffix', EMAIL_DOMAINS[r][0]);
              }}
              t={t}
            />

            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="email-prefix" className="text-xs font-medium text-foreground/80">
                {t('School Email', '学校邮箱')}
              </Label>
              <div
                className={`flex min-w-0 items-stretch overflow-hidden rounded-lg border bg-background transition-colors focus-within:ring-1 focus-within:ring-primary/30 ${
                  emailForm.formState.errors.emailPrefix
                    ? 'border-destructive/70'
                    : 'border-input focus-within:border-primary/40'
                }`}
              >
                <Input
                  id="email-prefix"
                  placeholder={role === 'student' ? '202xxxxxx' : 'username'}
                  {...emailForm.register('emailPrefix')}
                  className="h-9 min-w-0 flex-1 basis-0 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0 rounded-none"
                />
                <div className="w-px shrink-0 bg-border self-stretch my-2" />
                <Select
                  value={emailForm.watch('emailSuffix')}
                  onValueChange={(val) => emailForm.setValue('emailSuffix', val)}
                >
                  <SelectTrigger
                    size="sm"
                    className="h-9 w-[9.5rem] max-w-[46%] shrink-0 border-0 bg-transparent px-2 text-[11px] shadow-none focus:ring-0 rounded-none [&>span]:truncate"
                  >
                    <SelectValue placeholder="@..." />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {EMAIL_DOMAINS[role].map((domain) => (
                      <SelectItem key={domain} value={domain} className="text-xs">
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {emailForm.formState.errors.emailPrefix && (
                <p className="text-[11px] text-destructive leading-tight">
                  {t('Please enter a valid email username', '请输入正确的邮箱用户名')}
                </p>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-2 rounded-md border border-border/40 leading-relaxed">
              {t(
                'We will email you a code. First-time sign-in binds this address to your account, and lets you contact us from the site.',
                '我们会发送验证码到该邮箱。首次登录即完成绑定，之后可直接在站内联系我们。'
              )}
            </p>

            <Button className="w-full mt-1" size="default" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {t('Send Code', '发送验证码')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
