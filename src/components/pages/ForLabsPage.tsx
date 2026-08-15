import React, { useEffect } from 'react';
import {
  TestTube,
  QrCode,
  FileCheck,
  Truck,
  Layers,
  Sparkles,
  Users,
  CheckCircle2,
  DollarSign,
  ArrowLeft
} from 'lucide-react';
import { setPageSeo, FOR_LABS_PAGE_SEO } from '../../utils/seo';

interface ForLabsPageProps {
  onNavigate: (tab: any, options?: any) => void;
  onNavigateAuth: (accountType?: 'doctor' | 'laboratory') => void;
}

export const ForLabsPage: React.FC<ForLabsPageProps> = ({ onNavigate, onNavigateAuth }) => {
  useEffect(() => {
    setPageSeo(FOR_LABS_PAGE_SEO);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 font-['Tajawal',sans-serif]">
      
      {/* Header */}
      <header className="space-y-4 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#edf3fa] border border-[#d1dfed] text-[#122c4a] font-bold text-xs">
          <TestTube className="w-3.5 h-3.5 text-[#1b3a5c]" />
          <span>منظومة دوري لمختبرات ومعامل التحاليل الطبية</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#122c4a] tracking-tight leading-snug">
          إدارة متقدمة للفحوصات المخبرية، مسار العينات، والتقارير المعتمدة بـ QR
        </h1>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-normal">
          منظومة سحابية متخصصة تمنح معملك صفحة عامة لعرض الفحوصات والأسعار، واستقبال طلبات السحب المنزلي، وإصدار نتائج PDF موثقة ومتاحة إلكترونياً للمريض والطبيب.
        </p>

        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => onNavigateAuth('laboratory')}
            className="px-6 py-3 bg-[#122c4a] hover:bg-[#0d223a] text-white rounded-xl text-xs sm:text-sm font-bold shadow-2xs cursor-pointer transition flex items-center gap-2"
          >
            <TestTube className="w-4 h-4 text-sky-300" />
            <span>إنشاء حساب معمل تحاليل</span>
          </button>
        </div>
      </header>

      {/* Core Laboratory Features */}
      <section aria-labelledby="lab-features-title" className="space-y-6">
        <h2 id="lab-features-title" className="text-xl sm:text-2xl font-bold text-[#122c4a]">
          مزايا إدارة المختبر والتحاليل في دوري
        </h2>

        <div className="grid sm:grid-cols-2 gap-5">
          
          {/* Feature 1: Test Catalog */}
          <div className="bg-[#fdfcf9] p-6 rounded-2xl border border-[#d1dfed] shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#edf3fa] text-[#122c4a] flex items-center justify-center font-bold">
              <Layers className="w-5 h-5 text-[#1b3a5c]" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">دليل التحاليل والباقات والأسعار</h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              إضافة وتصنيف الفحوصات الطبية (وظائف كبد، كلى، سكر، تحاليل شاملة) وتحديد شروط التحليل وفترة ظهور النتيجة وسعر كل فحص.
            </p>
          </div>

          {/* Feature 2: Sample Tracking & Barcode */}
          <div className="bg-[#fdfcf9] p-6 rounded-2xl border border-[#d1dfed] shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#edf3fa] text-[#122c4a] flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5 text-[#1b3a5c]" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">تتبع مسار العينة والباركود</h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              رقم تتبع وباركود لكل عينة لتسهيل فرزها في المختبر وتحديث حالتها خطوة بخطوة (تم السحب، قيد التحليل، جاهزة للاعتماد).
            </p>
          </div>

          {/* Feature 3: Certified PDF Reports */}
          <div className="bg-[#fdfcf9] p-6 rounded-2xl border border-[#d1dfed] shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#edf3fa] text-[#122c4a] flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5 text-[#1b3a5c]" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">إصدار تقارير PDF الموثقة برمز QR</h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              توليد تقارير رسمية باسم المعمل وتوقيع المشرف مع رمز QR للتحقق السريع، بحيث يستطيع الطبيب والمريض الاطلاع عليها وطباعتها بسهولة.
            </p>
          </div>

          {/* Feature 4: Home Blood Draw */}
          <div className="bg-[#fdfcf9] p-6 rounded-2xl border border-[#d1dfed] shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#edf3fa] text-[#122c4a] flex items-center justify-center font-bold">
              <Truck className="w-5 h-5 text-[#1b3a5c]" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">استقبال طلبات السحب المنزلي</h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              إمكانية تفعيل خدمة الزيارات المنزلية وتحديد رسوم الخدمة واستقبال طلبات المرضى مع عنوانهم وبيانات الاتصال مباشرة في لوحة التحكم.
            </p>
          </div>

        </div>
      </section>

      {/* Lab Workflow */}
      <section aria-labelledby="lab-workflow-title" className="bg-[#fdfcf9] rounded-2xl p-6 sm:p-8 border border-[#e7e3da] shadow-2xs space-y-6">
        <h2 id="lab-workflow-title" className="text-xl sm:text-2xl font-bold text-[#122c4a]">
          دورة عمل فحص المعمل في دوري
        </h2>

        <div className="grid sm:grid-cols-4 gap-4">
          <div className="p-4 bg-[#faf8f5] rounded-xl border border-[#d1dfed] space-y-2">
            <div className="text-xs font-bold text-[#122c4a]">1. الطلب أو الحضور</div>
            <div className="text-xs text-slate-600">طلب الفحص عبر صفحة المعمل أو تسجيل المريض عند وصوله للمقر.</div>
          </div>

          <div className="p-4 bg-[#faf8f5] rounded-xl border border-[#d1dfed] space-y-2">
            <div className="text-xs font-bold text-[#122c4a]">2. تسجيل وسحب العينة</div>
            <div className="text-xs text-slate-600">إصدار رقم الطلب والباركود وتحديد الفحوصات المطلوبة في النظام.</div>
          </div>

          <div className="p-4 bg-[#faf8f5] rounded-xl border border-[#d1dfed] space-y-2">
            <div className="text-xs font-bold text-[#122c4a]">3. إدخال النتائج والاعتماد</div>
            <div className="text-xs text-slate-600">تدوين القيم والملاحظات الطبية واعتماد التقرير من أخصائي التحاليل.</div>
          </div>

          <div className="p-4 bg-[#faf8f5] rounded-xl border border-[#d1dfed] space-y-2">
            <div className="text-xs font-bold text-[#122c4a]">4. استلام المريض الفوري</div>
            <div className="text-xs text-slate-600">إتاحة التقرير للتحميل والمشاهدة برابط مباشر وتوثيق QR موثوق.</div>
          </div>
        </div>
      </section>

      {/* Internal Links & CTA */}
      <div className="border-t border-[#e7e3da] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs text-slate-600">
          <button onClick={() => onNavigate('faq')} className="hover:underline font-bold">الأسئلة الشائعة</button>
          <span>•</span>
          <button onClick={() => onNavigate('for-clinics')} className="hover:underline font-bold">حلول العيادات والأطباء</button>
          <span>•</span>
          <button onClick={() => onNavigate('privacy')} className="hover:underline font-bold">الخصوصية والأمان</button>
        </div>

        <button
          onClick={() => onNavigateAuth('laboratory')}
          className="px-6 py-3 bg-[#122c4a] hover:bg-[#0d223a] text-white rounded-xl text-xs sm:text-sm font-bold shadow-2xs cursor-pointer transition flex items-center gap-2"
        >
          <span>تسجيل حساب معمل تحاليل</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
