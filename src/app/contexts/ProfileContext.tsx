import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, fetchAboutUsCanEdit } from '../../lib/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

/**
 * 用户个人资料类型定义
 * 存储在 Supabase Auth 的 user_metadata 中
 */
export interface UserProfile {
  username: string;          // 用户昵称
  real_name: string;         // 真实姓名
  role: 'student' | 'teacher' | 'admin';  // 用户角色
  class_name?: string;       // 班级（仅学生）
  avatar_url?: string;       // 头像 URL（Base64 或 URL）
}

/**
 * ProfileContext 类型定义
 * 提供全局的用户认证和个人资料管理
 */
interface ProfileContextType {
  user: User | null;         // Supabase 用户对象
  session: Session | null;   // Supabase 会话对象（包含 access_token）
  profile: UserProfile | null;  // 用户个人资料
  loading: boolean;          // 加载状态
  isAdmin: boolean;          // 是否为管理员
  canEditAboutUs: boolean;   // 是否在 About 正文编辑白名单内（或未设限时为 true）
  refreshProfile: () => Promise<void>;  // 刷新用户信息
  signOut: () => Promise<void>;         // 登出
  profileVersion: number;    // 用于强制触发组件更新
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// 管理员邮箱列表 - 与服务端 ADMIN_EMAILS 保持一致；导出供后台「About 权限」等 UI 使用
export const ADMIN_EMAILS = [
  '202760149@stu.scls-sh.org',
  '202760107@stu.scls-sh.org',
  '202760102@stu.scls-sh.org'
];

/**
 * ProfileProvider 组件
 * 提供全局用户认证状态管理
 * - 自动检测和恢复登录会话（从 localStorage）
 * - 监听认证状态变化
 * - 提供用户信息和管理员权限判断
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canEditAboutUs, setCanEditAboutUs] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);

  /**
   * 从用户对象加载个人资料
   * @param user - Supabase User 对象
   */
  const loadProfile = (user: User | null) => {
    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      setCanEditAboutUs(false);
      return;
    }

    // 从 user_metadata 提取个人资料（注册时保存的数据）
    const metadata = user.user_metadata;
    
    // Load avatar from localStorage
    const avatarKey = `avatar_${user.id}`;
    const savedAvatar = localStorage.getItem(avatarKey);
    
    // 也尝试从 profile_${user.id} 加载完整配置
    const profileKey = `profile_${user.id}`;
    const savedProfile = localStorage.getItem(profileKey);
    let profileData = {};
    if (savedProfile) {
      try {
        profileData = JSON.parse(savedProfile);
      } catch (e) {
        console.error('[PROFILE] Error parsing saved profile:', e);
      }
    }
    
    setProfile({
      username: metadata.username || '',
      real_name: metadata.real_name || '',
      role: metadata.role || 'student',
      class_name: metadata.class_name,
      avatar_url: savedAvatar || (profileData as any).avatar_url || metadata.avatar_url,
    });

    // 检查是否为管理员（基于邮箱匹配）
    setIsAdmin(ADMIN_EMAILS.includes(user.email?.toLowerCase() || ''));

    console.log('[PROFILE] User loaded:', {
      email: user.email,
      isAdmin: ADMIN_EMAILS.includes(user.email?.toLowerCase() || ''),
      profile: metadata,
      hasAvatar: !!(savedAvatar || (profileData as any).avatar_url)
    });
  };

  /**
   * 初始化认证状态
   * useEffect 在组件挂载时执行
   */
  useEffect(() => {
    console.log('[PROFILE] Initializing auth state...')
    
    // 1. 检查是否有活跃会话（从 localStorage 自动恢复）
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('[PROFILE] Error getting session:', error);
        setLoading(false);
        return;
      }
      
      console.log('[PROFILE] Session loaded:', session ? 'Active' : 'None');
      
      // 验证 session 是否真的有效（检查 token 是否过期）
      if (session?.access_token) {
        console.log('[PROFILE] Validating session token...');
        const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
        
        if (userError) {
          console.error('[PROFILE] Token validation failed:', userError.message);
          
          // 如果 token 无效或过期，清除 session
          if (userError.message?.includes('JWT') || 
              userError.message?.includes('expired') || 
              userError.message?.includes('Invalid')) {
            console.log('[PROFILE] Clearing invalid/expired session...');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            loadProfile(null);
            setLoading(false);
            toast.error('登录已过期，请重新登录');
            return;
          }
        }
        
        console.log('[PROFILE] Session token validated successfully');
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
      setLoading(false);
    });

    // 2. 监听认证状态变化（登录、登出、token 刷新等）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[PROFILE] Auth state changed:', _event, session ? 'Session active' : 'No session');
      
      // 处理邮箱确认后的首次登录
      if (_event === 'SIGNED_IN' && session) {
        // 检查是否在回调页面，如果在回调页面就不干预跳转
        const isOnCallbackPage = window.location.hash.includes('/auth/callback');
        
        if (!isOnCallbackPage) {
          const urlParams = new URLSearchParams(window.location.search);
          const isEmailConfirm = urlParams.get('type') === 'signup';
          
          if (isEmailConfirm) {
            console.log('[PROFILE] Email confirmation detected, showing welcome message...');
            toast.success('邮箱验证成功！欢迎加入 SCLS Campus Shop！');
            // 清除 URL 参数
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
          }
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
      setLoading(false);
    });

    // 3. 组件卸载时取消订阅
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const admin = !!(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
      if (!admin) {
        setCanEditAboutUs(false);
        return;
      }
      try {
        const ok = await fetchAboutUsCanEdit();
        if (!cancelled) setCanEditAboutUs(ok);
      } catch {
        if (!cancelled) setCanEditAboutUs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email, profileVersion]);

  useEffect(() => {
    const onEditors = () => {
      void fetchAboutUsCanEdit().then((ok) => setCanEditAboutUs(ok)).catch(() => setCanEditAboutUs(false));
    };
    window.addEventListener('aboutus-editors-changed', onEditors);
    return () => window.removeEventListener('aboutus-editors-changed', onEditors);
  }, []);

  /**
   * 手动刷新用户信息
   * 可以在需要强制更新用户状态时调用
   */
  const refreshProfile = async () => {
    console.log('[PROFILE] Refreshing profile...');
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[PROFILE] Error refreshing session:', error);
        // 如果获取session失败，尝试重新获取
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          console.log('[PROFILE] Session expired, signing out...');
          await signOut();
          toast.error('登录已过期，请重新登录');
        }
        return;
      }
      
      // 验证 session 是否真的有效
      if (session?.access_token) {
        // 尝试用这个 token 获取用户信息来验证它是否有效
        const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
        
        if (userError) {
          console.error('[PROFILE] Token validation failed:', userError);
          if (userError.message?.includes('JWT') || userError.message?.includes('expired') || userError.message?.includes('Invalid')) {
            console.log('[PROFILE] Invalid/expired token detected, signing out...');
            await signOut();
            toast.error('登录已过期，请重新登录');
            return;
          }
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
      
      const newVersion = profileVersion + 1;
      setProfileVersion(newVersion);
      console.log('[PROFILE] Profile version updated to:', newVersion);
    } catch (err) {
      console.error('[PROFILE] Exception during profile refresh:', err);
    }
  };

  /**
   * 登出功能
   * - 清除 Supabase 会话
   * - 清除本地状态
   * - 跳转到首页
   */
  const signOut = async () => {
    console.log('[PROFILE] Signing out...');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setCanEditAboutUs(false);
    window.location.hash = '/';
    toast.success('已成功登出');
  };

  return (
    <ProfileContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isAdmin,
        canEditAboutUs,
        refreshProfile,
        signOut,
        profileVersion,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * useProfile Hook
 * 在任何组件中使用此 Hook 获取用户信息
 * 必须在 ProfileProvider 内部使用
 */
export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}