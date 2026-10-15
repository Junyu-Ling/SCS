import React, { useState } from 'react';
import '../styles/index.css';
import '../styles/fonts.css';
import '../styles/theme.css';
import Navbar from './components/Navbar';
import SubNavbar from './components/SubNavbar';
import HomePage from './components/HomePage';
import TagsPage from './components/TagsPage';
import ProductListPage from './components/ProductListPage';
import AboutUsPage from './components/AboutUsPage';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import AdminOrders from './components/AdminOrders';
import OrderHistory from './components/OrderHistory';
import ProfilePage from './components/ProfilePage';
import SalesStatistics from './components/SalesStatistics';
import TermsOfUsePage from './components/TermsOfUsePage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import UpdateHistoryPage from './components/UpdateHistoryPage';
import { LanguageProvider } from './contexts/LanguageContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CartProvider } from './contexts/CartContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { CheckoutProfileProvider } from './contexts/CheckoutProfileContext';
import { Toaster } from './components/ui/sonner';
import { useImagePreloader } from './hooks/useImagePreloader';
import VisitorStats from './components/VisitorStats';

/**
 * 错误边界组件
 * 用于捕获 React Context 相关错误并强制刷新页面
 * 主要处理热重载时的 Context 错误
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // 如果是 Context 错误（常见于热重载），强制刷新页面
    if (error.message.includes('must be used within') || error.message.includes('Provider')) {
      console.log('Context error detected - forcing page reload to fix hot reload issue');
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          fontFamily: 'sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Loading...</h1>
          <p style={{ color: '#666' }}>Refreshing the page to fix a hot reload issue...</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple router component
function Router() {
  // ✅ 启动时预加载所有商品和目录图片
  useImagePreloader();
  
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash.slice(1) || '/';
    return hash;
  });

  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    setCurrentPage(window.location.hash.slice(1) || '/');
  });

  // Render the appropriate page based on the current route
  const renderPage = () => {
    if (currentPage === '/' || currentPage === '/home') {
      return <HomePage />;
    } else if (currentPage === '/tag') {
      return <TagsPage />;
    } else if (currentPage.startsWith('/tag/')) {
      // Show product list for specific category/tag
      return <ProductListPage />;
    } else if (currentPage === '/aboutUs') {
      return <AboutUsPage />;
    } else if (currentPage === '/detail' || currentPage.startsWith('/detail?')) {
      return <ProductDetail />;
    } else if (currentPage === '/login') {
      return <AuthPage />;
    } else if (currentPage === '/admin') {
      return <AdminOrders />;
    } else if (currentPage === '/sales') {
      return <SalesStatistics />;
    } else if (currentPage === '/orders') {
      return <OrderHistory />;
    } else if (currentPage === '/profile') {
      return <ProfilePage />;
    } else if (currentPage === '/terms-of-use' || currentPage === '/termsOfUse') {
      return <TermsOfUsePage />;
    } else if (currentPage === '/privacy-policy' || currentPage === '/privacyPolicy') {
      return <PrivacyPolicyPage />;
    } else if (currentPage === '/update-history' || currentPage === '/updateHistory') {
      return <UpdateHistoryPage />;
    } else {
      // Default to home page
      return <HomePage />;
    }
  };

  // Show SubNavbar on all pages except home and tags selection page
  const showSubNavbar = currentPage !== '/' && currentPage !== '/home' && currentPage !== '/tag' && currentPage !== '/login' && currentPage !== '/admin' && currentPage !== '/terms-of-use' && currentPage !== '/termsOfUse' && currentPage !== '/privacy-policy' && currentPage !== '/privacyPolicy' && currentPage !== '/update-history' && currentPage !== '/updateHistory';

  const showFooter = currentPage !== '/tag' && currentPage !== '/login';
  
  // HomePage and TagsPage should have no top padding
  const showMainPadding = currentPage !== '/' && currentPage !== '/home' && currentPage !== '/tag';
  
  return (
    <div className={`w-full ${showMainPadding ? 'pt-[clamp(60px,10vh,80px)]' : ''}`}>
      {showSubNavbar && <SubNavbar />}
      {renderPage()}
      {showFooter && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <ProfileProvider>
          <CheckoutProfileProvider>
          <CartProvider>
            <ErrorBoundary>
              <div className="min-h-screen bg-background flex flex-col w-full overflow-x-hidden">
                <Navbar />
                <main className="flex-1 w-full">
                  <Router />
                </main>
                <Cart />
                <VisitorStats />
                <Toaster position="top-center" />
              </div>
            </ErrorBoundary>
          </CartProvider>
          </CheckoutProfileProvider>
        </ProfileProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}