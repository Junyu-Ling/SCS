import { useLanguage } from '../contexts/LanguageContext';
import { OptimizedImage } from './OptimizedImage';
import { categoryImages } from '../data/category-images';
import { useRef, useState, useEffect } from 'react';

const categories = [
  {
    id: 'aboutus',
    name: { en: 'About Us', cn: '关于我们' },
    image: categoryImages.aboutus,
    href: '#/aboutUs',
  },
  {
    id: 'apparel',
    name: { en: 'Apparel', cn: '服饰' },
    image: categoryImages.apparel,
    href: '#/tag/apparel',
  },
  {
    id: 'stationery',
    name: { en: 'Stationery', cn: '文具' },
    image: categoryImages.stationery,
    href: '#/tag/stationery',
  },
  {
    id: 'gift',
    name: { en: 'Gift', cn: '礼品' },
    image: categoryImages.gift,
    href: '#/tag/gift',
  },
  {
    id: 'dailyuse',
    name: { en: 'Daily Use', cn: '日用品' },
    image: categoryImages.dailyUse,
    href: '#/tag/dailyUse',
  },
  {
    id: 'sports',
    name: { en: 'Sports', cn: '运动' },
    image: categoryImages.sports,
    href: '#/tag/sports',
  },
];

export default function TagsPage() {
  const { language, t } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        const progress = Math.max(0, Math.min(1, scrollLeft / maxScroll));
        setScrollProgress(progress);
      }
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col relative">
      <div className="flex-1 flex items-start pt-[16vh] sm:pt-[18vh] md:pt-[20vh] overflow-hidden">
        <div className="w-full h-full flex flex-col lg:flex-row">
          <div className="w-full lg:w-2/5 flex items-start justify-center px-6 sm:px-8 lg:px-16 py-6 lg:py-8">
            <div className="text-black max-w-md">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl mb-6 leading-[1.1] font-semibold">
                {language === 'en' ? (
                  <>
                    Unleash Your<br />
                    SCLS Spirit<br />
                    in Style.
                  </>
                ) : (
                  <>
                    尽情展现<br />
                    你的宋校<br />
                    精神
                  </>
                )}
              </h1>
              <p className="text-base sm:text-lg text-[#4A5E55] leading-[1.6]">
                {t('Welcome to SCLS Student-Run Campus Shop', '欢迎来到宋校文创商品店')}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 items-start overflow-hidden py-8">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex gap-5 overflow-x-auto scrollbar-hide px-8 scroll-smooth"
            >
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={category.href}
                  className="group relative overflow-hidden rounded-xl flex-shrink-0 cursor-pointer border border-[#D6E2DC] w-[210px] h-[300px]"
                >
                  <OptimizedImage
                    src={category.image}
                    alt={language === 'en' ? category.name.en : category.name.cn}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-black/45"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-xl text-white font-medium">
                      {language === 'en' ? category.name.en : category.name.cn}
                    </h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden px-4 pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((category) => (
            <a
              key={category.id}
              href={category.href}
              className="group relative overflow-hidden rounded-xl aspect-[4/5] cursor-pointer border border-[#D6E2DC] touch-manipulation"
            >
              <OptimizedImage
                src={category.image}
                alt={language === 'en' ? category.name.en : category.name.cn}
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-black/45"></div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-sm sm:text-base text-white font-medium">
                  {language === 'en' ? category.name.en : category.name.cn}
                </h3>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="hidden lg:block absolute bottom-16 left-16 right-16 z-30">
        <div className="flex items-center gap-3">
          <p className="text-[#4A5E55] text-sm whitespace-nowrap">
            {t('Scroll for more', '滚动查看更多')}
          </p>
          <div className="flex-1 h-px bg-[#D6E2DC] overflow-hidden max-w-md">
            <div
              className="h-full bg-[#174D3D] w-1/3 transition-transform duration-100 ease-out will-change-transform"
              style={{ transform: `translateX(${scrollProgress * 200}%)` }}
            ></div>
          </div>
          <svg
            className="w-4 h-4 text-black animate-bounce-horizontal"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes bounce-horizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        .animate-bounce-horizontal {
          animation: bounce-horizontal 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
