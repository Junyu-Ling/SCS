import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { OptimizedImage } from './OptimizedImage';
import { HERO_BLUR_PLACEHOLDER } from './heroBlur';
import bgImage from 'figma:asset/61b600464c10ad2f4fcf9d9d77c1d869e872c127.webp';

export default function HomePage() {
  const { t } = useLanguage();

  const handleShopNow = () => {
    window.location.href = '#/tag';
  };

  return (
    <div className="relative w-full bg-white pt-20">
      <div className="relative w-full h-[min(100vw,calc(100svh-5rem))]">
        <OptimizedImage
          src={bgImage}
          alt="Campus Shop"
          priority={true}
          blurUp
          placeholderSrc={HERO_BLUR_PLACEHOLDER}
          wrapperClassName="absolute inset-0 h-full w-full"
          placeholderClassName="object-[center_55%]"
          className="h-full w-full object-cover object-[center_55%]"
        />

        <div className="pointer-events-none absolute inset-0 bg-black/35" />

        <div className="absolute inset-0 z-10 flex items-center justify-center px-4 py-6">
          <div className="flex w-full max-w-4xl flex-col items-center text-center text-white">
            <h1 className="max-w-full text-[clamp(1.75rem,5.5vw,4.25rem)] font-semibold leading-tight">
              {t('SCLS Campus Shop', '欢 迎 光 临')}
            </h1>
            <p className="mt-3 max-w-full text-[clamp(0.95rem,2.2vw,1.25rem)] font-normal leading-snug opacity-90">
              {t('SCLS Student-Run Campus Shop', '宋校文创商品店')}
            </p>
            <Button
              onClick={handleShopNow}
              size="lg"
              className="mt-6 bg-[#174D3D] text-white hover:bg-[#0F3A2E] border-0 text-sm sm:text-base px-8 py-5 rounded-xl font-medium transition-colors duration-200"
            >
              {t('Shop Now', '开始购物')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
