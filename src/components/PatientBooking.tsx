import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Stethoscope, Building, Phone, Clock, Users, ArrowRight, AlertCircle, Ticket, CheckCircle2, Bell, Lock, Tag } from 'lucide-react';
import { DoctorProfile, PatientRecord, NotificationTimingPreference, ClinicService } from '../types';
import { bookPatient, getDoctorProfile, checkActiveBooking, getTodayDateString, getClinicServicesPublic, getPatientMedicalFile } from '../services/firebaseService';

interface PatientBookingProps {
  doctorId: string;
  onBookingSuccess: (patientId: string) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onBackToDoctorLogin?: () => void;
}

export const PatientBooking: React.FC<PatientBookingProps> = ({
  doctorId,
  onBookingSuccess,
  onShowToast,
  onBackToDoctorLogin
}) => {
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationPreference, setNotificationPreference] = useState<NotificationTimingPreference>('two_turns');
  const [availableServices, setAvailableServices] = useState<ClinicService[]>([]);
  const [selectedService, setSelectedService] = useState<ClinicService | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingTicket, setExistingTicket] = useState<PatientRecord | null>(null);

  // Fetch doctor details, active services, and check for existing local ticket
  useEffect(() => {
    console.log('[QR] PATIENT_BOOKING_MOUNTED', { doctorId });
    async function loadDoctorData() {
      setLoading(true);
      const profile = await getDoctorProfile(doctorId);
      setDoctor(profile);

      if (profile) {
        // Fetch active services configured by doctor
        const dbServices = await getClinicServicesPublic(doctorId);
        if (dbServices && dbServices.length > 0) {
          setAvailableServices(dbServices);
          setSelectedService(dbServices[0]);
        } else if (profile.servicesAndPrices && profile.servicesAndPrices.length > 0) {
          const fallbackList: ClinicService[] = profile.servicesAndPrices.map((sp, idx) => ({
            id: `sp_${idx}`,
            organizationId: doctorId,
            name: sp.serviceName,
            description: sp.serviceName.includes('إعادة') ? 'زيارة متابعة للكشف السابق' : 'فحص أول مرة وتشخيص طبي',
            price: Number(sp.price) || 200,
            active: true,
            createdAt: new Date().toISOString(),
            createdBy: doctorId
          }));
          setAvailableServices(fallbackList);
          setSelectedService(fallbackList[0]);
        } else {
          // Standard defaults if doctor hasn't configured services yet
          const defaultList: ClinicService[] = [
            {
              id: 'srv_default_1',
              organizationId: doctorId,
              name: 'كشف جديد',
              description: 'فحص أول مرة وتشخيص طبي شامل',
              price: 200,
              active: true,
              createdAt: new Date().toISOString(),
              createdBy: doctorId
            },
            {
              id: 'srv_default_2',
              organizationId: doctorId,
              name: 'إعادة كشف',
              description: 'متابعة للكشف السابق واستعراض الفحوصات',
              price: 100,
              active: true,
              createdAt: new Date().toISOString(),
              createdBy: doctorId
            },
            {
              id: 'srv_default_3',
              organizationId: doctorId,
              name: 'استشارة',
              description: 'استشارة طبية سريعة ومراجعة تحاليل',
              price: 150,
              active: true,
              createdAt: new Date().toISOString(),
              createdBy: doctorId
            }
          ];
          setAvailableServices(defaultList);
          setSelectedService(defaultList[0]);
        }
      }
      setLoading(false);
    }
    loadDoctorData();
  }, [doctorId]);

  // Check if phone matches active ticket or medical file when typing (auto-fill patient name)
  useEffect(() => {
    if (phone.length < 8 || !doctor) {
      setExistingTicket(null);
      return;
    }

    const timer = setTimeout(() => {
      checkActiveBooking(doctor.uid, phone.trim()).then((ticket) => {
        setExistingTicket(ticket);
        if (ticket && ticket.name && !name.trim()) {
          setName(ticket.name);
        }
      }).catch(console.error);

      getPatientMedicalFile(doctor.uid, phone.trim()).then((file) => {
        if (file && file.patientName && !name.trim()) {
          setName(file.patientName);
        }
      }).catch(console.error);
    }, 400);

    return () => clearTimeout(timer);
  }, [phone, doctor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !doctor) return;

    if (phone.length < 10) {
      onShowToast("رقم الموبايل غير صحيح", "يرجى كتابة رقم موبايل يتكون من 10 أرقام أو أكثر", "warning");
      return;
    }

    setIsSubmitting(true);
    console.log('[QR] EXISTING_BOOKING_SYSTEM_CALLED', { doctorId: doctor.uid, name: name.trim(), phone: phone.trim(), service: selectedService?.name });
    try {
      const res = await bookPatient(
        doctor.uid,
        name.trim(),
        phone.trim(),
        undefined,
        notificationPreference,
        selectedService ? {
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          visitType: selectedService.name,
          price: selectedService.price
        } : undefined
      );
      setIsSubmitting(false);
      console.log('[QR] TICKET_CREATED', { patientId: res.patientId, sequenceNumber: res.sequenceNumber, isExisting: res.isExisting });

      if (res.isExisting) {
        onShowToast("لديك حجز نشط بالفعل!", `تم توجيهك لتذكرتك رقم #${res.sequenceNumber}`, "info");
      } else {
        onShowToast("تم الحجز بنجاح", `دورك في الطابور هو الرقم #${res.sequenceNumber}`, "success");
      }

      // Save to local storage for quick reload
      localStorage.setItem(`dawry_ticket_${doctorId}`, res.patientId);
      onBookingSuccess(res.patientId);
    } catch (err: unknown) {
      setIsSubmitting(false);
      const errMsg = err instanceof Error ? err.message : "حدث خطأ أثناء الحجز";
      onShowToast("تعذر الحجز", errMsg, "error");
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-16 h-16 bg-sky-100 rounded-3xl animate-pulse mx-auto" />
        <div className="h-6 bg-slate-200 rounded-xl w-3/4 mx-auto animate-pulse" />
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="bg-[#fdfcf9] p-8 rounded-3xl border border-[#e7e3da] shadow-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#122c4a] font-['Tajawal',sans-serif]">
            العيادة غير متوفرة
          </h2>
          <p className="text-xs text-slate-500 mt-2 mb-6">
            تعذر العثور على بيانات هذه العيادة، يرجى التأكد من مسح رمز QR الصحيح.
          </p>
          {onBackToDoctorLogin && (
            <button
              onClick={onBackToDoctorLogin}
              className="w-full py-2.5 bg-[#122c4a] text-white font-bold text-xs rounded-xl hover:bg-[#0d223a] transition cursor-pointer"
            >
              العودة للصفحة الرئيسية
            </button>
          )}
        </div>
      </div>
    );
  }

  const isExpired = doctor.subscriptionStatus === 'expired';

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-10">
      
      {/* Clinic Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#122c4a] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#1b3a5c] relative overflow-hidden mb-6 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#f4efe6] text-[#122c4a] flex items-center justify-center mx-auto mb-4 shadow-lg font-bold">
          <Stethoscope className="w-7 h-7 text-[#122c4a]" />
        </div>

        <span className="inline-block px-3 py-1 bg-white/10 text-sky-200 font-bold text-xs rounded-full border border-white/20 mb-2">
          {doctor.specialty}
        </span>

        <h1 className="text-2xl font-black font-['Tajawal',sans-serif] tracking-tight text-white">
          {doctor.clinicName}
        </h1>
        <p className="text-sm font-bold text-slate-200 mt-0.5">
          {doctor.name}
        </p>

        <div className="mt-4 pt-4 border-t border-[#1b3a5c] grid grid-cols-2 gap-2 text-xs text-slate-200">
          <div className="flex items-center justify-center gap-1.5 bg-white/5 p-2 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-sky-300" />
            <span>{doctor.workHours?.open} - {doctor.workHours?.close}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-white/5 p-2 rounded-xl">
            <Users className="w-3.5 h-3.5 text-emerald-300" />
            <span>~{doctor.avgConsultTime} دقيقة/مريض</span>
          </div>
        </div>
      </motion.div>

      {/* Subscription Expired Warning */}
      {isExpired ? (
        <div className="bg-[#fdfcf9] p-6 rounded-3xl border border-rose-200 shadow-md text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h3 className="font-bold text-[#122c4a] text-base font-['Tajawal',sans-serif]">
            نظام الحجز غير متاح حالياً
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            عذراً، خدمة الحجز التلقائي متوقفة مؤقتاً لدى هذه العيادة. يرجى التوجه لموظف الاستقبال مباشرة.
          </p>
        </div>
      ) : (
        /* Booking Form Card */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#fdfcf9] rounded-3xl p-6 sm:p-8 shadow-xl border border-[#e7e3da]"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#122c4a] font-['Tajawal',sans-serif]">
              احجز دورك الآن في صالة الانتظار
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              أدخل بياناتك وسيقوم النظام بتوليد تذكرة تفاعلية تتبع دورك مباشرة (Live)
            </p>
          </div>

          {/* Active Ticket Alert (if user has an active booking) */}
          {existingTicket && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Ticket className="w-4 h-4 text-amber-600" />
                <span>لديك حجز نشط بالفعل برقم #{existingTicket.sequenceNumber}!</span>
              </div>
              <p className="text-[11px] text-amber-800">
                يمكنك الانتقال فوراً لمتابعة تذكرتك الحالية دون الحاجة للحجز مجدداً.
              </p>
              <button
                type="button"
                onClick={() => onBookingSuccess(existingTicket.id)}
                className="mt-1 w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer"
              >
                انتقل إلى تذكرتك الحالية
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Visit Type / Package Selection Cards */}
            {availableServices.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-[#122c4a] mb-2">
                  نوع الزيارة / الخدمة <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableServices.map((srv) => {
                    const isSelected = selectedService?.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs'
                            : 'bg-[#faf8f5] border-[#e7e3da] hover:border-[#122c4a]/30'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`font-bold text-xs sm:text-sm ${isSelected ? 'text-emerald-950' : 'text-[#122c4a]'}`}>
                              {srv.name}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </div>
                          {srv.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                              {srv.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-semibold">السعر المقرر</span>
                          <span className={`font-black text-xs sm:text-sm font-mono ${isSelected ? 'text-emerald-700' : 'text-[#122c4a]'}`}>
                            {srv.price} جنيه
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedService && (
                  <div className="mt-3 p-3 bg-emerald-50/90 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-emerald-950">نوع الزيارة: {selectedService.name}</span>
                    </div>
                    <div className="font-black text-emerald-800 font-mono">
                      المبلغ: {selectedService.price} جنيه
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#122c4a] mb-1">
                الاسم بالكامل <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك كما في الهوية"
                required
                className="w-full px-4 py-3 bg-[#faf8f5] border border-[#e7e3da] rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#122c4a] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#122c4a] mb-1">
                رقم الموبايل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#1b3a5c] absolute right-3.5 top-3.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  required
                  className="w-full pl-4 pr-10 py-3 bg-[#faf8f5] border border-[#e7e3da] rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#122c4a] transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#122c4a] mb-1">
                توقيت إشعار قرب الدور المفضل
              </label>
              <div className="relative">
                <Bell className="w-4 h-4 text-[#1b3a5c] absolute right-3.5 top-3.5 pointer-events-none" />
                <select
                  value={notificationPreference}
                  onChange={(e) => setNotificationPreference(e.target.value as NotificationTimingPreference)}
                  className="w-full pl-4 pr-10 py-3 bg-[#faf8f5] border border-[#e7e3da] rounded-2xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#122c4a] transition appearance-none"
                >
                  <option value="two_turns">تنبيهي قبل دوري بدورين (افتراضي)</option>
                  <option value="one_turn">تنبيهي قبل دوري بدور واحد</option>
                  <option value="ten_minutes">تنبيهي قبل الموعد بـ 10 دقائق</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#122c4a] hover:bg-[#0d223a] active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Ticket className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري إشعار العيادة وتحديد الدور...' : 'تأكيد الحجز والحصول على التذكرة'}</span>
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>بياناتك مشفرة ومحفوظة آمنة لربطها برقم دورك في العيادة فقط.</span>
          </div>
        </motion.div>
      )}

    </div>
  );
};
