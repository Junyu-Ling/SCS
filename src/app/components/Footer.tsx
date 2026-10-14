import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-black border-t border-[#174D3D] flex flex-col justify-center items-center py-12 sm:py-16 px-4 sm:px-6 md:px-8 lg:px-16 text-xs sm:text-sm">
      <div className="space-y-6 text-center text-white/60 max-w-2xl w-full">
        <div className="text-white font-medium">2023-{currentYear} SCLS Campus Shop</div>

        <div className="leading-[1.6]">
          {t(
            'Disclaimer: This website is owned by a Team, and product information and prices may be subject to change. We reserve the right to interpret the content and services of the website.',
            '免责声明：本网站由团队所有,商品信息和价格可能会有变动。我们保留对网站内容和服务的最终解释权。'
          )}
        </div>

        <nav className="flex items-center justify-center gap-x-5 gap-y-2 flex-wrap text-white">
          <a href="#/privacyPolicy" className="hover:opacity-60 transition-opacity">
            {t('Privacy Policy', '隐私政策')}
          </a>
          <a href="#/termsOfUse" className="hover:opacity-60 transition-opacity">
            {t('Terms of Use', '使用条款')}
          </a>
          <a href="#/aboutUs" className="hover:opacity-60 transition-opacity">
            {t('About Us', '关于我们')}
          </a>
          <a href="#/updateHistory" className="hover:opacity-60 transition-opacity">
            {t('Update History', '更新记录')}
          </a>
          <a href="#/chat" className="hover:opacity-60 transition-opacity">
            {t('Contact Us', '联系我们')}
          </a>
        </nav>
      </div>
    </footer>
  );
}
