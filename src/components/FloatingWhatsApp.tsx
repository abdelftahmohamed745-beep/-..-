import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, Zap } from 'lucide-react';

export const FloatingWhatsApp: React.FC = () => {
  const [status, setStatus] = useState<{
    isOnline: boolean;
    label: string;
    subtext: string;
    bgDot: string;
  }>({
    isOnline: true,
    label: 'متصل الأن',
    subtext: 'رد فوري',
    bgDot: 'bg-emerald-400',
  });

  useEffect(() => {
    const checkStatus = () => {
      const currentHour = new Date().getHours();
      // Active support hours: 9 AM (09:00) to 11 PM (23:00)
      const online = currentHour >= 9 && currentHour < 23;
      if (online) {
        setStatus({
          isOnline: true,
          label: 'متصل الأن',
          subtext: 'رد فوري واستجابة سريعة',
          bgDot: 'bg-emerald-400',
        });
      } else {
        setStatus({
          isOnline: false,
          label: 'مشغول حالياً',
          subtext: 'خارج ساعات العمل - قد يتأخر الرد',
          bgDot: 'bg-amber-400',
        });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const whatsappUrl = `https://wa.me/201032120351?text=${encodeURIComponent('مرحبًا، أريد التواصل والاستفسار عن نظام دوري للعيادات')}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-2.5 bg-emerald-700/95 hover:bg-emerald-600 text-white font-bold rounded-full shadow-2xl shadow-emerald-950/40 border border-emerald-400/30 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 group"
      aria-label="تواصل معنا عبر واتساب"
    >
      <div className="relative flex items-center justify-center shrink-0">
        <MessageCircle className="w-6 h-6 fill-current text-white shrink-0" />
        <span className={`absolute -top-1 -right-1 w-3 h-3 ${status.bgDot} rounded-full animate-ping opacity-75`} />
        <span className={`absolute -top-1 -right-1 w-3 h-3 ${status.bgDot} rounded-full border-2 border-emerald-800`} />
      </div>

      <div className="flex flex-col text-right font-['Tajawal',sans-serif]">
        <div className="flex items-center gap-1.5 leading-tight">
          <span className="text-sm font-extrabold text-white">الدعم الفني</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              status.isOnline
                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
            }`}
          >
            {status.label}
          </span>
        </div>
        <span className="text-[11px] font-medium text-emerald-100/90 flex items-center gap-1 mt-0.5">
          {status.isOnline ? (
            <Zap className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
          ) : (
            <Clock className="w-3 h-3 text-amber-300 shrink-0" />
          )}
          <span>{status.subtext}</span>
        </span>
      </div>
    </a>
  );
};

