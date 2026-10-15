import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export const CHECKOUT_CLASSES = [
  '高一（1）班',
  '高一（2）班',
  '高二（1）班',
  '高二（2）班',
  '高三（1）班',
  '高三（2）班',
];

const STORAGE_KEY = 'scls_checkout_profile';

export interface CheckoutProfile {
  email: string;
  /** 邮箱已通过验证码验证；一旦为 true，这台设备上的邮箱就被绑定，不能再修改 */
  emailVerified: boolean;
  /** 服务端签发的"邮箱已验证"令牌（30 天），下单 / 查看订单时作为身份凭证；见 api/verify-code.ts */
  verifyToken: string;
  realName: string;
  className: string;
  note: string;
}

const EMPTY_PROFILE: CheckoutProfile = {
  email: '',
  emailVerified: false,
  verifyToken: '',
  realName: '',
  className: '',
  note: '',
};

interface CheckoutProfileContextType {
  checkoutProfile: CheckoutProfile;
  saveCheckoutProfile: (profile: CheckoutProfile) => void;
  /** 验证码校验通过后调用：保存当前填写内容，并把邮箱绑定在这台设备上 */
  bindVerifiedEmail: (profile: CheckoutProfile, verifyToken: string) => void;
  /** 服务端说令牌失效（过期 / 密钥变更）时调用：解除绑定，让用户重新验证 */
  invalidateVerification: () => void;
  isCheckoutProfileComplete: (profile?: CheckoutProfile) => boolean;
}

const CheckoutProfileContext = createContext<CheckoutProfileContextType | undefined>(undefined);

// 只允许学校邮箱：@scls-sh.org（老师）或 @stu.scls-sh.org（学生）
export const SCHOOL_EMAIL_DOMAINS = ['stu.scls-sh.org', 'scls-sh.org'] as const;
export const SCHOOL_EMAIL_RE = /^[^\s@]+@(stu\.)?scls-sh\.org$/;

function readStoredProfile(): CheckoutProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<CheckoutProfile>;
    const verifyToken = typeof parsed.verifyToken === 'string' ? parsed.verifyToken : '';
    return {
      email: typeof parsed.email === 'string' ? parsed.email : '',
      // 没有服务端令牌的旧"已验证"记录不再算数，需要重新验证一次
      emailVerified:
        parsed.emailVerified === true &&
        verifyToken !== '' &&
        typeof parsed.email === 'string' &&
        SCHOOL_EMAIL_RE.test(parsed.email.trim().toLowerCase()),
      verifyToken: parsed.emailVerified === true ? verifyToken : '',
      realName: typeof parsed.realName === 'string' ? parsed.realName : '',
      className: typeof parsed.className === 'string' ? parsed.className : '',
      note: typeof parsed.note === 'string' ? parsed.note : '',
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function isCheckoutProfileComplete(profile: CheckoutProfile): boolean {
  const email = profile.email.trim().toLowerCase();
  const name = profile.realName.trim();
  const className = profile.className.trim();
  const emailOk = SCHOOL_EMAIL_RE.test(email);
  return emailOk && profile.emailVerified && name.length > 0 && className.length > 0;
}

function profileIsComplete(profile: CheckoutProfile): boolean {
  return isCheckoutProfileComplete(profile);
}

export function CheckoutProfileProvider({ children }: { children: ReactNode }) {
  const [checkoutProfile, setCheckoutProfile] = useState<CheckoutProfile>(EMPTY_PROFILE);

  useEffect(() => {
    setCheckoutProfile(readStoredProfile());
  }, []);

  const persist = useCallback((next: CheckoutProfile) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCheckoutProfile(next);
  }, []);

  const saveCheckoutProfile = useCallback((profile: CheckoutProfile) => {
    // 邮箱一旦验证绑定，就只能沿用已绑定的那个；未验证时无法通过保存把状态改成"已验证"
    const stored = readStoredProfile();
    const locked = stored.emailVerified && stored.email !== '';
    persist({
      email: locked ? stored.email : profile.email.trim().toLowerCase(),
      emailVerified: locked,
      verifyToken: locked ? stored.verifyToken : '',
      realName: profile.realName.trim(),
      className: profile.className.trim(),
      note: profile.note.trim(),
    });
  }, [persist]);

  const bindVerifiedEmail = useCallback((profile: CheckoutProfile, verifyToken: string) => {
    persist({
      email: profile.email.trim().toLowerCase(),
      emailVerified: true,
      verifyToken,
      realName: profile.realName.trim(),
      className: profile.className.trim(),
      note: profile.note.trim(),
    });
  }, [persist]);

  const invalidateVerification = useCallback(() => {
    const stored = readStoredProfile();
    persist({ ...stored, emailVerified: false, verifyToken: '' });
  }, [persist]);

  return (
    <CheckoutProfileContext.Provider
      value={{
        checkoutProfile,
        saveCheckoutProfile,
        bindVerifiedEmail,
        invalidateVerification,
        isCheckoutProfileComplete: (profile?: CheckoutProfile) =>
          profileIsComplete(profile ?? checkoutProfile),
      }}
    >
      {children}
    </CheckoutProfileContext.Provider>
  );
}

export function useCheckoutProfile() {
  const context = useContext(CheckoutProfileContext);
  if (!context) {
    throw new Error('useCheckoutProfile must be used within CheckoutProfileProvider');
  }
  return context;
}
