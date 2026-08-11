import React, { useState } from 'react';
import { LabOrder, LabOrderStatus } from '../../types';
import { updateLabOrderStatus } from '../../services/labService';
import {
  Search,
  Filter,
  ShoppingBag,
  Plus,
  Calendar,
  FileText,
  Building,
  Home,
  CheckCircle,
  XCircle,
  Clock,
  Printer
} from 'lucide-react';

interface LabOrdersTabProps {
  labId: string;
  orders: LabOrder[];
  onRefreshOrders: () => void;
  onNewOrder: () => void;
  onEnterResult: (order: LabOrder) => void;
  onViewPDF: (order: LabOrder) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const LabOrdersTab: React.FC<LabOrdersTabProps> = ({
  labId,
  orders,
  onRefreshOrders,
  onNewOrder,
  onEnterResult,
  onViewPDF,
  onShowToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LabOrderStatus>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !searchTerm.trim() ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.patientPhone.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (orderId: string, newStatus: LabOrderStatus) => {
    setUpdatingId(orderId);
    try {
      await updateLabOrderStatus(labId, orderId, newStatus);
      onShowToast("تم تحديث حالة الطلب", `الحالة الجديدة: ${newStatus}`, "success");
      onRefreshOrders();
    } catch (err: any) {
      console.error("Status update error:", err);
      onShowToast("خطأ في تحديث الحالة", err.message || "تعذر تحديث طلب التحليل", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header Bar & Quick New Order */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 font-['Tajawal',sans-serif]">إدارة طلبات التحاليل</h1>
          <p className="text-xs text-slate-500">إجمالي الطلبات المسجلة: {orders.length} طلب</p>
        </div>

        <button
          onClick={onNewOrder}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء طلب تحليل جديد</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث برقم الطلب، اسم المريض، أو رقم الهاتف..."
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Status Tabs Filter */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'NEW', label: 'جديد' },
              { id: 'SAMPLE_COLLECTED', label: 'تم السحب' },
              { id: 'IN_PROGRESS', label: 'قيد المعالجة' },
              { id: 'COMPLETED', label: 'مكتمل' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الطلب</th>
                <th className="py-3 px-4">اسم المريض</th>
                <th className="py-3 px-4">رقم الهاتف</th>
                <th className="py-3 px-4">الفحوصات المطلوبة</th>
                <th className="py-3 px-4">نوع السحب</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {order.orderNumber}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {order.patientName}
                    {order.patientAge && <span className="text-slate-400 font-normal mr-1">({order.patientAge} سنة)</span>}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {order.patientPhone}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                    {order.testNames.join('، ')}
                  </td>
                  <td className="py-3.5 px-4">
                    {order.collectionMethod === 'HOME_COLLECTION' ? (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        سحب منزلي
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        المختبر
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      
                      <button
                        onClick={() => onEnterResult(order)}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-md text-[11px] transition"
                      >
                        النتائج
                      </button>

                      <button
                        onClick={() => onViewPDF(order)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                        title="طباعة التقرير"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {order.status !== 'COMPLETED' && (
                        <button
                          disabled={updatingId === order.id}
                          onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold rounded-md text-[11px] transition"
                        >
                          إنهاء
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              ))}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    لا توجد طلبات مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards List */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredOrders.map((order) => (
            <div key={order.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-slate-900">{order.orderNumber}</span>
                <StatusBadge status={order.status} />
              </div>

              <div>
                <span className="font-bold text-sm text-slate-800">{order.patientName}</span>
                <p className="text-xs text-slate-500">{order.patientPhone}</p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-700">
                <p className="font-bold text-slate-900 mb-0.5">الفحوصات:</p>
                <p>{order.testNames.join('، ')}</p>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="font-bold text-slate-900">{order.totalPrice} ج.م</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onViewPDF(order)}
                    className="p-1.5 bg-slate-100 text-slate-700 font-bold rounded-md"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEnterResult(order)}
                    className="px-3 py-1 bg-teal-600 text-white font-bold rounded-md"
                  >
                    إدخال النتائج
                  </button>
                </div>
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
      return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">مكتمل</span>;
    default:
      return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">{status}</span>;
  }
}
