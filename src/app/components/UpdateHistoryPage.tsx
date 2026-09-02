import { useLanguage } from '../contexts/LanguageContext';
import { LegalPageShell } from './LegalPageShell';

export default function UpdateHistoryPage() {
  const { t } = useLanguage();

  const updates = [
    {
      date: 'Fri, 27 Dec 2024 13:20:12 GMT+8',
      title: t('Feature Updates', '功能更新'),
      description: t(
        'Added the status of the order "Partial Delivery", added the "Update History" page',
        '添加了订单的"部分交付"状态，添加了"更新历史"页面'
      ),
    },
    {
      date: 'Thu, 26 Dec 2024 20:41:46 GMT+8',
      title: t('Front-end Performance Optimization', '前端性能优化'),
      description: t(
        'Optimized the style and layout of some elements in the page under different window sizes, optimized the visual experience of small electronic devices',
        '优化了页面中某些元素在不同窗口大小下的样式和布局，优化了小型电子设备的视觉体验'
      ),
    },
    {
      date: 'Thu, 26 Dec 2024 08:54:02 GMT+8',
      title: t('Website Officially Opened', '网站正式开放'),
      description: t(
        'All the functions of the website are officially opened, including the registration system and the commodity reservation system',
        '网站的所有功能正式开放，包括注册系统和商品预订系统'
      ),
    },
    {
      date: 'Sat, 14 Dec 2024 14:30:06 GMT+8',
      title: t(
        'Comprehensive Open Web Performance Evaluation and Optimization Testing',
        '全面开放的Web性能评估和优化测试'
      ),
      description: t(
        'Debugging and optimization of all functions in the web page, testing and improvement of various exception handling, stability, anomaly detection, availability optimization solutions',
        '网页中所有功能的调试和优化，测试和改进各种异常处理、稳定性、异常检测、可用性优化解决方案'
      ),
    },
  ];

  return (
    <LegalPageShell
      title={t('Update History', '更新历史')}
      subtitle={t(
        'Track the latest updates and improvements to SCLS Campus Shop',
        '跟踪 SCLS Campus Shop 的最新更新和改进'
      )}
    >
      <div className="space-y-6 sm:space-y-8">
        {updates.map((update, index) => (
          <article
            key={index}
            className="relative pl-5 sm:pl-8 py-2 border-l-4 border-yellow-500"
          >
            <p className="text-xs sm:text-sm text-gray-400 mb-2 break-words">
              {update.date}
            </p>
            <h2 className="text-xl sm:text-2xl font-normal mb-2 sm:mb-3 text-white break-words">
              {update.title}
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed break-words">
              {update.description}
            </p>
          </article>
        ))}
      </div>
    </LegalPageShell>
  );
}
