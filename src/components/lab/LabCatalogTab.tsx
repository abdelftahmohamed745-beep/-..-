import React, { useState } from 'react';
import { LabTestCatalogItem } from '../../types';
import { addLabTest, updateLabTest, deleteLabTest } from '../../services/labService';
import { ListPlus, Plus, Search, Edit2, Trash2, Check, X, Clock, AlertCircle } from 'lucide-react';

interface LabCatalogTabProps {
  labId: string;
  tests: LabTestCatalogItem[];
  onRefreshTests: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const LabCatalogTab: React.FC<LabCatalogTabProps> = ({
  labId,
  tests,
  onRefreshTests,
  onShowToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTestCatalogItem | null>(null);

  const [form, setForm] = useState({
    name: '',
    category: 'كيمياء الدم',
    price: 150,
    estimatedTurnaroundHours: 12,
    sampleType: 'دم وريدي',
    requiresFasting: false,
    patientInstructions: ''
  });

  const filteredTests = tests.filter((t) =>
    !searchTerm.trim() ||
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingTest(null);
    setForm({
      name: '',
      category: 'كيمياء الدم',
      price: 150,
      estimatedTurnaroundHours: 12,
      sampleType: 'دم وريدي',
      requiresFasting: false,
      patientInstructions: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (test: LabTestCatalogItem) => {
    setEditingTest(test);
    setForm({
      name: test.name,
      category: test.category,
      price: test.price,
      estimatedTurnaroundHours: test.estimatedTurnaroundHours,
      sampleType: test.sampleType,
      requiresFasting: test.requiresFasting,
      patientInstructions: test.patientInstructions || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      onShowToast("اسم الفحص مطلوب", "يرجى كتابة اسم فحص التحليل", "warning");
      return;
    }

    try {
      if (editingTest) {
        await updateLabTest(labId, editingTest.id, form);
        onShowToast("تم تحديث الفحص بنجاح", form.name, "success");
      } else {
        await addLabTest(labId, { ...form, active: true });
        onShowToast("تمت إضافة الفحص الجديد", form.name, "success");
      }
      setShowModal(false);
      onRefreshTests();
    } catch (err: any) {
      console.error("Save test error:", err);
      onShowToast("خطأ في حفظ الفحص", err.message, "error");
    }
  };

  const handleDelete = async (testId: string, testName: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف فحص (${testName})؟`)) return;
    try {
      await deleteLabTest(labId, testId);
      onShowToast("تم حذف الفحص", testName, "info");
      onRefreshTests();
    } catch (err: any) {
      onShowToast("خطأ أثناء الحذف", err.message, "error");
    }
  };

  return (
    <div className="space-y-5">
      
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 font-['Tajawal',sans-serif]">دليل الفحوصات والأسعار</h1>
          <p className="text-xs text-slate-500">إجمالي الفحوصات المتاحة للمرضى: {tests.length} فحص</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة فحص جديد للدليل</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الفحص أو التصنيف (CBC، سكر، هرمونات)..."
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">اسم الفحص</th>
                <th className="py-3 px-4">التصنيف</th>
                <th className="py-3 px-4">السعر</th>
                <th className="py-3 px-4">مدة الإنجاز</th>
                <th className="py-3 px-4">نوع العينة</th>
                <th className="py-3 px-4">شروط الصيام</th>
                <th className="py-3 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {test.name}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-600">
                    {test.category}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-teal-800">
                    {test.price} ج.م
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {test.estimatedTurnaroundHours} ساعة
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {test.sampleType}
                  </td>
                  <td className="py-3.5 px-4">
                    {test.requiresFasting ? (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        يتطلب صيام
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        بدون صيام
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(test)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(test.id, test.name)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900">
                {editingTest ? "تعديل بيانات الفحص" : "إضافة فحص جديد للدليل"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الفحص الكامل</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  placeholder="مثال: سكر صائم (FBG)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">السعر (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مدة الإنجاز المتوقعة (ساعات)</label>
                  <input
                    type="number"
                    required
                    value={form.estimatedTurnaroundHours}
                    onChange={(e) => setForm({ ...form, estimatedTurnaroundHours: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">التصنيف</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  >
                    <option value="كيمياء الدم">كيمياء الدم</option>
                    <option value="أمراض الدم">أمراض الدم</option>
                    <option value="الهرمونات">الهرمونات</option>
                    <option value="الفحوصات العامة">الفحوصات العامة</option>
                    <option value="المناعة والفيتايمينات">المناعة والفيتايمينات</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع العينة المطلوبة</label>
                  <input
                    type="text"
                    value={form.sampleType}
                    onChange={(e) => setForm({ ...form, sampleType: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="reqFast"
                  checked={form.requiresFasting}
                  onChange={(e) => setForm({ ...form, requiresFasting: e.target.checked })}
                  className="rounded-md border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="reqFast" className="font-bold text-slate-800">يتطلب الصيام قبل الفحص</label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تعليمات المريض</label>
                <textarea
                  rows={2}
                  value={form.patientInstructions}
                  onChange={(e) => setForm({ ...form, patientInstructions: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  placeholder="مثال: يرجى الصيام لمدة 8-10 ساعات قبل الفحص..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 font-bold text-slate-700 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-2xs"
                >
                  حفظ الفحص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
