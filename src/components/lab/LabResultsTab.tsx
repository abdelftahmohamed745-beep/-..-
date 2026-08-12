import React, { useState } from 'react';
import { LabOrder, LabTestResult, LabTestResultItem } from '../../types';
import { saveTestResult, approveAndPublishResult, generateAIPatientExplanation } from '../../services/labService';
import {
  FileCheck2,
  Plus,
  Edit2,
  CheckCircle2,
  Printer,
  X,
  Search,
  User,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface LabResultsTabProps {
  labId: string;
  orders: LabOrder[];
  selectedOrderForResults: LabOrder | null;
  setSelectedOrderForResults: (order: LabOrder | null) => void;
  onViewPDF: (order: LabOrder) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const LabResultsTab: React.FC<LabResultsTabProps> = ({
  labId,
  orders,
  selectedOrderForResults,
  setSelectedOrderForResults,
  onViewPDF,
  onShowToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal / Drawer state for Result Entry
  const [resultTestName, setResultTestName] = useState('صورة دم كاملة (CBC)');
  const [parameters, setParameters] = useState<LabTestResultItem[]>([
    { parameterName: 'Hemoglobin (Hb)', value: '14.2', unit: 'g/dL', referenceRange: '13.0 - 17.5', flag: 'normal' },
    { parameterName: 'WBC Count', value: '7.5', unit: 'x10^3/uL', referenceRange: '4.0 - 11.0', flag: 'normal' },
    { parameterName: 'Platelets', value: '250', unit: 'x10^3/uL', referenceRange: '150 - 450', flag: 'normal' }
  ]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredOrders = orders.filter((o) =>
    !searchTerm.trim() ||
    o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddParam = () => {
    setParameters([
      ...parameters,
      { parameterName: '', value: '', unit: '', referenceRange: '', flag: 'normal' }
    ]);
  };

  const handleParamChange = (index: number, field: keyof LabTestResultItem, val: string) => {
    const updated = [...parameters];
    (updated[index] as any)[field] = val;
    setParameters(updated);
  };

  const handleRemoveParam = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleGenerateAIExplanation = () => {
    const summary = generateAIPatientExplanation(parameters);
    setAiSummary(summary);
    onShowToast("تم توليد التلخيص الذكي للنتائج", "تمت صياغة ملاحظة توضيحية مبسطة للمريض", "info");
  };

  const handleSaveResult = async (publishNow = false) => {
    if (!selectedOrderForResults) return;

    if (parameters.length === 0 || !parameters[0].parameterName.trim()) {
      onShowToast("بيانات التحليل ناقصة", "يرجى إضافة عنصر واحد على الأقل للنتائج", "warning");
      return;
    }

    setIsSaving(true);
    try {
      const created = await saveTestResult(labId, {
        labId,
        orderId: selectedOrderForResults.id,
        orderNumber: selectedOrderForResults.orderNumber,
        sampleId: `LAB-${selectedOrderForResults.orderNumber}`,
        patientName: selectedOrderForResults.patientName,
        patientPhone: selectedOrderForResults.patientPhone || '',
        testName: resultTestName,
        status: publishNow ? 'published' : 'approved',
        items: parameters,
        generalNotes,
        aiNotesSummary: aiSummary || generateAIPatientExplanation(parameters)
      });

      setIsSaving(false);
      setSelectedOrderForResults(null);
      onShowToast("تم حفظ واعتمد نتائج التحليل بنجاح", `رقم الطلب: ${selectedOrderForResults.orderNumber}`, "success");
    } catch (err: any) {
      setIsSaving(false);
      console.error("Save result error:", err);
      onShowToast("خطأ في حفظ النتيجة", err.message || "تعذر حفظ النتيجة", "error");
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 font-['Tajawal',sans-serif]">إدخال واعتمد نتائج التحاليل</h1>
          <p className="text-xs text-slate-500">مسار اعتماد النتائج: مسودة ← مراجعة ← اعتماد ← نشر للمريض</p>
        </div>
      </div>

      {/* Orders Selection Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن طلب لإدخال النتائج..."
              className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">رقم الطلب</th>
                <th className="py-3 px-4">المريض</th>
                <th className="py-3 px-4">الفحوصات المطلوبة</th>
                <th className="py-3 px-4">حالة الطلب</th>
                <th className="py-3 px-4 text-center">الإجراء</th>
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
                    <div className="text-[11px] font-normal text-slate-500">{order.patientPhone}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                    {order.testNames.join('، ')}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedOrderForResults(order);
                          if (order.testNames.length > 0) setResultTestName(order.testNames[0]);
                        }}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-md text-xs transition"
                      >
                        إدخال النتائج
                      </button>
                      <button
                        onClick={() => onViewPDF(order)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 rounded-md"
                        title="معاينة التقرير"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* Result Entry Modal / Drawer */}
      {selectedOrderForResults && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm font-['Tajawal',sans-serif]">
                  إدخال نتائج تحليل — {selectedOrderForResults.patientName}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">طلب #{selectedOrderForResults.orderNumber}</p>
              </div>
              <button
                onClick={() => setSelectedOrderForResults(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              
              <div>
                <label className="block font-bold text-slate-800 mb-1">اسم الفحص الرئيسي</label>
                <input
                  type="text"
                  value={resultTestName}
                  onChange={(e) => setResultTestName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              {/* Parameter Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-slate-900">قيم ومؤشرات التحليل</span>
                  <button
                    onClick={handleAddParam}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-md flex items-center gap-1 text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة عنصر</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {parameters.map((param, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg items-center">
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="اسم المؤشر"
                          value={param.parameterName}
                          onChange={(e) => handleParamChange(idx, 'parameterName', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded-md font-bold text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="النتيجة"
                          value={param.value}
                          onChange={(e) => handleParamChange(idx, 'value', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded-md font-bold text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="الوحدة"
                          value={param.unit}
                          onChange={(e) => handleParamChange(idx, 'unit', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="المدى الطبيعي"
                          value={param.referenceRange}
                          onChange={(e) => handleParamChange(idx, 'referenceRange', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-xs"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRemoveParam(idx)}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Summary Generator */}
              <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-teal-900">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <span>التلخيص والتقرير المبسط للمريض</span>
                  </div>
                  <button
                    onClick={handleGenerateAIExplanation}
                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-md text-[11px]"
                  >
                    توليد تلخيص تلقائي
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={aiSummary}
                  onChange={(e) => setAiSummary(e.target.value)}
                  placeholder="ملاحظات وتلخيص النتائج للمريض..."
                  className="w-full p-2 bg-white border border-teal-200 rounded-md text-xs text-slate-800"
                />
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedOrderForResults(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs"
              >
                إلغاء
              </button>
              <button
                disabled={isSaving}
                onClick={() => handleSaveResult(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs shadow-2xs"
              >
                اعتماد ونشر النتيجة للمريض
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
