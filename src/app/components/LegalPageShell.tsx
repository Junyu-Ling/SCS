import type { ReactNode } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type LegalPageShellProps = {
  title: string;
  subtitle?: string;
  metaLines?: string[];
  notice?: string;
  children: ReactNode;
};

export function LegalPageShell({
  title,
  subtitle,
  metaLines,
  notice,
  children,
}: LegalPageShellProps) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white text-[#111111] py-12 sm:py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 break-words">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm text-[#6B7280] max-w-2xl mx-auto break-words leading-[1.6]">
              {subtitle}
            </p>
          ) : null}
          {metaLines?.length ? (
            <div className="mt-4 space-y-1">
              {metaLines.map((line, i) => (
                <p key={i} className="text-xs sm:text-sm text-[#6B7280] break-words">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          {notice ? (
            <p className="text-xs leading-[1.6] text-[#6B7280] mt-5 px-2 max-w-2xl mx-auto break-words">
              {notice}
            </p>
          ) : null}
        </header>

        {children}

        <footer className="mt-16 pt-8 border-t border-[#E5E7EB] text-center space-y-2">
          <p className="text-xs sm:text-sm text-[#6B7280]">
            {t('2022-2024 SCLS Campus Shop', '2022-2024 SCLS Campus Shop')}
          </p>
          <p className="text-xs text-[#6B7280] px-2 break-words leading-[1.6]">
            {t(
              'Disclaimer: This website is owned by a Team, and product information and prices may be subject to change. We reserve the right to interpret the content and services of the website.',
              '免责声明：本网站由团队拥有，产品信息和价格可能会发生变化。我们保留对网站内容和服务的解释权。'
            )}
          </p>
          <nav className="flex justify-center gap-4 text-xs sm:text-sm text-[#111111] pt-3 flex-wrap">
            <a href="#/privacyPolicy" className="hover:opacity-60 transition-opacity">
              {t('Privacy Policy', '隐私政策')}
            </a>
            <a href="#/termsOfUse" className="hover:opacity-60 transition-opacity">
              {t('Terms of Use', '使用条款')}
            </a>
            <a href="#/updateHistory" className="hover:opacity-60 transition-opacity">
              {t('Update History', '更新历史')}
            </a>
            <a href="#/aboutUs" className="hover:opacity-60 transition-opacity">
              {t('About Us', '关于我们')}
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
