import React, { useState } from 'react';
import { getSampleByBarcode, updateSampleStatus, getLabOrders } from '../../services/labService';
import { LabSample, LabOrder } from '../../types';
import { QrCode, Search, CheckCircle, Clock, AlertCircle, X, ArrowRight, User, TestTube, Check } from 'lucide-react';

interface SampleScannerModalProps {
  labId: string;
  onClose: () => void;
  onOpenResultEntry?: (orderId: string, sample: LabSample) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const SampleScannerModal: React.FC<SampleScannerModalProps> = ({
  labId,
  onClose,
  onOpenResultEntry,
  onShowToast
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundSample, setFoundSample] = useState<LabSample | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setFoundSample(null);

    try {
      const sample = await getSampleByBarcode(labId, barcodeInput.trim());
      if (sample) {
        setFoundSample(sample);
      } else {
        setErrorMsg(`لم يتم العثور على عينة بهذا الكود: ${barcodeInput.trim().toUpperCase()}`);
      }
    } catch (err) {
      console.error("Barcode scan error:", err);
      setErrorMsg("حدث خطأ أثناء البحث عن كود العينة.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'received' | 'processing' | 'completed') => {
    if (!foundSample) return;
    try {
      await updateSampleStatus(labId, foundSample.id, newStatus);
      setFoundSample({
        ...foundSample,
        status: newStatus
      });
      onShowToast("تم تحديث حالة العينة بنجاح", `الحالة الجديدة: ${newStatus}`, "success");
    } catch (err) {
      onShowToast("خطأ في تحديث حالة العينة", "", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base font-['Tajawal',sans-serif]">ماسح أكواد العينات السريع</h3>
              <p className="text-xs text-slate-400">إدخال الكود أو الكاميرا للبحث السريع</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Barcode Search Input Form */}
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">أدخل باركود العينة (Barcode / Sample ID)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <QrCode className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="مثال: LAB-2026-000124"
                  className="w-full pl-3 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono uppercase font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !barcodeInput.trim()}
                className="px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>بحث</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">يمكنك كتابة الباركود يدوياً أو قراءته بواسطة جهاز الـ Barcode Scanner.</p>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Found Sample Card */}
          {foundSample && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">رقم العينة:</span>
                  <span className="font-mono text-base font-black text-slate-900">{foundSample.sampleId}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  foundSample.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : foundSample.status === 'processing'
                    ? 'bg-amber-100 text-amber-800'
                    : foundSample.status === 'received'
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {foundSample.status === 'completed' ? 'تمت النتائج' : foundSample.status === 'processing' ? 'قيد التحليل' : foundSample.status === 'received' ? 'تم الاستلام' : 'في انتظار الاستلام'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">اسم المريض:</span>
                  <span className="font-extrabold text-slate-900">{foundSample.patientName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">رقم الهاتف:</span>
                  <span className="font-mono font-bold text-slate-800">{foundSample.patientPhone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">رقم الطلب:</span>
                  <span className="font-mono font-bold text-teal-700">{foundSample.orderNumber}</span>
                </div>
                <div className="pt-2">
                  <span className="text-slate-500 font-bold block mb-1">التحاليل المطلوبة:</span>
                  <div className="flex flex-wrap gap-1">
                    {foundSample.testNames.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 block">إجراءات سريعة على العينة:</span>
                <div className="grid grid-cols-2 gap-2">
                  {foundSample.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange('received')}
                      className="col-span-2 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>تأكيد استلام العينة بالمعمل</span>
                    </button>
                  )}
                  {foundSample.status === 'received' && (
                    <button
                      onClick={() => handleStatusChange('processing')}
                      className="col-span-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                    >
                      <TestTube className="w-4 h-4" />
                      <span>تحويل العينة لقسم التحليل</span>
                    </button>
                  )}
                  {onOpenResultEntry && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenResultEntry(foundSample.orderId, foundSample);
                      }}
                      className="col-span-2 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                    >
                      <ArrowRight className="w-4 h-4 text-teal-400" />
                      <span>الانتقال لإدخال نتائج الفحص</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
