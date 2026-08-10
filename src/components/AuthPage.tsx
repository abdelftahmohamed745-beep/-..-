import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  createDoctorProfile,
  getDoctorProfile
} from '../services/firebaseService';
import { DoctorProfile } from '../types';
import { Stethoscope, Mail, Lock, User, Building, ArrowLeft, ShieldCheck, MessageSquare } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('طب أطفال وباطنة');
  const [clinicName, setClinicName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    try {
      if (isRegister) {
        // Register new doctor with Firebase Auth
        const creds = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const newDoctor = await createDoctorProfile(
          creds.user.uid,
          doctorName.trim() || "دكتور جديد",
          specialty.trim() || "طبيب عام",
          clinicName.trim() || "العيادة الطبية"
        );
        setLoading(false);
        onShowToast("تم إنشاء حساب العيادة بنجاح", "تم تفعيل الفترة التجريبية المجانية (7 أيام)", "success");
        onDoctorLoggedIn(newDoctor);
      } else {
        // Sign In
        const creds = await signInWithEmailAndPassword(auth, email.trim(), password);
        let doctor = await getDoctorProfile(creds.user.uid);
        if (!doctor) {
          doctor = await createDoctorProfile(creds.user.uid, "دكتور", "طبيب", "العيادة");
        }
        setLoading(false);
        onShowToast("أهلاً بعودتك!", `تم تسجيل الدخول في ${doctor.clinicName}`, "success");
        onDoctorLoggedIn(doctor);
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      setLoading(false);
      const errMsg = err instanceof Error ? err.message : "فشل تسجيل الدخول";
      onShowToast("خطأ في المصادقة", errMsg.includes('auth/invalid-credential') ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : errMsg, "error");
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      
      {/* Main Login / Signup Card */}
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
            حساب عيادة جديد
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isRegister && (
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
            {loading ? 'جاري التحقق...' : isRegister ? 'تسجيل العيادة وبدء التجربة المجانية' : 'تسجيل الدخول'}
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

      {/* Standalone Section: Want a custom website? */}
      <CustomWebsiteSection />

    </div>
  );
};
