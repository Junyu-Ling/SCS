import type { ReactNode } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

type LegalPageShellProps = {
  title: string;
  /** 标题下灰色说明（单段） */
  subtitle?: string;
  /** 条款类页面的元信息行（最后更新、负责人等） */
  metaLines?: string[];
  /** 英文优先说明框 */
  notice?: string;
  children: ReactNode;
};

/**
 * Terms / Privacy / Update History 共用布局：黑底、白字、统一页脚链接
 */
export function LegalPageShell({
  title,
  subtitle,
  metaLines,
  notice,
  children,
}: LegalPageShellProps) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-black text-white py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-normal mb-3 sm:mb-4 break-words px-1">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-xs sm:text-sm text-gray-400 max-w-2xl mx-auto break-words">
              {subtitle}
            </p>
          ) : null}
          {metaLines?.length ? (
            <div className="mt-3 space-y-1">
              {metaLines.map((line, i) => (
                <p key={i} className="text-xs sm:text-sm text-gray-400 break-words">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          {notice ? (
            <p className="text-xs leading-relaxed text-gray-500 mt-4 sm:mt-5 px-2 max-w-2xl mx-auto break-words">
              {notice}
            </p>
          ) : null}
        </header>

        {children}

        <footer className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-gray-800 text-center space-y-2">
          <p className="text-xs sm:text-sm text-gray-400">
            {t('2022-2024 SCLS Campus Shop', '2022-2024 SCLS Campus Shop')}
          </p>
          <p className="text-xs sm:text-sm text-gray-400">
            {t('Contact Email: help@sclscampus.shop', '联系邮箱：help@sclscampus.shop')}
          </p>
          <p className="text-xs text-gray-500 px-2 break-words">
            {t(
              'Disclaimer: This website is owned by a Team, and product information and prices may be subject to change. We reserve the right to interpret the content and services of the website.',
              '免责声明：本网站由团队拥有，产品信息和价格可能会发生变化。我们保留对网站内容和服务的解释权。'
            )}
          </p>
          <nav className="flex justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-400 pt-2 flex-wrap">
            <a href="#/privacyPolicy" className="hover:text-white transition-colors underline">
              {t('Privacy Policy', '隐私政策')}
            </a>
            <span className="hidden sm:inline">|</span>
            <a href="#/termsOfUse" className="hover:text-white transition-colors underline">
              {t('Terms of Use', '使用条款')}
            </a>
            <span className="hidden sm:inline">|</span>
            <a href="#/updateHistory" className="hover:text-white transition-colors underline">
              {t('Update History', '更新历史')}
            </a>
            <span className="hidden sm:inline">|</span>
            <a href="#/aboutUs" className="hover:text-white transition-colors underline">
              {t('About Us', '关于我们')}
            </a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
