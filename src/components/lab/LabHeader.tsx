import React, { useState } from 'react';
import { LabProfile } from '../../types';
import {
  TestTube,
  Bell,
  Search,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Building,
  Plus
} from 'lucide-react';

interface LabHeaderProps {
  lab: LabProfile;
  onSignOut: () => void;
  onOpenMobileNav: () => void;
  onNewOrderClick: () => void;
  onScanClick: () => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
  pendingReviewsCount: number;
}

export const LabHeader: React.FC<LabHeaderProps> = ({
  lab,
  onSignOut,
  onOpenMobileNav,
  onNewOrderClick,
  onScanClick,
  globalSearchQuery,
  setGlobalSearchQuery,
  pendingReviewsCount
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOutClick = () => {
    if (window.confirm("هل أنت متأكد أنك تريد تسجيل الخروج من نظام المختبر؟")) {
      onSignOut();
    }
  };

  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? "صباح الخير" : "مساء الخير";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand & Mobile Menu Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            aria-label="افتح القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
              <TestTube className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-900 font-['Tajawal',sans-serif]">
                  {lab.name}
                </span>
                <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-teal-200">
                  نظام المختبر LIS
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{lab.responsibleName} — المدير الطبي</p>
            </div>
          </div>
        </div>

        {/* Center: Global Search Input */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="بحث سريع برقم الطلب، اسم المريض، أو باركود العينة..."
              className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Right: Quick Actions & Account Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Scan Barcode Quick Button */}
          <button
            onClick={onScanClick}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            title="مسح باركود عينة"
          >
            <TestTube className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">مسح عينة</span>
          </button>

          {/* New Order Quick Button */}
          <button
            onClick={onNewOrderClick}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">طلب جديد</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition relative"
              aria-label="التنبيهات"
            >
              <Bell className="w-5 h-5" />
              {pendingReviewsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 text-right">
                <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-900">التنبيهات التشغيلية</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    {pendingReviewsCount} جديدة
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {pendingReviewsCount > 0 ? (
                    <div className="p-3 text-xs text-slate-700 bg-amber-50/50 border-b border-slate-100">
                      <p className="font-bold text-amber-900">نتائج بانتظار الاعتماد</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        يوجد {pendingReviewsCount} نتائج تحاليل تحتاج إلى مراجعة واعتماد نشر.
                      </p>
                    </div>
                  ) : (
                    <p className="p-4 text-center text-xs text-slate-400">لا توجد تنبيهات عاجلة حالياً</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User & Account Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                {lab.responsibleName ? lab.responsibleName.charAt(0) : 'L'}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-right">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-xs text-slate-900">{lab.responsibleName}</p>
                  <p className="text-[11px] text-slate-500">{lab.phone}</p>
                </div>
                <button
                  onClick={handleSignOutClick}
                  className="w-full text-right px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
