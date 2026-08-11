import React from 'react';
import { LabOrder, LabTestResult, LabProfile } from '../../types';
import { Printer, Download, CheckCircle, FileText, X, Building2, User, Calendar, Tag, AlertTriangle } from 'lucide-react';

interface LabPDFReportModalProps {
  lab: LabProfile | null;
  order: LabOrder;
  results: LabTestResult[];
  onClose: () => void;
}

export const LabPDFReportModal: React.FC<LabPDFReportModalProps> = ({
  lab,
  order,
  results,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const publishedResults = results.filter((r) => r.status === 'published' || r.status === 'approved');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0">
      
      {/* Container */}
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Actions Toolbar (Hidden on Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base font-['Tajawal',sans-serif]">التقرير الطبي الرسمي للنتائج</h3>
              <p className="text-xs text-slate-400">رقم الطلب: {order.orderNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Body */}
        <div className="p-8 sm:p-12 print:p-6 bg-white min-h-[800px] flex flex-col justify-between" id="printable-lab-report">
          
          <div>
            {/* 1. Header with Lab Logo & Details */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-6">
              <div className="flex items-center gap-4">
                {lab?.logoUrl ? (
                  <img src={lab.logoUrl} alt={lab.name} className="w-16 h-16 object-cover rounded-2xl border border-slate-200" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-sm">
                    {lab?.name?.slice(0, 2) || "معمل"}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-black text-slate-900 font-['Tajawal',sans-serif]">
                    {lab?.name || "معمل التحاليل الطبية"}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1 font-medium">{lab?.address || "جمهورية مصر العربية"}</p>
                  <p className="text-xs text-slate-500 font-mono dir-ltr text-right">{lab?.phone || ""}</p>
                </div>
              </div>

              <div className="text-left dir-ltr">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-mono text-xs font-bold rounded-lg border border-slate-300">
                  {order.orderNumber}
                </span>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Date: {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold mt-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>OFFICIAL LABORATORY REPORT</span>
                </div>
              </div>
            </div>

            {/* 2. Patient Info Block */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 text-xs">
              <div>
                <span className="text-slate-500 block mb-0.5 font-bold">اسم المريض:</span>
                <span className="font-extrabold text-slate-900 text-sm">{order.patientName}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 font-bold">رقم الهاتف:</span>
                <span className="font-mono text-slate-800">{order.patientPhone}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 font-bold">العمر / الجنس:</span>
                <span className="font-bold text-slate-800">
                  {order.patientAge ? `${order.patientAge} سنة` : 'غير محدد'} {order.patientGender === 'male' ? '(ذكر)' : order.patientGender === 'female' ? '(أنثى)' : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 font-bold">طريقة السحب:</span>
                <span className="font-bold text-slate-800">
                  {order.collectionMethod === 'HOME_COLLECTION' ? 'سحب من المنزل' : 'في المعمل'}
                </span>
              </div>
            </div>

            {/* 3. Results Section */}
            {publishedResults.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl my-6">
                <p className="text-slate-500 font-bold text-sm">النتائج قيد المراجعة الطبية والتدقيق من قِبل الطبيب المختص.</p>
                <p className="text-xs text-slate-400 mt-1">سيتم إشعاركم فور إعتماد التقرير النهائي.</p>
              </div>
            ) : (
              publishedResults.map((result, idx) => (
                <div key={result.id || idx} className="mb-8">
                  
                  {/* Test Category Title */}
                  <div className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center justify-between mb-3">
                    <span className="font-extrabold text-sm font-['Tajawal',sans-serif]">{result.testName}</span>
                    <span className="text-xs text-slate-300 font-mono">Sample: Verified</span>
                  </div>

                  {/* Results Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black">
                          <th className="p-3">اسم الفحص / Parameter</th>
                          <th className="p-3 text-center">النتيجة / Result</th>
                          <th className="p-3 text-center">الوحدة / Unit</th>
                          <th className="p-3 text-center">المدى الطبيعي / Ref. Range</th>
                          <th className="p-3 text-center">التنشيط / Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                        {result.items.map((item, itemIdx) => {
                          const isHigh = item.flag === 'high' || item.flag === 'critical';
                          const isLow = item.flag === 'low';
                          return (
                            <tr key={itemIdx} className={isHigh || isLow ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                              <td className="p-3 font-bold text-slate-900">{item.parameterName}</td>
                              <td className={`p-3 text-center font-extrabold font-mono text-sm ${
                                item.flag === 'critical' ? 'text-rose-600' : isHigh ? 'text-amber-700' : isLow ? 'text-sky-700' : 'text-slate-900'
                              }`}>
                                {item.value}
                              </td>
                              <td className="p-3 text-center text-slate-500 font-mono">{item.unit}</td>
                              <td className="p-3 text-center text-slate-600 font-mono dir-ltr">{item.referenceRange}</td>
                              <td className="p-3 text-center">
                                {item.flag === 'normal' && (
                                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">طبيعي</span>
                                )}
                                {item.flag === 'high' && (
                                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px]">مرتفع ↑</span>
                                )}
                                {item.flag === 'low' && (
                                  <span className="inline-block px-2 py-0.5 bg-sky-100 text-sky-900 rounded font-bold text-[10px]">منخفض ↓</span>
                                )}
                                {item.flag === 'critical' && (
                                  <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-900 rounded font-bold text-[10px]">حرج ⚠️</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* General / AI Notes */}
                  {result.generalNotes && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                      <span className="font-bold text-slate-900 block mb-1">ملاحظات الفحص الطبي:</span>
                      <p>{result.generalNotes}</p>
                    </div>
                  )}
                  {result.aiNotesSummary && (
                    <div className="mt-2 p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-950">
                      <span className="font-bold text-teal-900 block mb-1">💡 تفسير النتائج الميسر للمريض:</span>
                      <p className="whitespace-pre-line leading-relaxed">{result.aiNotesSummary}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 4. Footer & Signatures */}
          <div className="border-t-2 border-slate-200 pt-6 mt-8">
            <div className="flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-slate-900">طبيب المراجعة والتدقيق:</p>
                <p className="text-slate-600 mt-1 font-medium">{publishedResults[0]?.reviewerName || lab?.responsibleName || "استشاري التحاليل الطبية"}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Approved on {new Date().toLocaleDateString('ar-EG')}</p>
              </div>

              <div className="text-center">
                <div className="w-24 h-12 border-2 border-dashed border-teal-300 rounded-xl flex items-center justify-center text-teal-600 font-extrabold text-[10px] uppercase">
                  Lab Stamp
                </div>
              </div>

              <div className="text-left font-mono text-[11px] text-slate-400">
                <p>DORY LABS AUTOMATED VERIFIED</p>
                <p>Page 1 of 1</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
