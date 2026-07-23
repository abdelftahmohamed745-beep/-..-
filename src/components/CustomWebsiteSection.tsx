import React from 'react';
import { Globe, ArrowLeft, MessageSquare, Sparkles } from 'lucide-react';

export const CustomWebsiteSection: React.FC = () => {
  const customWebsiteMessage = "مرحبًا، أريد إنشاء موقع خاص بي. أريد معرفة التفاصيل والأسعار.";
  const whatsappUrl = `https://wa.me/9647813745417?text=${encodeURIComponent(customWebsiteMessage)}`;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden my-8">
      
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="text-right max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-300 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>خدمات البرمجة والتطوير المخصصة</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black font-['Tajawal',sans-serif] text-white">
            عايز تعمل موقع خاص بيك؟
          </h2>
          
          <p className="text-slate-300 text-sm leading-relaxed sm:text-base">
            نقدر نساعدك في إنشاء موقع خاص بك ومناسب لاحتياجاتك. تواصل معنا عبر واتساب لمعرفة التفاصيل والأسعار.
          </p>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-emerald-950/40 transition-all duration-200 hover:scale-[1.02] active:scale-95 group border border-emerald-400/30"
          >
            <MessageSquare className="w-5 h-5 fill-current" />
            <span>اطلب موقعك الآن</span>
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          </a>
        </div>
      </div>
    </div>
  );
};
