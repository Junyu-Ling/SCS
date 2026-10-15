import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

// /api/stats（见 api/stats.ts）：
//   左下 Visitor = 累计独立访客 UV（localStorage 持久 visitorId，服务端 SET 去重）
//   右下 Online  = 最近 60 秒内有心跳的人数
// 左边不是 PV、不是当日、不是当前在线；展示值只增不减。
const API = '/api';
const STORAGE_KEY = 'scls_visitor_id';
const TOTAL_HW_KEY = 'scls_visitor_total_hw';

function getVisitorId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function readHighWater(): number {
  try {
    const n = Number(localStorage.getItem(TOTAL_HW_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function writeHighWater(n: number) {
  try {
    localStorage.setItem(TOTAL_HW_KEY, String(n));
  } catch {
    /* ignore */
  }
}

function formatCount(n: number) {
  return n.toLocaleString();
}

export default function VisitorStats() {
  const { t } = useLanguage();
  const [total, setTotal] = useState<number | null>(() => {
    const hw = readHighWater();
    return hw > 0 ? hw : null;
  });
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    const visitorId = getVisitorId();
    let cancelled = false;

    const ping = async () => {
      try {
        const res = await fetch(`${API}/stats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.total === 'number' && Number.isFinite(data.total)) {
          // Visitor 是累计 UV：UI 与本地高水位都只升不降。
          setTotal((prev) => {
            const next = Math.max(prev ?? 0, Math.floor(data.total), readHighWater());
            writeHighWater(next);
            return next;
          });
        }
        if (typeof data.online === 'number' && Number.isFinite(data.online)) {
          setOnline(Math.max(0, Math.floor(data.online)));
        }
      } catch {
        /* 后端未部署时保持占位 */
      }
    };

    ping();
    const timer = window.setInterval(ping, 25000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const pill =
    'pointer-events-none rounded-xl bg-white/90 text-[#4A5E55] text-[11px] sm:text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 border border-[#D6E2DC]';

  return (
    <>
      <div
        className={`fixed bottom-3 left-3 z-20 ${pill}`}
        title={t(
          'Cumulative unique visitors (never decreases)',
          '累计独立访客，只增不减（非当日、非浏览次数、非当前在线）',
        )}
      >
        {t('Visitors', '累计访问用户量')} {total === null ? '—' : formatCount(total)}
      </div>
      <div
        className={`fixed bottom-3 right-3 z-20 ${pill}`}
        title={t('Currently online', '最近 60 秒内有心跳的访客')}
      >
        {t('Online', '当前在线')} {online === null ? '—' : formatCount(online)}
      </div>
    </>
  );
}
