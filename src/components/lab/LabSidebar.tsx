import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  TestTube,
  FileCheck2,
  Users,
  BarChart3,
  ListPlus,
  Settings,
  X,
  Sparkles,
  ChevronLeft
} from 'lucide-react';

export type LabTabType = 'overview' | 'orders' | 'samples' | 'results' | 'patients' | 'reports' | 'catalog' | 'settings';

interface LabSidebarProps {
  activeTab: LabTabType;
  setActiveTab: (tab: LabTabType) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  newOrdersCount?: number;
  pendingSamplesCount?: number;
  pendingResultsCount?: number;
}

export const LabSidebar: React.FC<LabSidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  newOrdersCount = 0,
  pendingSamplesCount = 0,
  pendingResultsCount = 0
}) => {
  const navItems = [
    {
      id: 'overview' as LabTabType,
      label: 'الرئيسية',
      icon: LayoutDashboard,
      badge: 0
    },
    {
      id: 'orders' as LabTabType,
      label: 'الطلبات',
      icon: ShoppingBag,
      badge: newOrdersCount
    },
    {
      id: 'samples' as LabTabType,
      label: 'العينات',
      icon: TestTube,
      badge: pendingSamplesCount
    },
    {
      id: 'results' as LabTabType,
      label: 'النتائج',
      icon: FileCheck2,
      badge: pendingResultsCount
    },
    {
      id: 'patients' as LabTabType,
      label: 'المرضى',
      icon: Users,
      badge: 0
    },
    {
      id: 'reports' as LabTabType,
      label: 'التقارير',
      icon: BarChart3,
      badge: 0
    },
    {
      id: 'catalog' as LabTabType,
      label: 'الفحوصات',
      icon: ListPlus,
      badge: 0
    },
    {
      id: 'settings' as LabTabType,
      label: 'الإعدادات',
      icon: Settings,
      badge: 0
    }
  ];

  const handleSelectTab = (tabId: LabTabType) => {
    setActiveTab(tabId);
    setIsMobileOpen(false);
  };

  const SidebarContent = (
    <div className="flex flex-col h-full py-4 bg-white border-l border-slate-200">
      
      {/* Title */}
      <div className="px-5 mb-4 hidden lg:block">
        <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase font-['Tajawal',sans-serif]">
          قائمة التشغيل الطبية
        </p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 mx-3 mt-4 bg-slate-50 border border-slate-200 rounded-xl text-right">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-800">النظام متصل بالشبكة</span>
        </div>
        <p className="text-[10px] text-slate-500">إصدار دوري LIS Enterprise v2.4</p>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left Side in RTL) */}
      <aside className="hidden lg:block w-60 shrink-0 h-[calc(100vh-4rem)] sticky top-16">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl z-10 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="font-extrabold text-sm text-slate-900 font-['Tajawal',sans-serif]">قائمة المختبر</span>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {SidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
