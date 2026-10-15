import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useLanguage } from './LanguageContext';

/**
 * 管理员会话（基于 /api/admin-session 的 HttpOnly 签名 Cookie）。
 * 学生不需要登录：下单时只做邮箱验证（见 CheckoutProfileContext）。
 * 是否为管理员完全由服务端判断；前端只负责显示。
 */
interface ProfileContextType {
  /** 已登录的管理员；未登录为 null */
  user: { email: string } | null;
  loading: boolean;
  isAdmin: boolean;
  /** About Us 可编辑 = 管理员 */
  canEditAboutUs: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  profileVersion: number;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileVersion, setProfileVersion] = useState(0);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await api<{ admin: boolean; email?: string }>('/api/admin-session');
      setAdminEmail(data.admin && data.email ? data.email : null);
    } catch {
      setAdminEmail(null);
    } finally {
      setLoading(false);
      setProfileVersion((v) => v + 1);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    try {
      await api('/api/admin-session', { method: 'DELETE' });
    } catch {
      /* ignore */
    }
    setAdminEmail(null);
    window.location.hash = '/';
    toast.success(t('Signed out', '已成功登出'));
  }, [t]);

  const isAdmin = adminEmail !== null;

  return (
    <ProfileContext.Provider
      value={{
        user: adminEmail ? { email: adminEmail } : null,
        loading,
        isAdmin,
        canEditAboutUs: isAdmin,
        refreshProfile,
        signOut,
        profileVersion,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
