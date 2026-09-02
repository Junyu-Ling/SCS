import { useLanguage } from '../contexts/LanguageContext';
import { useProfile } from '../contexts/ProfileContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { OptimizedImage } from './OptimizedImage';
import bgImage from 'figma:asset/61b600464c10ad2f4fcf9d9d77c1d869e872c127.png';

export default function HomePage() {
  const { t } = useLanguage();
  const { user } = useProfile();

  const handleShopNow = () => {
    // Allow everyone to browse, no login required
    window.location.href = '#/tag';
  };

  return (
    <div className="relative w-full overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative min-h-[85vh] sm:min-h-[90vh] md:min-h-[100vh] w-full flex items-start justify-center overflow-hidden bg-gradient-to-br from-primary to-secondary">
        <OptimizedImage
          src={bgImage}
          alt="Campus Shop"
          priority={true}
          blurUp
          wrapperClassName="absolute inset-0 w-full h-full"
          className="w-full h-full object-cover"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/15 z-10"></div>
        
        {/* Title and Subtitle */}
        <div className="relative z-20 text-center text-white px-3 sm:px-4 md:px-6 pt-[40vh] sm:pt-[42vh] md:pt-[45vh]">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-2 sm:mb-3 md:mb-4 font-normal leading-tight">
            {t('SCLS Campus Shop', '欢 迎 光 临')}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-12 sm:mb-16 md:mb-20 lg:mb-24 opacity-90 font-light">
            {t('SCLS Student-Run Campus Shop', '宋校文创商品店')}
          </p>
          <Button
            onClick={handleShopNow}
            size="lg"
            className="bg-primary text-white hover:bg-transparent hover:border-2 hover:border-white border-2 border-primary text-base sm:text-lg px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 rounded-full transition-all duration-300 font-medium"
          >
            {t('Shop Now', '开始购物')}
          </Button>
        </div>
      </div>
    </div>
  );
}