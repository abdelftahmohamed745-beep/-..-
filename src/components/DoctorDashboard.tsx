import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Volume2,
  QrCode,
  Plus,
  Search,
  Filter,
  Sparkles,
  AlertTriangle,
  Phone,
  ArrowLeftRight,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Zap,
  Star,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { CustomWebsiteSection } from './CustomWebsiteSection';
import { DoctorProfile, PatientRecord, PatientStatus, DoctorRating, FollowUpAppointment, ClinicMember } from '../types';
import {
  subscribeToDoctorQueue,
  callNextPatient,
  updatePatientStatus,
  bookPatient,
  getDoctorRatings,
  getUserClinicMember
} from '../services/firebaseService';
import { playTurnNotificationSound, speakText } from '../utils/audio';
import { DoctorFollowUpManager } from './DoctorFollowUpManager';
import { CreateFollowUpModal } from './CreateFollowUpModal';
import { ClinicTeamManager } from './ClinicTeamManager';
import { ClinicFinanceManager } from './ClinicFinanceManager';
import { hasPermission } from '../utils/permissions';
import { auth } from '../firebase/config';

interface DoctorDashboardProps {
  doctor: DoctorProfile;
  onOpenQRModal: () => void;
  onOpenScannerModal: () => void;
  onOpenSettingsModal: () => void;
  onNavigateSubscription: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctor,
  onOpenQRModal,
  onOpenScannerModal,
  onOpenSettingsModal,
  onNavigateSubscription,
  onShowToast
}) => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | PatientStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCallingNext, setIsCallingNext] = useState(false);

  // Dashboard section mode: 'queue', 'followups', 'team', or 'finance'
  const [activeSection, setActiveSection] = useState<'queue' | 'followups' | 'team' | 'finance'>('queue');
  const [selectedPatientForPayment, setSelectedPatientForPayment] = useState<PatientRecord | null>(null);

  // Clinic Member & Permissions State
  const [currentMember, setCurrentMember] = useState<ClinicMember | null>(null);
  const [isDoctorOwnerFallback, setIsDoctorOwnerFallback] = useState(false);

  useEffect(() => {
    async function loadMemberInfo() {
      if (auth.currentUser) {
        const { member, isPrimaryOwner } = await getUserClinicMember(auth.currentUser);
        setCurrentMember(member);
        setIsDoctorOwnerFallback(isPrimaryOwner);
      } else {
        // Fallback for single-doctor clinic viewing
        setIsDoctorOwnerFallback(true);
      }
    }
    loadMemberInfo();
  }, [doctor.uid]);

  // Quick follow-up modal for queue patient
  const [quickFollowUpPatient, setQuickFollowUpPatient] = useState<{ name: string; phone: string } | null>(null);

  // Manual Walk-In Registration Modal state
  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Ratings & Reviews state for Doctor
  const [doctorRatings, setDoctorRatings] = useState<DoctorRating[]>([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  // Load Doctor Ratings
  useEffect(() => {
    async function loadRatings() {
      const rList = await getDoctorRatings(doctor.uid);
      setDoctorRatings(rList);
    }
    loadRatings();
  }, [doctor.uid]);

  // Real-time Firestore Queue Subscription
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToDoctorQueue(doctor.uid, (data) => {
      setPatients(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [doctor.uid]);

  // Derived Statistics
  const waitingPatients = patients.filter(p => p.status === 'waiting');
  const calledPatient = patients.find(p => p.status === 'called');
  const donePatients = patients.filter(p => p.status === 'done');
  const cancelledPatients = patients.filter(p => p.status === 'cancelled');

  // Filtered Queue
  const displayedPatients = patients.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.phone.includes(term) ||
        p.sequenceNumber.toString() === term
      );
    }
    return true;
  });

  // Call Next Patient
  const handleCallNext = async () => {
    if (waitingPatients.length === 0 && !calledPatient) {
      onShowToast("لا يوجد مرضى في الانتظار", "الطابور فارغ حالياً", "info");
      return;
    }

    setIsCallingNext(true);
    try {
      const { calledPatient: nextP } = await callNextPatient(doctor.uid);
      playTurnNotificationSound('turn');

      if (nextP) {
        speakText(`مريض رقم ${nextP.sequenceNumber}، ${nextP.name}، تفضل بالدخول للطبيب`);
        onShowToast(
          `تم استدعاء المريض رقم #${nextP.sequenceNumber}`,
          `${nextP.name} - ${nextP.phone}`,
          "success"
        );
      } else {
        onShowToast("تم إكمال جميع الكشوفات اليوم!", "لا يوجد مرضى آخرون في الانتظار", "success");
      }
    } catch (err) {
      console.error("Error calling next patient:", err);
      onShowToast("خطأ في الاستدعاء", "تعذر تحديث حالة المريض", "error");
    } finally {
      setIsCallingNext(false);
    }
  };

  // Action: Single Patient Status Change
  const handleStatusChange = async (patient: PatientRecord, newStatus: PatientStatus) => {
    try {
      await updatePatientStatus(doctor.uid, patient.id, newStatus);
      if (newStatus === 'called') {
        playTurnNotificationSound('turn');
        speakText(`مريض رقم ${patient.sequenceNumber}، ${patient.name}`);
        onShowToast(`تم استدعاء ${patient.name}`, `دور رقم #${patient.sequenceNumber}`, "info");
      } else if (newStatus === 'done') {
        playTurnNotificationSound('success');
        onShowToast(`تم إنهاء كشف ${patient.name}`, "تم تحديث وقت الكشف المتوسط", "success");
      } else if (newStatus === 'cancelled') {
        onShowToast(`تم إلغاء حجز ${patient.name}`, "تمت إزالته من الطابور النشط", "warning");
      }
    } catch (err) {
      console.error("Status update error:", err);
      onShowToast("خطأ في التحديث", "تعذر تغيير حالة الحجز", "error");
    }
  };

  // Action: Walk-In Manual Patient Add
  const handleManualAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPhone.trim()) return;

    setIsSubmittingManual(true);
    try {
      const res = await bookPatient(doctor.uid, manualName.trim(), manualPhone.trim());
      setIsSubmittingManual(false);
      setIsManualAddOpen(false);
      setManualName('');
      setManualPhone('');

      if (res.isExisting) {
        onShowToast("لديه حجز نشط بالفعل", `المريض مسجل برقم دور #${res.sequenceNumber}`, "warning");
      } else {
        playTurnNotificationSound('success');
        onShowToast("تم إضافة المريض بنجاح", `تم تخصيص رقم الدور #${res.sequenceNumber}`, "success");
      }
    } catch (err: unknown) {
      setIsSubmittingManual(false);
      const errMsg = err instanceof Error ? err.message : "تعذر إضافة المريض";
      onShowToast("خطأ في إضافة المريض", errMsg, "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Expired / Trial Warning Banner */}
      {doctor.subscriptionStatus === 'expired' && (
        <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm font-['Tajawal',sans-serif]">
                اشتراك العيادة متوقف حالياً!
              </div>
              <p className="text-xs text-rose-700">
                لا يمكن للمرضى الجدد حجز أدوار جديدة عبر QR Code حتى يتم تجديد الاشتراك. المرضى الحاليون يستطيعون متابعة دورهم.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateSubscription}
            className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
          >
            تجديد الاشتراك الآن
          </button>
        </div>
      )}

      {/* Header Info & Hero Controls */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-sky-400/10 via-teal-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          {/* Clinic & Doctor Details */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200/50">
                {doctor.specialty}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                • {doctor.clinicName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-['Tajawal',sans-serif] tracking-tight">
              {doctor.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-3">
              <span>ساعات العمل: {doctor.workHours.open} - {doctor.workHours.close}</span>
              <span>•</span>
              <span>الحد اليومي: {doctor.workHours.maxPatientsPerDay} مريض</span>
            </p>
          </div>

          {/* Call Next Patient Big Action Box */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-gradient-to-b from-slate-900 to-slate-800 p-4 sm:p-5 rounded-2xl text-white shadow-lg border border-slate-700 w-full md:w-auto">
            <div className="text-center sm:text-right flex-1 min-w-[160px]">
              <div className="text-[11px] text-slate-400 font-semibold">المريض الحالي داخل العيادة:</div>
              <div className="text-lg font-black text-amber-400 font-['Tajawal',sans-serif] truncate max-w-[200px]">
                {calledPatient ? `#${calledPatient.sequenceNumber} - ${calledPatient.name}` : 'لا يوجد مريض حالياً'}
              </div>
              <div className="text-[10px] text-slate-400">
                المتبقي في الانتظار: {waitingPatients.length} مريض
              </div>
            </div>

            <button
              onClick={handleCallNext}
              disabled={isCallingNext || (waitingPatients.length === 0 && !calledPatient)}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-black text-sm transition shadow-md flex items-center justify-center gap-2 shrink-0 ${
                waitingPatients.length > 0 || calledPatient
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-slate-950 scale-100 hover:scale-105 active:scale-95'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>{isCallingNext ? 'جاري الاستدعاء...' : 'استدعاء التالي 📢'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Stats Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        
        {/* Waiting */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-bold">في الانتظار</div>
            <div className="text-2xl font-black text-sky-600 font-['Tajawal',sans-serif] mt-1">
              {waitingPatients.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">جاهزون للدخول</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Called */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-bold">في الكشف الآن</div>
            <div className="text-2xl font-black text-amber-500 font-['Tajawal',sans-serif] mt-1">
              {calledPatient ? `#${calledPatient.sequenceNumber}` : '0'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">داخل الغرفة</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Done */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-bold">تم الكشف اليوم</div>
            <div className="text-2xl font-black text-emerald-600 font-['Tajawal',sans-serif] mt-1">
              {donePatients.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">حالات مكتملة</div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Avg Consult Time (Live Auto Calculated) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-bold">متوسط وقت الكشف</div>
            <div className="text-2xl font-black text-slate-900 font-['Tajawal',sans-serif] mt-1">
              {doctor.avgConsultTime} دقيقة
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              محسوبة تلقائياً من الكشوفات
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Doctor Rating Card */}
        <button
          onClick={() => setShowReviewsModal(true)}
          className="bg-gradient-to-br from-amber-50 to-orange-50/70 p-5 rounded-2xl border border-amber-200/90 shadow-xs flex items-center justify-between hover:border-amber-400 transition text-right group cursor-pointer"
        >
          <div>
            <div className="text-xs text-amber-900 font-bold flex items-center gap-1">
              <span>تقييم العيادة</span>
              <span className="text-[10px] text-amber-700 underline group-hover:text-amber-900">(عرض)</span>
            </div>
            <div className="text-2xl font-black text-amber-950 font-['Tajawal',sans-serif] mt-1 flex items-center gap-1 dir-ltr">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>{doctor.ratingAverage ? doctor.ratingAverage : "0.0"}</span>
            </div>
            <div className="text-[10px] text-amber-800 font-medium mt-0.5">
              {doctorRatings.length} تقييم مريض
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
            <Star className="w-5 h-5 fill-current" />
          </div>
        </button>

      </div>

      {/* Section Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-200/60 p-1.5 rounded-2xl max-w-2xl overflow-x-auto">
        <button
          onClick={() => setActiveSection('queue')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSection === 'queue'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-sky-600" />
          <span>طابور اليوم ({patients.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('followups')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSection === 'followups'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-sky-600" />
          <span>إعادة الكشف 📅</span>
        </button>

        <button
          onClick={() => setActiveSection('team')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSection === 'team'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-purple-600" />
          <span>فريق العمل 👥</span>
        </button>

        {hasPermission(currentMember, 'VIEW_FINANCE', isDoctorOwnerFallback) && (
          <button
            onClick={() => setActiveSection('finance')}
            className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSection === 'finance'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>المالية 💵</span>
          </button>
        )}
      </div>

      {activeSection === 'finance' ? (
        <ClinicFinanceManager
          currentMember={currentMember}
          organizationId={doctor.uid}
          isDoctorOwnerFallback={isDoctorOwnerFallback}
          doctor={doctor}
          patientsList={patients}
          initialPatientForPayment={selectedPatientForPayment}
          onShowToast={onShowToast}
        />
      ) : activeSection === 'team' ? (
        <ClinicTeamManager
          currentMember={currentMember}
          organizationId={doctor.uid}
          isDoctorOwnerFallback={isDoctorOwnerFallback}
          onShowToast={onShowToast}
        />
      ) : activeSection === 'followups' ? (
        <DoctorFollowUpManager
          doctorId={doctor.uid}
          doctorName={doctor.name}
          clinicId={doctor.uid}
          clinicName={doctor.clinicName}
          onShowToast={onShowToast}
        />
      ) : (
        /* Main Queue Management Section */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              الكل ({patients.length})
            </button>
            <button
              onClick={() => setFilterStatus('waiting')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                filterStatus === 'waiting'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              في الانتظار ({waitingPatients.length})
            </button>
            <button
              onClick={() => setFilterStatus('called')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                filterStatus === 'called'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              في الكشف ({calledPatient ? 1 : 0})
            </button>
            <button
              onClick={() => setFilterStatus('done')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                filterStatus === 'done'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              مكتمل ({donePatients.length})
            </button>
            <button
              onClick={() => setFilterStatus('cancelled')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                filterStatus === 'cancelled'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              ملغي ({cancelledPatients.length})
            </button>
          </div>

          {/* Action Tools & Search */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث بالموبايل أو الاسم أو الدور..."
                className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Quick Scanner */}
            <button
              onClick={onOpenScannerModal}
              className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl transition shadow-2xs"
              title="ماسح الكاميرا للتذاكر"
            >
              <QrCode className="w-4 h-4 text-sky-600" />
            </button>

            {/* Add Walk-In Patient */}
            <button
              onClick={() => setIsManualAddOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مريض</span>
            </button>
          </div>

        </div>

        {/* Patients Queue List */}
        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : displayedPatients.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-base font-['Tajawal',sans-serif]">
                لا يوجد مرضي في القائمة حالياً
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                اطبع رمز QR وششاركه مع المرضى للحجز التلقائي، أو اضغط "إضافة مريض" لتسجيل حجز يدوي.
              </p>
              <button
                onClick={onOpenQRModal}
                className="mt-4 px-4 py-2 bg-slate-900 text-white font-semibold text-xs rounded-xl hover:bg-slate-800 transition"
              >
                عرض رمز QR للطباعة
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {displayedPatients.map((patient) => {
                  const isCalled = patient.status === 'called';
                  const isWaiting = patient.status === 'waiting';
                  const isDone = patient.status === 'done';
                  const isCancelled = patient.status === 'cancelled';

                  return (
                    <motion.div
                      key={patient.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isCalled
                          ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20 shadow-sm'
                          : isWaiting
                          ? 'bg-white border-slate-200/90 hover:border-sky-300 shadow-2xs'
                          : isDone
                          ? 'bg-slate-50/80 border-slate-200 opacity-80'
                          : 'bg-rose-50/30 border-rose-200/60 opacity-60'
                      }`}
                    >
                      {/* Left side info */}
                      <div className="flex items-center gap-3">
                        
                        {/* Sequence Badge */}
                        <div className={`w-12 h-12 rounded-2xl font-black text-lg flex items-center justify-center shrink-0 shadow-2xs font-['Tajawal',sans-serif] ${
                          isCalled ? 'bg-amber-500 text-slate-950 animate-pulse' :
                          isWaiting ? 'bg-sky-600 text-white' :
                          isDone ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600'
                        }`}>
                          #{patient.sequenceNumber}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base font-['Tajawal',sans-serif]">
                              {patient.name}
                            </h4>

                            {/* Status Badge */}
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                              isCalled ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                              isWaiting ? 'bg-sky-100 text-sky-800' :
                              isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isCalled ? '🔔 داخل الكشف الآن' :
                               isWaiting ? 'في الانتظار' :
                               isDone ? 'تم الكشف' : 'ملغي'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1 font-mono dir-ltr">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {patient.phone}
                            </span>
                            <span>•</span>
                            <span>
                              وقت الحجز: {new Date(patient.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Right side actions */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-0 pt-2 sm:pt-0 border-slate-100">
                        {isWaiting && (
                          <button
                            onClick={() => handleStatusChange(patient, 'called')}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition shadow-2xs flex items-center gap-1"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>استدعاء</span>
                          </button>
                        )}

                        {(isWaiting || isCalled) && (
                          <button
                            onClick={() => handleStatusChange(patient, 'done')}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-2xs flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تم الكشف</span>
                          </button>
                        )}

                        {(isWaiting || isCalled) && (
                          <button
                            onClick={() => handleStatusChange(patient, 'cancelled')}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                            title="إلغاء حجز المريض"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {(isDone || isCancelled) && (
                          <button
                            onClick={() => handleStatusChange(patient, 'waiting')}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                          >
                            إعادة للطابور
                          </button>
                        )}

                        {/* Quick Follow Up Appointment Registration */}
                        <button
                          onClick={() => setQuickFollowUpPatient({ name: patient.name, phone: patient.phone })}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                          title="حجز موعد إعادة كشف للمريض"
                        >
                          <Calendar className="w-3.5 h-3.5 text-sky-600" />
                          <span>إعادة كشف</span>
                        </button>

                        {/* Quick Payment Registration */}
                        {hasPermission(currentMember, 'VIEW_FINANCE', isDoctorOwnerFallback) && (
                          <button
                            onClick={() => {
                              setSelectedPatientForPayment(patient);
                              setActiveSection('finance');
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                            title="تسجيل دفع رسوم الكشف"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            <span>الدفع 💵</span>
                          </button>
                        )}
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

      </div>
      )}

      {/* Custom Website Agency Section */}
      <CustomWebsiteSection />

      {/* Manual Walk-In Patient Registration Modal */}
      {isManualAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-lg font-['Tajawal',sans-serif]">
                إضافة حجز مريض يدوي
              </h3>
              <button
                onClick={() => setIsManualAddOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                إلغاء
              </button>
            </div>

            <form onSubmit={handleManualAddPatient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المريض بالكامل</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="مثال: أحمد محمد علي"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الموبايل</label>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  placeholder="01012345678"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition shadow-xs"
                >
                  {isSubmittingManual ? 'جاري الإضافة...' : 'تأكيد الحجز وإصدار الرقم'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Doctor Patient Reviews & Ratings Modal */}
      {showReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-right animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base font-['Tajawal',sans-serif]">
                    تقييمات وآراء المرضى
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    التقييم العام: {doctor.ratingAverage || "0.0"} / 5 (إجمالي {doctorRatings.length} تقييم)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-3 py-1 bg-slate-100 rounded-lg"
              >
                إغلاق
              </button>
            </div>

            {/* Ratings List */}
            {doctorRatings.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">لا يوجد تقييمات حتى الآن من المرضى</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pl-1">
                {doctorRatings.map((rev) => (
                  <div key={rev.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs font-['Tajawal',sans-serif]">
                        {rev.patientName || "مريض"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('ar-EG') : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 dir-ltr">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>

                    {rev.comment && (
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100 font-medium">
                        "{rev.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-3 border-t border-slate-100 text-left">
              <button
                onClick={() => setShowReviewsModal(false)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Quick Follow-up Modal for patient from queue */}
      {quickFollowUpPatient && (
        <CreateFollowUpModal
          isOpen={!!quickFollowUpPatient}
          onClose={() => setQuickFollowUpPatient(null)}
          doctorId={doctor.uid}
          doctorName={doctor.name}
          clinicId={doctor.uid}
          clinicName={doctor.clinicName}
          initialPatientName={quickFollowUpPatient.name}
          initialPatientPhone={quickFollowUpPatient.phone}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};
