import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-black flex flex-col justify-center items-center py-6 sm:py-8 md:py-10 px-4 sm:px-6 md:px-8 lg:px-16 text-xs sm:text-sm">
      <div className="space-y-3 sm:space-y-4 text-center text-white max-w-5xl w-full">
        <div className="text-white">2023-{currentYear} SCLS Campus Shop</div>
        
        <div className="text-white leading-relaxed">
          {t(
            'Disclaimer: This website is owned by a Team, and product information and prices may be subject to change. We reserve the right to interpret the content and services of the website.',
            '免责声明：本网站由团队所有,商品信息和价格可能会有变动。我们保留对网站内容和服务的最终解释权。'
          )}
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap text-white">
          <a href="#/privacyPolicy" className="text-white font-bold hover:underline inline-block w-28 sm:w-32 text-right">
            {t('Privacy Policy', '隐私政策')}
          </a>
          <span className="flex-shrink-0">|</span>
          <a href="#/termsOfUse" className="text-white font-bold hover:underline inline-block w-28 sm:w-32 text-left">
            {t('Terms of Use', '使用条款')}
          </a>
        </div>

        <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap text-white">
          <a href="#/aboutUs" className="text-white font-bold hover:underline inline-block w-28 sm:w-32 text-right">
            {t('About Us', '关于我们')}
          </a>
          <span className="flex-shrink-0">|</span>
          <a href="#/updateHistory" className="text-white font-bold hover:underline inline-block w-28 sm:w-32 text-left">
            {t('Update History', '更新记录')}
          </a>
        </div>
      </div>
    </footer>
  );
}