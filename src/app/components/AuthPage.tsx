import { useState } from 'react';
import { useForm, UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Mail, GraduationCap, School } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, setAuthPersistence } from '../../lib/supabaseClient';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';
import { useLanguage } from '../contexts/LanguageContext';
import { OTPInput } from './OTPInput';

import { Checkbox } from './ui/checkbox';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const CLASSES = [
  '高一（1）班', '高一（2）班',
  '高二（1）班', '高二（2）班',
  '高三（1）班', '高三（2）班',
];

const EMAIL_DOMAINS = {
  student: ['@stu.scls-sh.org', '@scls-sh.org'],
  teacher: ['@scls-sh.org']
};

// --- Schemas ---

const loginSchema = z.object({
  role: z.enum(['student', 'teacher']),
  emailPrefix: z.string().min(1),
  emailSuffix: z.string().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().default(true),
});

const signupSchema = z.object({
  role: z.enum(['student', 'teacher']),
  emailPrefix: z.string().min(1).regex(/^[a-zA-Z0-9._-]+$/),
  emailSuffix: z.string().min(1),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  username: z.string().min(2),
  className: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === 'student' && !data.className) {
    return false;
  }
  return true;
}, {
  path: ["className"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

// --- Components ---

interface RoleSelectionProps {
  selectedRole: 'student' | 'teacher';
  onSelect: (role: 'student' | 'teacher') => void;
  t: (en: string, cn: string) => string;
}

function RoleSelection({ selectedRole, onSelect, t }: RoleSelectionProps) {
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

function EmailField({
  idPrefix,
  role,
  suffixValue,
  onSuffixChange,
  prefixError,
  prefixErrorMessage,
  prefixRegister,
  t,
}: {
  idPrefix: string;
  role: 'student' | 'teacher';
  suffixValue: string;
  onSuffixChange: (v: string) => void;
  prefixError?: boolean;
  prefixErrorMessage?: string;
  prefixRegister: UseFormRegister<LoginFormValues | SignupFormValues>;
  t: (en: string, cn: string) => string;
}) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label htmlFor={`${idPrefix}-email-prefix`} className="text-xs font-medium text-foreground/80">
        {t('Email Username', '邮箱用户名')}
      </Label>
      <div
        className={`flex min-w-0 items-stretch overflow-hidden rounded-lg border bg-background transition-colors focus-within:ring-1 focus-within:ring-primary/30 ${
          prefixError ? 'border-destructive/70' : 'border-input focus-within:border-primary/40'
        }`}
      >
        <Input
          id={`${idPrefix}-email-prefix`}
          placeholder={role === 'student' ? '202xxxxxx' : 'username'}
          {...prefixRegister('emailPrefix' as 'emailPrefix')}
          className="h-9 min-w-0 flex-1 basis-0 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0 rounded-none"
        />
        <div className="w-px shrink-0 bg-border self-stretch my-2" />
        <Select value={suffixValue} onValueChange={onSuffixChange}>
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
      {prefixError && prefixErrorMessage && (
        <p className="text-[11px] text-destructive leading-tight">{prefixErrorMessage}</p>
      )}
    </div>
  );
}

// --- Main Page ---

export default function AuthPage() {
  const { language, t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckEmail, setShowCheckEmail] = useState(false);
  const [checkEmailAddress, setCheckEmailAddress] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingSignupData, setPendingSignupData] = useState<SignupFormValues | null>(null);

  // Forms
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { role: 'student', emailSuffix: EMAIL_DOMAINS.student[0], rememberMe: true }
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: 'student', emailSuffix: EMAIL_DOMAINS.student[0] }
  });

  // Watchers
  const loginRole = loginForm.watch('role');
  const signupRole = signupForm.watch('role');

  // Handlers
  const onLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    // 设置持久化选项
    setAuthPersistence(data.rememberMe);
    
    try {
      const fullEmail = `${data.emailPrefix}${data.emailSuffix}`;
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: fullEmail,
        password: data.password,
      });

      if (error) {
        console.log('[LOGIN] Login failed (expected behavior for wrong credentials)');
        console.log('[LOGIN] Error message:', error.message);
        console.log('[LOGIN] Full email used:', fullEmail);
        
        // 登录失败，检查用户存在以区分错误类型
        let errorHandled = false;
        try {
          const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
          const checkUrl = `${API_BASE}/check-user`;
          console.log('[LOGIN] Checking user existence...');
          
          const checkResponse = await fetch(checkUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ email: fullEmail }),
          });
          
          console.log('[LOGIN] Check user response status:', checkResponse.status);
          
          if (checkResponse.ok) {
            const checkResult = await checkResponse.json();
            console.log('[LOGIN] User check result:', checkResult);
            
            if (!checkResult.exists) {
              // 分支 1: 用户不存在（未注册）
              console.log('[LOGIN] ❌ User does not exist - showing registration prompt');
              toast.error(t('This account is not registered. Please register first.', '该账号未注册，请先注册'));
              errorHandled = true;
            } else if (!checkResult.emailConfirmed) {
              // 分支 2: 用户存在但邮箱未验证
              console.log('[LOGIN] ❌ User exists but email not confirmed');
              toast.error(t('Email not verified. Please check your verification email.', '邮箱尚未验证，请先查收验证邮件'));
              errorHandled = true;
            } else {
              // 分支 3: 用户存在且已验证，但密码错误
              console.log('[LOGIN] ❌ User exists and confirmed - incorrect password');
              toast.error(t('Incorrect password. Please try again.', '密码错误，请检查后重试'));
              errorHandled = true;
            }
          } else {
            // check-user API 调用失败，记录错误
            const errorText = await checkResponse.text();
            console.error('[LOGIN] ⚠️ Check user API failed:', checkResponse.status, errorText);
            console.log('[LOGIN] Will use fallback error handling');
          }
        } catch (checkError) {
          console.error('[LOGIN] ⚠️ Error calling check user API:', checkError);
          console.log('[LOGIN] Will use fallback error handling');
        }
        
        // 如果检查用户失败或未处理，显示通用错误信息（后备处理）
        if (!errorHandled) {
          console.log('[LOGIN] Using fallback error handling');
          if (error.message.includes('Email not confirmed')) {
            toast.error(t('Email not verified. Please check your verification email.', '邮箱尚未验证，请先查收验证邮件'));
          } else if (error.message.includes('Invalid login credentials')) {
            toast.error(t('Login failed: Invalid email or password', '登录失败：账号或密码错误'));
          } else {
            toast.error(t('Login failed: ', '登录失败: ') + error.message);
          }
        }
        return;
      } else {
        // 登录成功，但还需要检查邮箱是否已确认
        if (authData.user && !authData.user.email_confirmed_at) {
          console.log('[LOGIN] Email not confirmed yet');
          toast.error(t('Email not verified. Please check your verification email.', '邮箱尚未验证，请先查收验证邮件'));
          // 登出未验证的会话
          await supabase.auth.signOut();
          return;
        }
        
        console.log('[LOGIN] Login successful:', authData.user?.email);
        toast.success(t('Login successful!', '登录成功'));
        // Redirect to home page
        setTimeout(() => {
          window.location.hash = '/';
        }, 500);
      }
    } catch (error) {
      console.error('[LOGIN] Error:', error);
      toast.error(t('Login error occurred', '登录发生错误'));
    } finally {
      setIsLoading(false);
    }
  };

  const onSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      const fullEmail = `${data.emailPrefix}${data.emailSuffix}`;
      
      console.log('[SIGNUP] Requesting verification code for:', fullEmail);
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4/send-verification-code`;
      
      // 调用后端发送验证码
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email: fullEmail,
          metadata: {
            username: data.username,
            real_name: `${data.firstName} ${data.lastName}`,
            role: data.role,
            class_name: data.role === 'student' ? data.className : undefined,
          }
        })
      });

      console.log('[SIGNUP] Backend response status:', response.status);
      
      const responseText = await response.text();
      console.log('[SIGNUP] Backend response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('[SIGNUP] Failed to parse response as JSON:', e);
        toast.error(t(
          `Failed to send verification code: Server response format error`,
          `发送验证码失败: 服务器响应格式错误`
        ));
        return;
      }
      
      console.log('[SIGNUP] Backend response parsed:', result);

      if (!response.ok) {
        console.error('[SIGNUP] Sending verification code failed:', result);
        
        let errorMessage = t('Failed to send verification code. Please try again later.', '发送验证码失败，请稍后重试');
        
        if (typeof result.error === 'string' && result.error) {
          errorMessage = result.error;
        } else if (response.status === 409) {
          errorMessage = t('This email is already registered', '该邮箱已被注册');
        } else if (response.status === 429) {
          errorMessage = t('Too many requests. Please try again later.', '操作过于频繁，请稍后再试');
        }
        
        console.error('[SIGNUP] Error message:', errorMessage);
        toast.error(errorMessage);
        return;
      }

      if (result.success) {
        console.log('[SIGNUP] Verification code sent successfully');
        toast.success(t('Verification code sent! Please check your email.', '验证码已发送！请查收邮件'));
        
        // 保存注册数据并显示验证码输入界面
        setPendingSignupData(data);
        setCheckEmailAddress(fullEmail);
        setShowVerificationInput(true);
      } else {
        console.error('[SIGNUP] Unexpected response:', result);
        toast.error(t('Failed to send verification code', '发送验证码失败'));
      }
    } catch (error) {
      console.error('[SIGNUP] Unexpected error:', error);
      if (error instanceof Error) {
        toast.error(t('Error: ', '错误: ') + error.message);
      } else {
        toast.error(t('An error occurred while sending verification code', '发送验证码时发生错误'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyEmail = async () => {
    setIsLoading(true);
    try {
      if (!pendingSignupData) {
        console.error('[VERIFY] No pending signup data');
        toast.error(t('Verification failed: No pending signup data', '验证失败：没有待处理的注册数据'));
        return;
      }

      const fullEmail = `${pendingSignupData.emailPrefix}${pendingSignupData.emailSuffix}`;
      
      console.log('[VERIFY] Starting email verification for:', fullEmail);
      console.log('[VERIFY] Verification code:', verificationCode);
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4/verify-code`;
      
      // 调用后端验证接口
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email: fullEmail,
          code: verificationCode,
          password: pendingSignupData.password,
        })
      });

      console.log('[VERIFY] Backend response status:', response.status);
      
      const responseText = await response.text();
      console.log('[VERIFY] Backend response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('[VERIFY] Failed to parse response as JSON:', e);
        toast.error(t(
          `Verification failed: Server response format error`,
          `验证失败: 服务器响应格式错误`
        ));
        return;
      }
      
      console.log('[VERIFY] Backend response parsed:', result);

      if (!response.ok) {
        console.error('[VERIFY] Verification failed:', result);
        
        if (response.status === 504) {
          console.error('[VERIFY] Gateway timeout - likely SMTP configuration issue');
          toast.error(t(
            'Email service temporarily unavailable. Please try again later or contact administrator.',
            '邮件服务暂时不可用，请稍后重试或联系管理员'
          ));
          return;
        }
        
        let errorMessage = t('Verification failed. Please try again later.', '验证失败，请稍后重试');
        
        if (typeof result.error === 'string' && result.error && result.error !== '{}') {
          errorMessage = result.error;
        } else if (response.status === 409) {
          errorMessage = t('This email is already registered', '该邮箱已被注册');
        } else if (response.status === 429) {
          errorMessage = t('Too many requests. Please try again later.', '操作过于频繁，请稍后再试');
        }
        
        console.error('[VERIFY] Error message:', errorMessage);
        toast.error(errorMessage);
        return;
      }

      if (result.success) {
        console.log('[VERIFY] Email verification successful, user:', result.user);
        
        toast.success(t('Email verification successful! Logging in...', '邮箱验证成功！正在登录...'));
        
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: fullEmail,
          password: pendingSignupData.password,
        });

        if (loginError) {
          console.error('[VERIFY] Auto-login failed:', loginError);
          toast.error(t('Registration successful, but auto-login failed. Please login manually.', '注册成功，但自动登录失败，请手动登录'));
          setTimeout(() => {
            window.location.hash = '/login';
          }, 2000);
        } else {
          console.log('[VERIFY] Auto-login successful');
          toast.success(t('Welcome to SCLS Campus Shop!', '欢迎加入 SCLS Campus Shop！'));
          setTimeout(() => {
            window.location.hash = '/';
          }, 1000);
        }
      } else {
        console.error('[VERIFY] Unexpected response:', result);
        toast.error(t('Verification failed', '验证失败'));
      }
    } catch (error) {
      console.error('[VERIFY] Unexpected error:', error);
      if (error instanceof Error) {
        toast.error(t('Verification error: ', '验证发生错误: ') + error.message);
      } else {
        toast.error(t('Verification error occurred', '验证发生错误'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showCheckEmail) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-fit">
              <Mail className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              {t('Check Your Email', '请查收验证邮件')}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {t(
                'We need to verify your email address to complete registration.',
                '我们需要验证您的邮箱地址以完成注册。'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4 pt-4">
            <p className="text-muted-foreground">
              {t('Verification email sent to:', '验证邮件已发送至：')}
              <br />
              <span className="font-medium text-foreground block mt-1">{checkEmailAddress}</span>
            </p>
            <p className="text-sm text-muted-foreground/80 bg-muted/50 p-3 rounded-lg">
              {t(
                'Please click the link in the email to activate your account.',
                '请点击邮件中的链接激活您的账号。'
              )}
            </p>
          </CardContent>
          <CardFooter className="justify-center pt-2">
            <Button variant="outline" onClick={() => setShowCheckEmail(false)}>
              {t('Back to Login', '返回登录')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (showVerificationInput) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-fit">
              <Mail className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              {t('Verify Your Email', '验证您的邮箱')}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {t(
                'Please enter the verification code sent to your email to complete registration.',
                '请输入发送到您邮箱的验证码以完成注册。'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4 pt-4">
            <p className="text-muted-foreground">
              {t('Verification email sent to:', '验证邮件已发送至：')}
              <br />
              <span className="font-medium text-foreground block mt-1">{checkEmailAddress}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="verification-code">{t('Verification Code', '验证码')}</Label>
              <OTPInput 
                length={8}
                value={verificationCode}
                onChange={setVerificationCode}
                disabled={isLoading}
              />
              {verificationCode.length > 0 && verificationCode.length < 8 && (
                <p className="text-xs text-red-500">
                  {t('Verification code must be 8 digits', '验证码必须是8位')}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-center pt-2">
            <Button className="w-full mt-4" type="submit" disabled={isLoading} onClick={onVerifyEmail}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('Verify Email', '验证邮箱')}
            </Button>
          </CardFooter>
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
            {t('Please login or register to continue shopping', '请登录或注册以继续购物')}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-2 min-w-0">
          <Tabs defaultValue="login" className="w-full min-w-0">
            <TabsList className="grid w-full grid-cols-2 h-9 p-0.5 mb-5 rounded-lg bg-muted/60">
              <TabsTrigger
                value="login"
                className="rounded-md h-full text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {t('Login', '登录')}
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-md h-full text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {t('Register', '注册')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-0 min-w-0">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 min-w-0">
                <RoleSelection 
                  selectedRole={loginRole} 
                  onSelect={(r) => {
                    loginForm.setValue('role', r);
                    loginForm.setValue('emailSuffix', EMAIL_DOMAINS[r][0]);
                  }}
                  t={t}
                />

                <EmailField
                  idPrefix="login"
                  role={loginRole}
                  suffixValue={loginForm.watch('emailSuffix')}
                  onSuffixChange={(val) => loginForm.setValue('emailSuffix', val)}
                  prefixError={!!loginForm.formState.errors.emailPrefix}
                  prefixErrorMessage={t('Please enter your account', '请输入账号')}
                  prefixRegister={loginForm.register}
                  t={t}
                />

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs font-medium text-foreground/80">
                    {t('Password', '密码')}
                  </Label>
                  <Input 
                    id="login-password" 
                    type="password" 
                    {...loginForm.register('password')} 
                    className="h-9 text-sm"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-[11px] text-destructive">
                      {t('Please enter your password', '请输入密码')}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="remember-me"
                    className="size-3.5 shrink-0 rounded-[3px]"
                    checked={loginForm.watch('rememberMe')} 
                    onCheckedChange={(checked) => loginForm.setValue('rememberMe', checked as boolean)} 
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-xs font-normal text-muted-foreground cursor-pointer leading-none select-none"
                  >
                    {t('Remember me', '记住我')}
                  </Label>
                </div>

                <Button className="w-full mt-1" size="default" type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  {t('Login', '登录')}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="mt-0 min-w-0">
              <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-3.5 min-w-0">
                <RoleSelection 
                  selectedRole={signupRole} 
                  onSelect={(r) => {
                    signupForm.setValue('role', r);
                    signupForm.setValue('emailSuffix', EMAIL_DOMAINS[r][0]);
                  }}
                  t={t}
                />

                <EmailField
                  idPrefix="signup"
                  role={signupRole}
                  suffixValue={signupForm.watch('emailSuffix')}
                  onSuffixChange={(val) => signupForm.setValue('emailSuffix', val)}
                  prefixError={!!signupForm.formState.errors.emailPrefix}
                  prefixErrorMessage={t(
                    'Only letters, numbers, dots, underscores and hyphens are allowed',
                    '仅允许字母、数字、点、下划线和连字符'
                  )}
                  prefixRegister={signupForm.register}
                  t={t}
                />
                
                <p className="text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-2 rounded-md border border-border/40 leading-relaxed">
                  {t(
                    'Please use your real name, otherwise it may affect your order pickup.',
                    '请务必填写真实姓名，否则将影响后续预定和取货。'
                  )}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="username" className="text-xs font-medium text-foreground/80">{t('Username', '用户名')}</Label>
                    <Input 
                      id="username" 
                      placeholder={t('Nickname', '昵称')}
                      {...signupForm.register('username')} 
                      className="h-9 text-sm"
                    />
                    {signupForm.formState.errors.username && (
                      <p className="text-[11px] text-destructive">
                        {t('Please enter username', '请输入用户名')}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="firstName" className="text-xs font-medium text-foreground/80">{t('First Name', '名')}</Label>
                    <Input 
                      id="firstName" 
                      placeholder={t('First Name', '名')}
                      {...signupForm.register('firstName')} 
                      className="h-9 text-sm"
                    />
                    {signupForm.formState.errors.firstName && (
                      <p className="text-[11px] text-destructive">
                        {t('Please enter first name', '请输入名')}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <Label htmlFor="lastName" className="text-xs font-medium text-foreground/80">{t('Last Name', '姓')}</Label>
                    <Input 
                      id="lastName" 
                      placeholder={t('Last Name', '姓')}
                      {...signupForm.register('lastName')} 
                      className="h-9 text-sm"
                    />
                    {signupForm.formState.errors.lastName && (
                      <p className="text-[11px] text-destructive">
                        {t('Please enter last name', '请输入姓')}
                      </p>
                    )}
                  </div>
                </div>

                {signupRole === 'student' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="className" className="text-xs font-medium text-foreground/80">{t('Class', '班级')}</Label>
                    <Select onValueChange={(val) => signupForm.setValue('className', val)}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder={t('Select Class', '选择班级')} />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASSES.map((cls) => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {signupForm.formState.errors.className && (
                      <p className="text-[11px] text-destructive">
                        {t('Student account must select a class', '学生账号必须选择班级')}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs font-medium text-foreground/80">{t('Password', '密码')}</Label>
                  <Input 
                    id="signup-password" 
                    type="password" 
                    {...signupForm.register('password')} 
                    className="h-9 text-sm"
                  />
                  {signupForm.formState.errors.password && (
                    <p className="text-[11px] text-destructive">
                      {t('Password must be at least 6 characters', '密码至少6位')}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground/80">{t('Confirm Password', '确认密码')}</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    {...signupForm.register('confirmPassword')} 
                    className="h-9 text-sm"
                  />
                  {signupForm.formState.errors.confirmPassword && (
                    <p className="text-[11px] text-destructive">
                      {t('Passwords do not match', '两次输入的密码不一致')}
                    </p>
                  )}
                </div>
                
                <Button className="w-full mt-1" size="default" type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  {t('Register', '注册')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}