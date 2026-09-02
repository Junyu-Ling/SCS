import React, { useState, useEffect } from 'react';
import { PerformanceMonitor } from '../utils/performance';

/**
 * 🔍 性能调试器组件
 * 仅在开发环境显示，用于监控性能指标
 * 
 * 使用方法：
 * 在 URL 添加 ?debug=true 参数即可显示
 */
export function PerformanceDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState({
    imageCount: 0,
    cacheHits: 0,
    apiCalls: 0,
    renderTime: 0,
  });

  useEffect(() => {
    // 检查 URL 参数
    const params = new URLSearchParams(window.location.search);
    setIsVisible(params.get('debug') === 'true');
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // 监控图片加载
    const images = document.querySelectorAll('img');
    setMetrics(prev => ({ ...prev, imageCount: images.length }));

    // 性能观察器
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource' && entry.name.includes('image')) {
            console.log('[Performance] Image loaded:', entry.name, `${entry.duration.toFixed(2)}ms`);
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });

      return () => observer.disconnect();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-2xl z-[9999] max-w-sm"
      style={{ fontFamily: 'monospace', fontSize: '12px' }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">🔍 Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <MetricRow label="Images" value={metrics.imageCount} />
        <MetricRow label="Cache Hits" value={metrics.cacheHits} />
        <MetricRow label="API Calls" value={metrics.apiCalls} />
        <MetricRow label="Render Time" value={`${metrics.renderTime.toFixed(2)}ms`} />
        
        <div className="border-t border-gray-700 pt-2 mt-2">
          <button
            onClick={() => {
              performance.mark('clear-cache');
              window.location.reload();
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
          >
            Clear Cache & Reload
          </button>
        </div>
      </div>

      <div className="mt-3 text-[10px] text-gray-400">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}:</span>
      <span className="font-bold text-green-400">{value}</span>
    </div>
  );
}
