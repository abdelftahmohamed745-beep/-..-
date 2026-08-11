import React from 'react';
import { LabOrder, LabTransaction } from '../../types';
import { BarChart3, TrendingUp, DollarSign, FileText, Printer, CheckCircle2 } from 'lucide-react';

interface LabReportsTabProps {
  orders: LabOrder[];
  transactions: LabTransaction[];
}

export const LabReportsTab: React.FC<LabReportsTabProps> = ({ orders, transactions }) => {
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const completedCount = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'PUBLISHED').length;

  return (
    <div className="space-y-5">
      
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 font-['Tajawal',sans-serif]">التقارير والإحصائيات التشغيلية</h1>
          <p className="text-xs text-slate-500">مؤشرات الأداء المالي والإنتاجي لعمليات المختبر</p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-xs flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة ملخص التقرير</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">إجمالي قيمة الفحوصات</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalRevenue.toLocaleString()} ج.م</p>
          <p className="text-[11px] text-teal-700 font-semibold mt-1">حسب إجمالي الطلبات الحالية</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">الفحوصات المكتملة والمجازة</span>
          <p className="text-2xl font-black text-emerald-900 mt-1">{completedCount} فحص</p>
          <p className="text-[11px] text-slate-400 mt-1">تمت المعالجة ونشر النتائج</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <span className="text-xs font-bold text-slate-500">معدل الإنجاز اليومي</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {orders.length > 0 ? Math.round((completedCount / orders.length) * 100) : 100}%
          </p>
          <p className="text-[11px] text-slate-400 mt-1">نسبة الفحوصات المكتملة من الإجمالي</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <h2 className="font-extrabold text-sm text-slate-900 font-['Tajawal',sans-serif]">تفاصيل العمليات حسب نوع السحب</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold text-slate-800">سحب بداخل المختبر (In-Lab)</span>
            <p className="text-xl font-bold text-slate-900">
              {orders.filter((o) => o.collectionMethod === 'IN_LAB').length} طلب
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="font-bold text-slate-800">سحب العينات من المنازل (Home Collection)</span>
            <p className="text-xl font-bold text-slate-900">
              {orders.filter((o) => o.collectionMethod === 'HOME_COLLECTION').length} طلب
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
