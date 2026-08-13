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
    <header className="bg-[#fdfcf9] border-b border-[#e7e3da] sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand & Mobile Menu Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileNav}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-[#f4efe6] rounded-lg transition cursor-pointer"
            aria-label="افتح القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#122c4a] text-white flex items-center justify-center font-bold shadow-2xs">
              <TestTube className="w-5 h-5 text-teal-300" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-[#122c4a] font-['Tajawal',sans-serif]">
                  {lab.name}
                </span>
                <span className="bg-[#edf3fa] text-[#122c4a] text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-[#d1dfed]">
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
            <Search className="w-4 h-4 text-[#1b3a5c] absolute right-3 top-2.5" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="بحث سريع برقم الطلب، اسم المريض، أو باركود العينة..."
              className="w-full pl-3 pr-9 py-1.5 bg-[#faf8f5] border border-[#e7e3da] rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#122c4a] focus:bg-[#fdfcf9] transition"
            />
          </div>
        </div>

        {/* Right: Quick Actions & Account Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Scan Barcode Quick Button */}
          <button
            onClick={onScanClick}
            className="p-2 sm:px-3 sm:py-1.5 bg-[#f4efe6] hover:bg-[#e7e3da] text-[#122c4a] rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="مسح باركود عينة"
          >
            <TestTube className="w-4 h-4 text-teal-600" />
            <span className="hidden sm:inline">مسح عينة</span>
          </button>

          {/* New Order Quick Button */}
          <button
            onClick={onNewOrderClick}
            className="px-3 py-1.5 bg-[#122c4a] hover:bg-[#0d223a] text-white rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">طلب جديد</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-[#f4efe6] rounded-lg transition relative cursor-pointer"
              aria-label="التنبيهات"
            >
              <Bell className="w-5 h-5" />
              {pendingReviewsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute left-0 mt-2 w-72 bg-[#fdfcf9] rounded-xl shadow-lg border border-[#e7e3da] py-2 z-50 text-right">
                <div className="px-3 py-2 border-b border-[#f0ebe1] flex justify-between items-center">
                  <span className="font-bold text-xs text-[#122c4a]">التنبيهات التشغيلية</span>
                  <span className="text-[10px] bg-[#f4efe6] text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    {pendingReviewsCount} جديدة
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {pendingReviewsCount > 0 ? (
                    <div className="p-3 text-xs text-slate-700 bg-amber-50/50 border-b border-[#f0ebe1]">
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
              className="flex items-center gap-2 p-1.5 hover:bg-[#f4efe6] rounded-lg transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#122c4a] text-white flex items-center justify-center font-bold text-xs">
                {lab.responsibleName ? lab.responsibleName.charAt(0) : 'L'}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute left-0 mt-2 w-56 bg-[#fdfcf9] rounded-xl shadow-lg border border-[#e7e3da] py-1.5 z-50 text-right">
                <div className="px-3 py-2 border-b border-[#f0ebe1]">
                  <p className="font-bold text-xs text-[#122c4a]">{lab.responsibleName}</p>
                  <p className="text-[11px] text-slate-500">{lab.phone}</p>
                </div>
                <button
                  onClick={handleSignOutClick}
                  className="w-full text-right px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer"
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
