import React from 'react';
import { MessageCircle } from 'lucide-react';

export const FloatingWhatsApp: React.FC = () => {
  const whatsappUrl = `https://wa.me/9647813745417?text=${encodeURIComponent('مرحبًا، أريد التواصل والاستفسار عن نظام دوري للعيادات')}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full shadow-2xl shadow-emerald-900/30 transition-all duration-300 hover:scale-105 active:scale-95 group border border-emerald-400/40"
      aria-label="تواصل معنا عبر واتساب"
    >
      <div className="relative flex items-center justify-center">
        <MessageCircle className="w-6 h-6 fill-current text-white shrink-0" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full animate-ping" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-200 rounded-full" />
      </div>
      <span className="text-sm font-['Tajawal',sans-serif] whitespace-nowrap">
        تواصل معنا
      </span>
    </a>
  );
};
