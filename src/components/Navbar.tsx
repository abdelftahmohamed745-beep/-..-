import React from 'react';
import { Stethoscope, QrCode, CreditCard, Settings, LogOut, UserCheck, Sparkles, ExternalLink, Building2, ShieldAlert, Bell, TestTube } from 'lucide-react';
import { DoctorProfile } from '../types';

export type NavTabType = 'dashboard' | 'directory' | 'clinic' | 'booking' | 'ticket' | 'subscription' | 'auth' | 'admin' | 'lab_dashboard' | 'lab_public' | 'lab_result';

interface NavbarProps {
  currentDoctor: DoctorProfile | null;
  activeTab: NavTabType;
  onNavigate: (tab: NavTabType) => void;
  onOpenQRModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenNotificationModal?: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDoctor,
  activeTab,
  onNavigate,
  onOpenQRModal,
  onOpenSettingsModal,
  onOpenNotificationModal,
  onSignOut
}) => {
  const isLabAccount = currentDoctor?.accountType === 'laboratory';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Main Nav Tabs */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => onNavigate('directory')}
              className="flex items-center gap-2.5 text-right group focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-teal-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl text-slate-900 tracking-tight font-['Tajawal',sans-serif]">
                    دوري
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium block -mt-1">
                  المنظومة الطبية الذكية للعيادات والمختبرات
                </span>
              </div>
            </button>

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onNavigate('directory')}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'directory'
                    ? 'bg-sky-50 text-sky-700 font-black border border-sky-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>أطباء وعيادات</span>
              </button>

              {currentDoctor && (
                <button
                  onClick={() => onNavigate(isLabAccount ? 'lab_dashboard' : 'dashboard')}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'dashboard' || activeTab === 'lab_dashboard'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {isLabAccount ? <TestTube className="w-4 h-4 text-teal-400" /> : null}
                  <span>{isLabAccount ? 'لوحة تحكم معملي' : 'لوحة تحكم عيادتي'}</span>
                </button>
              )}

              <button
                onClick={() => onNavigate('subscription')}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                  activeTab === 'subscription'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                الاشتراكات والباقات
              </button>

              <button
                onClick={() => onNavigate('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1 ${
                  activeTab === 'admin'
                    ? 'bg-rose-900 text-white shadow-xs'
                    : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50'
                }`}
                title="لوحة تحكم إدارة المنصة"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>إدارة المنصة</span>
              </button>
            </nav>
          </div>

          {/* Right Navigation Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Near-Turn Notification Bell Button */}
            {onOpenNotificationModal && (
              <button
                onClick={onOpenNotificationModal}
                className="p-2 text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-xl transition relative"
                title="إعدادات ورسائل إشعارات قرب الدور"
                aria-label="إعدادات رسائل وتنبيهات الإشعارات"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-sky-500 rounded-full animate-ping" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-sky-600 rounded-full" />
              </button>
            )}

            {currentDoctor ? (
              <>
                {/* Subscription Badge */}
                <button
                  onClick={() => onNavigate('subscription')}
                  className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                    currentDoctor.subscriptionStatus === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : currentDoctor.subscriptionStatus === 'trial'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    {currentDoctor.subscriptionStatus === 'active'
                      ? 'اشتراك نشط'
                      : currentDoctor.subscriptionStatus === 'trial'
                      ? 'تجريبي'
                      : 'منتهي'}
                  </span>
                </button>

                {/* Patient View Preview Button */}
                <button
                  onClick={() => onNavigate('booking')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                    activeTab === 'booking'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="معاينة صفحة حجز المريض كأنك قمت بمسح QR Code"
                >
                  <ExternalLink className="w-4 h-4 text-sky-500" />
                  <span className="hidden sm:inline">معاينة صفحة الحجز</span>
                </button>

                {/* QR Code Action */}
                <button
                  onClick={onOpenQRModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition"
                  title="عرض وطباعة QR Code العيادة"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">رمز QR</span>
                </button>

                {/* Settings */}
                <button
                  onClick={onOpenSettingsModal}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                  title="إعدادات العيادة وتعديل الملف"
                  aria-label="إعدادات العيادة"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Sign Out */}
                <button
                  onClick={onSignOut}
                  className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition"
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4 rtl:rotate-180" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('directory')}
                  className={`md:hidden px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTab === 'directory'
                      ? 'bg-sky-600 text-white'
                      : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  أطباء وعيادات
                </button>

                {/* Doctor/Lab Login Button */}
                <button
                  onClick={() => onNavigate('auth')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition shadow-sm ${
                    activeTab === 'auth'
                      ? 'bg-slate-900 text-white ring-2 ring-slate-900/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-sky-400" />
                  <span>دخول العيادات والمختبرات</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
