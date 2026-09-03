import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-c4f5ade4`;
const STORAGE_KEY = 'scls_visitor_id';

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

function formatCount(n: number) {
  return n.toLocaleString();
}

export default function VisitorStats() {
  const { t } = useLanguage();
  const [total, setTotal] = useState<number | null>(null);
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    const visitorId = getVisitorId();
    let cancelled = false;

    const ping = async () => {
      try {
        const res = await fetch(`${API}/stats/heartbeat`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ visitorId }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (typeof data.total === 'number') setTotal(data.total);
        if (typeof data.online === 'number') setOnline(data.online);
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
    'pointer-events-none rounded-full bg-black/70 text-white text-[11px] sm:text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 backdrop-blur-sm shadow-sm';

  return (
    <>
      <div className={`fixed bottom-3 left-3 z-20 ${pill}`}>
        {t('Visitors', '累计访问')} {total === null ? '—' : formatCount(total)}
      </div>
      <div className={`fixed bottom-3 right-3 z-20 ${pill}`}>
        {t('Online', '当前在线')} {online === null ? '—' : formatCount(online)}
      </div>
    </>
  );
}
