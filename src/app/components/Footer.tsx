import { useLanguage } from '../contexts/LanguageContext';

const links = [
  { href: '#/privacyPolicy', en: 'Privacy Policy', cn: '隐私政策' },
  { href: '#/termsOfUse', en: 'Terms of Use', cn: '使用条款' },
  { href: '#/updateHistory', en: 'Update History', cn: '更新记录' },
];

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full overflow-hidden bg-[#174D3D] text-white">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full bg-white/[0.04]" />

      <article className="relative mx-auto w-full max-w-6xl px-[clamp(1.25rem,6vw,6rem)] pb-8 pt-14 sm:pt-16">
        <div className="grid gap-10 pb-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-16">
          <div>
            <div className="text-2xl font-semibold leading-tight sm:text-3xl">
              {t('SCLS Campus Shop', '宋校文创商品店')}
            </div>
            <div className="pt-2 text-sm font-medium uppercase tracking-[0.18em] text-[#A8D5C2]">
              {t('SCLS Student-Run Campus Shop', '中国部高中学生会')}
            </div>
            <p className="max-w-lg pt-6 text-sm leading-[1.8] text-white/70">
              {t(
                'Disclaimer: This website is owned by a Team, and product information and prices may be subject to change. We reserve the right to interpret the content and services of the website.',
                '免责声明：本网站由团队所有,商品信息和价格可能会有变动。我们保留对网站内容和服务的最终解释权。'
              )}
            </p>
          </div>

          <nav className="grid grid-cols-2 content-start gap-x-6 gap-y-3 text-sm md:grid-cols-1 md:justify-self-end md:text-base">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group inline-flex w-fit items-center gap-2 text-white/90 transition-colors hover:text-[#A8D5C2]"
              >
                <span className="h-px w-4 bg-white/40 transition-all group-hover:w-6 group-hover:bg-[#A8D5C2]" />
                {t(link.en, link.cn)}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/15 pt-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2023-{currentYear} {t('SCLS Campus Shop', '宋校文创商品店')}</span>
        </div>
      </article>
    </footer>
  );
}
