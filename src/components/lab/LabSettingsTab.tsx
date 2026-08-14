import React, { useState } from 'react';
import { LabProfile } from '../../types';
import { updateLabProfile } from '../../services/labService';
import { Settings, Building, Phone, MapPin, Clock, Home, Save, CheckCircle } from 'lucide-react';
import { ImageUpload } from '../ui/ImageUpload';

interface LabSettingsTabProps {
  lab: LabProfile;
  onProfileUpdated: (updatedLab: LabProfile) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const LabSettingsTab: React.FC<LabSettingsTabProps> = ({
  lab,
  onProfileUpdated,
  onShowToast
}) => {
  const [form, setForm] = useState({
    name: lab.name,
    responsibleName: lab.responsibleName,
    phone: lab.phone,
    address: lab.address,
    offersHomeCollection: lab.offersHomeCollection,
    homeCollectionFee: lab.homeCollectionFee || 100,
    openTime: lab.workHours?.open || "08:00",
    closeTime: lab.workHours?.close || "23:00",
    logoUrl: lab.logoUrl || ''
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      onShowToast("خطأ في البيانات", "اسم المختبر ورقم الهاتف حقول إجبارية", "warning");
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<LabProfile> = {
        name: form.name.trim(),
        responsibleName: form.responsibleName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        offersHomeCollection: form.offersHomeCollection,
        homeCollectionFee: form.homeCollectionFee,
        logoUrl: form.logoUrl,
        workHours: {
          ...lab.workHours,
          open: form.openTime,
          close: form.closeTime
        }
      };

      await updateLabProfile(lab.uid, updates);
      setSaving(false);
      onProfileUpdated({ ...lab, ...updates });
      onShowToast("تم حفظ إعدادات المختبر بنجاح", "تمت تحديث البيانات التشغيلية", "success");
    } catch (err: any) {
      setSaving(false);
      console.error("Settings save error:", err);
      onShowToast("خطأ أثناء حفظ البيانات", err.message, "error");
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <h1 className="text-lg font-extrabold text-slate-900 font-['Tajawal',sans-serif]">إعدادات ملف المختبر</h1>
        <p className="text-xs text-slate-500">تحديث البيانات التعريفية، ساعات العمل، وخدمات السحب المنزلي</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 text-xs">
        
        {/* Lab Logo Direct Upload */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <ImageUpload
            label="شعار المختبر الرسمي (Logo)"
            helperText="يظهر الشعار في رأس صفحة التحاليل العامة، ونتائج التحاليل المطبوعة للمرضى"
            currentImageUrl={form.logoUrl}
            onChange={(dataUrl) => setForm({ ...form, logoUrl: dataUrl })}
            onRemove={() => setForm({ ...form, logoUrl: '' })}
            variant="avatar"
            maxDimension={600}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label className="block font-bold text-slate-800 mb-1">اسم المختبر الرسمي</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">اسم المدير الطبي المسئول</label>
            <input
              type="text"
              required
              value={form.responsibleName}
              onChange={(e) => setForm({ ...form, responsibleName: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-800 mb-1">رقم هاتف المختبر / واتساب</label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">عنوان المختبر التفصيلي</label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="block font-bold text-slate-800 mb-1">وقت فتح المختبر</label>
            <input
              type="time"
              value={form.openTime}
              onChange={(e) => setForm({ ...form, openTime: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-800 mb-1">وقت الإغلاق</label>
            <input
              type="time"
              value={form.closeTime}
              onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
            />
          </div>
        </div>

        <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl space-y-3 pt-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="offersHome"
              checked={form.offersHomeCollection}
              onChange={(e) => setForm({ ...form, offersHomeCollection: e.target.checked })}
              className="rounded-md border-teal-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="offersHome" className="font-extrabold text-teal-900">
              توفير خدمة سحب العينات الطبية من المنزل للمرضى
            </label>
          </div>

          {form.offersHomeCollection && (
            <div>
              <label className="block font-bold text-teal-900 mb-1">رسوم السحب المنزلي (ج.م)</label>
              <input
                type="number"
                value={form.homeCollectionFee}
                onChange={(e) => setForm({ ...form, homeCollectionFee: Number(e.target.value) })}
                className="w-40 p-2 bg-white border border-teal-200 rounded-lg font-bold text-slate-900"
              />
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-2xs"
          >
            <Save className="w-4 h-4" />
            <span>حفظ وتحديث الملف</span>
          </button>
        </div>

      </form>

    </div>
  );
};
