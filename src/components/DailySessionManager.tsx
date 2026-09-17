import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  CreditCard,
  Archive,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  X,
  DollarSign,
  UserCheck,
  UserX,
  Play
} from 'lucide-react';
import { DailySession, PatientRecord, ClinicTransaction } from '../types';
import {
  getTodayDateString,
  subscribeToTodayDailySession,
  startNewDaySession,
  completeDaySession,
  getArchivedDays,
  getArchivedDayDetails
} from '../services/firebaseService';

interface DailySessionManagerProps {
  doctorId: string;
  doctorName?: string;
  clinicName?: string;
  currentUserId?: string;
  currentUserName?: string;
  todayPatients?: PatientRecord[];
  onShowToast?: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DailySessionManager: React.FC<DailySessionManagerProps> = ({
  doctorId,
  doctorName = 'دكتور العيادة',
  clinicName = 'العيادة',
  currentUserId,
  currentUserName,
  todayPatients = [],
  onShowToast
}) => {
  const today = getTodayDateString();
  const [session, setSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);

  // Complete Day Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Archive View State
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archivedDays, setArchivedDays] = useState<DailySession[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [selectedArchivedDay, setSelectedArchivedDay] = useState<{
    session: DailySession | null;
    patients: PatientRecord[];
    transactions: ClinicTransaction[];
  } | null>(null);
  const [loadingArchivedDetails, setLoadingArchivedDetails] = useState(false);

  // Subscribe to today's session
  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    const unsubscribe = subscribeToTodayDailySession(doctorId, today, (sess) => {
      setSession(sess);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [doctorId, today]);

  // Handle Start New Day
  const handleStartDay = async () => {
    try {
      const newSess = await startNewDaySession(doctorId, today);
      setSession(newSess);
      if (onShowToast) {
        onShowToast('تم بدء يوم عمل جديد بنجاح', `تاريخ الجلسة: ${today}`, 'success');
      }
    } catch (err: any) {
      if (onShowToast) onShowToast('تعذر بدء اليوم', err?.message, 'error');
    }
  };

  // Compute live aggregates from queue
  const waitingCount = todayPatients.filter((p) => p.status === 'waiting').length;
  const inConsultCount = todayPatients.filter((p) => p.status === 'called').length;
  const completedCount = todayPatients.filter((p) => p.status === 'done').length;
  const noShowCount = todayPatients.filter((p) => p.status === 'no_show').length;
  const totalPatientsCount = todayPatients.length;

  // Handle Complete Day
  const handleConfirmCompleteDay = async () => {
    setIsCompleting(true);
    try {
      const summaryToSave: Partial<DailySession> = {
        patientsCount: totalPatientsCount,
        waitingCount,
        inConsultationCount: inConsultCount,
        completedCount,
        noShowCount,
        totalRevenue: session?.totalRevenue || 0,
        totalCollected: session?.totalCollected || 0,
        outstandingBalance: session?.outstandingBalance || 0,
        paymentBreakdown: session?.paymentBreakdown || { cash: 0, card: 0, transfer: 0, other: 0 },
        serviceBreakdown: session?.serviceBreakdown || {}
      };

      await completeDaySession(
        doctorId,
        today,
        summaryToSave,
        currentUserId,
        currentUserName || doctorName
      );

      setShowCompleteModal(false);
      if (onShowToast) {
        onShowToast('تم إنهاء اليوم وأرشفته بنجاح', 'تم حفظ ملخص اليوم في سجل الأرشيف', 'success');
      }
    } catch (err: any) {
      if (onShowToast) onShowToast('تعذر إنهاء اليوم', err?.message, 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  // Load Archive List
  const handleOpenArchive = async () => {
    setShowArchiveModal(true);
    setSelectedArchivedDay(null);
    setLoadingArchive(true);
    try {
      const days = await getArchivedDays(doctorId, 30);
      setArchivedDays(days);
    } catch (err) {
      console.warn('Error loading archive:', err);
    } finally {
      setLoadingArchive(false);
    }
  };

  // View specific archived day details
  const handleViewArchivedDay = async (dateStr: string) => {
    setLoadingArchivedDetails(true);
    try {
      const details = await getArchivedDayDetails(doctorId, dateStr);
      setSelectedArchivedDay(details);
    } catch (err) {
      console.error('Error fetching day details:', err);
    } finally {
      setLoadingArchivedDetails(false);
    }
  };

  const isActive = session?.status === 'active';
  const isCompletedToday = session?.status === 'completed';

  return (
    <div id="daily-session-manager" className="space-y-4 text-right" dir="rtl">
      
      {/* Session Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Status & Date */}
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                isActive
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : isCompletedToday
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-amber-50 border-amber-200 text-amber-600'
              }`}
            >
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
                    isActive
                      ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800'
                      : isCompletedToday
                      ? 'bg-blue-100/70 border-blue-300 text-blue-800'
                      : 'bg-amber-100/70 border-amber-300 text-amber-800'
                  }`}
                >
                  {isActive
                    ? 'جلسة اليوم نشطة (Active Day)'
                    : isCompletedToday
                    ? 'تم إنهاء يوم العمل وأرشفته'
                    : 'يوم جديد — بانتظار البدء'}
                </span>
                <span className="text-xs text-slate-500 font-mono">{today}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 font-['Tajawal',sans-serif]">
                إدارة يوم العمل وجلسة العيادة
              </h3>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Archive Button */}
            <button
              type="button"
              onClick={handleOpenArchive}
              className="px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Archive className="w-4 h-4 text-slate-500" />
              <span>أرشيف الأيام السابقة</span>
            </button>

            {/* Start Day Button */}
            {!isActive && !isCompletedToday && (
              <button
                type="button"
                onClick={handleStartDay}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl text-xs sm:text-sm font-extrabold transition shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>بدء يوم عمل جديد</span>
              </button>
            )}

            {/* Complete Day Button */}
            {isActive && (
              <button
                type="button"
                onClick={() => setShowCompleteModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white rounded-2xl text-xs sm:text-sm font-extrabold transition shadow-md shadow-slate-900/20 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>إنهاء اليوم وحفظ التقرير (Complete Day)</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time KPI Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-slate-100">
          
          {/* Total Patients */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">إجمالي الحالات</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900 font-mono">{totalPatientsCount}</span>
              <span className="text-[10px] text-slate-400">حالة</span>
            </div>
          </div>

          {/* In Waiting */}
          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200/60">
            <span className="text-[11px] text-amber-700 font-bold block mb-1">في الانتظار</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-amber-900 font-mono">{waitingCount}</span>
              <span className="text-[10px] text-amber-600">ينتظر</span>
            </div>
          </div>

          {/* In Consultation */}
          <div className="bg-sky-50/60 p-3 rounded-2xl border border-sky-200/60">
            <span className="text-[11px] text-sky-700 font-bold block mb-1">في الكشف</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-sky-900 font-mono">{inConsultCount}</span>
              <span className="text-[10px] text-sky-600">حالة</span>
            </div>
          </div>

          {/* Completed */}
          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200/60">
            <span className="text-[11px] text-emerald-700 font-bold block mb-1">تم الكشف</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-900 font-mono">{completedCount}</span>
              <span className="text-[10px] text-emerald-600">كشف</span>
            </div>
          </div>

          {/* No Show */}
          <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-200/60">
            <span className="text-[11px] text-rose-700 font-bold block mb-1">لم يحضر (No-show)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-rose-900 font-mono">{noShowCount}</span>
              <span className="text-[10px] text-rose-600">تغيّب</span>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">إيراد اليوم</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900 font-mono">
                {session?.totalCollected || 0}
              </span>
              <span className="text-[10px] text-slate-400">ج.م</span>
            </div>
          </div>

          {/* Outstanding */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
            <span className="text-[11px] text-slate-500 font-bold block mb-1">المتبقي المطلوب</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-rose-600 font-mono">
                {session?.outstandingBalance || 0}
              </span>
              <span className="text-[10px] text-slate-400">ج.م</span>
            </div>
          </div>

        </div>
      </div>

      {/* Complete Day Confirmation Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-1 inline-block">
                  تقرير إغلاق يوم العمل
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 font-['Tajawal',sans-serif]">
                  تأكيد إنهاء يوم العمل — {today}
                </h3>
              </div>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              سيتم أرشفة إحصائيات جلسة اليوم وتجميد اليوم كجلسة منتهية. يمكنك مراجعة البيانات في أي وقت من خلال الأرشيف.
            </p>

            {/* Summary Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-0.5">إجمالي الحالات</span>
                <strong className="text-lg font-black text-slate-900 font-mono">{totalPatientsCount}</strong>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 block mb-0.5">الكشوفات المكتملة</span>
                <strong className="text-lg font-black text-emerald-900 font-mono">{completedCount}</strong>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                <span className="text-rose-700 block mb-0.5">المرضى المتغيبين</span>
                <strong className="text-lg font-black text-rose-900 font-mono">{noShowCount}</strong>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block mb-0.5">إجمالي الإيرادات</span>
                <strong className="text-lg font-black text-slate-900 font-mono">
                  {session?.totalRevenue || 0} ج.م
                </strong>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 block mb-0.5">المحصل نقدًا وبطاقات</span>
                <strong className="text-lg font-black text-emerald-900 font-mono">
                  {session?.totalCollected || 0} ج.م
                </strong>
              </div>
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <span className="text-amber-700 block mb-0.5">المتبقي على الحسابات</span>
                <strong className="text-lg font-black text-amber-900 font-mono">
                  {session?.outstandingBalance || 0} ج.م
                </strong>
              </div>
            </div>

            {/* Payment Methods Breakdown */}
            {session?.paymentBreakdown && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-800 block mb-2">توزيع وسائل الدفع اليوم:</span>
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">كاش</span>
                    <strong className="text-slate-900">{session.paymentBreakdown.cash || 0} ج.م</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">فيزا / كارت</span>
                    <strong className="text-slate-900">{session.paymentBreakdown.card || 0} ج.م</strong>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">تحويل بنكي</span>
                    <strong className="text-slate-900">{session.paymentBreakdown.transfer || 0} ج.م</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmCompleteDay}
                disabled={isCompleting}
                className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isCompleting ? 'جاري الأرشفة...' : 'تأكيد إغلاق اليوم والأرشفة'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archived Days Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full p-6 space-y-5 animate-in fade-in max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold mb-1 inline-block">
                  الأيام السابقة المؤرشفة
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 font-['Tajawal',sans-serif]">
                  سجل أرشيف أيام العمل
                </h3>
              </div>
              <button
                onClick={() => setShowArchiveModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Archive Content */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {selectedArchivedDay ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedArchivedDay(null)}
                    className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>العودة إلى قائمة الأيام</span>
                  </button>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-black text-slate-900">
                        تقرير يوم {selectedArchivedDay.session?.date} ({selectedArchivedDay.session?.dayName || ''})
                      </h4>
                      <span className="text-slate-500 font-mono">
                        مغلق بواسطة: {selectedArchivedDay.session?.completedByName || 'طبيب العيادة'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono pt-2 border-t border-slate-200">
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-[10px]">إجمالي الحالات</span>
                        <strong className="text-slate-900 text-sm">
                          {selectedArchivedDay.session?.patientsCount || selectedArchivedDay.patients.length}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-[10px]">الكشوفات المكتملة</span>
                        <strong className="text-emerald-700 text-sm">
                          {selectedArchivedDay.session?.completedCount || 0}
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-[10px]">الإيراد المحصل</span>
                        <strong className="text-slate-900 text-sm">
                          {selectedArchivedDay.session?.totalCollected || 0} ج.م
                        </strong>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block text-[10px]">المتبقي المطلوب</span>
                        <strong className="text-rose-600 text-sm">
                          {selectedArchivedDay.session?.outstandingBalance || 0} ج.م
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Patient list of that archived day */}
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs mb-2">قائمة المرضى في هذا اليوم:</h5>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {selectedArchivedDay.patients.map((p) => (
                        <div
                          key={p.id}
                          className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 font-mono text-[11px]">
                              #{p.sequenceNumber}
                            </span>
                            <span className="font-bold text-slate-900">{p.name}</span>
                            <span className="text-slate-400 font-mono text-[11px]">{p.phone}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              p.status === 'done'
                                ? 'bg-emerald-50 text-emerald-700'
                                : p.status === 'no_show'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.status === 'done' ? 'تم الكشف' : p.status === 'no_show' ? 'لم يحضر' : p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : loadingArchive ? (
                <div className="py-12 text-center text-xs text-slate-400">جاري تحميل الأرشيف...</div>
              ) : archivedDays.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                  لا توجد أيام مؤرشفة حتى الآن. عندما تقوم بـ "إنهاء اليوم" سيتم حفظه هنا تلقائيًا.
                </div>
              ) : (
                <div className="space-y-2">
                  {archivedDays.map((d) => (
                    <div
                      key={d.id}
                      onClick={() => handleViewArchivedDay(d.date)}
                      className="bg-white hover:bg-slate-50 p-4 rounded-2xl border border-slate-200 transition flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-mono text-xs font-bold">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm font-mono">{d.date}</span>
                            {d.dayName && <span className="text-xs text-slate-500">({d.dayName})</span>}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5 font-mono">
                            <span>الحالات: {d.patientsCount || 0}</span>
                            <span>الكشوفات: {d.completedCount || 0}</span>
                            <span>المتحصل: {d.totalCollected || 0} ج.م</span>
                          </div>
                        </div>
                      </div>

                      <ChevronLeft className="w-5 h-5 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
