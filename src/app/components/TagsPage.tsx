import { useLanguage } from '../contexts/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
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
  const { user, loading } = useProfile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Handle scroll progress
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        // Clamp value between 0 and 1
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

  // Allow browsing without login
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex flex-col relative">
      {/* Main Content */}
      <div className="flex-1 flex items-start pt-[18vh] sm:pt-[20vh] md:pt-[22vh] overflow-hidden">
        <div className="w-full h-full flex flex-col lg:flex-row">
          {/* Left Side - Title Section */}
          <div className="w-full lg:w-2/5 flex items-start justify-center px-4 sm:px-6 md:px-8 lg:px-16 py-4 sm:py-6 lg:py-8">
            <div className="text-white">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl mb-4 sm:mb-6 md:mb-8 leading-tight">
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
              <p className="text-base sm:text-lg lg:text-xl opacity-90">
                {t('Welcome to SCLS Student-Run Campus Shop', '欢迎来到宋校文创商品店')}
              </p>
            </div>
          </div>

          {/* Right Side - Horizontal Scroll Categories (Desktop) */}
          <div className="hidden lg:flex flex-1 items-start pt-0 overflow-hidden py-12">
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex gap-6 overflow-x-auto scrollbar-hide px-8 scroll-smooth"
            >
              {categories.map((category) => (
                <a
                  key={category.id}
                  href={category.href}
                  className="group relative overflow-hidden rounded-2xl flex-shrink-0 cursor-pointer shadow-2xl hover:shadow-3xl transition-all duration-300 w-[280px] h-[400px]"
                >
                  <OptimizedImage
                    src={category.image}
                    alt={language === 'en' ? category.name.en : category.name.cn}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-3xl text-white">
                      {language === 'en' ? category.name.en : category.name.cn}
                    </h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet View - Grid Layout */}
      <div className="lg:hidden px-3 sm:px-4 pb-6 sm:pb-8">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {categories.map((category) => (
            <a
              key={category.id}
              href={category.href}
              className="group relative overflow-hidden rounded-xl aspect-[3/4] cursor-pointer shadow-lg hover:shadow-xl transition-shadow touch-manipulation"
            >
              <OptimizedImage
                src={category.image}
                alt={language === 'en' ? category.name.en : category.name.cn}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                <h3 className="text-base sm:text-lg md:text-xl text-white">
                  {language === 'en' ? category.name.en : category.name.cn}
                </h3>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Scroll Indicator - Desktop Only */}
      <div className="hidden lg:block absolute bottom-16 left-16 right-16 z-30">
        <div className="flex items-center gap-3">
          <p className="text-white text-sm whitespace-nowrap drop-shadow-lg">
            {t('Scroll for more', '滚动查看更多')}
          </p>
          <div className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden max-w-md">
            <div 
              className="h-full bg-white/80 w-1/3 transition-transform duration-100 ease-out will-change-transform"
              style={{ transform: `translateX(${scrollProgress * 200}%)` }}
            ></div>
          </div>
          <svg 
            className="w-5 h-5 text-white animate-bounce-horizontal" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(4px);
          }
        }
        .animate-bounce-horizontal {
          animation: bounce-horizontal 1.5s infinite;
        }
      `}</style>
    </div>
  );
}