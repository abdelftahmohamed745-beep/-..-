import React from 'react';
import { Stethoscope, QrCode, CreditCard, Settings, LogOut, UserCheck, ExternalLink, Building2, ShieldAlert, Bell, TestTube } from 'lucide-react';
import { DoctorProfile } from '../types';

export type NavTabType =
  | 'dashboard'
  | 'directory'
  | 'clinic'
  | 'booking'
  | 'ticket'
  | 'subscription'
  | 'auth'
  | 'admin'
  | 'lab_dashboard'
  | 'lab_public'
  | 'lab_result'
  | 'about'
  | 'for-clinics'
  | 'for-labs'
  | 'for-patients'
  | 'faq'
  | 'privacy';

interface NavbarProps {
  currentDoctor: DoctorProfile | null;
  activeTab: NavTabType;
  isAdmin?: boolean;
  unreadNotificationCount?: number;
  onNavigate: (tab: NavTabType) => void;
  onOpenQRModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenNotificationModal?: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDoctor,
  activeTab,
  isAdmin = false,
  unreadNotificationCount = 0,
  onNavigate,
  onOpenQRModal,
  onOpenSettingsModal,
  onOpenNotificationModal,
  onSignOut
}) => {
  const isLabAccount = currentDoctor?.accountType === 'laboratory';

  return (
    <header className="sticky top-0 z-40 bg-[#fdfcf9]/95 backdrop-blur-md border-b border-[#e7e3da] shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo & Main Nav Tabs */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => onNavigate('directory')}
              className="flex items-center gap-2.5 text-right group focus:outline-hidden cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#122c4a] flex items-center justify-center text-white shadow-md shadow-[#122c4a]/15 group-hover:bg-[#0d223a] transition-all">
                <Stethoscope className="w-5 h-5 text-sky-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl text-[#122c4a] tracking-tight font-['Tajawal',sans-serif]">
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
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'directory'
                    ? 'bg-[#edf3fa] text-[#122c4a] font-black border border-[#d1dfed]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#f4efe6]'
                }`}
              >
                <Building2 className="w-4 h-4 text-[#1b3a5c]" />
                <span>أطباء وعيادات</span>
              </button>

              {currentDoctor && (
                <button
                  onClick={() => onNavigate(isLabAccount ? 'lab_dashboard' : 'dashboard')}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'dashboard' || activeTab === 'lab_dashboard'
                      ? isLabAccount
                        ? 'bg-[#122c4a] text-white shadow-2xs'
                        : 'bg-[#1c5242] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-[#f4efe6]'
                  }`}
                >
                  {isLabAccount ? <TestTube className="w-4 h-4 text-sky-300" /> : <Stethoscope className="w-4 h-4 text-emerald-200" />}
                  <span>{isLabAccount ? 'لوحة تحكم معملي' : 'لوحة تحكم عيادتي'}</span>
                </button>
              )}

              <button
                onClick={() => onNavigate('subscription')}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  activeTab === 'subscription'
                    ? 'bg-[#122c4a] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#f4efe6]'
                }`}
              >
                الاشتراكات والباقات
              </button>

              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1 cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-rose-900 text-white shadow-2xs'
                      : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50'
                  }`}
                  title="لوحة تحكم إدارة المنصة"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>إدارة المنصة</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Navigation Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Notification Center Bell Button */}
            {onOpenNotificationModal && (
              <button
                onClick={onOpenNotificationModal}
                className="p-2 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition relative cursor-pointer"
                title="مركز التنبيهات والإعلانات"
                aria-label="مركز التنبيهات والإعلانات"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-purple-600 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white shadow-2xs">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                ) : (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                )}
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
                  onClick={() => {
                    if (currentDoctor?.accountType === 'laboratory') {
                      onNavigate('lab_public');
                    } else {
                      onNavigate('booking');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                    activeTab === 'booking' || activeTab === 'lab_public'
                      ? 'bg-[#122c4a] text-white'
                      : 'bg-[#edf3fa] text-[#1b3a5c] hover:bg-[#dce7f3]'
                  }`}
                  title={
                    currentDoctor?.accountType === 'laboratory'
                      ? "معاينة صفحة المعمل العامة كأنك قمت بمسح QR Code"
                      : "معاينة صفحة حجز المريض كأنك قمت بمسح QR Code"
                  }
                >
                  <ExternalLink className="w-4 h-4 text-sky-600" />
                  <span className="hidden sm:inline">
                    {currentDoctor?.accountType === 'laboratory' ? "معاينة صفحة المعمل" : "معاينة صفحة الحجز"}
                  </span>
                </button>

                {/* QR Code Action */}
                <button
                  onClick={onOpenQRModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#122c4a] hover:bg-[#0d223a] text-white rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition cursor-pointer"
                  title={
                    currentDoctor?.accountType === 'laboratory'
                      ? "عرض وطباعة QR Code المعمل"
                      : "عرض وطباعة QR Code العيادة"
                  }
                >
                  <QrCode className="w-4 h-4 text-sky-300" />
                  <span className="hidden sm:inline">رمز QR</span>
                </button>

                {/* Settings */}
                <button
                  onClick={onOpenSettingsModal}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-[#f4efe6] rounded-xl transition cursor-pointer"
                  title="إعدادات العيادة وتعديل الملف"
                  aria-label="إعدادات العيادة"
                >
                  <Settings className="w-4 h-4" />
                </button>

                {/* Sign Out */}
                <button
                  onClick={() => {
                    if (window.confirm("هل أنت متأكد أنك تريد الخروج؟")) {
                      onSignOut();
                    }
                  }}
                  className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition cursor-pointer"
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
                      ? 'bg-[#122c4a] text-white'
                      : 'bg-[#edf3fa] text-[#122c4a]'
                  }`}
                >
                  أطباء وعيادات
                </button>

                {/* Doctor/Lab Login Button */}
                <button
                  onClick={() => onNavigate('auth')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition shadow-2xs cursor-pointer ${
                    activeTab === 'auth'
                      ? 'bg-[#122c4a] text-white ring-2 ring-[#122c4a]/30'
                      : 'bg-[#122c4a] hover:bg-[#0d223a] text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-sky-300" />
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
