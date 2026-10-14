import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';

export default function SubNavbar() {
  const { t } = useLanguage();
  const [currentPath, setCurrentPath] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const categories = [
    { name: t('Apparel', '服饰'), href: '#/tag/apparel' },
    { name: t('Stationery', '文具'), href: '#/tag/stationery' },
    { name: t('Daily Use', '日用品'), href: '#/tag/dailyUse' },
    { name: t('Sports', '运动'), href: '#/tag/sports' },
    { name: t('Gift', '礼品'), href: '#/tag/gift' },
    { name: t('About Us', '关于我们'), href: '#/aboutUs' },
  ];

  const isActive = (href: string) => {
    return currentPath === href;
  };

  return (
    <div className="bg-white border-b border-[#D6E2DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
            {categories.map((category) => (
              <a
                key={category.href}
                href={category.href}
                className={`relative pb-1 text-sm transition-opacity ${
                  isActive(category.href)
                    ? 'text-black font-semibold'
                    : 'text-[#4A5E55] hover:text-[#174D3D]'
                }`}
              >
                {category.name}
                {isActive(category.href) && (
                  <span className="absolute bottom-0 left-0 w-full h-px bg-[#174D3D]"></span>
                )}
              </a>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="text-[#4A5E55] hover:text-[#174D3D] hover:bg-[#E8F0EC] text-sm rounded-xl"
          >
            {t('Back', '返回')}
          </Button>
        </div>
      </div>
    </div>
  );
}
