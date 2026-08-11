import React, { useState, useEffect } from 'react';
import { LabOrder, LabTestResult, LabProfile } from '../../types';
import { getLabOrderById, getLabResultsForOrder, getLabProfile } from '../../services/labService';
import { LabPDFReportModal } from './LabPDFReportModal';
import { FileText, CheckCircle, Clock, AlertCircle, Printer, Download, ArrowRight, TestTube, MapPin, Building2, User, Phone, ChevronLeft } from 'lucide-react';

interface PatientLabResultViewProps {
  labId: string;
  orderId: string;
  onBackToDirectory?: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const PatientLabResultView: React.FC<PatientLabResultViewProps> = ({
  labId,
  orderId,
  onBackToDirectory,
  onShowToast
}) => {
  const [lab, setLab] = useState<LabProfile | null>(null);
  const [order, setOrder] = useState<LabOrder | null>(null);
  const [results, setResults] = useState<LabTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPDFModal, setShowPDFModal] = useState(false);

  useEffect(() => {
    async function loadOrderData() {
      setLoading(true);
      try {
        const labData = await getLabProfile(labId);
        setLab(labData);

        const orderData = await getLabOrderById(labId, orderId);
        setOrder(orderData);

        if (orderData) {
          const resList = await getLabResultsForOrder(labId, orderId);
          setResults(resList);
        }
      } catch (err) {
        console.error("Error loading patient lab result:", err);
      } finally {
        setLoading(false);
      }
    }
    loadOrderData();
  }, [labId, orderId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل تفاصيل ونتائج طلب التحليل...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center bg-white rounded-3xl border border-slate-200 my-8 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-black text-slate-900 mb-1">لم يتم العثور على طلب التحليل</h2>
        <p className="text-xs text-slate-500 mb-4">تأكد من صحة رقم الطلب أو رابط النتائج.</p>
        {onBackToDirectory && (
          <button
            onClick={onBackToDirectory}
            className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
          >
            العودة للرئيسية
          </button>
        )}
      </div>
    );
  }

  const publishedResults = results.filter((r) => r.status === 'published' || r.status === 'approved');

  // Status Stepper Index
  const statusSteps = [
    { key: 'NEW', label: 'تم تقديم الطلب' },
    { key: 'CONFIRMED', label: 'تم تأكيد الطلب' },
    { key: 'SAMPLE_RECEIVED', label: 'تم استلام العينة' },
    { key: 'PROCESSING', label: 'قيد التحليل' },
    { key: 'READY', label: 'النتائج جاهزة' }
  ];

  const getStepIndex = (st: string) => {
    if (st === 'NEW') return 0;
    if (st === 'CONFIRMED' || st === 'SAMPLE_PENDING') return 1;
    if (st === 'SAMPLE_RECEIVED') return 2;
    if (st === 'PROCESSING' || st === 'UNDER_REVIEW') return 3;
    if (st === 'READY' || st === 'COMPLETED') return 4;
    return 0;
  };

  const currentStepIdx = getStepIndex(order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToDirectory && (
            <button
              onClick={onBackToDirectory}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-black text-slate-900 font-['Tajawal',sans-serif]">
              تتبع نتائج فحص التحاليل
            </h1>
            <p className="text-xs text-slate-500">رقم الطلب: <span className="font-mono font-bold text-teal-700">{order.orderNumber}</span></p>
          </div>
        </div>

        {publishedResults.length > 0 && (
          <button
            onClick={() => setShowPDFModal(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl flex items-center gap-2 transition shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>عرض وطباعة التقرير (PDF)</span>
          </button>
        )}
      </div>

      {/* Lab & Patient Summary Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <span className="text-[10px] text-slate-400 font-bold block mb-1">المعمل المصدر للتقرير:</span>
          <h3 className="font-extrabold text-base text-slate-900">{lab?.name || order.labName}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{lab?.address}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5 dir-ltr text-right">{lab?.phone}</p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">اسم المريض:</span>
            <span className="font-extrabold text-slate-900">{order.patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">رقم الهاتف:</span>
            <span className="font-mono font-bold text-slate-800">{order.patientPhone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-bold">طريقة السحب:</span>
            <span className="font-bold text-slate-800">
              {order.collectionMethod === 'HOME_COLLECTION' ? 'سحب من المنزل' : 'في المعمل'}
            </span>
          </div>
        </div>
      </div>

      {/* Status Progress Stepper */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4">
        <span className="text-xs font-bold text-slate-400 block">حالة طلب التحليل الحالية:</span>
        
        <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
          {statusSteps.map((s, idx) => {
            const isDone = idx <= currentStepIdx;
            const isCurrent = idx === currentStepIdx;

            return (
              <div key={s.key} className="space-y-2">
                <div className={`h-2 rounded-full transition-all ${
                  isDone ? 'bg-teal-400' : 'bg-slate-700'
                }`} />
                <span className={isCurrent ? 'text-teal-300 font-black scale-105 inline-block' : isDone ? 'text-white' : 'text-slate-500'}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Results Section or Pending State */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-['Tajawal',sans-serif]">
              نتائج الفحوصات الطبية
            </h2>
            <p className="text-xs text-slate-500">التحاليل المطلوبة: {order.testNames.join("، ")}</p>
          </div>
        </div>

        {publishedResults.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl">
            <Clock className="w-10 h-10 text-amber-500 mx-auto mb-2 animate-pulse" />
            <h3 className="text-sm font-extrabold text-slate-900">النتائج قيد الفحص والمراجعة الطبية</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              يقوم أطباء المعمل حالياً بتحليل العينة واعتماد النتائج بدقة. يرجى إعادة تنشيط الصفحة لاحقاً أو انتظار الإشعار.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {publishedResults.map((result) => (
              <div key={result.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                
                <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                  <span className="font-extrabold text-sm font-['Tajawal',sans-serif]">{result.testName}</span>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[11px] font-bold">
                    معتمد ورسمي
                  </span>
                </div>

                {/* Parameters Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="p-3">اسم الفحص</th>
                        <th className="p-3 text-center">النتيجة</th>
                        <th className="p-3 text-center">الوحدة</th>
                        <th className="p-3 text-center">المدى الطبيعي</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                      {result.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900">{item.parameterName}</td>
                          <td className="p-3 text-center font-extrabold font-mono text-sm text-teal-700">{item.value}</td>
                          <td className="p-3 text-center text-slate-500 font-mono">{item.unit}</td>
                          <td className="p-3 text-center text-slate-600 font-mono dir-ltr">{item.referenceRange}</td>
                          <td className="p-3 text-center">
                            {item.flag === 'normal' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">سليم</span>}
                            {item.flag === 'high' && <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px]">مرتفع ↑</span>}
                            {item.flag === 'low' && <span className="px-2 py-0.5 bg-sky-100 text-sky-900 rounded font-bold text-[10px]">منخفض ↓</span>}
                            {item.flag === 'critical' && <span className="px-2 py-0.5 bg-rose-100 text-rose-900 rounded font-bold text-[10px]">حرج ⚠️</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {result.aiNotesSummary && (
                  <div className="p-4 bg-teal-50 border-t border-teal-100 text-xs text-teal-950">
                    <span className="font-extrabold block text-teal-900 mb-1">💡 ملخص ميسر للنتائج للمريض:</span>
                    <p className="whitespace-pre-line leading-relaxed">{result.aiNotesSummary}</p>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

      </div>

      {/* PDF Modal */}
      {showPDFModal && (
        <LabPDFReportModal
          lab={lab}
          order={order}
          results={results}
          onClose={() => setShowPDFModal(false)}
        />
      )}

    </div>
  );
};
