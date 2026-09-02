import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Search, ShoppingCart, Languages, User, LogOut, Package, Shield, X, MessageSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useProfile } from '../contexts/ProfileContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useProducts } from '../hooks/useProducts';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';

export default function Navbar() {
  // Stable hook order: contexts, states, refs, effects
  const { language, toggleLanguage, t } = useLanguage();
  const { setIsCartOpen, cartItems } = useCart();
  const { user, profile, signOut, isAdmin, profileVersion } = useProfile();
  const [searchValue, setSearchValue] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { products } = useProducts();

  // 监听 profile 变化，更新头像
  useEffect(() => {
    setAvatarUrl(profile?.avatar_url || null);
  }, [profile?.avatar_url, profileVersion]);

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 搜索商品 - 只搜索商品名称
  const searchResults = searchValue.trim() ? products.filter(product => {
    const query = searchValue.toLowerCase();
    const nameEn = product.name.en.toLowerCase();
    const nameCn = product.name.cn.toLowerCase();
    return nameEn.includes(query) || nameCn.includes(query);
  }).slice(0, 5) : []; // 最多显示5个结果

  const handleSearchChange = (value: string) => {
    if (!user) {
      // 显示提示并立即跳转到登录页面
      toast.error(t(
        'Please log in to use the search function',
        '请登录后使用搜索功能'
      ));
      window.location.hash = '/login';
      return;
    }
    setSearchValue(value);
    setShowSearchResults(value.trim().length > 0);
  };

  const handleProductClick = (productId: number) => {
    setSearchValue('');
    setShowSearchResults(false);
    window.location.hash = `#/detail?id=${productId}`;
  };

  const clearSearch = () => {
    setSearchValue('');
    setShowSearchResults(false);
  };

  const handleCartClick = () => {
    if (!user) {
      // 显示提示并立即跳转到登录页面
      toast.error(t(
        'Please log in to view your shopping cart',
        '请登录后查看购物车'
      ));
      window.location.hash = '/login';
      return;
    }
    setIsCartOpen(true);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-yellow-200 font-semibold">{part}</mark> : part
    );
  };

  return (
    <nav className="h-[10vh] min-h-[60px] max-h-[80px] w-full bg-primary fixed top-0 z-40 flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8">
      {/* Left Side - Logo and Title */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6 flex-1 min-w-0">
        <a href="#/" className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
          <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl text-white font-semibold truncate">
            {language === 'en' ? 'SCLS Campus Shop' : '宋校文创商品店'}
          </h1>
        </a>
        
        {/* Subtitle - Hidden on mobile and tablet */}
        <div className="hidden lg:flex flex-col justify-center text-white/90 flex-shrink-0">
          {language === 'en' ? (
            <>
              <p className="text-xs leading-tight font-normal">Domestic Division High School</p>
              <p className="text-xs leading-tight font-normal">Student Council</p>
            </>
          ) : (
            <>
              <p className="text-xs leading-tight font-normal">中国部高中</p>
              <p className="text-xs leading-tight font-normal">学生会</p>
            </>
          )}
        </div>
      </div>

      {/* Right Side - Search Box and Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Search Box - Hidden on mobile, shown on tablet and up */}
        <div className="hidden md:flex items-center bg-white rounded h-9 md:h-10 px-2 md:px-3 w-[180px] lg:w-[280px] xl:w-[320px] relative" ref={searchContainerRef}>
          <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mr-1 md:mr-2 flex-shrink-0" />
          <Input
            type="text"
            placeholder={language === 'en' ? 'Search' : '搜索'}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearchChange(searchValue)}
            className={`h-full border-0 bg-transparent text-xs md:text-sm p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 ${searchValue ? 'pr-7' : ''}`}
            ref={searchInputRef}
          />
          {searchValue && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 md:right-3 p-0.5 hover:bg-gray-100 rounded transition-colors focus:outline-none"
              aria-label={language === 'en' ? 'Clear search' : '清除搜索'}
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-[400px] overflow-y-auto">
              {searchResults.map(product => (
                <div
                  key={product.id}
                  className="px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors border-b border-border last:border-b-0"
                  onClick={() => handleProductClick(product.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-muted">
                      {product.images?.[0] ? (
                        <ImageWithFallback
                          src={product.images[0]}
                          alt={language === 'en' ? product.name.en : product.name.cn}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">
                        {highlightText(language === 'en' ? product.name.en : product.name.cn, searchValue)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {product.category} · ¥{product.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showSearchResults && searchValue.trim() && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 px-4 py-6 text-center">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {language === 'en' ? 'No products found' : '未找到商品'}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-white/10 text-white rounded-full">
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-green-800 text-white text-xs">
                      {profile?.real_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.real_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.hash = '/profile'}>
                  <User className="mr-2 h-4 w-4" />
                  <span>{t('Profile Settings', '个人设置')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.hash = '/chat'}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>{t('Customer Service', '在线客服')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.hash = '/orders'}>
                  <Package className="mr-2 h-4 w-4" />
                  <span>{t('My Reservations', '我的预定')}</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => window.location.hash = '/admin'}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>{t('Admin Dashboard', '管理员后台')}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('Log out', '退出登录')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.hash = '/login'}
              className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-white/10 text-white rounded"
              title={t('Login', '登录')}
            >
              <User className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
          )}

          {/* Cart Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCartClick}
            className="relative h-9 w-9 sm:h-10 sm:w-10 hover:bg-white/10 text-white rounded"
            title={t('Cart', '购物车')}
          >
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
            {cartItems.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center font-medium">
                {cartItems.length}
              </span>
            )}
          </Button>

          {/* Language Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            title={t('Switch to Chinese', 'Switch to English')}
            className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-white/10 text-white rounded"
          >
            <Languages className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </div>
      </div>
    </nav>
  );
}