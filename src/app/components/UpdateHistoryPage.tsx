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
      <ol className="flex flex-col gap-6">
        {updates.map((update, index) => {
          const latest = index === 0;
          return (
            <li
              key={index}
              className="grid gap-3 md:grid-cols-[minmax(0,3fr)_minmax(0,9fr)] md:gap-10"
            >
              <div className="flex items-start gap-3 md:justify-end md:text-right">
                <span
                  className={`mt-[0.45em] h-2.5 w-2.5 shrink-0 rounded-full md:order-2 ${
                    latest ? 'bg-[#174D3D] ring-4 ring-[#174D3D]/15' : 'bg-[#174D3D]/40'
                  }`}
                />
                <span className="break-words text-sm font-medium leading-[1.6] text-[#4A5E55] md:order-1">
                  {update.date}
                </span>
              </div>

              <article
                className={`rounded-2xl border p-6 sm:p-7 ${
                  latest
                    ? 'border-[#174D3D] bg-[#174D3D] text-white'
                    : 'border-[#D6E2DC] bg-[#F4F8F6] text-black'
                }`}
              >
                <h2 className="break-words text-lg font-semibold leading-snug sm:text-xl">
                  {update.title}
                </h2>
                <p
                  className={`break-words pt-3 text-base leading-[1.8] sm:text-[17px] ${
                    latest ? 'text-white/80' : 'text-[#4A5E55]'
                  }`}
                >
                  {update.description}
                </p>
              </article>
            </li>
          );
        })}
      </ol>
    </LegalPageShell>
  );
}
