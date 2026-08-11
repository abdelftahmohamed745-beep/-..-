import React from 'react';
import { LabProfile, LabOrder, LabSample, LabTestResult } from '../../types';
import {
  ShoppingBag,
  TestTube,
  FileCheck2,
  AlertTriangle,
  Clock,
  Plus,
  QrCode,
  FileText,
  Search,
  CheckCircle2,
  ChevronLeft,
  ArrowRight
} from 'lucide-react';

interface LabOverviewTabProps {
  lab: LabProfile;
  orders: LabOrder[];
  samples: LabSample[];
  results: LabTestResult[];
  onNewOrder: () => void;
  onScanSample: () => void;
  onEnterResult: (order: LabOrder) => void;
  onSelectTab: (tab: any) => void;
  onViewOrderDetails: (order: LabOrder) => void;
}

export const LabOverviewTab: React.FC<LabOverviewTabProps> = ({
  lab,
  orders,
  samples,
  results,
  onNewOrder,
  onScanSample,
  onEnterResult,
  onSelectTab,
  onViewOrderDetails
}) => {
  const currentHour = new Date().getHours();
  const timeGreeting = currentHour < 12 ? "صباح الخير" : "مساء الخير";

  // Calculate Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o) => o.createdAt.startsWith(todayStr));
  const inProgressSamples = samples.filter((s) => s.status === 'received' || s.status === 'processing');
  const pendingResultsCount = orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'SAMPLE_COLLECTED').length;
  const completedResultsCount = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'PUBLISHED').length;
  const urgentOrders = orders.filter((o) => o.collectionMethod === 'HOME_COLLECTION' && o.status === 'NEW');

  const pendingSampleReceiveCount = samples.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Greeting */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 font-['Tajawal',sans-serif]">
            {timeGreeting}، {lab.responsibleName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ملخص العمليات اليومية في {lab.name} — متابعة العينات والنتائج المباشرة
          </p>
        </div>

        {/* Quick Action Buttons Bar */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            onClick={onNewOrder}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>طلب جديد</span>
          </button>
          <button
            onClick={onScanSample}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <QrCode className="w-4 h-4 text-teal-600" />
            <span>مسح عينة</span>
          </button>
          <button
            onClick={() => onSelectTab('results')}
            className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-sky-600" />
            <span>إدخال نتائج</span>
          </button>
        </div>
      </div>

      {/* Operational Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">طلبات اليوم</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{todayOrders.length || orders.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">إجمالي الطلبات المستلمة</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">عينات قيد المعالجة</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <TestTube className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{inProgressSamples.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">في المختبر حالياً</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">تحتاج مراجعة</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-900">{pendingResultsCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">بانتظار الاعتماد</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">نتائج مكتملة</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">{completedResultsCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">تم نشرها للمريض</p>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white rounded-xl border border-rose-200 p-4 shadow-2xs bg-rose-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-800">حالات عاجلة</span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-900">{urgentOrders.length}</p>
          <p className="text-[11px] text-rose-600 mt-0.5">سحب منزلي جديد</p>
        </div>

      </div>

      {/* Action Needed Items */}
      {(pendingSampleReceiveCount > 0 || pendingResultsCount > 0 || urgentOrders.length > 0) && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <h3 className="font-bold text-xs text-amber-900 font-['Tajawal',sans-serif]">
              مهام تشغيلية تقتضي الإجراء المباشر
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {pendingSampleReceiveCount > 0 && (
              <button
                onClick={() => onSelectTab('samples')}
                className="bg-white p-3 rounded-lg border border-amber-200 text-right hover:border-amber-400 transition"
              >
                <span className="font-bold text-slate-900 block">عينات بانتظار الاستلام ({pendingSampleReceiveCount})</span>
                <span className="text-[11px] text-slate-500">استلم العينات وقم بتحديث الباركود</span>
              </button>
            )}

            {pendingResultsCount > 0 && (
              <button
                onClick={() => onSelectTab('results')}
                className="bg-white p-3 rounded-lg border border-amber-200 text-right hover:border-amber-400 transition"
              >
                <span className="font-bold text-slate-900 block">نتائج بانتظار الاعتماد ({pendingResultsCount})</span>
                <span className="text-[11px] text-slate-500">راجع قيم التحاليل واعتمد النشر</span>
              </button>
            )}

            {urgentOrders.length > 0 && (
              <button
                onClick={() => onSelectTab('orders')}
                className="bg-white p-3 rounded-lg border border-amber-200 text-right hover:border-amber-400 transition"
              >
                <span className="font-bold text-slate-900 block">طلبات سحب منزلي ({urgentOrders.length})</span>
                <span className="text-[11px] text-slate-500">حدد موعد الفني وتواصل مع المريض</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent Orders Operational Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-sm text-slate-900 font-['Tajawal',sans-serif]">الطلبات الأخيرة</h2>
            <p className="text-[11px] text-slate-500">جدول متابعة أحدث طلبات الفحوصات والعينات</p>
          </div>
          <button
            onClick={() => onSelectTab('orders')}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1 transition"
          >
            <span>عرض كل الطلبات</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الطلب</th>
                <th className="py-3 px-4">المريض</th>
                <th className="py-3 px-4">الفحوصات المطلوبة</th>
                <th className="py-3 px-4">طريقة السحب</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4">الإجمالي</th>
                <th className="py-3 px-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.slice(0, 8).map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {order.orderNumber}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    <div>{order.patientName}</div>
                    <div className="text-[11px] font-normal text-slate-500">{order.patientPhone}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                    {order.testNames.join('، ')}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {order.collectionMethod === 'HOME_COLLECTION' ? (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        سحب منزلي
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        في المختبر
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {order.totalPrice} ج.م
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onViewOrderDetails(order)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md text-[11px] transition"
                      >
                        تفاصيل
                      </button>
                      {(order.status === 'NEW' || order.status === 'SAMPLE_COLLECTED' || order.status === 'IN_PROGRESS') && (
                        <button
                          onClick={() => onEnterResult(order)}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-md text-[11px] transition"
                        >
                          إدخال نتائج
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-semibold">
                    لا توجد طلبات مسجلة حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Compact List View */}
        <div className="md:hidden divide-y divide-slate-100">
          {orders.slice(0, 6).map((order) => (
            <div key={order.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-900">{order.orderNumber}</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">{order.patientName}</span>
                <span className="text-xs font-bold text-slate-900">{order.totalPrice} ج.م</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{order.testNames.join('، ')}</p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => onViewOrderDetails(order)}
                  className="px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-md text-xs"
                >
                  تفاصيل
                </button>
                <button
                  onClick={() => onEnterResult(order)}
                  className="px-3 py-1 bg-teal-600 text-white font-bold rounded-md text-xs"
                >
                  النتائج
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'NEW':
      return <span className="bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-md">جديد</span>;
    case 'SAMPLE_COLLECTED':
      return <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md">تم السحب</span>;
    case 'IN_PROGRESS':
      return <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">قيد المعالجة</span>;
    case 'COMPLETED':
    case 'PUBLISHED':
      return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">مكتمل ومستلم</span>;
    case 'CANCELLED':
      return <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md">ملغي</span>;
    default:
      return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">{status}</span>;
  }
}
