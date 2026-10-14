import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { OptimizedImage } from './OptimizedImage';
import bgImage from 'figma:asset/61b600464c10ad2f4fcf9d9d77c1d869e872c127.png';

export default function HomePage() {
  const { t } = useLanguage();

  const handleShopNow = () => {
    window.location.href = '#/tag';
  };

  return (
    <div className="relative w-full overflow-x-hidden bg-white">
      <div className="relative min-h-[85vh] sm:min-h-[90vh] md:min-h-[100vh] w-full flex items-end justify-center overflow-hidden bg-[#E8F0EC]">
        <OptimizedImage
          src={bgImage}
          alt="Campus Shop"
          priority={true}
          blurUp
          wrapperClassName="absolute inset-0 w-full h-full"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/40 z-10"></div>

        <div className="relative z-20 w-full max-w-4xl text-center text-white px-6 pb-24 sm:pb-28 md:pb-32">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-4 font-semibold leading-[1.1]">
            {t('SCLS Campus Shop', '欢 迎 光 临')}
          </h1>
          <p className="text-base sm:text-lg md:text-xl mb-10 sm:mb-12 opacity-80 font-normal leading-[1.6]">
            {t('SCLS Student-Run Campus Shop', '宋校文创商品店')}
          </p>
          <Button
            onClick={handleShopNow}
            size="lg"
            className="bg-[#174D3D] text-white hover:bg-[#0F3A2E] border-0 text-sm sm:text-base px-8 py-5 rounded-xl font-medium transition-colors duration-200"
          >
            {t('Shop Now', '开始购物')}
          </Button>
        </div>
      </div>
    </div>
  );
}
