import React, { createContext, useContext } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 始终使用浅色模式，移除深色模式
  // 清除之前保存的主题设置，确保始终使用浅色模式
  React.useEffect(() => {
    localStorage.removeItem('scls-theme');
    document.documentElement.classList.remove('dark');
  }, []);

  // toggleTheme 保留为空操作，兼容现有代码
  const toggleTheme = () => {
    // Dark mode has been removed — no-op
  };

  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme, isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
