import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { auth } from '../firebase/config';
import { verifyAdminStatus } from '../services/firebaseService';
import { AdminDashboard } from './AdminDashboard';
import { ShieldAlert, Lock, Mail, ArrowRight, LogOut, CheckCircle2, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AdminGuardProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateHome: () => void;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ onShowToast, onNavigateHome }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Login Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        setCheckingAdmin(true);
        setAdminError(null);
        const result = await verifyAdminStatus(user);
        setIsAdmin(result.isAdmin);
        if (!result.isAdmin) {
          setAdminError(result.error || "الحساب الحالي لا يمتلك صلاحيات مدير المنصة");
        }
        setCheckingAdmin(false);
      } else {
        setIsAdmin(false);
        setCheckingAdmin(false);
        setAdminError(null);
      }
    });

    return () => unsub();
  }, []);

  // Handle Admin Login submission
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      setLoginError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setIsSubmitting(true);
    setLoginError(null);

    try {
      let targetUser: User;
      const normalizedEmail = cleanEmail.toLowerCase();
      const isAuthorizedBootstrap = (
        normalizedEmail === 'abdelftahmohamed745@gmail.com' ||
        normalizedEmail === 'admin@dawry.app'
      );

      try {
        const creds = await signInWithEmailAndPassword(auth, cleanEmail, password);
        targetUser = creds.user;
      } catch (authErr: any) {
        const code = authErr?.code || '';
        // If account does not exist in Firebase Auth yet, and email is the authorized bootstrap admin, create the account
        if (isAuthorizedBootstrap && (code === 'auth/user-not-found' || code === 'auth/invalid-credential')) {
          try {
            const newCreds = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            targetUser = newCreds.user;
          } catch (createErr: any) {
            console.error("Admin account creation failed:", createErr);
            throw authErr;
          }
        } else {
          throw authErr;
        }
      }

      const result = await verifyAdminStatus(targetUser);
      
      if (result.isAdmin) {
        setCurrentUser(targetUser);
        setIsAdmin(true);
        onShowToast("تم تسجيل الدخول بنجاح 🛡️", "أهلاً بك في لوحة تحكم إدارة منصة دوري", "success");
      } else {
        setIsAdmin(false);
        setLoginError("حسابك لا يمتلك صلاحيات مدير المنصة المركزية");
        onShowToast("غير مصرح", "هذا الحساب لا يملك صلاحيات مدير المنصة", "warning");
      }
    } catch (err: any) {
      console.error("Admin Auth Error:", err);
      const code = err?.code || '';
      let msg = "فشل تسجيل الدخول كمدير منصة";
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        msg = "البريد الإلكتروني أو كلمة المرور غير صحيحة";
      } else if (code === 'auth/too-many-requests') {
        msg = "تم تعليق المحاولات مؤقتاً لكثرة المحاولات الخاطئة. يرجى الانتظار قليلاً.";
      } else if (code === 'auth/weak-password') {
        msg = "كلمة المرور ضعيفة جداً. يجب أن تحتوي على 6 أحرف على الأقل.";
      } else if (err?.message) {
        msg = err.message;
      }
      setLoginError(msg);
      onShowToast("خطأ في المصادقة", msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setIsAdmin(false);
      onShowToast("تم تسجيل الخروج من حساب الإدارة", "", "info");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // State 1: Initial Auth Loading or Admin Privilege Check
  if (authLoading || checkingAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200/90 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-sky-100 shadow-inner">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            جاري التحقق من صلاحيات إدارة المنصة...
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            يرجى الانتظار لحظات أثناء مطابقة التوقيع والتحقق من صلاحيات الحساب مع خادم Firebase
          </p>
        </div>
      </div>
    );
  }

  // State 2: Unauthenticated User -> Show Admin Login Form
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/90 relative overflow-hidden">
          
          {/* Top Decorative Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-rose-900 via-rose-800 to-slate-900 text-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-950/20 border border-rose-700/30">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-extrabold border border-rose-200 mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>منطقة محمية - الدخول حصري لمديري النظام</span>
            </span>
            <h1 className="text-2xl font-black text-slate-900 font-['Tajawal',sans-serif]">
              تسجيل دخول مدير المنصة
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              أدخل بيانات حساب الإدارة للوصول إلى لوحة تحكم منصة دوري
            </p>
          </div>

          {/* Error Banner */}
          {loginError && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">خطأ في تسجيل الدخول</span>
                <span>{loginError}</span>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                البريد الإلكتروني للإدارة
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="abdelftahmohamed745@gmail.com"
                  dir="ltr"
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-600 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-600 focus:bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-rose-900 to-slate-900 hover:from-rose-800 hover:to-slate-800 text-white rounded-2xl text-xs font-extrabold shadow-lg shadow-rose-950/20 transition active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري المصادقة كمدير...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تسجيل الدخول كمدير المنصة</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Back Link */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للصفحة الرئيسية (دليل العيادات)</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // State 3: Authenticated BUT NOT Authorized as Admin
  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-200 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-extrabold mb-3">
            وصول غير مصرح (Unauthorized Admin Access)
          </span>

          <h2 className="text-xl font-bold text-slate-900 mb-2">
            الحساب الحالي لا يمتلك صلاحيات إدارة المنصة
          </h2>

          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            لقد قمت بتسجيل الدخول ببريد الإلكتروني: <strong className="text-slate-900 dir-ltr inline-block">{currentUser.email}</strong>. هذا الحساب مصرح له كطبيب فقط وليس كمدير منصة.
          </p>

          {adminError && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
              {adminError}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleSignOut}
              className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج والتبديل بحساب مدير</span>
            </button>

            <button
              onClick={onNavigateHome}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة للرئيسية</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 4: Authenticated AND Verified Admin -> Render Admin Dashboard
  return (
    <div>
      {/* Top Admin session banner */}
      <div className="bg-rose-950 text-rose-100 px-4 py-2 text-xs font-bold border-b border-rose-900/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>جلسة مدير النظام النشطة:</span>
            <span className="font-mono text-white dir-ltr">{currentUser.email}</span>
          </div>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
            title="تسجيل الخروج من حساب الإدارة"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      <AdminDashboard onShowToast={onShowToast} />
    </div>
  );
};
