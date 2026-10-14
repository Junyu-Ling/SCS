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
  realName: string;
  className: string;
  note: string;
}

const EMPTY_PROFILE: CheckoutProfile = {
  email: '',
  realName: '',
  className: '',
  note: '',
};

interface CheckoutProfileContextType {
  checkoutProfile: CheckoutProfile;
  saveCheckoutProfile: (profile: CheckoutProfile) => void;
  isCheckoutProfileComplete: (profile?: CheckoutProfile) => boolean;
}

const CheckoutProfileContext = createContext<CheckoutProfileContextType | undefined>(undefined);

function readStoredProfile(): CheckoutProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<CheckoutProfile>;
    return {
      email: typeof parsed.email === 'string' ? parsed.email : '',
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
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return emailOk && name.length > 0 && className.length > 0;
}

function profileIsComplete(profile: CheckoutProfile): boolean {
  return isCheckoutProfileComplete(profile);
}

export function CheckoutProfileProvider({ children }: { children: ReactNode }) {
  const [checkoutProfile, setCheckoutProfile] = useState<CheckoutProfile>(EMPTY_PROFILE);

  useEffect(() => {
    setCheckoutProfile(readStoredProfile());
  }, []);

  const saveCheckoutProfile = useCallback((profile: CheckoutProfile) => {
    const next: CheckoutProfile = {
      email: profile.email.trim().toLowerCase(),
      realName: profile.realName.trim(),
      className: profile.className.trim(),
      note: profile.note.trim(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setCheckoutProfile(next);
  }, []);

  return (
    <CheckoutProfileContext.Provider
      value={{
        checkoutProfile,
        saveCheckoutProfile,
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
