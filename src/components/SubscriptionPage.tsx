import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, ShieldCheck, Sparkles, Clock, AlertTriangle, MessageSquare, ArrowRight, Info, CheckCircle2 } from 'lucide-react';
import { DoctorProfile } from '../types';
import { CustomWebsiteSection } from './CustomWebsiteSection';

interface SubscriptionPageProps {
  doctor: DoctorProfile;
  onBackToDashboard: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const SubscriptionPage: React.FC<SubscriptionPageProps> = ({
  doctor,
  onBackToDashboard,
  onShowToast
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const trialEnd = new Date(doctor.trialEndDate);
  const daysLeftTrial = Math.max(0, Math.ceil((trialEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  const getWhatsAppSubscriptionLink = (planName: string) => {
    const text = `مرحبًا، أريد تفعيل اشتراك. اسم الباقة: ${planName}`;
    return `https://wa.me/201032120351?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      
      {/* Back Button */}
      <button
        onClick={onBackToDashboard}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs transition"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة للوحة التحكم</span>
      </button>

      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 text-sky-700 font-bold text-xs mb-3 border border-sky-200/60">
          <Sparkles className="w-4 h-4 text-sky-600" />
          <span>اشتراكات عيادات دوري</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-['Tajawal',sans-serif]">
          اختر الباقة المناسبة لعيادتك
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm mt-2">
          نظام حجز وتتبع دور ذكي ومباشر، بدون أجهزة معقدة وبدون تكاليف صيانة
        </p>
      </div>

      {/* Current Subscription Status Card */}
      <div className="mb-8 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-right">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            doctor.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-700' :
            doctor.subscriptionStatus === 'trial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'
          }`}>
            {doctor.subscriptionStatus === 'active' ? <ShieldCheck className="w-6 h-6" /> :
             doctor.subscriptionStatus === 'trial' ? <Clock className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-xs text-slate-500 font-semibold">حالة اشتراك العيادة الحالية:</div>
            <div className="text-lg font-bold text-slate-900 font-['Tajawal',sans-serif]">
              {doctor.subscriptionStatus === 'active' ? 'اشتراك مدفوع نشط' :
               doctor.subscriptionStatus === 'trial' ? `الفترة التجريبية المجانية (${daysLeftTrial} أيام متبقية)` :
               'الاشتراك منتهي الحساب متوقف'}
            </div>
            {doctor.subscriptionStatus === 'expired' && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                تنويه: لا يمكن للمرضى الجدد حجز أدوار جديدة حتى يتم تجديد الاشتراك.
              </p>
            )}
          </div>
        </div>

        <a
          href={getWhatsAppSubscriptionLink(doctor.subscriptionStatus === 'active' ? 'تجديد الاشتراك' : 'تفعيل جديد')}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-sm"
        >
          <MessageSquare className="w-4 h-4 fill-current" />
          <span>تواصل للتفعيل عبر واتساب (01032120351)</span>
        </a>
      </div>

      {/* Important Instructions Banner */}
      <div className="mb-10 p-5 bg-sky-50 border border-sky-200/80 rounded-2xl flex items-start gap-3 text-right">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-sky-900 leading-relaxed font-medium">
          <span className="font-bold block mb-1">تعليمات تفعيل الاشتراك:</span>
          لتفعيل الاشتراك، تواصل معنا عبر واتساب وأرسل اسم الباقة وإثبات الدفع. سيتم مراجعة الطلب وتفعيل الاشتراك يدويًا بعد التأكد من عملية الدفع.
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
        
        {/* Monthly Plan */}
        <div className={`bg-white rounded-3xl p-8 border transition-all ${
          selectedPlan === 'monthly'
            ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-lg'
            : 'border-slate-200 hover:border-slate-300 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-500">الباقة الشهرية</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-semibold">مرونة عالية</span>
          </div>

          <div className="flex items-baseline gap-1 my-4">
            <span className="text-4xl font-extrabold text-slate-900 font-['Tajawal',sans-serif]">1,500</span>
            <span className="text-sm font-bold text-slate-500">ج.م / شهرياً</span>
          </div>

          <p className="text-xs text-slate-500 mb-6">مناسب للعيادات المستقلة والأطباء الجدد</p>

          <ul className="space-y-3 text-xs sm:text-sm text-slate-700 mb-8">
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>عدد غير محدود من حجوزات المرضى يومياً</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>شاشة تتبع حية (Live Realtime) لكل مريض</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>توليد ورسم QR Code قابل للطباعة</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>حساب تلقائي لمتوسط زمن الكشف الفعلي</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تنبيهات صوتية وبصرية عند اقتراب دور المريض</span>
            </li>
          </ul>

          <a
            href={getWhatsAppSubscriptionLink("الباقة الشهرية")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSelectedPlan('monthly')}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition shadow-sm"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>تفعيل الاشتراك عبر واتساب</span>
          </a>
        </div>

        {/* Yearly Plan (Best Value) */}
        <div className={`bg-slate-900 text-white rounded-3xl p-8 border relative transition-all ${
          selectedPlan === 'yearly'
            ? 'border-sky-400 ring-4 ring-sky-500/30 shadow-2xl scale-[1.02]'
            : 'border-slate-800 hover:border-slate-700 shadow-xl'
        }`}>
          <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 px-3.5 py-1 rounded-full text-xs font-black shadow-md">
            الأكثر توفيراً (توفير 22%)
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-sky-400">الباقة السنوية</span>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-semibold">سنة كاملة</span>
          </div>

          <div className="flex items-baseline gap-1 my-4">
            <span className="text-4xl font-extrabold text-white font-['Tajawal',sans-serif]">14,000</span>
            <span className="text-sm font-bold text-slate-400">ج.م / سنوياً</span>
          </div>

          <p className="text-xs text-slate-400 mb-6">احصل على شهرين مجاناً عند الاشتراك السنوي</p>

          <ul className="space-y-3 text-xs sm:text-sm text-slate-300 mb-8">
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>جميع ميزات الباقة الشهرية كاملة</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>أولوية الدعم الفني الفوري المباشر</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>توفير أكثر من 4,000 ج.م سنوياً</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>تخصيص شعار واسم العيادة على التذاكر</span>
            </li>
          </ul>

          <a
            href={getWhatsAppSubscriptionLink("الباقة السنوية")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setSelectedPlan('yearly')}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl transition shadow-lg"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>تفعيل الاشتراك عبر واتساب</span>
          </a>
        </div>

      </div>

      {/* Standalone Section: Want a custom website? */}
      <CustomWebsiteSection />

    </div>
  );
};
