import React, { useState } from 'react';
import { LabSample, LabSampleStatus } from '../../types';
import { updateSampleStatus, getSampleByBarcode } from '../../services/labService';
import {
  TestTube,
  QrCode,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  User
} from 'lucide-react';

interface LabSamplesTabProps {
  labId: string;
  samples: LabSample[];
  onRefreshSamples: () => void;
  onOpenScanner: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const LabSamplesTab: React.FC<LabSamplesTabProps> = ({
  labId,
  samples,
  onRefreshSamples,
  onOpenScanner,
  onShowToast
}) => {
  const [searchBarcode, setSearchBarcode] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LabSampleStatus>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredSamples = samples.filter((s) => {
    const matchesSearch =
      !searchBarcode.trim() ||
      s.sampleId.toLowerCase().includes(searchBarcode.toLowerCase()) ||
      s.patientName.toLowerCase().includes(searchBarcode.toLowerCase()) ||
      s.orderNumber.toLowerCase().includes(searchBarcode.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (sampleDocId: string, status: LabSampleStatus) => {
    setProcessingId(sampleDocId);
    try {
      await updateSampleStatus(labId, sampleDocId, status);
      onShowToast("تم تحديث حالة العينة", `الحالة الجديدة: ${status}`, "success");
      onRefreshSamples();
    } catch (err: any) {
      console.error("Sample update error:", err);
      onShowToast("خطأ في تحديث العينة", err.message || "تعذر معالجة حالة العينة", "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 font-['Tajawal',sans-serif]">إدارة وتتبع العينات الطبية</h1>
          <p className="text-xs text-slate-500">متابعة أكواد الباركود واستلام العينات بالمعمل</p>
        </div>

        <button
          onClick={onOpenScanner}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-2 shadow-2xs"
        >
          <QrCode className="w-4 h-4" />
          <span>قراءة باركود عينة بالكاميرا</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchBarcode}
              onChange={(e) => setSearchBarcode(e.target.value)}
              placeholder="ابحث برقم الباركود (LAB-2026-XXXXXX)، اسم المريض، أو رقم الطلب..."
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'الكل' },
              { id: 'pending', label: 'بانتظار الاستلام' },
              { id: 'received', label: 'تم الاستلام' },
              { id: 'processing', label: 'قيد المعالجة' },
              { id: 'completed', label: 'مكتملة' },
              { id: 'rejected', label: 'مرفوضة' }
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
                <th className="py-3 px-4">كود الباركود</th>
                <th className="py-3 px-4">المريض</th>
                <th className="py-3 px-4">رقم الطلب</th>
                <th className="py-3 px-4">نوع العينة</th>
                <th className="py-3 px-4">الفحوصات المحددة</th>
                <th className="py-3 px-4">وقت التسجيل</th>
                <th className="py-3 px-4">حالة العينة</th>
                <th className="py-3 px-4 text-center">الإجراءات التشغيلية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSamples.map((sample) => (
                <tr key={sample.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                    <div className="flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-slate-400" />
                      <span>{sample.sampleId}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    <div>{sample.patientName}</div>
                    <div className="text-[11px] font-normal text-slate-500">{sample.patientPhone}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {sample.orderNumber}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    {sample.sampleType}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                    {sample.testNames.join('، ')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(sample.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3.5 px-4">
                    <SampleStatusBadge status={sample.status} />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {sample.status === 'pending' && (
                        <button
                          disabled={processingId === sample.id}
                          onClick={() => handleUpdateStatus(sample.id, 'received')}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-md text-[11px] transition"
                        >
                          استلام العينة
                        </button>
                      )}

                      {sample.status === 'received' && (
                        <button
                          disabled={processingId === sample.id}
                          onClick={() => handleUpdateStatus(sample.id, 'processing')}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-md text-[11px] transition"
                        >
                          بدء الفحص
                        </button>
                      )}

                      {sample.status !== 'completed' && sample.status !== 'rejected' && (
                        <button
                          disabled={processingId === sample.id}
                          onClick={() => handleUpdateStatus(sample.id, 'rejected')}
                          className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold rounded-md text-[11px] transition"
                        >
                          رفض
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSamples.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    لا توجد عينات مطابقة للبحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredSamples.map((sample) => (
            <div key={sample.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-teal-800 flex items-center gap-1">
                  <QrCode className="w-4 h-4 text-slate-400" />
                  {sample.sampleId}
                </span>
                <SampleStatusBadge status={sample.status} />
              </div>

              <div>
                <span className="font-bold text-sm text-slate-800">{sample.patientName}</span>
                <p className="text-xs text-slate-500 font-mono">طلب #{sample.orderNumber}</p>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                <p className="font-bold text-slate-900">الفحوصات: {sample.testNames.join('، ')}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">نوع العينة: {sample.sampleType}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {sample.status === 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus(sample.id, 'received')}
                    className="px-3 py-1 bg-teal-600 text-white font-bold rounded-md text-xs"
                  >
                    استلام العينة
                  </button>
                )}
                {sample.status === 'received' && (
                  <button
                    onClick={() => handleUpdateStatus(sample.id, 'processing')}
                    className="px-3 py-1 bg-sky-600 text-white font-bold rounded-md text-xs"
                  >
                    بدء المعالجة
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
};

function SampleStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">بانتظار الاستلام</span>;
    case 'received':
      return <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-md">تم الاستلام</span>;
    case 'processing':
      return <span className="bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-md">قيد المعالجة</span>;
    case 'completed':
      return <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">مكتملة</span>;
    case 'rejected':
      return <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-md">مرفوضة</span>;
    default:
      return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">{status}</span>;
  }
}
