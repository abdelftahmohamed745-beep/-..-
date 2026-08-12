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
  CreditCard,
  Lock,
  Unlock,
  MessageCircle,
  Copy,
  Plus,
  Calendar,
  History,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  Filter,
  TestTube,
  Eye,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Info
} from 'lucide-react';
import { DoctorProfile, SubscriptionStatus, SubscriptionPlan, SubscriptionLog, LabAdminView } from '../types';
import {
  getAllDoctorsAdmin,
  toggleDoctorStatus,
  deleteDoctorAccountByAdmin,
  formatPhoneNumberForUrl,
  generateReferenceCode,
  activateSubscriptionByAdmin,
  cancelSubscriptionByAdmin,
  getAllSubscriptionLogs,
  OFFICIAL_SUBSCRIPTION_PRICES,
  getAllLabsAdmin,
  toggleLabStatusAdmin
} from '../services/firebaseService';

interface AdminDashboardProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onShowToast }) => {
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [labs, setLabs] = useState<LabAdminView[]>([]);
  const [subscriptionLogs, setSubscriptionLogs] = useState<SubscriptionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'doctors' | 'labs' | 'subscriptions' | 'logs'>('doctors');

  // Search & Filter state for Doctors
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Search & Filter state for Labs
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [labStatusFilter, setLabStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [selectedLabForDetails, setSelectedLabForDetails] = useState<LabAdminView | null>(null);
  const [processingLabId, setProcessingLabId] = useState<string | null>(null);

  // Manual Subscription Activation Modal / Form state
  const [selectedDoctorForSub, setSelectedDoctorForSub] = useState<DoctorProfile | null>(null);
  const [searchRefCodeInput, setSearchRefCodeInput] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('monthly');
  const [isExtension, setIsExtension] = useState(false);
  const [subNotes, setSubNotes] = useState('');
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);
  const [subErrorMsg, setSubErrorMsg] = useState<string | null>(null);

  // Copy Reference Code Toast Feedback
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [docList, logsList, labsList] = await Promise.all([
        getAllDoctorsAdmin(),
        getAllSubscriptionLogs(),
        getAllLabsAdmin()
      ]);
      setDoctors(docList);
      setSubscriptionLogs(logsList);
      setLabs(labsList);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(code);
    onShowToast("تم نسخ الكود المرجعي", code, "success");
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

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

  const handleToggleLabStatus = async (labId: string, currentStatus?: boolean) => {
    const nextStatus = currentStatus === false ? true : false;
    setProcessingLabId(labId);
    try {
      await toggleLabStatusAdmin(labId, nextStatus);
      setLabs(labs.map(l => l.uid === labId ? { ...l, isActive: nextStatus } : l));
      if (selectedLabForDetails && selectedLabForDetails.uid === labId) {
        setSelectedLabForDetails({ ...selectedLabForDetails, isActive: nextStatus });
      }
      onShowToast(
        nextStatus ? "تم تفعيل حساب المعمل بنجاح" : "تم تعليق/تجميد حساب المعمل",
        nextStatus
          ? "يظهر الآن المعمل في الدليل ومتاح لاستقبال طلبات التحاليل"
          : "تم تعليق حساب المعمل مؤقتاً مع الحفاظ الكامل على كافة السجلات والنتائج الطبية",
        nextStatus ? "success" : "warning"
      );
    } catch (err) {
      console.error(err);
      onShowToast("خطأ في تحديث حالة المعمل", "يرجى المحاولة لاحقاً", "error");
    } finally {
      setProcessingLabId(null);
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

  // Search clinic by Reference Code or Name or Phone
  const handleFindClinicByRefCode = (queryStr: string) => {
    const clean = queryStr.trim().toLowerCase();
    setSearchRefCodeInput(queryStr);
    setSubErrorMsg(null);

    if (!clean) {
      setSelectedDoctorForSub(null);
      return;
    }

    const found = doctors.find(d => {
      const ref = (d.referenceCode || generateReferenceCode(d.uid)).toLowerCase();
      return (
        ref === clean ||
        ref.includes(clean) ||
        d.name.toLowerCase().includes(clean) ||
        d.clinicName.toLowerCase().includes(clean) ||
        (d.phone && d.phone.includes(clean))
      );
    });

    if (found) {
      setSelectedDoctorForSub(found);
      if (found.isActive === false) {
        setSubErrorMsg("عذراً، هذه العيادة معطلة من قبل الإدارة. يرجى تفعيل الحساب أولاً من قائمة الأطباء.");
      }
    } else {
      setSelectedDoctorForSub(null);
    }
  };

  // Submit Subscription Activation
  const handleActivateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorForSub) {
      setSubErrorMsg("يرجى اختيار أو البحث عن العيادة أولاً");
      return;
    }

    if (selectedDoctorForSub.isActive === false) {
      setSubErrorMsg("لا يمكن تفعيل اشتراك لعيادة غير نشطة أو معطلة");
      return;
    }

    setIsSubmittingSub(true);
    setSubErrorMsg(null);

    try {
      const res = await activateSubscriptionByAdmin({
        clinicId: selectedDoctorForSub.uid,
        plan: selectedPlan,
        adminId: 'ADMIN_SESSION',
        isExtension,
        notes: subNotes.trim()
      });

      onShowToast(
        isExtension ? "تم تمديد الاشتراك بنجاح" : "تم تفعيل الاشتراك بنجاح",
        `كود المرجع: ${res.referenceCode} - تاريخ الانتهاء: ${new Date(res.expiresAt).toLocaleDateString('ar-EG')}`,
        "success"
      );

      // Refresh Data
      await fetchInitialData();

      // Reset modal state
      setSelectedDoctorForSub(null);
      setSearchRefCodeInput('');
      setSubNotes('');
      setIsExtension(false);
    } catch (err: any) {
      console.error(err);
      setSubErrorMsg(err.message || "حدث خطأ أثناء تفعيل الاشتراك");
      onShowToast("فشل تفعيل الاشتراك", err.message || "", "error");
    } finally {
      setIsSubmittingSub(false);
    }
  };

  // Cancel Subscription Action
  const handleCancelSubscription = async (docId: string, doctorName: string) => {
    if (!window.confirm(`هل أنت متأكد من إلغاء اشتراك عيادة "${doctorName}"؟`)) {
      return;
    }

    setProcessingId(docId);
    try {
      await cancelSubscriptionByAdmin({
        clinicId: docId,
        adminId: 'ADMIN_SESSION',
        notes: 'إلغاء أيديوي من لوحة تحكم المدير'
      });

      onShowToast("تم إلغاء الاشتراك بنجاح", doctorName, "warning");
      await fetchInitialData();
    } catch (err: any) {
      console.error(err);
      onShowToast("خطأ في إلغاء الاشتراك", err.message || "", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered Doctors List
  const filteredDoctors = doctors.filter((doc) => {
    const q = searchQuery.toLowerCase().trim();
    const ref = (doc.referenceCode || generateReferenceCode(doc.uid)).toLowerCase();
    const matchesSearch =
      !q ||
      ref.includes(q) ||
      doc.name.toLowerCase().includes(q) ||
      doc.clinicName.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      (doc.phone && doc.phone.includes(q)) ||
      (doc.city && doc.city.toLowerCase().includes(q));

    if (statusFilter === 'active') return matchesSearch && doc.isActive !== false;
    if (statusFilter === 'deactivated') return matchesSearch && doc.isActive === false;
    return matchesSearch;
  });

  // Filtered Laboratories List
  const filteredLabs = labs.filter((lab) => {
    const q = labSearchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      lab.name.toLowerCase().includes(q) ||
      lab.responsibleName.toLowerCase().includes(q) ||
      (lab.email && lab.email.toLowerCase().includes(q)) ||
      (lab.phone && lab.phone.includes(q)) ||
      (lab.address && lab.address.toLowerCase().includes(q)) ||
      (lab.governorate && lab.governorate.toLowerCase().includes(q));

    if (labStatusFilter === 'active') return matchesSearch && lab.isActive !== false;
    if (labStatusFilter === 'suspended') return matchesSearch && lab.isActive === false;
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
              إدارة العيادات، كود المرجع الثابت لكل عيادة، وتفعيل الاشتراكات الشهرية والسنوية
            </p>
          </div>

          <button
            onClick={fetchInitialData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/10"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl mb-8 max-w-fit">
        <button
          onClick={() => setActiveTab('doctors')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'doctors'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-sky-600" />
          <span>العيادات والأطباء ({doctors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('labs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'labs'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4 text-teal-300" />
          <span>المعامل الطبية ({labs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'subscriptions'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>تفعيل الاشتراك المباشر</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'logs'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل التفعيلات السابق ({subscriptionLogs.length})</span>
        </button>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">إجمالي العيادات</span>
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
              <span className="text-[11px] text-slate-500 font-bold block">اشتراكات مفعلة</span>
              <span className="text-xl font-black text-emerald-700">
                {doctors.filter(d => d.subscriptionStatus === 'active').length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">فترة تجريبية (Trial)</span>
              <span className="text-xl font-black text-amber-700">
                {doctors.filter(d => d.subscriptionStatus === 'trial').length}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-bold block">منتهي / ملغى</span>
              <span className="text-xl font-black text-rose-700">
                {doctors.filter(d => d.subscriptionStatus === 'expired' || d.subscriptionStatus === 'cancelled').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TAB 1: DOCTORS DIRECTORY */}
      {activeTab === 'doctors' && (
        <div>
          {/* Search & Filter */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الطبيب، العيادة، الكود المرجعي (REF-XXXXXX) أو الهاتف..."
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
              <p className="text-slate-500 font-semibold text-xs">جاري تحميل البيانات...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">لا يوجد نتائج تجريبية تطابق البحث</h3>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-extrabold uppercase">
                      <th className="py-3.5 px-4">كود المرجع الثابت</th>
                      <th className="py-3.5 px-4">الطبيب والعيادة</th>
                      <th className="py-3.5 px-4">التخصص والمدينة</th>
                      <th className="py-3.5 px-4">الاتصال المباشر</th>
                      <th className="py-3.5 px-4">حالة الحساب</th>
                      <th className="py-3.5 px-4">الاشتراك والانتهاء</th>
                      <th className="py-3.5 px-4 text-center">الإجراءات والسجل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredDoctors.map((doc) => {
                      const isDeactivated = doc.isActive === false;
                      const refCode = doc.referenceCode || generateReferenceCode(doc.uid);
                      const phoneClean = formatPhoneNumberForUrl(doc.phone);
                      const whatsappClean = formatPhoneNumberForUrl(doc.whatsappNumber || doc.phone);

                      return (
                        <tr key={doc.uid} className={`hover:bg-slate-50/80 transition ${isDeactivated ? 'bg-amber-50/30' : ''}`}>
                          
                          {/* Reference Code */}
                          <td className="py-3.5 px-4 font-bold">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-900 rounded-lg border border-slate-200 font-mono text-xs">
                              <span className="text-amber-700 font-black">{refCode}</span>
                              <button
                                onClick={() => handleCopyCode(refCode)}
                                className="text-slate-400 hover:text-slate-800 transition cursor-pointer"
                                title="نسخ الكود المرجعي"
                                aria-label="نسخ الكود المرجعي"
                              >
                                {copiedCodeId === refCode ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>

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

                          {/* Account Status Badge */}
                          <td className="py-3.5 px-4 font-bold">
                            {isDeactivated ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px]">
                                <Lock className="w-3 h-3" />
                                <span>معطل</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px]">
                                <CheckCircle className="w-3 h-3" />
                                <span>نشط</span>
                              </span>
                            )}
                          </td>

                          {/* Subscription Status & End Date */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-black ${
                                doc.subscriptionStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                                doc.subscriptionStatus === 'trial' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {doc.subscriptionStatus === 'active' ? 'مفعل مدفوع' :
                                 doc.subscriptionStatus === 'trial' ? 'تجريبي (Trial)' :
                                 doc.subscriptionStatus === 'cancelled' ? 'ملغى' : 'منتهي'}
                              </span>
                              
                              <span className="block text-[10px] text-slate-500 font-medium">
                                {doc.subscriptionEndDate
                                  ? `ينتهي: ${new Date(doc.subscriptionEndDate).toLocaleDateString('ar-EG')}`
                                  : doc.trialEndDate
                                  ? `تجريبي حتى: ${new Date(doc.trialEndDate).toLocaleDateString('ar-EG')}`
                                  : 'غير محدد'}
                              </span>
                            </div>
                          </td>

                          {/* Actions Buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              
                              {/* Open Subscription Panel for this Clinic */}
                              <button
                                onClick={() => {
                                  setSelectedDoctorForSub(doc);
                                  setSearchRefCodeInput(refCode);
                                  setActiveTab('subscriptions');
                                }}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold transition flex items-center gap-1"
                                title="تفعيل أو تمديد اشتراك العيادة"
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                                <span>تفعيل</span>
                              </button>

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
                              </button>

                              {/* Delete Account */}
                              <button
                                onClick={() => handleDeleteDoctor(doc.uid, doc.name)}
                                disabled={processingId === doc.uid}
                                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                                title="حذف حساب الطبيب من النظام"
                                aria-label="حذف حساب الطبيب"
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
      )}

      {/* TAB FOR LABORATORIES MANAGEMENT */}
      {activeTab === 'labs' && (
        <div className="space-y-6">
          {/* Labs Search & Filter Controls */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                value={labSearchQuery}
                onChange={(e) => setLabSearchQuery(e.target.value)}
                placeholder="ابحث باسم المعمل، اسم المسؤول، رقم الهاتف، أو البريد الإلكتروني..."
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold shrink-0">
                <Filter className="w-4 h-4" />
                <span>حالة الحساب:</span>
              </div>
              <select
                value={labStatusFilter}
                onChange={(e) => setLabStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">جميع الحسابات ({labs.length})</option>
                <option value="active">الحسابات النشطة ({labs.filter(l => l.isActive !== false).length})</option>
                <option value="suspended">الحسابات الموقوفة ({labs.filter(l => l.isActive === false).length})</option>
              </select>
            </div>
          </div>

          {/* Laboratories List Table */}
          {filteredLabs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">لم يتم العثور على معامل طبية مطابقة لنتائج البحث</p>
              <p className="text-xs text-slate-400 mt-1">تأكد من كتابة اسم المعمل أو المسؤول أو الهاتف بشكل صحيح</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-slate-800">قائمة المعامل الطبية المعتمدة ({filteredLabs.length})</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  عرض {filteredLabs.length} من أصل {labs.length} معمل مسجل
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[11px] font-extrabold uppercase">
                      <th className="py-3 px-4">اسم المعمل والمسؤول</th>
                      <th className="py-3 px-4">رقم الهاتف والبريد</th>
                      <th className="py-3 px-4">الموقع والمحافظة</th>
                      <th className="py-3 px-4 text-center">الموظفين والطلبات</th>
                      <th className="py-3 px-4">تاريخ التسجيل</th>
                      <th className="py-3 px-4">حالة الحساب</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLabs.map((lab) => {
                      const isSuspended = lab.isActive === false;
                      const phoneClean = lab.phone ? lab.phone.replace(/\D/g, '') : '';
                      return (
                        <tr key={lab.uid} className={`hover:bg-slate-50/80 transition ${isSuspended ? 'bg-amber-50/30' : ''}`}>
                          
                          {/* Name & Owner */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                isSuspended ? 'bg-amber-100 text-amber-800' : 'bg-teal-50 text-teal-700 border border-teal-200'
                              }`}>
                                <Building className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-black text-slate-900 text-sm block">{lab.name}</span>
                                <span className="text-[11px] text-slate-500 font-bold block mt-0.5">
                                  المسؤول: {lab.responsibleName || 'غير محدد'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Contact & Email */}
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            {lab.phone ? (
                              <a href={`tel:${phoneClean}`} className="text-sky-700 hover:underline block font-bold">
                                {lab.phone}
                              </a>
                            ) : (
                              <span className="text-slate-400 font-normal">لم يضف رقم هاتف</span>
                            )}
                            {lab.email ? (
                              <span className="text-slate-500 block text-[10px] truncate max-w-[160px]" title={lab.email}>
                                {lab.email}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px] block">بريد غير مسجل</span>
                            )}
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800 block text-xs">{lab.governorate || 'القاهرة'}</span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-[180px]" title={lab.address}>
                              {lab.address || 'غير محدد'}
                            </span>
                          </td>

                          {/* Staff & Orders */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-lg text-[11px]">
                              <span title="عدد الموظفين">👥 {lab.staffCount || 1}</span>
                              <span className="text-slate-300">|</span>
                              <span title="عدد الطلبات">🧪 {lab.orderCount || 0}</span>
                            </div>
                          </td>

                          {/* Created Date */}
                          <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                            {lab.createdAt ? new Date(lab.createdAt).toLocaleDateString('ar-EG') : 'غير محدد'}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            {isSuspended ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[11px] font-bold">
                                <Lock className="w-3 h-3" />
                                <span>موقوف</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[11px] font-bold">
                                <CheckCircle className="w-3 h-3" />
                                <span>نشط</span>
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* View Details Modal Trigger */}
                              <button
                                onClick={() => setSelectedLabForDetails(lab)}
                                className="p-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl transition"
                                title="عرض تفاصيل المعمل كاملة"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Toggle Active/Suspended */}
                              <button
                                onClick={() => handleToggleLabStatus(lab.uid, lab.isActive)}
                                disabled={processingLabId === lab.uid}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1 ${
                                  isSuspended
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                                title={isSuspended ? "تفعيل حساب المعمل" : "تجميد/إيقاف حساب المعمل"}
                              >
                                {isSuspended ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>تفعيل</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>إيقاف</span>
                                  </>
                                )}
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
      )}

      {/* TAB 2: MANUAL SUBSCRIPTION ACTIVATION PANEL */}
      {activeTab === 'subscriptions' && (
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-3 bg-slate-900 text-amber-400 rounded-2xl">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 font-['Tajawal',sans-serif]">
                تفعيل أو تمديد اشتراك العيادة يدويًا
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ابحث بالكود المرجعي الثابت (REF-XXXXXX) للعيادة وحدد الباقة لتأكيد التفعيل
              </p>
            </div>
          </div>

          <form onSubmit={handleActivateSubscription} className="space-y-6">
            
            {/* Step 1: Find Clinic by Reference Code or Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                1. ابحث عن العيادة (الكود المرجعي REF-XXXXXX أو الاسم أو الهاتف):
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <input
                  type="text"
                  value={searchRefCodeInput}
                  onChange={(e) => handleFindClinicByRefCode(e.target.value)}
                  placeholder="مثال: REF-A1B2C3 أو اسم الطبيب..."
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Selected Clinic Preview Card */}
            {selectedDoctorForSub ? (
              <div className={`p-4 rounded-2xl border ${
                selectedDoctorForSub.isActive === false
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-sky-50/80 border-sky-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-500 font-bold block">العيادة المحددة:</span>
                    <span className="text-base font-black text-slate-900 font-['Tajawal',sans-serif]">
                      {selectedDoctorForSub.clinicName} - {selectedDoctorForSub.name}
                    </span>
                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                      <span>الكود: <strong className="font-mono text-amber-700">{selectedDoctorForSub.referenceCode || generateReferenceCode(selectedDoctorForSub.uid)}</strong></span>
                      <span>•</span>
                      <span>الهاتف: {selectedDoctorForSub.phone || 'غير محدد'}</span>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selectedDoctorForSub.isActive === false
                      ? 'bg-rose-200 text-rose-900'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {selectedDoctorForSub.isActive === false ? 'معطل' : 'نشط'}
                  </span>
                </div>
              </div>
            ) : searchRefCodeInput.trim() ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>لم يتم العثور على عيادة بهذا الكود المرجعي أو الاسم. يرجى التأكد من إدخال كود صحبح.</span>
              </div>
            ) : null}

            {/* Step 2: Choose Official Plan (Fixed Server Prices) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                2. اختر باقة الاشتراك الرسمية (الأسعار ثابتة ومعتمدة من النظام):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Monthly Plan Option */}
                <div
                  onClick={() => setSelectedPlan('monthly')}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    selectedPlan === 'monthly'
                      ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-slate-900">الباقة الشهرية (Monthly)</span>
                    <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md font-bold">30 يوماً</span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-['Tajawal',sans-serif]">
                    {OFFICIAL_SUBSCRIPTION_PRICES.monthly} <span className="text-xs font-bold text-slate-500">EGP</span>
                  </div>
                </div>

                {/* Yearly Plan Option */}
                <div
                  onClick={() => setSelectedPlan('yearly')}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    selectedPlan === 'yearly'
                      ? 'bg-slate-900 text-white border-sky-400 ring-2 ring-sky-400/30'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-amber-400">الباقة السنوية (Yearly)</span>
                    <span className="text-xs bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md font-bold">12 شهراً</span>
                  </div>
                  <div className="text-2xl font-black text-white font-['Tajawal',sans-serif]">
                    {OFFICIAL_SUBSCRIPTION_PRICES.yearly} <span className="text-xs font-bold text-slate-400">EGP</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Step 3: Activation Type (New vs Extension) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">هل تريد تمديد اشتراك نشط؟</span>
                <span className="text-[11px] text-slate-500">عند التمديد، يتم إضافة الفترة الجديدة فوق تاريخ الانتهاء الحالي مباشرة</span>
              </div>

              <input
                type="checkbox"
                checked={isExtension}
                onChange={(e) => setIsExtension(e.target.checked)}
                className="w-5 h-5 text-sky-600 rounded-md focus:ring-sky-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات العملية (اختياري):</label>
              <input
                type="text"
                value={subNotes}
                onChange={(e) => setSubNotes(e.target.value)}
                placeholder="مثال: تم الاستلام كاش / تحويل فودافون كاش..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
              />
            </div>

            {/* Error Banner if any */}
            {subErrorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{subErrorMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmittingSub || !selectedDoctorForSub || selectedDoctorForSub.isActive === false}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black text-xs sm:text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>{isExtension ? 'تأكيد تمديد الاشتراك' : 'تأكيد تفعيل الاشتراك الآن'}</span>
              </button>

              {selectedDoctorForSub && selectedDoctorForSub.subscriptionStatus === 'active' && (
                <button
                  type="button"
                  onClick={() => handleCancelSubscription(selectedDoctorForSub.uid, selectedDoctorForSub.name)}
                  className="px-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-2xl transition border border-rose-200"
                >
                  إلغاء الاشتراك
                </button>
              )}
            </div>

          </form>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTION LOGS HISTORY */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base font-['Tajawal',sans-serif]">
                سجل عمليات التفعيل والتمديد في Firestore
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                سجل موثق لجميع تفعيلات الاشتراك المسجلة برقم المرجع والباقة والمبلغ والتاريخ
              </p>
            </div>
          </div>

          {subscriptionLogs.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">لا يوجد عمليات تفعيل مسجلة في السجل حتى الآن</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-extrabold uppercase">
                    <th className="py-3 px-4">تاريخ العملية</th>
                    <th className="py-3 px-4">العيادة والطبيب</th>
                    <th className="py-3 px-4">الكود المرجعي</th>
                    <th className="py-3 px-4">الباقة والمبلغ</th>
                    <th className="py-3 px-4">تاريخ الانتهاء</th>
                    <th className="py-3 px-4">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptionLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {new Date(log.activatedAt).toLocaleString('ar-EG')}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        <span className="block">{log.clinicName}</span>
                        <span className="text-[11px] text-slate-500 font-normal">{log.doctorName}</span>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-amber-700">
                        {log.referenceCode}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {log.plan === 'yearly' ? 'سنوية (Yearly)' : 'شهرية (Monthly)'} - <span className="text-emerald-700 font-black">{log.amount} EGP</span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {new Date(log.expiresAt).toLocaleDateString('ar-EG')}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          log.action === 'extend' ? 'bg-sky-100 text-sky-800' :
                          log.action === 'cancel' ? 'bg-rose-100 text-rose-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {log.action === 'extend' ? 'تمديد' : log.action === 'cancel' ? 'إلغاء' : 'تفعيل جديد'}
                        </span>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LAB DETAILS MODAL */}
      {selectedLabForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-teal-700 rounded-2xl border border-teal-200">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 font-['Tajawal',sans-serif]">
                    {selectedLabForDetails.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تفاصيل حساب المعمل وسجل التراخيص والخدمات
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLabForDetails(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Account Status Alert */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              selectedLabForDetails.isActive === false
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center gap-2">
                {selectedLabForDetails.isActive === false ? (
                  <Lock className="w-5 h-5 text-amber-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                )}
                <span className="text-xs font-bold">
                  حالة الحساب: {selectedLabForDetails.isActive === false ? 'موقوف / معطل مؤقتاً' : 'نشط ومعتمد'}
                </span>
              </div>

              <button
                onClick={() => handleToggleLabStatus(selectedLabForDetails.uid, selectedLabForDetails.isActive)}
                disabled={processingLabId === selectedLabForDetails.uid}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedLabForDetails.isActive === false
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                }`}
              >
                {selectedLabForDetails.isActive === false ? 'تفعيل الحساب الآن' : 'تعليق الحساب مؤقتاً'}
              </button>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">الاسم والمسؤول</span>
                <span className="font-bold text-slate-900 block">{selectedLabForDetails.name}</span>
                <span className="text-slate-600 block mt-0.5">المسؤول: {selectedLabForDetails.responsibleName || 'غير محدد'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">معلومات الاتصال</span>
                <span className="font-mono font-bold text-slate-900 block">{selectedLabForDetails.phone || 'غير مسجل'}</span>
                <span className="text-slate-600 block text-[11px] mt-0.5">{selectedLabForDetails.email || 'بدون بريد'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">العنوان والموقع</span>
                <span className="font-bold text-slate-900 block">{selectedLabForDetails.governorate || 'القاهرة'} - {selectedLabForDetails.district || 'وسط البلد'}</span>
                <span className="text-slate-600 block mt-0.5">{selectedLabForDetails.address}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">الإحصائيات والسجلات</span>
                <div className="flex items-center gap-3 font-bold text-slate-800 mt-1">
                  <span>👥 موظفين: {selectedLabForDetails.staffCount || 1}</span>
                  <span>•</span>
                  <span>🧪 طلبات: {selectedLabForDetails.orderCount || 0}</span>
                </div>
              </div>

            </div>

            {/* Services & Home Collection */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <span className="font-bold text-slate-800 block">خدمة سحب العينات بالمنزل:</span>
              <p className="text-slate-600">
                {selectedLabForDetails.offersHomeCollection ? (
                  <span className="text-emerald-700 font-bold">متوفرة (رسوم: {selectedLabForDetails.homeCollectionFee || 0} ج) - {selectedLabForDetails.homeCollectionNotes || ''}</span>
                ) : (
                  <span className="text-slate-500">غير متوفرة</span>
                )}
              </p>

              {selectedLabForDetails.services && selectedLabForDetails.services.length > 0 && (
                <div className="pt-2">
                  <span className="font-bold text-slate-800 block mb-1.5">الخدمات والتحاليل المتاحة:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLabForDetails.services.map((srv, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-white text-teal-800 rounded-lg border border-teal-100 font-bold text-[11px]">
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-mono text-[11px]">UID: {selectedLabForDetails.uid}</span>
              <button
                onClick={() => setSelectedLabForDetails(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
              >
                إغلاق النافذة
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
