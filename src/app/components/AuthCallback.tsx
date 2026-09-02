import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './ui/button';

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('正在验证您的邮箱...');

  useEffect(() => {
    // 处理邮箱验证回调
    const handleEmailVerification = async () => {
      try {
        console.log('[AUTH_CALLBACK] Full URL:', window.location.href);
        console.log('[AUTH_CALLBACK] Hash:', window.location.hash);
        console.log('[AUTH_CALLBACK] Search:', window.location.search);
        
        // 从 URL 参数和 hash 中获取 token
        const urlParams = new URLSearchParams(window.location.search);
        const hashParts = window.location.hash.split('?');
        const hashParams = hashParts.length > 1 ? new URLSearchParams(hashParts[1]) : new URLSearchParams();
        
        // 尝试从两个地方获取参数
        const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
        const type = urlParams.get('type') || hashParams.get('type');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');

        console.log('[AUTH_CALLBACK] Type:', type);
        console.log('[AUTH_CALLBACK] Access token:', accessToken ? 'exists' : 'missing');
        console.log('[AUTH_CALLBACK] Refresh token:', refreshToken ? 'exists' : 'missing');
        console.log('[AUTH_CALLBACK] Error description:', errorDescription);
        
        // 检查是否有错误
        if (errorDescription) {
          console.error('[AUTH_CALLBACK] Error from Supabase:', errorDescription);
          setStatus('error');
          setMessage(`验证失败: ${errorDescription}`);
          return;
        }

        if (accessToken && refreshToken) {
          // 邮箱验证成功，使用 token 手动设置会话
          console.log('[AUTH_CALLBACK] Setting session with tokens...');
          
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            console.error('[AUTH_CALLBACK] Session error:', sessionError);
            setStatus('error');
            setMessage('登录失败: ' + sessionError.message);
            return;
          }

          if (data.session) {
            console.log('[AUTH_CALLBACK] Session created successfully!');
            console.log('[AUTH_CALLBACK] User email:', data.session.user.email);
            console.log('[AUTH_CALLBACK] User ID:', data.session.user.id);
            setStatus('success');
            setMessage('邮箱验证成功！正在跳转...');
            
            // 1秒后跳转到首页（已登录状态）
            setTimeout(() => {
              // 清空 URL 参数，避免再次触发验证
              window.history.replaceState({}, '', window.location.pathname + window.location.hash.split('?')[0]);
              window.location.hash = '/';
              // 不需要刷新页面，ProfileContext 会自动更新
            }, 1000);
          } else {
            console.error('[AUTH_CALLBACK] No session created');
            setStatus('error');
            setMessage('登录失败，请手动登录');
          }
        } else {
          console.error('[AUTH_CALLBACK] Missing tokens - accessToken:', !!accessToken, 'refreshToken:', !!refreshToken);
          setStatus('error');
          setMessage('验证链接无效或已过期');
        }
      } catch (error) {
        console.error('[AUTH_CALLBACK] Error:', error);
        setStatus('error');
        setMessage('验证过程中发生错误: ' + (error instanceof Error ? error.message : String(error)));
      }
    };

    handleEmailVerification();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-fit">
            {status === 'loading' && <Loader2 className="w-12 h-12 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle className="w-12 h-12 text-green-500" />}
            {status === 'error' && <XCircle className="w-12 h-12 text-red-500" />}
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            {status === 'loading' && '验证中'}
            {status === 'success' && '验证成功'}
            {status === 'error' && '验证失败'}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent className="text-center pt-4">
            <Button 
              onClick={() => window.location.hash = '/login'}
              className="w-full"
            >
              返回登录
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}