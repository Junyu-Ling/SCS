import { useEffect } from 'react';
import { useProfile } from '../contexts/ProfileContext';

/**
 * 自定义 Hook: 认证重定向
 * 如果用户未登录，自动重定向到登录页
 * 
 * @returns 用户信息和加载状态
 */
export function useAuthRedirect() {
  const { user, loading } = useProfile();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '#/login';
    }
  }, [user, loading]);

  return { user, loading };
}
