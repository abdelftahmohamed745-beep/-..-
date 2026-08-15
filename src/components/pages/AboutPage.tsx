import React, { useEffect } from 'react';
import {
  HeartPulse,
  Stethoscope,
  TestTube,
  Users,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Tv,
  FileText,
  DollarSign,
  QrCode,
  Smartphone,
  Sparkles,
  Layers,
  ArrowLeft,
  CalendarCheck
} from 'lucide-react';
import { setPageSeo, ABOUT_PAGE_SEO } from '../../utils/seo';

interface AboutPageProps {
  onNavigate: (tab: any, options?: any) => void;
  onNavigateAuth: (accountType?: 'doctor' | 'laboratory') => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate, onNavigateAuth }) => {
  useEffect(() => {
    setPageSeo(ABOUT_PAGE_SEO);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 font-['Tajawal',sans-serif]">
      
      {/* Header / Hero */}
      <header className="space-y-4 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#edf3fa] border border-[#d1dfed] text-[#122c4a] font-bold text-xs">
          <HeartPulse className="w-3.5 h-3.5 text-[#1b3a5c]" />
          <span>عن منظومة دوري الطبية</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#122c4a] tracking-tight leading-snug">
          منظومة دوري (Dory) لرقمنة الرعاية الصحية والعيادات والمختبرات
        </h1>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
          نظام سحابي ذكي صُمم لمعالجة التحديات اليومية للعيادات الخاصة ومختبرات التحاليل الطبية؛ لتحويل رحلة الكشف من الانتظار الورقي المرهق إلى تجربة رقمية منظمة وسلسة.
        </p>
      </header>

      {/* Core Mission & Vision */}
      <section aria-labelledby="mission-title" className="bg-[#fdfcf9] rounded-2xl p-6 sm:p-10 border border-[#e7e3da] shadow-2xs space-y-6">
        <h2 id="mission-title" className="text-xl sm:text-2xl font-bold text-[#122c4a]">
          رؤيتنا: القضاء على عشوائية الانتظار وتحديث السجلات الطبية
        </h2>
        <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
          تعتمد إدارة العيادات والمختبرات في العديد من المراكز على الحجز الورقي اليدوي أو الاتصال الهاتفي غير المنظم، مما يؤدي إلى تكدس المرضى في غرف الانتظار لساعات طويلة، وضياع السجلات الطبية الورقية، وتأخر تسليم نتائج الفحوصات.
        </p>
        <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
          جاءت <strong>منظومة دوري (Dory)</strong> لتوفر حلاً تقنياً فورياً يعمل مباشرة عبر الويب بدون الحاجة لتحميل تطبيقات ثقيلة، حيث يربط بين الطبيب والمساعد والمعمل والمريض في بيئة تفاعلية لحظية.
        </p>
      </section>

      {/* Problems Solved Breakdown */}
      <section aria-labelledby="problems-title" className="space-y-6">
        <div className="max-w-2xl">
          <h2 id="problems-title" className="text-xl sm:text-2xl font-bold text-[#122c4a]">
            المشكلات الأساسية التي تعالجها منظومة دوري
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            حلول هندسية وبرمجية محددة لمعالجة نقاط الضعف في إدارة العيادات والمعامل:
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          <div className="bg-[#fdfcf9] p-5 rounded-2xl border border-[#c4e5db] shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#eef7f4] text-[#143d30] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4 text-[#1c5242]" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">إنهاء التكدس وضياع الوقت</h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              استبدال الجلوس لساعات في صالة الانتظار بتذكرة رقمية حية تعرض عدد المتبقين قبلك وموعد الدخول المتوقع بدقة.
            </p>
          </div>

          <div className="bg-[#fdfcf9] p-5 rounded-2xl border border-[#d1dfed] shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#edf3fa] text-[#122c4a] flex items-center justify-center font-bold">
              <FileText className="w-4 h-4 text-[#1b3a5c]" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">حفظ السجلات الطبية</h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              أرشفة تاريخ الزيارات والتشخيصات والروشتات السابقة إلكترونياً لسهولة الرجوع إليها عند كل استشارة أو إعادة كشف.
            </p>
          </div>

          <div className="bg-[#fdfcf9] p-5 rounded-2xl border border-[#e7e3da] shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-[#faf8f5] text-[#b45309] flex items-center justify-center font-bold">
              <TestTube className="w-4 h-4 text-[#b45309]" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">تسليم النتائج الموثقة إلكترونياً</h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              إتاحة تقارير المختبر بصيغة PDF فور اعتمادها وتحقق الطبيب منها بمسح رمز QR دون الحاجة للمشاوير الإضافية.
            </p>
          </div>
        </div>
      </section>

      {/* Target Audiences Summary & Links */}
      <section aria-labelledby="audience-title" className="bg-[#fdfcf9] rounded-2xl p-6 sm:p-8 border border-[#e7e3da] shadow-2xs space-y-6">
        <h2 id="audience-title" className="text-xl sm:text-2xl font-bold text-[#122c4a]">
          حلول مصممة خصيصاً لكل طرف في المنظومة
        </h2>

        <div className="grid md:grid-cols-3 gap-5">
          <div className="bg-[#faf8f5] p-5 rounded-xl border border-[#c4e5db] space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#143d30] text-sm">
                <Stethoscope className="w-4 h-4 text-[#1c5242]" />
                <span>للأطباء والعيادات</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                لوحة تحكم لإدارة الطابور الحي، شاشة الانتظار TV View، ملفات المرضى، الروشتات، والعمليات المالية.
              </p>
            </div>
            <button
              onClick={() => onNavigate('for-clinics')}
              className="text-xs font-bold text-[#1c5242] hover:underline flex items-center gap-1 cursor-pointer pt-2"
            >
              <span>تفاصيل ميزات العيادات</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-[#faf8f5] p-5 rounded-xl border border-[#d1dfed] space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#122c4a] text-sm">
                <TestTube className="w-4 h-4 text-[#1b3a5c]" />
                <span>للمختبرات والمعامل</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                دليل الفحوصات والأسعار، تتبع باركود العينات، إصدار تقارير PDF الموثقة بـ QR، والسحب المنزلي.
              </p>
            </div>
            <button
              onClick={() => onNavigate('for-labs')}
              className="text-xs font-bold text-[#1b3a5c] hover:underline flex items-center gap-1 cursor-pointer pt-2"
            >
              <span>تفاصيل ميزات المعامل</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-[#faf8f5] p-5 rounded-xl border border-[#e7e3da] space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#b45309] text-sm">
                <Users className="w-4 h-4 text-[#b45309]" />
                <span>للمرضى والمراجعين</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                حجز فوري كـ Guest بدون حساب، متابعة التذكرة الرقمية الحية، استرجاع الحجز، والاطلاع على النتائج.
              </p>
            </div>
            <button
              onClick={() => onNavigate('for-patients')}
              className="text-xs font-bold text-[#b45309] hover:underline flex items-center gap-1 cursor-pointer pt-2"
            >
              <span>تفاصيل تجربة المرضى</span>
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <div className="text-center py-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-900">هل أنت جاهز لتحديث إدارة عيادتك أو معملك؟</h3>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => onNavigateAuth('doctor')}
            className="px-6 py-3 bg-[#1c5242] hover:bg-[#143d30] text-white rounded-xl text-xs sm:text-sm font-bold shadow-2xs cursor-pointer transition"
          >
            تسجيل عيادة جديدة مجاناً
          </button>
          <button
            onClick={() => onNavigateAuth('laboratory')}
            className="px-6 py-3 bg-[#122c4a] hover:bg-[#0d223a] text-white rounded-xl text-xs sm:text-sm font-bold shadow-2xs cursor-pointer transition"
          >
            تسجيل معمل تحاليل مجاناً
          </button>
          <button
            onClick={() => onNavigate('directory')}
            className="px-6 py-3 bg-[#faf8f5] hover:bg-[#f4efe6] text-slate-800 border border-[#e7e3da] rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition"
          >
            استعراض دليل الأطباء والمعامل
          </button>
        </div>
      </div>

    </div>
  );
};
