import React, { useState } from 'react';
import { LabProfile, LabTestCatalogItem, CollectionMethod } from '../../types';
import { createLabOrder } from '../../services/labService';
import { ShoppingBag, Home, Building, User, Phone, Calendar, Clock, AlertCircle, X, CheckCircle, ShieldCheck } from 'lucide-react';

interface LabOrderModalProps {
  lab: LabProfile;
  selectedTests: LabTestCatalogItem[];
  onClose: () => void;
  onOrderSuccess: (orderId: string, orderNum: string) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const LabOrderModal: React.FC<LabOrderModalProps> = ({
  lab,
  selectedTests,
  onClose,
  onOrderSuccess,
  onShowToast
}) => {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState<number | ''>('');
  const [patientGender, setPatientGender] = useState<'male' | 'female'>('male');
  const [patientNotes, setPatientNotes] = useState('');
  const [collectionMethod, setCollectionMethod] = useState<CollectionMethod>('IN_LAB');
  
  // Home Collection fields
  const [homeAddress, setHomeAddress] = useState('');
  const [homePreferredDate, setHomePreferredDate] = useState('');
  const [homePreferredTime, setHomePreferredTime] = useState('10:00');

  const [loading, setLoading] = useState(false);

  const testTotal = selectedTests.reduce((sum, item) => sum + item.price, 0);
  const homeFee = collectionMethod === 'HOME_COLLECTION' ? (lab.homeCollectionFee || 100) : 0;
  const grandTotal = testTotal + homeFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) {
      onShowToast("خطأ في البيانات", "يرجى كتابة اسم المريض ورقم الهاتف", "warning");
      return;
    }

    if (collectionMethod === 'HOME_COLLECTION' && !homeAddress.trim()) {
      onShowToast("عنوان المنزل مطلوب", "يرجى كتابة العنوان التفصيلي لسحب العينة من المنزل", "warning");
      return;
    }

    setLoading(true);
    try {
      const order = await createLabOrder({
        labId: lab.uid,
        labName: lab.name || "المعمل الطبي",
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        patientAge: typeof patientAge === 'number' && !isNaN(patientAge) ? patientAge : 0,
        patientGender,
        patientNotes: patientNotes.trim() || "",
        collectionMethod,
        homeAddress: collectionMethod === 'HOME_COLLECTION' ? homeAddress.trim() : "",
        homePreferredDate: collectionMethod === 'HOME_COLLECTION' ? homePreferredDate : "",
        homePreferredTime: collectionMethod === 'HOME_COLLECTION' ? homePreferredTime : "",
        testIds: selectedTests.map((t) => t.id),
        testNames: selectedTests.map((t) => t.name),
        totalPrice: grandTotal
      });

      setLoading(false);
      onShowToast("تم إرسال طلب التحليل بنجاح!", `رقم الطلب: ${order.orderNumber}`, "success");
      onOrderSuccess(order.id, order.orderNumber);
    } catch (err: unknown) {
      console.error("Lab order error:", err);
      setLoading(false);
      let userFriendlyMsg = "حدث خطأ غير متوقع أثناء إنشاء الطلب. يرجى التأكد من البيانات والمحاولة مرة أخرى.";
      if (err instanceof Error) {
        if (err.message.includes('permission') || err.message.includes('PERMISSION_DENIED')) {
          userFriendlyMsg = "عذراً، لا تملك الصلاحيات الكافية لتنفيذ هذا الطلب.";
        } else if (err.message.includes('network') || err.message.includes('offline')) {
          userFriendlyMsg = "تعذر الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت وإعادة المحاولة.";
        }
      }
      onShowToast("خطأ أثناء إنشاء الطلب", userFriendlyMsg, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base font-['Tajawal',sans-serif]">تأكيد طلب التحاليل الطبية</h3>
              <p className="text-xs text-slate-400">{lab.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Selected Tests Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-700 block">الفحوصات والتحاليل المختارة ({selectedTests.length}):</span>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {selectedTests.map((test) => (
                <div key={test.id} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900">{test.name}</span>
                  <span className="font-mono font-extrabold text-teal-700">{test.price} ج.م</span>
                </div>
              ))}
            </div>
          </div>

          {/* Collection Method Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2">طريقة سحب العينة</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCollectionMethod('IN_LAB')}
                className={`p-4 rounded-2xl border text-right transition flex items-center gap-3 ${
                  collectionMethod === 'IN_LAB'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Building className="w-5 h-5 shrink-0 text-teal-400" />
                <div>
                  <span className="block font-bold text-xs">زيارة المعمل</span>
                  <span className="text-[10px] opacity-80 block">الحضور لمقر المعمل</span>
                </div>
              </button>

              {lab.offersHomeCollection && (
                <button
                  type="button"
                  onClick={() => setCollectionMethod('HOME_COLLECTION')}
                  className={`p-4 rounded-2xl border text-right transition flex items-center gap-3 ${
                    collectionMethod === 'HOME_COLLECTION'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Home className="w-5 h-5 shrink-0 text-teal-400" />
                  <div>
                    <span className="block font-bold text-xs">سحب من المنزل</span>
                    <span className="text-[10px] opacity-80 block">زيارة فني سحب معتمد</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Patient Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المريض بالكامل *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="مثال: أحمد محمود علي"
                  required
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم هاتف المريض *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="tel"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  required
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500 dir-ltr text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">العمر (بالسنوات)</label>
              <input
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="مثال: 35"
                min={1}
                max={120}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الجنس</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPatientGender('male')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    patientGender === 'male' ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  ذكر
                </button>
                <button
                  type="button"
                  onClick={() => setPatientGender('female')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    patientGender === 'female' ? 'bg-teal-50 text-teal-800 border-teal-300' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  أنثى
                </button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات المريض أو التشخيص (اختياري)</label>
              <textarea
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="أية ملاحظات خاصة بالفحص أو الحالة الصحية..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Additional Home Collection Details */}
          {collectionMethod === 'HOME_COLLECTION' && (
            <div className="bg-teal-50/60 rounded-2xl p-4 border border-teal-200/80 space-y-3">
              <span className="text-xs font-bold text-teal-900 block">تفاصيل سحب العينة المنزلية:</span>
              
              <div>
                <label className="block text-[11px] font-bold text-teal-900 mb-1">العنوان التفصيلي (المنطقة، الشارع، رقم العمارة، الشقة) *</label>
                <input
                  type="text"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  placeholder="القاهرة - المعادي - شارع 9 - عمارة 15 - شقة 4"
                  required={collectionMethod === 'HOME_COLLECTION'}
                  className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-teal-900 mb-1">تاريخ السحب المفضل</label>
                  <input
                    type="date"
                    value={homePreferredDate}
                    onChange={(e) => setHomePreferredDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-teal-900 mb-1">الوقت المفضل</label>
                  <input
                    type="time"
                    value={homePreferredTime}
                    onChange={(e) => setHomePreferredTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-teal-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pricing Total Breakdown */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>إجمالي رسوم التحاليل:</span>
              <span className="font-mono font-bold">{testTotal} ج.م</span>
            </div>
            {collectionMethod === 'HOME_COLLECTION' && (
              <div className="flex justify-between text-slate-300">
                <span>رسوم زيارة وسحب العينة المنزلية:</span>
                <span className="font-mono font-bold">{homeFee} ج.م</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm text-teal-400 pt-2 border-t border-slate-800">
              <span>المبلغ الإجمالي المستحق:</span>
              <span className="font-mono">{grandTotal} ج.م</span>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black text-sm rounded-2xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <span>جاري إرسال الطلب...</span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>تأكيد وإرسال طلب التحليل</span>
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
};
