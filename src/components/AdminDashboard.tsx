import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  RefreshCw,
  Search,
  Building,
  Stethoscope,
  Phone,
  CreditCard,
  Lock,
  Unlock,
  AlertTriangle,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { DoctorProfile, SubscriptionStatus } from '../types';
import {
  getAllDoctorsAdmin,
  toggleDoctorStatus,
  updateDoctorSubscriptionByAdmin,
  deleteDoctorAccountByAdmin,
  formatPhoneNumberForUrl
} from '../services/firebaseService';

interface AdminDashboardProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onShowToast }) => {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchDoctors = async () => {
    setLoading(true);
    const list = await getAllDoctorsAdmin();
    setDoctors(list);
    setLoading(false);
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleToggleStatus = async (docId: string, currentStatus?: boolean) => {
    const nextStatus = currentStatus === false ? true : false;
    setProcessingId(docId);
    try {
      await toggleDoctorStatus(docId, nextStatus);
      setDoctors(doctors.map(d => d.uid === docId ? { ...d, isActive: nextStatus } : d));
      onShowToast(
        nextStatus ? "تم تفعيل حساب الطبيب بنجاح" : "تم إيقاف/تعطيل حساب الطبيب",
        nextStatus ? "يظهر الآن في دليل الأطباء ويمكن للمرضى الحجز" : "تم إخفاؤه من الدليل ومنع الحجوزات",
        nextStatus ? "success" : "warning"
      );
    } catch (err) {
      console.error(err);
      onShowToast("خطأ في تحديث حالة الحساب", "يرجى المحاولة لاحقاً", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateSubscription = async (docId: string, newSub: SubscriptionStatus) => {
    setProcessingId(docId);
    try {
      await updateDoctorSubscriptionByAdmin(docId, newSub, newSub === 'active' ? 12 : 1);
      setDoctors(doctors.map(d => d.uid === docId ? { ...d, subscriptionStatus: newSub } : d));
      onShowToast("تم تحديث باقة اشتراك الطبيب بنجاح", `الحالة الجديدة: ${newSub}`, "success");
    } catch (err) {
      console.error(err);
      onShowToast("خطأ في تحديث الاشتراك", "", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteDoctor = async (docId: string, doctorName: string) => {
    if (!window.confirm(`هل أنت متأكد تماماً من حذف حساب الطبيب "${doctorName}" كلياً من المنصة؟`)) {
      return;
    }
    setProcessingId(docId);
    try {
      await deleteDoctorAccountByAdmin(docId, "ADMIN_SESSION");
      setDoctors(doctors.filter(d => d.uid !== docId));
      onShowToast("تم حذف/تعطيل حساب الطبيب بواسطة الخادم بنجاح", "", "info");
    } catch (err) {
      console.error(err);
      onShowToast("خطأ في حذف الحساب", "", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      doc.name.toLowerCase().includes(q) ||
      doc.clinicName.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      (doc.city && doc.city.toLowerCase().includes(q));

    if (statusFilter === 'active') return matchesSearch && doc.isActive !== false;
    if (statusFilter === 'deactivated') return matchesSearch && doc.isActive === false;
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl mb-8 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/20 text-sky-300 rounded-full text-xs font-bold border border-sky-400/30 mb-2">
              <ShieldAlert className="w-4 h-4" />
              <span>إدارة المنصة المركزية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Tajawal',sans-serif]">
              لوحة تحكم مدير منصة دوري
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              إدارة الأطباء، العيادات، تفعيل وتجميد الحسابات، وتعديل باقات الاشتراك
            </p>
          </div>

          <button
            onClick={fetchDoctors}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث القائمة</span>
          </button>
        </div>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">إجمالي الأطباء</span>
              <span className="text-xl font-black text-slate-900">{doctors.length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">حسابات نشطة</span>
              <span className="text-xl font-black text-emerald-700">
                {doctors.filter(d => d.isActive !== false).length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">حسابات معطلة</span>
              <span className="text-xl font-black text-amber-700">
                {doctors.filter(d => d.isActive === false).length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">اشتراكات مدفوعة</span>
              <span className="text-xl font-black text-purple-700">
                {doctors.filter(d => d.subscriptionStatus === 'active').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم الطبيب، التخصص، أو العيادة..."
            className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            الكل ({doctors.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            نشط فقط
          </button>
          <button
            onClick={() => setStatusFilter('deactivated')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              statusFilter === 'deactivated' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            معطل فقط
          </button>
        </div>
      </div>

      {/* Doctors Table */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-semibold text-xs">جاري تحميل بيانات الأطباء والعيادات...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">لا يوجد أطباء مطابقين للبحث</h3>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-extrabold uppercase">
                  <th className="py-3.5 px-4">الطبيب والعيادة</th>
                  <th className="py-3.5 px-4">التخصص والمدينة</th>
                  <th className="py-3.5 px-4">الاتصال المباشر</th>
                  <th className="py-3.5 px-4">حالة الحساب</th>
                  <th className="py-3.5 px-4">الاشتراك</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDoctors.map((doc) => {
                  const isDeactivated = doc.isActive === false;
                  const phoneClean = formatPhoneNumberForUrl(doc.phone);
                  const whatsappClean = formatPhoneNumberForUrl(doc.whatsappNumber || doc.phone);

                  return (
                    <tr key={doc.uid} className={`hover:bg-slate-50/80 transition ${isDeactivated ? 'bg-amber-50/30' : ''}`}>
                      
                      {/* Doctor & Clinic Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          {doc.photoUrl ? (
                            <img src={doc.photoUrl} alt={doc.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-black flex items-center justify-center shrink-0">
                              {doc.name ? doc.name.charAt(0) : "ط"}
                            </div>
                          )}
                          <div>
                            <span className="block font-black text-slate-900 font-['Tajawal',sans-serif]">{doc.name}</span>
                            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                              <Building className="w-3 h-3 text-sky-600" />
                              <span>{doc.clinicName}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Specialty & Location */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold text-[11px] mb-1">
                          {doc.specialty}
                        </span>
                        <span className="block text-[11px] text-slate-500">{doc.city || 'غير محدد'} - {doc.address}</span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {doc.phone ? (
                          <a href={`tel:${phoneClean}`} className="text-sky-700 hover:underline block font-bold">
                            {doc.phone}
                          </a>
                        ) : (
                          <span className="text-slate-400 font-normal">لم يضف رقم هاتف</span>
                        )}
                        {doc.whatsappNumber && (
                          <a
                            href={`https://wa.me/${whatsappClean}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:underline text-[11px] flex items-center gap-1 mt-0.5"
                          >
                            <MessageCircle className="w-3 h-3 fill-current" />
                            <span>{doc.whatsappNumber}</span>
                          </a>
                        )}
                      </td>

                      {/* Account Active / Deactivated Badge */}
                      <td className="py-3.5 px-4 font-bold">
                        {isDeactivated ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px]">
                            <Lock className="w-3 h-3" />
                            <span>موقف / معطل</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px]">
                            <CheckCircle className="w-3 h-3" />
                            <span>نشط ومفعل</span>
                          </span>
                        )}
                      </td>

                      {/* Subscription Status & Actions */}
                      <td className="py-3.5 px-4">
                        <select
                          value={doc.subscriptionStatus}
                          disabled={processingId === doc.uid}
                          onChange={(e) => handleUpdateSubscription(doc.uid, e.target.value as SubscriptionStatus)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-hidden ${
                            doc.subscriptionStatus === 'active'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : doc.subscriptionStatus === 'trial'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          <option value="trial">تجريبي (Trial)</option>
                          <option value="active">مفعل مدفوع (Active)</option>
                          <option value="expired">منتهي (Expired)</option>
                        </select>
                      </td>

                      {/* Actions Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          
                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleStatus(doc.uid, doc.isActive)}
                            disabled={processingId === doc.uid}
                            className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              isDeactivated
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                            title={isDeactivated ? "تفعيل حساب الطبيب" : "إيقاف حساب الطبيب"}
                          >
                            {isDeactivated ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            <span>{isDeactivated ? 'تفعيل' : 'تجميد'}</span>
                          </button>

                          {/* Delete Account */}
                          <button
                            onClick={() => handleDeleteDoctor(doc.uid, doc.name)}
                            disabled={processingId === doc.uid}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                            title="حذف حساب الطبيب من النظام"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
