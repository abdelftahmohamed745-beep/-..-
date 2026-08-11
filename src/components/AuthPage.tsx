import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  createDoctorProfile,
  getDoctorProfile
} from '../services/firebaseService';
import { createLabProfile, getLabProfile } from '../services/labService';
import { DoctorProfile, AccountType } from '../types';
import { Stethoscope, Mail, Lock, User, Building, ArrowLeft, ShieldCheck, TestTube, RotateCcw, CheckCircle2, LogOut } from 'lucide-react';
import { CustomWebsiteSection } from './CustomWebsiteSection';

interface AuthPageProps {
  onDoctorLoggedIn: (doctor: DoctorProfile) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onSelectPatientBookingView: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onDoctorLoggedIn,
  onShowToast,
  onSelectPatientBookingView
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('doctor');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('طب أطفال وباطنة');
  const [clinicName, setClinicName] = useState('');
  
  // Lab fields
  const [labName, setLabName] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);

  // Email Verification State
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [verifyingLoading, setVerifyingLoading] = useState(false);

  // Auto-check unverified session on mount
  useEffect(() => {
    const checkPendingVerification = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        await user.reload();
        if (!user.emailVerified) {
          setIsVerifyingEmail(true);
          setVerificationEmail(user.email || '');
        }
      } catch (e) {
        console.warn("Error reloading current user on mount:", e);
      }
    };
    checkPendingVerification();
  }, []);

  // Countdown timer for email resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isVerifyingEmail && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isVerifyingEmail, resendTimer]);

  const handleCheckVerificationStatus = async () => {
    setVerifyingLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setIsVerifyingEmail(false);
        setVerifyingLoading(false);
        return;
      }

      await user.reload();

      if (user.emailVerified) {
        // Check if Lab profile exists
        const labProf = await getLabProfile(user.uid);
        if (labProf) {
          setVerifyingLoading(false);
          setIsVerifyingEmail(false);
          onShowToast("تم تأكيد الحساب بنجاح", `مرحباً بك في لوحة تحكم ${labProf.name}`, "success");
          onDoctorLoggedIn({
            uid: user.uid,
            accountType: 'laboratory',
            name: labProf.responsibleName,
            specialty: "معمل تحاليل",
            clinicName: labProf.name,
            qrCodeId: user.uid,
            address: labProf.address,
            phone: labProf.phone,
            subscriptionStatus: 'active',
            trialEndDate: new Date().toISOString(),
            avgConsultTime: 15,
            workHours: { open: "08:00", close: "23:00", maxPatientsPerDay: 100, daysOfWeek: [] },
            createdAt: labProf.createdAt
          });
          return;
        }

        // Check if Doctor profile exists
        const docProfile = await getDoctorProfile(user.uid);
        if (docProfile) {
          setVerifyingLoading(false);
          setIsVerifyingEmail(false);
          onShowToast("تم تأكيد الحساب بنجاح", `مرحباً بك في لوحة تحكم ${docProfile.clinicName}`, "success");
          onDoctorLoggedIn(docProfile);
          return;
        }

        // Fallback profile creation if needed
        const newDoctor = await createDoctorProfile(user.uid, "دكتور", "طبيب عام", "العيادة الطبية");
        setVerifyingLoading(false);
        setIsVerifyingEmail(false);
        onShowToast("تم تأكيد الحساب بنجاح", "تم تفعيل حسابك بنجاح", "success");
        onDoctorLoggedIn(newDoctor);

      } else {
        setVerifyingLoading(false);
        onShowToast(
          "لم يتم التحقق بعد",
          "يرجى فتح بريدك الإلكتروني والضغط على رابط التفعيل المرسل لك، ثم الضغط على هذا الزر مجدداً.",
          "warning"
        );
      }
    } catch (err: any) {
      console.error("Check verification error:", err);
      setVerifyingLoading(false);
      onShowToast("خطأ أثناء تحديث الحالة", err.message || "حدث خطأ غير متوقع", "error");
    }
  };

  const handleResendEmailLink = async () => {
    if (resendTimer > 0) return;
    setVerifyingLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        auth.languageCode = 'ar';
        await sendEmailVerification(user);
        console.log("[Firebase Auth Log] handleResendEmailLink succeeded for:", user.email);
        setResendTimer(60);
        setVerifyingLoading(false);
        onShowToast(
          "تم إرسال رابط جديد",
          `تم إرسال رابط تحقق جديد إلى بريدك الإلكتروني: ${user.email}`,
          "success"
        );
      } else {
        throw new Error("لم يتم العثور على الجلسة الحالية. يرجى تسجيل الدخول مجدداً.");
      }
    } catch (err: any) {
      console.error("[Firebase Auth Error] handleResendEmailLink failed:", err?.code, err?.message);
      setVerifyingLoading(false);
      onShowToast("فشل إعادة الإرسال", err.message || "تعذر إرسال رابط التحقق", "error");
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Sign out error:", e);
    }
    setIsVerifyingEmail(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      if (isRegister) {
        // 1. Create user in Firebase Auth
        let user;
        try {
          const creds = await createUserWithEmailAndPassword(auth, email.trim(), password);
          user = creds.user;
        } catch (authErr: any) {
          if (authErr?.code === 'auth/email-already-in-use') {
            try {
              const signCreds = await signInWithEmailAndPassword(auth, email.trim(), password);
              user = signCreds.user;
            } catch {
              throw new Error('هذا البريد الإلكتروني مسجل بالفعل. يرجى اختيار "تسجيل دخول" بدلاً من حساب جديد.');
            }
          } else if (authErr?.code === 'auth/weak-password') {
            throw new Error('كلمة المرور ضعيفة. يرجى اختيار كلمة مرور من 6 أحرف أو أكثر.');
          } else if (authErr?.code === 'auth/invalid-email') {
            throw new Error('البريد الإلكتروني غير صالحة صيغته.');
          } else {
            throw authErr;
          }
        }

        // 2. Create profile in Firestore
        if (accountType === 'laboratory') {
          await createLabProfile(
            user.uid,
            labName.trim() || "معمل التحاليل الطبية",
            responsibleName.trim() || "مدير المعمل",
            phone.trim() || "01000000000",
            address.trim() || "القاهرة، مصر"
          );
        } else {
          await createDoctorProfile(
            user.uid,
            doctorName.trim() || "دكتور جديد",
            specialty.trim() || "طبيب عام",
            clinicName.trim() || "العيادة الطبية"
          );
        }

        // 3. Send official Firebase Email Verification
        try {
          auth.languageCode = 'ar';
          await sendEmailVerification(user);
          console.log("[Firebase Auth Log] sendEmailVerification succeeded for:", user.email);
        } catch (sendErr: any) {
          console.error("[Firebase Auth Error] sendEmailVerification failed:", sendErr?.code, sendErr?.message);
        }

        setLoading(false);
        setIsVerifyingEmail(true);
        setVerificationEmail(user.email || email.trim());
        setResendTimer(60);

        onShowToast(
          "تم إرسال رابط التحقق",
          `تم إرسال رابط التفعيل إلى بريدك الإلكتروني: ${user.email}`,
          "info"
        );

      } else {
        // Sign In
        let creds;
        try {
          creds = await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (authErr: any) {
          if (
            authErr?.code === 'auth/invalid-credential' ||
            authErr?.code === 'auth/user-not-found' ||
            authErr?.code === 'auth/wrong-password' ||
            authErr?.code === 'auth/invalid-email'
          ) {
            throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
          }
          throw authErr;
        }

        const user = creds.user;
        await user.reload();

        // Check if email is verified
        if (!user.emailVerified) {
          setLoading(false);
          setIsVerifyingEmail(true);
          setVerificationEmail(user.email || email.trim());
          setResendTimer(60);

          onShowToast(
            "حسابك غير مفعل بعد",
            "يرجى فتح بريدك الإلكتروني والضغط على رابط التحقق لتفعيل الحساب.",
            "warning"
          );
          return;
        }

        // 1. Check if Lab profile exists
        const labProf = await getLabProfile(user.uid);
        if (labProf) {
          setLoading(false);
          onShowToast("أهلاً بعودتك!", `تم تسجيل الدخول في ${labProf.name}`, "success");
          onDoctorLoggedIn({
            uid: user.uid,
            accountType: 'laboratory',
            name: labProf.responsibleName,
            specialty: "معمل تحاليل",
            clinicName: labProf.name,
            qrCodeId: user.uid,
            address: labProf.address,
            phone: labProf.phone,
            subscriptionStatus: 'active',
            trialEndDate: new Date().toISOString(),
            avgConsultTime: 15,
            workHours: { open: "08:00", close: "23:00", maxPatientsPerDay: 100, daysOfWeek: [] },
            createdAt: labProf.createdAt
          });
          return;
        }

        // 2. Check if Doctor profile exists
        let doctor = await getDoctorProfile(user.uid);
        if (doctor) {
          setLoading(false);
          onShowToast("أهلاً بعودتك!", `تم تسجيل الدخول في ${doctor.clinicName}`, "success");
          onDoctorLoggedIn(doctor);
          return;
        }

        // 3. Fallback profile creation if neither profile exists
        if (accountType === 'laboratory') {
          const newLab = await createLabProfile(
            user.uid,
            labName.trim() || "معمل التحاليل الطبية",
            responsibleName.trim() || "مدير المعمل",
            phone.trim() || "01000000000",
            address.trim() || "القاهرة، مصر"
          );
          setLoading(false);
          onShowToast("أهلاً بعودتك!", `تم تفعيل حساب المعمل ${newLab.name}`, "success");
          onDoctorLoggedIn({
            uid: user.uid,
            accountType: 'laboratory',
            name: newLab.responsibleName,
            specialty: "معمل تحاليل",
            clinicName: newLab.name,
            qrCodeId: user.uid,
            address: newLab.address,
            phone: newLab.phone,
            subscriptionStatus: 'active',
            trialEndDate: new Date().toISOString(),
            avgConsultTime: 15,
            workHours: { open: "08:00", close: "23:00", maxPatientsPerDay: 100, daysOfWeek: [] },
            createdAt: newLab.createdAt
          });
        } else {
          doctor = await createDoctorProfile(user.uid, "دكتور", "طبيب عام", "العيادة الطبية");
          setLoading(false);
          onShowToast("أهلاً بعودتك!", `تم تسجيل الدخول في ${doctor.clinicName}`, "success");
          onDoctorLoggedIn(doctor);
        }
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      setLoading(false);
      const errMsg = err instanceof Error ? err.message : "فشل عملية المصادقة";
      onShowToast("خطأ في المصادقة", errMsg, "error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      
      {/* Firebase Email Verification Pending Screen */}
      {isVerifyingEmail ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-sky-100 mb-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-sky-100">
              <Mail className="w-8 h-8 text-sky-600" />
            </div>
            <h2 className="text-xl font-black text-slate-900 font-['Tajawal',sans-serif] mb-2">
              تأكيد ملكية البريد الإلكتروني
            </h2>
            <p className="text-sm text-slate-600 font-medium max-w-md mx-auto leading-relaxed">
              أرسلنا رابط التحقق والتفعيل إلى بريدك الإلكتروني:
            </p>
            <span className="inline-block mt-2 font-bold text-sky-700 bg-sky-50 border border-sky-200 px-4 py-1.5 rounded-full text-xs dir-ltr">
              {verificationEmail}
            </span>
            <p className="text-xs text-slate-500 mt-3 max-w-md mx-auto">
              يرجى فتح صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها Spam) والضغط على رابط التفعيل.
            </p>
          </div>

          <div className="space-y-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={handleCheckVerificationStatus}
              disabled={verifyingLoading}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {verifyingLoading ? (
                <span>جاري التحقق من الحالة...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>تأكيد التفعيل والدخول للوحة التحكم</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={resendTimer > 0 || verifyingLoading}
              onClick={handleResendEmailLink}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <span>
                {resendTimer > 0
                  ? `إعادة إرسال رابط التحقق خلال (${resendTimer} ثانية)`
                  : 'إعادة إرسال رابط التحقق'}
              </span>
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={handleSignOut}
              className="text-slate-500 hover:text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج والعودة لصفحة الدخول</span>
            </button>
          </div>
        </div>
      ) : (
        /* Main Login / Signup Card */
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90 mb-8">
          
          {/* Toggle Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                !isRegister ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              تسجيل دخول
            </button>
            <button
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                isRegister ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              حساب جديد (عيادة / معمل)
            </button>
          </div>

          {/* Account Type Selector for Registration */}
          {isRegister && (
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 mb-2">نوع الحساب الطبي:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('doctor')}
                  className={`p-3.5 rounded-2xl border text-right transition flex items-center gap-3 ${
                    accountType === 'doctor'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Stethoscope className="w-5 h-5 shrink-0 text-sky-400" />
                  <div>
                    <span className="block font-bold text-xs">👨‍⚕️ طبيب / عيادة</span>
                    <span className="text-[10px] opacity-80 block">نظام الحجز والإنذار المبكر</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('laboratory')}
                  className={`p-3.5 rounded-2xl border text-right transition flex items-center gap-3 ${
                    accountType === 'laboratory'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <TestTube className="w-5 h-5 shrink-0 text-teal-400" />
                  <div>
                    <span className="block font-bold text-xs">🧪 معمل تحاليل</span>
                    <span className="text-[10px] opacity-80 block">إدارة الفحوصات والنتائج (Dory Labs)</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {isRegister && accountType === 'doctor' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطبيب بالكامل</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      placeholder="د. محمد عبد الله"
                      required
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">التخصص الطبي</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="استشاري الباطنة والقلب"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم العيادة / المركز الطبي</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="عيادة الشفاء التخصصية"
                      required
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </>
            )}

            {isRegister && accountType === 'laboratory' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم معمل التحاليل الطبية *</label>
                  <div className="relative">
                    <TestTube className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    <input
                      type="text"
                      value={labName}
                      onChange={(e) => setLabName(e.target.value)}
                      placeholder="معمل النيل للتحاليل الطبية"
                      required
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم الطبيب / المدير المسؤول *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    <input
                      type="text"
                      value={responsibleName}
                      onChange={(e) => setResponsibleName(e.target.value)}
                      placeholder="د. أحمد مصطفى"
                      required
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم هاتف المعمل *</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500 dir-ltr text-left"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان المعمل التفصيلي *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="القاهرة - مدينة نصر - شارع الطيران"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@clinic.com"
                  required
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500 dir-ltr text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500 dir-ltr text-left"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl transition shadow-md cursor-pointer"
            >
              {loading ? 'جاري التحقق...' : isRegister ? 'تسجيل وبدء التجربة المجانية' : 'تسجيل الدخول'}
            </button>
          </form>

        <hr className="my-6 border-slate-100" />

        {/* Patient Preview Link */}
        <button
          onClick={onSelectPatientBookingView}
          className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs rounded-xl transition border border-sky-200/60 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>تصفح صفحة المريض (مسح كود الـ QR)</span>
          <ArrowLeft className="w-4 h-4" />
        </button>

      </div>
      )}

      {/* Standalone Section: Want a custom website? */}
      <CustomWebsiteSection />

    </div>
  );
};
