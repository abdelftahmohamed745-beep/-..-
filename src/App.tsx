/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import {
  getDoctorProfile,
  purgeTestAccounts
} from './services/firebaseService';
import { DoctorProfile, ToastMessage } from './types';

// Components
import { Navbar, NavTabType } from './components/Navbar';
import { DoctorsDirectory } from './components/DoctorsDirectory';
import { ClinicProfilePage } from './components/ClinicProfilePage';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PatientBooking } from './components/PatientBooking';
import { PatientTicket } from './components/PatientTicket';
import { SubscriptionPage } from './components/SubscriptionPage';
import { AuthPage } from './components/AuthPage';
import { AdminGuard } from './components/AdminGuard';
import { QRModal } from './components/QRModal';
import { QRScannerModal } from './components/QRScannerModal';
import { SettingsModal } from './components/SettingsModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { ClinicInvitationAcceptModal } from './components/ClinicInvitationAcceptModal';
import { ToastContainer } from './components/Toast';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { setPageSeo, DEFAULT_HOMEPAGE_SEO } from './utils/seo';

interface NavState {
  tab: NavTabType;
  selectedDoctorId: string;
  viewClinicDoctorId: string;
  selectedPatientId: string | null;
}

export default function App() {
  const [currentDoctor, setCurrentDoctor] = useState<DoctorProfile | null>(null);
  const [activeTab, setActiveTab] = useState<NavTabType>('directory');
  
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [viewClinicDoctorId, setViewClinicDoctorId] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Navigation History Stack
  const [navHistory, setNavHistory] = useState<NavState[]>([]);

  // Central Navigation Handler
  const navigateTo = (
    newTab: NavTabType,
    options?: {
      doctorId?: string;
      clinicDoctorId?: string;
      patientId?: string | null;
    }
  ) => {
    const currentState: NavState = {
      tab: activeTab,
      selectedDoctorId,
      viewClinicDoctorId,
      selectedPatientId,
    };

    // Save current state to history stack if navigating to a different view or context
    if (
      currentState.tab !== newTab ||
      (options?.doctorId !== undefined && options.doctorId !== selectedDoctorId) ||
      (options?.clinicDoctorId !== undefined && options.clinicDoctorId !== viewClinicDoctorId) ||
      (options?.patientId !== undefined && options.patientId !== selectedPatientId)
    ) {
      setNavHistory((prev) => [...prev, currentState]);
    }

    const targetDoctorId = options?.doctorId !== undefined ? options.doctorId : selectedDoctorId;
    const targetClinicDoctorId = options?.clinicDoctorId !== undefined ? options.clinicDoctorId : viewClinicDoctorId;
    const targetPatientId = options?.patientId !== undefined ? options.patientId : selectedPatientId;

    if (options?.doctorId !== undefined) setSelectedDoctorId(options.doctorId);
    if (options?.clinicDoctorId !== undefined) setViewClinicDoctorId(options.clinicDoctorId);
    if (options?.patientId !== undefined) setSelectedPatientId(options.patientId);

    setActiveTab(newTab);

    // Sync clean URL bar in browser
    if (typeof window !== 'undefined') {
      if (newTab === 'clinic' && targetClinicDoctorId) {
        const cleanPath = `/clinic/${encodeURIComponent(targetClinicDoctorId)}`;
        if (window.location.pathname !== cleanPath) {
          window.history.pushState({ tab: 'clinic', doctorId: targetClinicDoctorId }, '', cleanPath);
        }
      } else if (newTab === 'admin') {
        if (window.location.pathname !== '/admin') {
          window.history.pushState({ tab: 'admin' }, '', '/admin');
        }
      } else if (newTab === 'directory' && window.location.pathname !== '/') {
        window.history.pushState({ tab: 'directory' }, '', '/');
      }
    }
  };

  // Back Button Handler (Goes 1 step back in navigation history)
  const handleGoBack = () => {
    if (navHistory.length === 0) {
      // Fallback to browser history if available
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      }
      return;
    }

    const previousState = navHistory[navHistory.length - 1];
    setNavHistory((prev) => prev.slice(0, prev.length - 1));

    setActiveTab(previousState.tab);
    setSelectedDoctorId(previousState.selectedDoctorId);
    setViewClinicDoctorId(previousState.viewClinicDoctorId);
    setSelectedPatientId(previousState.selectedPatientId);

    if (typeof window !== 'undefined') {
      if (previousState.tab === 'clinic' && previousState.viewClinicDoctorId) {
        window.history.replaceState(null, '', `/clinic/${encodeURIComponent(previousState.viewClinicDoctorId)}`);
      } else if (previousState.tab === 'admin') {
        window.history.replaceState(null, '', '/admin');
      } else if (previousState.tab === 'directory') {
        window.history.replaceState(null, '', '/');
      }
    }
  };

  // Modals state
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);

  // Toasts state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    title: string,
    message?: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Parse URL route or query params on load and navigation
  const parseUrlRoute = () => {
    if (typeof window === 'undefined') return;

    const pathname = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    // Check invitation token query param: ?invite=<token>
    const inviteParam = params.get('invite');
    if (inviteParam) {
      setPendingInviteToken(inviteParam);
    }

    // Check clean route: /admin
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      setActiveTab('admin');
      return;
    }

    // Check clean route: /clinic/:docId
    const clinicMatch = pathname.match(/^\/clinic\/([^/?#]+)/);
    if (clinicMatch && clinicMatch[1]) {
      const docId = decodeURIComponent(clinicMatch[1]);
      setSelectedDoctorId(docId);
      setViewClinicDoctorId(docId);
      setActiveTab('clinic');
      return;
    }

    // Check legacy query params: ?doc=<docId>
    const docParam = params.get('doc');
    const ticketParam = params.get('ticket');
    const viewParam = params.get('view');

    if (docParam) {
      setSelectedDoctorId(docParam);
      setViewClinicDoctorId(docParam);

      if (ticketParam) {
        setSelectedPatientId(ticketParam);
        setActiveTab('ticket');
      } else if (viewParam === 'clinic') {
        setActiveTab('clinic');
      } else {
        setActiveTab('booking');
      }
    } else {
      // Clean up test accounts automatically from Firestore
      purgeTestAccounts().catch(console.error);
    }
  };

  useEffect(() => {
    parseUrlRoute();

    const handlePopState = () => {
      parseUrlRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (activeTab === 'directory') {
      setPageSeo(DEFAULT_HOMEPAGE_SEO);
    }
  }, [activeTab]);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docProfile = await getDoctorProfile(user.uid);
        if (docProfile) {
          setCurrentDoctor(docProfile);

          // If user didn't explicitly open patient, clinic, or admin link, navigate to dashboard
          const params = new URLSearchParams(window.location.search);
          const isClinicRoute = window.location.pathname.startsWith('/clinic/');
          const isAdminRoute = window.location.pathname.startsWith('/admin');
          if (!params.get('doc') && !isClinicRoute && !isAdminRoute) {
            setActiveTab('dashboard');
          }
        }
      } else {
        setCurrentDoctor(null);
      }
    });

    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setCurrentDoctor(null);
    setActiveTab('directory');
    addToast("تم تسجيل الخروج بنجاح", "", "info");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Cairo',sans-serif]">
      
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Main Navbar */}
      <Navbar
        currentDoctor={currentDoctor}
        activeTab={activeTab}
        onNavigate={(tab) => {
          if (tab === 'booking') {
            const docId = currentDoctor?.uid || selectedDoctorId;
            const lastTicket = docId ? localStorage.getItem(`dawry_ticket_${docId}`) : null;
            if (lastTicket && selectedPatientId) {
              navigateTo('ticket', { doctorId: docId });
            } else {
              navigateTo('booking', { doctorId: docId });
            }
          } else {
            navigateTo(tab);
          }
        }}
        onOpenQRModal={() => setIsQRModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenNotificationModal={() => setIsNotificationModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* Global Back Button (Shown when navigation history exists) */}
        {navHistory.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-1 flex items-center justify-start">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-sky-700 rounded-2xl text-xs font-extrabold border border-slate-200/90 shadow-2xs hover:shadow-xs transition active:scale-95 group cursor-pointer"
              title="الرجوع للصفحة السابقة (خطوة واحدة للخلف)"
            >
              <ArrowRight className="w-4 h-4 text-sky-600 group-hover:-translate-x-1 transition-transform" />
              <span>رجوع</span>
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {/* Doctors Directory Tab (Default Landing View for patients) */}
            {activeTab === 'directory' && (
              <DoctorsDirectory
                onSelectDoctorClinic={(docId) => {
                  navigateTo('clinic', { clinicDoctorId: docId });
                }}
                onBookTurn={(docId) => {
                  navigateTo('booking', { doctorId: docId });
                }}
                onShowToast={addToast}
              />
            )}

            {/* Single Clinic Public Profile Page */}
            {activeTab === 'clinic' && (
              <ClinicProfilePage
                doctorId={viewClinicDoctorId}
                onBookTurn={(docId) => {
                  navigateTo('booking', { doctorId: docId });
                }}
                onBackToDirectory={() => handleGoBack()}
                onShowToast={addToast}
              />
            )}

            {/* Doctor's Private Dashboard */}
            {activeTab === 'dashboard' && (
              currentDoctor ? (
                currentDoctor.isActive === false ? (
                  <div className="max-w-xl mx-auto px-4 py-16 text-center">
                    <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200 shadow-xl">
                      <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <span className="font-black text-xl">!</span>
                      </div>
                      <h2 className="text-lg font-bold text-amber-900 mb-2">الحساب غير نشط حالياً</h2>
                      <p className="text-xs text-amber-800 leading-relaxed mb-6">
                        تم إيقاف حساب عيادتك مؤقتاً من قبل إدارة المنصة. يرجى التواصل مع الدعم الفني لتفعيل الحساب.
                      </p>
                      <a
                        href="https://wa.me/201032120351"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition shadow-md"
                      >
                        <span>تواصل مع الدعم الفني (01032120351)</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <DoctorDashboard
                    doctor={currentDoctor}
                    onOpenQRModal={() => setIsQRModalOpen(true)}
                    onOpenScannerModal={() => setIsScannerModalOpen(true)}
                    onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
                    onNavigateSubscription={() => navigateTo('subscription')}
                    onShowToast={addToast}
                  />
                )
              ) : (
                <AuthPage
                  onDoctorLoggedIn={(doc) => {
                    setCurrentDoctor(doc);
                    navigateTo('dashboard');
                  }}
                  onShowToast={addToast}
                  onSelectPatientBookingView={() => {
                    navigateTo('directory');
                  }}
                />
              )
            )}

            {/* Platform Protected Admin Guard & Dashboard */}
            {activeTab === 'admin' && (
              <AdminGuard
                onShowToast={addToast}
                onNavigateHome={() => navigateTo('directory')}
              />
            )}

            {/* Patient Live Booking View */}
            {activeTab === 'booking' && (
              <PatientBooking
                doctorId={selectedDoctorId}
                onBookingSuccess={(patientId) => {
                  navigateTo('ticket', { patientId });
                }}
                onShowToast={addToast}
                onBackToDoctorLogin={() => navigateTo('auth')}
              />
            )}

            {/* Patient Ticket & Live Queue Monitor View */}
            {activeTab === 'ticket' && selectedPatientId && (
              <PatientTicket
                doctorId={selectedDoctorId}
                patientId={selectedPatientId}
                onNewBooking={() => navigateTo('booking')}
                onShowToast={addToast}
              />
            )}

            {/* Subscription & Plans View */}
            {activeTab === 'subscription' && (
              <SubscriptionPage
                doctor={currentDoctor}
                onBackToDashboard={() => handleGoBack()}
                onShowToast={addToast}
              />
            )}

            {/* Doctor Login & Signup Auth View */}
            {activeTab === 'auth' && (
              <AuthPage
                onDoctorLoggedIn={(doc) => {
                  setCurrentDoctor(doc);
                  navigateTo('dashboard');
                }}
                onShowToast={addToast}
                onSelectPatientBookingView={() => {
                  navigateTo('directory');
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>

      {/* Persistent Floating WhatsApp Button */}
      <FloatingWhatsApp />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-semibold text-slate-700">
            دوري - نظام حجز وتتبع دور العيادات الطبية الأذكى © {new Date().getFullYear()}
          </div>
          
          <a
            href="https://wa.me/201032120351"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-full font-bold transition border border-emerald-200/80"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 fill-current" />
            <span>واتساب دعم وإدارة منصة دوري: 01032120351</span>
          </a>

          <div className="flex items-center gap-3 text-slate-500">
            <span>تحديث مباشر (Real-time)</span>
            <span>•</span>
            <span>مدعوم بـ Firebase Firestore</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        userId={currentDoctor?.uid || 'guest_user'}
        onShowToast={addToast}
      />

      {currentDoctor && (
        <>
          <QRModal
            isOpen={isQRModalOpen}
            onClose={() => setIsQRModalOpen(false)}
            doctor={currentDoctor}
            onCopyLink={() => addToast("تم نسخ رابط حجز العيادة بنجاح", "", "success")}
          />

          <QRScannerModal
            isOpen={isScannerModalOpen}
            onClose={() => setIsScannerModalOpen(false)}
            patients={[]}
            onSelectPatient={(p) => {
              addToast(`تم اختيار المريض #${p.sequenceNumber}`, p.name, "info");
            }}
          />

          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            doctor={currentDoctor}
            onShowToast={addToast}
          />
        </>
      )}

      {/* Clinic Invitation Acceptance Modal */}
      {pendingInviteToken && (
        <ClinicInvitationAcceptModal
          invitationToken={pendingInviteToken}
          currentUser={auth.currentUser}
          onAccepted={async () => {
            const urlWithoutInvite = new URL(window.location.href);
            urlWithoutInvite.searchParams.delete('invite');
            window.history.replaceState(null, '', urlWithoutInvite.pathname + urlWithoutInvite.search);
            setPendingInviteToken(null);

            if (auth.currentUser) {
              const docProfile = await getDoctorProfile(auth.currentUser.uid);
              if (docProfile) {
                setCurrentDoctor(docProfile);
              }
            }
            setActiveTab('dashboard');
          }}
          onClose={() => {
            const urlWithoutInvite = new URL(window.location.href);
            urlWithoutInvite.searchParams.delete('invite');
            window.history.replaceState(null, '', urlWithoutInvite.pathname + urlWithoutInvite.search);
            setPendingInviteToken(null);
          }}
          onShowToast={addToast}
        />
      )}

    </div>
  );
}
