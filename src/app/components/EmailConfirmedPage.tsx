import { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { useProfile } from '../contexts/ProfileContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function EmailConfirmedPage() {
  const { user, loading } = useProfile();
  const { language } = useLanguage();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // 如果用户已登录，倒计时后自动跳转到首页
    if (!loading && user) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.hash = '/';
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [loading, user]);

  const handleGoHome = () => {
    window.location.hash = '/';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-green-500">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-green-100 p-4 rounded-full mb-4 w-fit">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            {language === 'en' ? '✓ Email Verified!' : '✓ 邮箱验证成功！'}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {language === 'en' 
              ? 'Your account has been successfully activated.' 
              : '您的账号已成功激活。'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4 pt-4">
          {user ? (
            <>
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 font-medium">
                  {language === 'en' ? 'Welcome,' : '欢迎，'}
                  <span className="font-bold"> {user.email}</span>
                </p>
                <p className="text-xs text-green-600 mt-2">
                  {language === 'en' 
                    ? 'You are now logged in and ready to shop!' 
                    : '您现在已登录，可以开始购物了！'}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'en' 
                  ? `Redirecting to home page in ${countdown} seconds...` 
                  : `${countdown} 秒后自动跳转到首页...`}
              </p>
            </>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">
                {language === 'en' 
                  ? 'Your email has been confirmed. You can now log in to your account.' 
                  : '您的邮箱已确认。现在可以登录您的账号了。'}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-center pt-2">
          <Button onClick={handleGoHome} className="w-full sm:w-auto">
            {language === 'en' ? 'Go to Home Page' : '前往首页'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
