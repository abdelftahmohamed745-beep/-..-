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
  DollarSign,
  Monitor,
  Stethoscope,
  UserX
} from 'lucide-react';
import { CustomWebsiteSection } from './CustomWebsiteSection';
import { TVQueueDisplay } from './TVQueueDisplay';
import { DoctorProfile, PatientRecord, PatientStatus, DoctorRating, FollowUpAppointment, ClinicMember, DailySession } from '../types';
import {
  subscribeToDoctorQueue,
  callNextPatient,
  updatePatientStatus,
  bookPatient,
  getDoctorRatings,
  recalculateDoctorRatingStats,
  getUserClinicMember,
  markQueuePatientNoShow,
  getTodayDateString
} from '../services/firebaseService';
import { playTurnNotificationSound, speakText } from '../utils/audio';
import { DoctorFollowUpManager } from './DoctorFollowUpManager';
import { CreateFollowUpModal } from './CreateFollowUpModal';
import { ClinicTeamManager } from './ClinicTeamManager';
import { ClinicFinanceManager } from './ClinicFinanceManager';
import { DoctorConsultationModal } from './DoctorConsultationModal';
import { DailySessionManager } from './DailySessionManager';
import { FastPatientRegistrationModal } from './FastPatientRegistrationModal';
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

  // TV Queue Fullscreen Display state
  const [showTVQueue, setShowTVQueue] = useState(false);

  // Quick follow-up modal for queue patient
  const [quickFollowUpPatient, setQuickFollowUpPatient] = useState<{ name: string; phone: string } | null>(null);

  // Doctor Consultation Modal state
  const [selectedPatientForConsultation, setSelectedPatientForConsultation] = useState<PatientRecord | null>(null);

  // Fast Patient Registration & Split Payment Modal state
  const [isFastRegistrationOpen, setIsFastRegistrationOpen] = useState(false);

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
      if (rList.length > 0) {
        const calculatedAvg = parseFloat((rList.reduce((acc, r) => acc + (Number(r.stars) || 0), 0) / rList.length).toFixed(1));
        if (doctor.ratingAverage !== calculatedAvg || doctor.ratingCount !== rList.length) {
          recalculateDoctorRatingStats(doctor.uid).catch(console.error);
        }
      }
    }
    loadRatings();
  }, [doctor.uid]);

  // Dynamic Rating Average Calculation
  const activeRatingAvg = doctorRatings.length > 0
    ? (doctorRatings.reduce((acc, r) => acc + (Number(r.stars) || 0), 0) / doctorRatings.length).toFixed(1)
    : (doctor.ratingAverage ? Number(doctor.ratingAverage).toFixed(1) : "0.0");
  const activeRatingCount = doctorRatings.length > 0 ? doctorRatings.length : (doctor.ratingCount || 0);

  // Active Daily Session Context
  const [activeDailySession, setActiveDailySession] = useState<DailySession | null>(null);

  // Real-time Firestore Queue Subscription (strictly scoped to active session date)
  useEffect(() => {
    setLoading(true);
    const sessionDate = activeDailySession?.date || getTodayDateString();
    const unsubscribe = subscribeToDoctorQueue(doctor.uid, sessionDate, (data) => {
      setPatients(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [doctor.uid, activeDailySession?.date]);

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
    if (activeDailySession?.status === 'completed') {
      onShowToast("يوم العمل مكتمل", "تم إنهاء وتوثيق هذا اليوم، لبدء طابور جديد يرجى بدء يوم عمل جديد.", "warning");
      return;
    }

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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">

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
            className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
          >
            تجديد الاشتراك الآن
          </button>
        </div>
      )}

      {/* Header Info & Hero Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-sky-400/10 via-teal-400/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6 relative z-10">
          
          {/* Clinic & Doctor Details */}
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200/50">
                {doctor.specialty}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                • {doctor.clinicName}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 font-['Tajawal',sans-serif] tracking-tight">
              {doctor.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
              <span>ساعات العمل: {doctor.workHours.open} - {doctor.workHours.close}</span>
              <span>•</span>
              <span>الحد اليومي: {doctor.workHours.maxPatientsPerDay} مريض</span>
            </p>
          </div>

          {/* Call Next Patient Big Action Box */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900 p-3.5 sm:p-5 rounded-2xl text-white shadow-md border border-slate-800 w-full lg:w-auto">
            <div className="text-right flex-1 min-w-[150px]">
              <div className="text-[11px] text-slate-400 font-semibold">المريض الحالي داخل العيادة:</div>
              <div className="text-base sm:text-lg font-black text-violet-300 font-['Tajawal',sans-serif] truncate max-w-[220px]">
                {calledPatient ? `#${calledPatient.sequenceNumber} - ${calledPatient.name}` : 'لا يوجد مريض حالياً'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                المتبقي في الانتظار: <span className="text-[#F59E0B] font-bold">{waitingPatients.length}</span> مريض
              </div>
            </div>

            <button
              onClick={handleCallNext}
              disabled={isCallingNext || (waitingPatients.length === 0 && !calledPatient)}
              className={`w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl font-black text-xs sm:text-sm transition shadow-sm flex items-center justify-center gap-2 shrink-0 min-h-[44px] cursor-pointer ${
                waitingPatients.length > 0 || calledPatient
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
              <span>{isCallingNext ? 'جاري الاستدعاء...' : 'استدعاء التالي'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Semantic Stats Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        
        {/* Total Registered Patients (Indigo #6366F1: patients, visits, primary operational statistics) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-bold">إجمالي الحالات اليوم</div>
            <div className="text-xl sm:text-2xl font-black text-[#6366F1] font-['Tajawal',sans-serif] mt-0.5 sm:mt-1">
              {patients.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">حالة مسجلة</div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-[#6366F1] border border-indigo-100 flex items-center justify-center font-bold shrink-0">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#6366F1]" />
          </div>
        </div>

        {/* Waiting (Orange #F59E0B: pending actions, attention-required states) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-bold">في الانتظار</div>
            <div className="text-xl sm:text-2xl font-black text-[#F59E0B] font-['Tajawal',sans-serif] mt-0.5 sm:mt-1">
              {waitingPatients.length}
            </div>
            <div className="text-[10px] text-amber-600 mt-0.5 font-medium">جاهزون للدخول</div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-[#F59E0B] border border-amber-100 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#F59E0B]" />
          </div>
        </div>

        {/* In Consultation (Violet #8B5CF6: consultations, medical services, clinical activity) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-bold">في الكشف الآن</div>
            <div className="text-xl sm:text-2xl font-black text-[#8B5CF6] font-['Tajawal',sans-serif] mt-0.5 sm:mt-1">
              {calledPatient ? `#${calledPatient.sequenceNumber}` : '—'}
            </div>
            <div className="text-[10px] text-violet-600 mt-0.5 font-medium">داخل الغرفة</div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-50 text-[#8B5CF6] border border-violet-100 flex items-center justify-center font-bold shrink-0">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B5CF6]" />
          </div>
        </div>

        {/* Done / Completed (Violet #8B5CF6: consultations, medical services, clinical activity) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-bold">تم الكشف اليوم</div>
            <div className="text-xl sm:text-2xl font-black text-[#8B5CF6] font-['Tajawal',sans-serif] mt-0.5 sm:mt-1">
              {donePatients.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">كشوفات مكتملة</div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-violet-50 text-[#8B5CF6] border border-violet-100 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#8B5CF6]" />
          </div>
        </div>

        {/* Avg Consult Time (Blue #0EA5E9: informational and secondary statistics) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] sm:text-xs text-slate-500 font-bold">متوسط وقت الكشف</div>
            <div className="text-xl sm:text-2xl font-black text-[#0EA5E9] font-['Tajawal',sans-serif] mt-0.5 sm:mt-1">
              {doctor.avgConsultTime} دقيقة
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              محسوب تلقائياً
            </div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 text-[#0EA5E9] border border-sky-100 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#0EA5E9]" />
          </div>
        </div>

        {/* Doctor Rating Card (Blue #0EA5E9: informational and secondary statistics) */}
        <button
          onClick={() => setShowReviewsModal(true)}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-sky-300 transition text-right group cursor-pointer col-span-2 sm:col-span-1"
        >
          <div>
            <div className="text-[11px] sm:text-xs text-slate-600 font-bold flex items-center gap-1">
              <span>تقييم العيادة</span>
              <span className="text-[10px] text-sky-600 underline group-hover:text-sky-800">(عرض)</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[#0EA5E9] font-['Tajawal',sans-serif] mt-0.5 sm:mt-1 flex items-center gap-1 dir-ltr">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
              <span>{activeRatingAvg}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              {activeRatingCount} تقييم
            </div>
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-50 text-[#0EA5E9] border border-sky-100 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
          </div>
        </button>

      </div>

      {/* Section Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100/90 p-1.5 rounded-2xl w-full sm:max-w-2xl overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSection('queue')}
          className={`flex-1 min-w-[95px] sm:min-w-[110px] py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] whitespace-nowrap ${
            activeSection === 'queue'
              ? 'bg-[#122c4a] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />
          <span>طابور اليوم ({patients.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('followups')}
          className={`flex-1 min-w-[95px] sm:min-w-[110px] py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] whitespace-nowrap ${
            activeSection === 'followups'
              ? 'bg-[#122c4a] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />
          <span>إعادة الكشف</span>
        </button>

        <button
          onClick={() => setActiveSection('team')}
          className={`flex-1 min-w-[95px] sm:min-w-[110px] py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] whitespace-nowrap ${
            activeSection === 'team'
              ? 'bg-[#122c4a] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-300" />
          <span>فريق العمل</span>
        </button>

        {hasPermission(currentMember, 'VIEW_FINANCE', isDoctorOwnerFallback) && (
          <button
            onClick={() => setActiveSection('finance')}
            className={`flex-1 min-w-[95px] sm:min-w-[110px] py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] whitespace-nowrap ${
              activeSection === 'finance'
                ? 'bg-[#122c4a] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            <span>المالية</span>
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
        <div className="space-y-6">
          {/* Section 4, 5, 6, 7: Daily Operating System & Past Days Archive */}
          <DailySessionManager
            doctorId={doctor.uid}
            doctorName={doctor.name}
            clinicName={doctor.clinicName}
            currentUserId={currentMember?.uid || doctor.uid}
            currentUserName={currentMember?.name || doctor.name}
            todayPatients={patients}
            onSessionChange={setActiveDailySession}
            onShowToast={onShowToast}
          />

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Controls Toolbar */}
          <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4">
            
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0 scrollbar-none">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer min-h-[36px] ${
                  filterStatus === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                الكل ({patients.length})
              </button>
              <button
                onClick={() => setFilterStatus('waiting')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer min-h-[36px] ${
                  filterStatus === 'waiting'
                    ? 'bg-[#F59E0B] text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                في الانتظار ({waitingPatients.length})
              </button>
              <button
                onClick={() => setFilterStatus('called')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer min-h-[36px] ${
                  filterStatus === 'called'
                    ? 'bg-[#8B5CF6] text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                في الكشف ({calledPatient ? 1 : 0})
              </button>
              <button
                onClick={() => setFilterStatus('done')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer min-h-[36px] ${
                  filterStatus === 'done'
                    ? 'bg-violet-700 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                مكتمل ({donePatients.length})
              </button>
              <button
                onClick={() => setFilterStatus('cancelled')}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer min-h-[36px] ${
                  filterStatus === 'cancelled'
                    ? 'bg-slate-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                ملغي ({cancelledPatients.length})
              </button>
            </div>

            {/* Action Tools & Search */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full xl:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-64 min-w-[140px]">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث بالموبايل أو الاسم أو الدور..."
                  className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 min-h-[38px]"
                />
              </div>

              {/* TV Queue Display */}
              <button
                onClick={() => setShowTVQueue(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#122c4a] hover:bg-[#0d223a] text-white font-bold text-xs rounded-xl transition shadow-2xs shrink-0 cursor-pointer min-h-[38px]"
                title="شاشة الانتظار للتلفزيون (TV Queue Display)"
              >
                <Monitor className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">شاشة TV</span>
              </button>

              {/* Quick Scanner */}
              <button
                onClick={onOpenScannerModal}
                className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer min-h-[38px] flex items-center justify-center shrink-0"
                title="ماسح الكاميرا للتذاكر"
              >
                <QrCode className="w-4 h-4 text-[#122c4a]" />
              </button>

              {/* Add Walk-In Patient with fast search & multi-payment */}
              <button
                onClick={() => setIsFastRegistrationOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-2xs shrink-0 cursor-pointer min-h-[38px]"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مريض</span>
              </button>
            </div>

          </div>

        {/* Patients Queue List */}
        <div className="p-3 sm:p-5 md:p-6">
          {loading ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : displayedPatients.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 text-base font-['Tajawal',sans-serif]">
                لا يوجد مرضي في القائمة حالياً
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                اطبع رمز QR وششاركه مع المرضى للحجز التلقائي، أو اضغط "إضافة مريض" لتسجيل حجز يدوي.
              </p>
              <button
                onClick={onOpenQRModal}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer min-h-[40px]"
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
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4 ${
                        isCalled
                          ? 'bg-violet-50/40 border-violet-200 ring-2 ring-violet-300/30 shadow-xs'
                          : isWaiting
                          ? 'bg-white border-slate-200/80 hover:border-amber-300 shadow-2xs'
                          : isDone
                          ? 'bg-white border-slate-200/60 opacity-85'
                          : 'bg-slate-50/80 border-slate-200 opacity-60'
                      }`}
                    >
                      {/* Left side info */}
                      <div className="flex items-center gap-3 w-full lg:w-auto">
                        
                        {/* Sequence Badge */}
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center shrink-0 shadow-2xs font-['Tajawal',sans-serif] ${
                          isCalled ? 'bg-[#8B5CF6] text-white animate-pulse' :
                          isWaiting ? 'bg-[#F59E0B] text-white' :
                          isDone ? 'bg-[#8B5CF6]/90 text-white' : 'bg-slate-400 text-white'
                        }`}>
                          #{patient.sequenceNumber}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm sm:text-base font-['Tajawal',sans-serif] truncate max-w-[200px] sm:max-w-none">
                              {patient.name}
                            </h4>

                            {/* Status Badge */}
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                              isCalled ? 'bg-violet-100 text-violet-800 border border-violet-200' :
                              isWaiting ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                              isDone ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}>
                              {isCalled ? 'داخل الكشف الآن' :
                               isWaiting ? 'في الانتظار' :
                               isDone ? 'تم الكشف' : 'ملغي'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1 flex-wrap">
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
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto justify-start lg:justify-end border-t lg:border-0 pt-2.5 lg:pt-0 border-slate-100">
                        {isWaiting && (
                          <button
                            onClick={() => handleStatusChange(patient, 'called')}
                            className="px-3 sm:px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition shadow-2xs flex items-center gap-1 min-h-[36px] active:scale-95 cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>استدعاء</span>
                          </button>
                        )}

                        {(isWaiting || isCalled) && (
                          <button
                            onClick={() => handleStatusChange(patient, 'done')}
                            className="px-3 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-2xs flex items-center gap-1 min-h-[36px] active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تم الكشف</span>
                          </button>
                        )}

                        {(isWaiting || isCalled) && (
                          <button
                            onClick={() => handleStatusChange(patient, 'cancelled')}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                            title="إلغاء حجز المريض"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {(isDone || isCancelled) && (
                          <button
                            onClick={() => handleStatusChange(patient, 'waiting')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition min-h-[36px] cursor-pointer"
                          >
                            إعادة للطابور
                          </button>
                        )}

                        {/* Doctor Consultation Workspace Modal (Section 12, 13, 14, 15) */}
                        <button
                          onClick={() => setSelectedPatientForConsultation(patient)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer min-h-[36px] active:scale-95"
                          title="بدء الكشف وحفظ السجل الطبي"
                        >
                          <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                          <span>كشف واستشارة</span>
                        </button>

                        {/* Quick Follow Up Appointment Registration */}
                        <button
                          onClick={() => setQuickFollowUpPatient({ name: patient.name, phone: patient.phone })}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer min-h-[36px] active:scale-95"
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
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer min-h-[36px] active:scale-95"
                            title="تسجيل دفع رسوم الكشف"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            <span>الدفع</span>
                          </button>
                        )}

                        {/* No-show 1-click action (Section 19) */}
                        {(isWaiting || isCalled) && (
                          <button
                            onClick={async () => {
                              try {
                                await markQueuePatientNoShow(patient.id, doctor.uid);
                                onShowToast('تم تسجيل تغيب المريض (No-show)', `تم تحويل حالة ${patient.name}`, 'info');
                              } catch (err: any) {
                                onShowToast('فشل التحديث', err?.message, 'error');
                              }
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="لم يحضر (No-show)"
                          >
                            <UserX className="w-4 h-4" />
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
                    التقييم العام: {activeRatingAvg} / 5 (إجمالي {activeRatingCount} تقييم)
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
          initialPatientId={quickFollowUpPatient.patientId || quickFollowUpPatient.id}
          onShowToast={onShowToast}
        />
      )}

      {/* Fullscreen TV Queue Display Overlay */}
      {showTVQueue && (
        <TVQueueDisplay
          clinicName={doctor.clinicName}
          doctorName={doctor.name}
          specialty={doctor.specialty}
          patients={patients}
          onClose={() => setShowTVQueue(false)}
        />
      )}

      {/* Doctor Consultation Workspace Modal (Section 12, 13, 14, 15) */}
      <DoctorConsultationModal
        isOpen={!!selectedPatientForConsultation}
        onClose={() => setSelectedPatientForConsultation(null)}
        patient={selectedPatientForConsultation}
        doctorId={doctor.uid}
        doctorName={doctor.name}
        clinicName={doctor.clinicName}
        onShowToast={onShowToast}
      />

      {/* Fast Patient Registration with Deduplication & Split Payment (Section 8, 9, 10, 11, 20, 21, 22) */}
      <FastPatientRegistrationModal
        isOpen={isFastRegistrationOpen}
        onClose={() => setIsFastRegistrationOpen(false)}
        doctorId={doctor.uid}
        doctorName={doctor.name}
        defaultConsultationPrice={doctor.consultationFee || 300}
        currentUserId={currentMember?.uid || doctor.uid}
        currentUserName={currentMember?.name || doctor.name}
        onShowToast={onShowToast}
      />

    </div>
  );
};
