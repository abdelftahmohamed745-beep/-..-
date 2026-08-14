import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  runTransaction
} from "firebase/firestore";
import { db } from "../firebase/config";
import {
  DoctorProfile,
  PatientRecord,
  PatientStatus,
  SubscriptionStatus,
  SubscriptionPlan,
  SubscriptionLog,
  NotificationTimingPreference,
  DoctorRating,
  FollowUpAppointment,
  FollowUpAppointmentStatus,
  FollowUpReminderSettings,
  PatientMedicalFile,
  PatientVisitEntry,
  ClinicMember,
  ClinicRole,
  ClinicPermission,
  ClinicInvitation,
  ClinicAuditLog,
  ClinicService,
  ClinicTransaction,
  ClinicExpense,
  PaymentStatus,
  PaymentMethod,
  ExpenseCategory,
  LabProfile,
  LabAdminView,
  AdminAnnouncement,
  AnnouncementType,
  AnnouncementTarget
} from "../types";
import { hasPermission } from "../utils/permissions";
import {
  sanitizeInput,
  isValidPhoneNumber,
  isValidUrl,
  checkBookingRateLimit,
  recordBookingSuccess,
  writeAuditLog
} from "./securityService";

export const DEMO_DOCTOR_ID = "demo-doctor-123";

// Official Subscription Prices (Server-Side Enforced)
export const OFFICIAL_SUBSCRIPTION_PRICES = {
  monthly: 200, // 200 EGP per month
  yearly: 1500  // 1500 EGP per year
} as const;

export function generateReferenceCode(uid: string): string {
  if (!uid) return 'REF-000000';
  const clean = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const code = clean.length >= 6 ? clean.slice(-6) : clean.padEnd(6, '0');
  return `REF-${code}`;
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return "";
  
  // 1. Convert Eastern Arabic / Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩ and ۰۱۲۳۴۵۶۷۸۹) to standard ASCII (0123456789)
  let str = phone.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
  str = str.replace(/[۰-۹]/g, (d) => (d.charCodeAt(0) - 1776).toString());

  // 2. Remove all non-digit characters
  const digits = str.replace(/\D/g, '');

  // 3. Normalize Egyptian mobile phone numbers
  if (digits.length === 12 && digits.startsWith('201')) {
    return '0' + digits.slice(2);
  }
  if (digits.length === 14 && digits.startsWith('00201')) {
    return '0' + digits.slice(4);
  }
  if (digits.length === 11 && digits.startsWith('01')) {
    return digits;
  }

  return digits || phone.trim();
}

export function getTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Check doctor subscription state dynamically
export function evaluateSubscriptionStatus(docData: DoctorProfile): SubscriptionStatus {
  if (docData.subscriptionStatus === 'cancelled') {
    return 'cancelled';
  }

  if (docData.subscriptionStatus === 'active') {
    if (docData.subscriptionEndDate) {
      const end = new Date(docData.subscriptionEndDate);
      if (new Date() > end) return 'expired';
    }
    return 'active';
  }
  
  if (docData.subscriptionStatus === 'trial') {
    if (docData.trialEndDate) {
      const trialEnd = new Date(docData.trialEndDate);
      if (new Date() > trialEnd) return 'expired';
    }
    return 'trial';
  }

  return 'expired';
}

// Helper to sanitize phone numbers for tel: and https://wa.me/ links
export function formatPhoneNumberForUrl(phone?: string): string {
  if (!phone) return "";
  // Strip +, spaces, dashes, parentheses
  return phone.replace(/[+\s\-()]/g, '');
}

// Fetch all active doctors for public directory listing
export async function getAllDoctors(): Promise<DoctorProfile[]> {
  try {
    const querySnap = await getDocs(collection(db, "doctors"));
    const doctors: DoctorProfile[] = [];
    querySnap.forEach((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DoctorProfile;
        data.referenceCode = data.referenceCode || generateReferenceCode(data.uid);
        data.subscriptionStatus = evaluateSubscriptionStatus(data);
        // Only include active and non-deleted clinics for public directory
        if (data.isActive !== false && !data.isDeleted) {
          doctors.push(data);
        }
      }
    });
    return doctors;
  } catch (error) {
    console.error("Error fetching doctors list:", error);
    return [];
  }
}

// Fetch all doctors for Platform Admin view (excludes soft deleted)
export async function getAllDoctorsAdmin(): Promise<DoctorProfile[]> {
  try {
    const querySnap = await getDocs(collection(db, "doctors"));
    const doctors: DoctorProfile[] = [];
    querySnap.forEach((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DoctorProfile;
        data.referenceCode = data.referenceCode || generateReferenceCode(data.uid);
        data.subscriptionStatus = evaluateSubscriptionStatus(data);
        if (!data.isDeleted) {
          doctors.push(data);
        }
      }
    });
    return doctors;
  } catch (error) {
    console.error("Error fetching admin doctors list:", error);
    return [];
  }
}

// Admin action: Toggle Doctor account active/deactivated status
export async function toggleDoctorStatus(doctorId: string, isActive: boolean): Promise<void> {
  const docRef = doc(db, "doctors", doctorId);
  await updateDoc(docRef, { isActive });
}

// Fetch all laboratories for Platform Admin view
export async function getAllLabsAdmin(): Promise<LabAdminView[]> {
  try {
    const querySnap = await getDocs(collection(db, "labs"));
    const labs: LabAdminView[] = [];

    const labPromises = querySnap.docs.map(async (docSnap) => {
      if (!docSnap.exists()) return null;
      const data = docSnap.data() as LabProfile;
      data.uid = docSnap.id;
      let staffCount = 0;
      let orderCount = 0;
      let email = data.email || "";

      try {
        const [staffSnap, orderSnap] = await Promise.all([
          getDocs(collection(db, "labs", docSnap.id, "staff")),
          getDocs(collection(db, "labs", docSnap.id, "orders"))
        ]);
        staffCount = staffSnap.size;
        orderCount = orderSnap.size;

        if (!email) {
          staffSnap.forEach((sDoc) => {
            const sData = sDoc.data();
            if (sData.email && (!email || sData.role === 'OWNER')) {
              email = sData.email;
            }
          });
        }

        if (!email) {
          const vSnap = await getDoc(doc(db, "email_verifications", docSnap.id));
          if (vSnap.exists() && vSnap.data()?.email) {
            email = vSnap.data().email;
          }
        }
      } catch (err) {
        console.warn(`Could not load subcollections for lab ${docSnap.id}:`, err);
      }

      const labView: LabAdminView = {
        ...data,
        email,
        staffCount,
        orderCount
      };
      return labView;
    });

    const results = await Promise.all(labPromises);
    results.forEach((res) => {
      if (res && !res.isDeleted) labs.push(res);
    });
    return labs;
  } catch (error) {
    console.error("Error fetching admin labs list:", error);
    return [];
  }
}

// Admin action: Toggle Laboratory account active/deactivated status
export async function toggleLabStatusAdmin(labId: string, isActive: boolean): Promise<void> {
  const docRef = doc(db, "labs", labId);
  await updateDoc(docRef, {
    isActive,
    updatedAt: new Date().toISOString()
  });
}

// Admin action: Activate or Extend Subscription (Server-side validation & audit log)
export async function activateSubscriptionByAdmin(params: {
  clinicId: string;
  plan: SubscriptionPlan;
  adminId: string;
  isExtension?: boolean;
  notes?: string;
}): Promise<{ success: boolean; expiresAt: string; referenceCode: string }> {
  const { clinicId, plan, adminId, isExtension, notes } = params;

  // 1. Fetch Doctor Profile
  const docRef = doc(db, "doctors", clinicId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error("عذراً، العيادة غير موجودة في النظام");
  }

  const doctor = snap.data() as DoctorProfile;

  // 2. Validate Clinic Active Status
  if (doctor.isActive === false) {
    throw new Error("لا يمكن تفعيل أو تمديد اشتراك لعيادة غير نشطة أو معطلة من قبل مدير المنصة");
  }

  // 3. Server-side enforce official price & reference code
  const amount = plan === 'yearly' ? OFFICIAL_SUBSCRIPTION_PRICES.yearly : OFFICIAL_SUBSCRIPTION_PRICES.monthly;
  const refCode = doctor.referenceCode || generateReferenceCode(doctor.uid);

  // 4. Calculate Expiration Date
  const now = new Date();
  let baseDate = now;

  // If extending an active subscription, add onto current expiration
  if (isExtension && doctor.subscriptionEndDate && evaluateSubscriptionStatus(doctor) === 'active') {
    const currentEnd = new Date(doctor.subscriptionEndDate);
    if (currentEnd > now) {
      baseDate = currentEnd;
    }
  }

  const newEnd = new Date(baseDate.getTime());
  if (plan === 'yearly') {
    newEnd.setFullYear(newEnd.getFullYear() + 1);
  } else {
    newEnd.setMonth(newEnd.getMonth() + 1);
  }

  const expiresAtIso = newEnd.toISOString();
  const activatedAtIso = now.toISOString();

  // 5. Update Doctor Doc in Firestore
  await updateDoc(docRef, {
    subscriptionStatus: 'active',
    subscriptionEndDate: expiresAtIso,
    referenceCode: refCode
  });

  // 6. Record Subscription Log in Firestore
  const logData: Omit<SubscriptionLog, 'id'> = {
    clinicId: doctor.uid,
    clinicName: doctor.clinicName,
    doctorName: doctor.name,
    referenceCode: refCode,
    plan,
    amount,
    activatedAt: activatedAtIso,
    expiresAt: expiresAtIso,
    adminId: adminId || 'admin-session',
    action: isExtension ? 'extend' : 'activate',
    notes: notes || ''
  };

  await addDoc(collection(db, "subscription_logs"), logData);

  writeAuditLog("ACTIVATE_SUBSCRIPTION", adminId || "ADMIN", doctor.uid, {
    plan,
    amount,
    expiresAt: expiresAtIso,
    isExtension: !!isExtension
  });

  return { success: true, expiresAt: expiresAtIso, referenceCode: refCode };
}

// Admin action: Cancel Subscription
export async function cancelSubscriptionByAdmin(params: {
  clinicId: string;
  adminId: string;
  notes?: string;
}): Promise<void> {
  const { clinicId, adminId, notes } = params;
  const docRef = doc(db, "doctors", clinicId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    throw new Error("العيادة غير موجودة في النظام");
  }

  const doctor = snap.data() as DoctorProfile;
  const refCode = doctor.referenceCode || generateReferenceCode(doctor.uid);
  const nowIso = new Date().toISOString();

  await updateDoc(docRef, {
    subscriptionStatus: 'cancelled'
  });

  const logData: Omit<SubscriptionLog, 'id'> = {
    clinicId: doctor.uid,
    clinicName: doctor.clinicName,
    doctorName: doctor.name,
    referenceCode: refCode,
    plan: 'monthly',
    amount: 0,
    activatedAt: nowIso,
    expiresAt: nowIso,
    adminId: adminId || 'admin-session',
    action: 'cancel',
    notes: notes || 'تم إلغاء الاشتراك من لوحة الإدارة'
  };

  await addDoc(collection(db, "subscription_logs"), logData);

  writeAuditLog("CANCEL_SUBSCRIPTION", adminId || "ADMIN", doctor.uid, { notes });
}

// Fetch all subscription logs for Admin view
export async function getAllSubscriptionLogs(): Promise<SubscriptionLog[]> {
  try {
    const q = query(
      collection(db, "subscription_logs"),
      orderBy("activatedAt", "desc"),
      limit(100)
    );
    const snap = await getDocs(q);
    const logs: SubscriptionLog[] = [];
    snap.forEach((d) => {
      logs.push({ id: d.id, ...d.data() } as SubscriptionLog);
    });
    return logs;
  } catch (err) {
    console.error("Error fetching subscription logs:", err);
    return [];
  }
}

// Admin action: Modify doctor subscription (Legacy wrapper)
export async function updateDoctorSubscriptionByAdmin(
  doctorId: string,
  status: SubscriptionStatus,
  monthsCount: number = 1
): Promise<void> {
  const docRef = doc(db, "doctors", doctorId);
  const now = new Date();
  const endDate = new Date(now.getTime() + monthsCount * 30 * 24 * 60 * 60 * 1000);

  await updateDoc(docRef, {
    subscriptionStatus: status,
    subscriptionEndDate: endDate.toISOString()
  });
}

// Admin action: Delete doctor profile
export async function deleteDoctorAccount(doctorId: string): Promise<void> {
  const docRef = doc(db, "doctors", doctorId);
  await deleteDoc(docRef);
}

// Verify Admin Status against Firebase Auth & Firestore
export async function verifyAdminStatus(user: any): Promise<{ isAdmin: boolean; doctor?: DoctorProfile; error?: string }> {
  if (!user || !user.uid) return { isAdmin: false, error: "غير مسجل الدخول" };

  try {
    // 1. Check Auth Token Custom Claims
    try {
      if (typeof user.getIdTokenResult === 'function') {
        const idTokenResult = await user.getIdTokenResult();
        if (idTokenResult && idTokenResult.claims && idTokenResult.claims.admin === true) {
          return { isAdmin: true };
        }
      }
    } catch (e) {
      console.warn("Token claim check warning:", e);
    }

    // 2. Check Firestore /admins/{uid} document (Secure Admin Identity Record)
    try {
      const adminRef = doc(db, "admins", user.uid);
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists()) {
        const adminData = adminSnap.data();
        if (adminData?.isAdmin !== false) {
          return { isAdmin: true };
        }
      }
    } catch (e) {
      console.warn("Admins collection check warning:", e);
    }

    // 3. Authorized Bootstrap Admin Emails check (abdelftahmohamed745@gmail.com)
    const normalizedEmail = user.email ? user.email.toLowerCase().trim() : '';
    const AUTHORIZED_ADMIN_EMAILS = [
      'abdelftahmohamed745@gmail.com',
      'admin@dawry.app'
    ];

    if (normalizedEmail && AUTHORIZED_ADMIN_EMAILS.includes(normalizedEmail)) {
      try {
        await setDoc(doc(db, "admins", user.uid), {
          uid: user.uid,
          email: user.email,
          isAdmin: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn("Could not write admin bootstrap doc:", e);
      }
      return { isAdmin: true };
    }

    return {
      isAdmin: false,
      error: "الحساب الحالي غير مصرح له بالوصول للوحة تحكم إدارة المنصة"
    };
  } catch (err: any) {
    console.error("Error verifying admin status:", err);
    return { isAdmin: false, error: "فشل التحقق من صلاحيات الحساب" };
  }
}

// Fetch Doctor Profile
export async function getDoctorProfile(doctorId: string): Promise<DoctorProfile | null> {
  try {
    const docRef = doc(db, "doctors", doctorId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as DoctorProfile;
      data.referenceCode = data.referenceCode || generateReferenceCode(data.uid);
      const computedStatus = evaluateSubscriptionStatus(data);
      if (computedStatus !== data.subscriptionStatus) {
        data.subscriptionStatus = computedStatus;
      }
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching doctor profile:", error);
    return null;
  }
}

// Create or initialize doctor profile
export async function createDoctorProfile(doctorId: string, name: string, specialty: string, clinicName: string): Promise<DoctorProfile> {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days free trial

  const newProfile: DoctorProfile = {
    uid: doctorId,
    referenceCode: generateReferenceCode(doctorId),
    name,
    specialty,
    clinicName: clinicName || `عيادة ${name}`,
    qrCodeId: `QR-${doctorId.slice(0, 8)}`,
    phone: "", // Doctor adds phone manually in settings
    whatsappNumber: "",
    address: "بغداد، العراق",
    city: "بغداد",
    photoUrl: "",
    description: `عيادة ${specialty} متخصصة بتقديم أفضل خدمات الرعاية الطبية.`,
    subscriptionStatus: "trial",
    trialEndDate: trialEnd.toISOString(),
    avgConsultTime: 12, // Default 12 minutes per patient
    workHours: {
      open: "09:00",
      close: "21:00",
      maxPatientsPerDay: 50,
      daysOfWeek: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"]
    },
    createdAt: now.toISOString(),
    isActive: true
  };

  await setDoc(doc(db, "doctors", doctorId), newProfile);
  return newProfile;
}

// Update doctor profile/settings with field protection and sanitization
export async function updateDoctorSettings(doctorId: string, updates: Partial<DoctorProfile>): Promise<void> {
  // Strip administrative / system fields to satisfy Firestore security rules
  const safeUpdates: Record<string, any> = { ...updates };
  delete safeUpdates.isAdmin;
  delete safeUpdates.isActive;
  delete safeUpdates.subscriptionStatus;
  delete safeUpdates.subscriptionEndDate;
  delete safeUpdates.createdAt;
  delete safeUpdates.ownerId;

  // Sanitize text inputs to prevent XSS
  if (safeUpdates.name) safeUpdates.name = sanitizeInput(safeUpdates.name);
  if (safeUpdates.clinicName) safeUpdates.clinicName = sanitizeInput(safeUpdates.clinicName);
  if (safeUpdates.specialty) safeUpdates.specialty = sanitizeInput(safeUpdates.specialty);
  if (safeUpdates.address) safeUpdates.address = sanitizeInput(safeUpdates.address);
  if (safeUpdates.city) safeUpdates.city = sanitizeInput(safeUpdates.city);
  if (safeUpdates.description) safeUpdates.description = sanitizeInput(safeUpdates.description);

  // Validate URLs if present
  if (safeUpdates.photoUrl && !isValidUrl(safeUpdates.photoUrl)) {
    throw new Error("رابط الصورة غير صالحة أو غير آمنة (يجب أن تبدأ بـ https://)");
  }

  const docRef = doc(db, "doctors", doctorId);
  await updateDoc(docRef, safeUpdates);

  // Write Audit Log
  writeAuditLog("UPDATE_DOCTOR_SETTINGS", doctorId, doctorId, { updatedFields: Object.keys(safeUpdates) });
}

// Check for active duplicate booking for phone number today
export async function checkActiveBooking(doctorId: string, phone: string): Promise<PatientRecord | null> {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) return null;
  const today = getTodayDateString();
  const q = query(
    collection(db, "queues", doctorId, "patients"),
    where("date", "==", today),
    where("phone", "==", normalizedPhone)
  );

  const snapshot = await getDocs(q);
  const activeDoc = snapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as PatientRecord))
    .find(p => p.status === 'waiting' || p.status === 'called');

  return activeDoc || null;
}

// Add Patient to Queue with rate limiting, subscription checks, and atomic sequence numbers
export async function bookPatient(
  doctorId: string,
  name: string,
  phone: string,
  userId?: string,
  notificationPreference: NotificationTimingPreference = 'two_turns',
  selectedService?: { serviceId?: string; serviceName: string; visitType?: string; price: number }
): Promise<{ patientId: string; sequenceNumber: number; isExisting?: boolean }> {
  // 1. Sanitize & Validate Inputs
  const cleanName = sanitizeInput(name);
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!cleanName || cleanName.length < 2) {
    throw new Error("يرجى إدخال اسم صحيح لا يقل عن حرفين");
  }

  if (cleanName.length > 100) {
    throw new Error("الاسم أطول من الحد المسموح به (100 حرف)");
  }

  if (!isValidPhoneNumber(normalizedPhone)) {
    throw new Error("رقم الهاتف غير صحيح. يرجى كتابة رقم هاتف صالح");
  }

  // 2. Check for active duplicate booking today first (idempotent ticket recovery)
  const existingBooking = await checkActiveBooking(doctorId, normalizedPhone);
  if (existingBooking) {
    return {
      patientId: existingBooking.id,
      sequenceNumber: existingBooking.sequenceNumber,
      isExisting: true
    };
  }

  // 3. Anti-Spam Rate Limiting Check for NEW bookings
  const rateCheck = checkBookingRateLimit(normalizedPhone);
  if (!rateCheck.allowed) {
    throw new Error(`يرجى الانتظار ${rateCheck.remainingSeconds} ثانية قبل محاولة الحجز مرة أخرى`);
  }

  // 3. Verify doctor subscription status & active account
  const doctor = await getDoctorProfile(doctorId);
  if (!doctor) {
    throw new Error("الطبيب غير موجود في النظام");
  }

  if (doctor.isActive === false) {
    throw new Error("عذراً، هذه العيادة متوقفة حالياً عن استقبال الحجوزات");
  }

  const effectiveSubStatus = evaluateSubscriptionStatus(doctor);
  if (effectiveSubStatus === 'expired') {
    throw new Error("عذراً، نظام الحجز غير متاح حالياً لدى هذه العيادة لانتهاء فترة الاشتراك. يرجى مراجعة موظف الاستقبال.");
  }

  // 5. Atomic Queue Sequence Number Generation via Transaction
  const today = getTodayDateString();
  const counterRef = doc(db, "queues", doctorId, "dailyCounters", today);
  const now = new Date().toISOString();

  // Deterministic booking document reference based on date + normalized phone
  const bookingDocId = `${today}_${normalizedPhone}`;
  const deterministicPatientRef = doc(db, "queues", doctorId, "patients", bookingDocId);

  // Baseline fetch in case counter document hasn't been created yet today
  const qBaseline = query(collection(db, "queues", doctorId, "patients"), where("date", "==", today));
  const snapBaseline = await getDocs(qBaseline);
  let baselineMaxSeq = 0;
  snapBaseline.docs.forEach((d) => {
    const p = d.data() as PatientRecord;
    if (typeof p.sequenceNumber === 'number' && p.sequenceNumber > baselineMaxSeq) {
      baselineMaxSeq = p.sequenceNumber;
    }
  });

  const transactionResult = await runTransaction(db, async (transaction) => {
    // A. Read deterministic patient doc inside transaction to prevent parallel race condition duplicates
    const patientSnap = await transaction.get(deterministicPatientRef);
    let targetPatientRef = deterministicPatientRef;

    if (patientSnap.exists()) {
      const existingData = patientSnap.data() as PatientRecord;
      if (existingData.status === 'waiting' || existingData.status === 'called') {
        return {
          patientId: patientSnap.id,
          sequenceNumber: existingData.sequenceNumber,
          isExisting: true
        };
      }
      // If previous ticket today was completed/cancelled, allocate new auto-ID doc
      targetPatientRef = doc(collection(db, "queues", doctorId, "patients"));
    }

    // B. Read daily counter inside transaction
    const counterSnap = await transaction.get(counterRef);
    let currentMaxSeq = baselineMaxSeq;

    if (counterSnap.exists()) {
      const recordedSeq = counterSnap.data().lastSequenceNumber;
      if (typeof recordedSeq === 'number' && recordedSeq > currentMaxSeq) {
        currentMaxSeq = recordedSeq;
      }
    }

    const nextSeq = currentMaxSeq + 1;

    if (doctor.workHours?.maxPatientsPerDay && nextSeq > doctor.workHours.maxPatientsPerDay) {
      throw new Error(`عذراً، اكتمل الحد الأقصى لحجوزات اليوم (${doctor.workHours.maxPatientsPerDay} مريض).`);
    }

    const estMins = Math.max(0, (nextSeq - 1) * (doctor.avgConsultTime || 12));

    const patientData: Omit<PatientRecord, 'id'> = {
      doctorId,
      clinicId: doctorId,
      userId: userId || '',
      sequenceNumber: nextSeq,
      queueNumber: nextSeq,
      name: cleanName,
      phone: normalizedPhone,
      status: 'waiting',
      date: today,
      serviceId: selectedService?.serviceId || '',
      serviceName: selectedService?.serviceName || 'كشف',
      visitType: selectedService?.visitType || selectedService?.serviceName || 'كشف جديد',
      price: typeof selectedService?.price === 'number' ? selectedService.price : 200,
      createdAt: now,
      updatedAt: now,
      estimatedMinutes: estMins,
      notificationSent: false,
      notifiedForTwoTurns: false,
      notifiedForOneTurn: false,
      notifiedForTenMinutes: false,
      notificationPreference
    };

    transaction.set(counterRef, {
      lastSequenceNumber: nextSeq,
      date: today,
      updatedAt: now
    }, { merge: true });

    transaction.set(targetPatientRef, patientData);

    return { patientId: targetPatientRef.id, sequenceNumber: nextSeq, isExisting: false };
  });

  // Record rate limiting timestamp ONLY on successful transaction completion
  if (!transactionResult.isExisting) {
    recordBookingSuccess(normalizedPhone);

    // Link visit to Patient Medical File
    try {
      await addVisitToPatientMedicalFile(doctorId, cleanName, normalizedPhone, {
        id: `visit_${Date.now()}`,
        date: today,
        serviceId: selectedService?.serviceId,
        serviceName: selectedService?.serviceName || 'كشف',
        visitType: selectedService?.visitType || selectedService?.serviceName || 'كشف جديد',
        price: typeof selectedService?.price === 'number' ? selectedService.price : 200,
        paidAmount: 0,
        remainingAmount: typeof selectedService?.price === 'number' ? selectedService.price : 200,
        status: 'waiting',
        createdAt: now
      });
    } catch (e) {
      console.warn("Could not auto-link visit to patient medical file:", e);
    }
  }

  // Write Audit Log
  writeAuditLog("BOOK_PATIENT_TICKET", userId || "PATIENT_PUBLIC", doctorId, {
    sequenceNumber: transactionResult.sequenceNumber,
    ticketId: transactionResult.patientId,
    isExisting: transactionResult.isExisting || false
  });

  return {
    patientId: transactionResult.patientId,
    sequenceNumber: transactionResult.sequenceNumber,
    isExisting: transactionResult.isExisting
  };
}

// Live Queue Listener for Doctor Dashboard
export function subscribeToDoctorQueue(
  doctorId: string,
  callback: (patients: PatientRecord[]) => void
) {
  const today = getTodayDateString();
  const q = query(
    collection(db, "queues", doctorId, "patients"),
    where("date", "==", today)
  );

  return onSnapshot(q, (snapshot) => {
    const list: PatientRecord[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as PatientRecord);
    });
    // Sort by sequence number ascending
    list.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    callback(list);
  }, (err) => {
    console.error("Queue listener error:", err);
  });
}

// Live Single Patient Ticket Listener with Dual Snapshot Sync Guard
export function subscribeToPatientTicket(
  doctorId: string,
  patientId: string,
  callback: (data: { patient: PatientRecord | null; doctor: DoctorProfile | null; allTodayPatients: PatientRecord[] }) => void
) {
  const today = getTodayDateString();
  const doctorRef = doc(db, "doctors", doctorId);
  const queueColRef = collection(db, "queues", doctorId, "patients");

  let currentDoctor: DoctorProfile | null = null;
  let allPatients: PatientRecord[] = [];
  let doctorLoaded = false;
  let queueLoaded = false;

  const unsubDoctor = onSnapshot(doctorRef, (docSnap) => {
    if (docSnap.exists()) {
      currentDoctor = docSnap.data() as DoctorProfile;
      currentDoctor.subscriptionStatus = evaluateSubscriptionStatus(currentDoctor);
    }
    doctorLoaded = true;
    emit();
  }, (err) => {
    console.error("Doctor ticket snapshot error:", err);
    doctorLoaded = true;
    emit();
  });

  const q = query(queueColRef, where("date", "==", today));
  const unsubQueue = onSnapshot(q, (snap) => {
    const list: PatientRecord[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as PatientRecord);
    });
    list.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    allPatients = list;
    queueLoaded = true;
    emit();
  }, (err) => {
    console.error("Queue ticket snapshot error:", err);
    queueLoaded = true;
    emit();
  });

  function emit() {
    // Prevent premature state emit until BOTH doctor and queue snapshots have loaded
    if (!doctorLoaded || !queueLoaded) return;
    const normalizedTarget = normalizePhoneNumber(patientId);
    let myPatient = allPatients.find(p => p.id === patientId) || null;
    if (!myPatient && normalizedTarget) {
      myPatient = allPatients.find(p => p.phone === normalizedTarget) || null;
    }
    callback({
      patient: myPatient,
      doctor: currentDoctor,
      allTodayPatients: allPatients
    });
  }

  return () => {
    unsubDoctor();
    unsubQueue();
  };
}

// Call Next Patient Action with Atomic Transaction
export async function callNextPatient(doctorId: string): Promise<{ calledPatient: PatientRecord | null }> {
  const today = getTodayDateString();
  const nowIso = new Date().toISOString();
  let nextCalledPatient: PatientRecord | null = null;

  await runTransaction(db, async (transaction) => {
    const queueColRef = collection(db, "queues", doctorId, "patients");
    const q = query(queueColRef, where("date", "==", today));
    const snap = await getDocs(q);

    const patients: PatientRecord[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatientRecord));
    patients.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    // 1. If there's an existing 'called' patient, mark them 'done'
    const currentCalled = patients.find(p => p.status === 'called');
    if (currentCalled) {
      const currentRef = doc(db, "queues", doctorId, "patients", currentCalled.id);
      transaction.update(currentRef, {
        status: 'done',
        doneAt: nowIso,
        updatedAt: nowIso
      });
    }

    // 2. Find next 'waiting' patient
    const nextWaiting = patients.find(p => p.status === 'waiting');
    if (nextWaiting) {
      const nextRef = doc(db, "queues", doctorId, "patients", nextWaiting.id);
      transaction.update(nextRef, {
        status: 'called',
        calledAt: nowIso,
        updatedAt: nowIso
      });
      nextCalledPatient = { ...nextWaiting, status: 'called', calledAt: nowIso };
    }
  });

  // 3. Recalculate average consultation time in background
  recalculateDoctorAvgConsultTime(doctorId).catch(console.error);

  return { calledPatient: nextCalledPatient };
}

// Update single patient status
export async function updatePatientStatus(
  doctorId: string,
  patientId: string,
  newStatus: PatientStatus
): Promise<void> {
  const nowIso = new Date().toISOString();
  const updates: Partial<PatientRecord> = { status: newStatus };

  if (newStatus === 'called') updates.calledAt = nowIso;
  if (newStatus === 'done') updates.doneAt = nowIso;
  if (newStatus === 'cancelled') updates.cancelledAt = nowIso;

  await updateDoc(doc(db, "queues", doctorId, "patients", patientId), updates);

  if (newStatus === 'done') {
    recalculateDoctorAvgConsultTime(doctorId).catch(console.error);
  }
}

// Auto-recalculate doctor avg consult time from last 10 done patients
export async function recalculateDoctorAvgConsultTime(doctorId: string): Promise<number> {
  try {
    const today = getTodayDateString();
    const q = query(
      collection(db, "queues", doctorId, "patients"),
      where("date", "==", today),
      where("status", "==", "done")
    );

    const snap = await getDocs(q);
    const donePatients = snap.docs.map(d => d.data() as PatientRecord);

    const validDurations: number[] = [];
    donePatients.forEach(p => {
      const startTimeStr = p.calledAt || p.createdAt;
      const endTimeStr = p.doneAt;
      if (startTimeStr && endTimeStr) {
        const start = new Date(startTimeStr).getTime();
        const end = new Date(endTimeStr).getTime();
        const diffMinutes = Math.round((end - start) / (1000 * 60));
        // Ignore unreasonable outliers (< 1 min or > 120 mins)
        if (diffMinutes >= 1 && diffMinutes <= 120) {
          validDurations.push(diffMinutes);
        }
      }
    });

    if (validDurations.length > 0) {
      // average of last 10
      const recent = validDurations.slice(-10);
      const sum = recent.reduce((acc, curr) => acc + curr, 0);
      const avg = Math.max(3, Math.round(sum / recent.length)); // minimum 3 mins

      await updateDoc(doc(db, "doctors", doctorId), { avgConsultTime: avg });
      return avg;
    }
  } catch (err) {
    console.error("Error recalculating avg consult time:", err);
  }
  return 12; // fallback default
}

// Delete doctor account securely via Backend/Admin function
export async function deleteDoctorAccountByAdmin(doctorId: string, adminUid: string): Promise<{ success: boolean; message: string }> {
  try {
    // Audit Log
    writeAuditLog("DELETE_DOCTOR_ACCOUNT_REQUEST", adminUid, doctorId, { targetDoctorId: doctorId });

    // Call server API / Firebase Callable Cloud Function
    const response = await fetch("/api/admin/delete-doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId, adminUid })
    });

    if (!response.ok) {
      // Fallback direct delete if server route unavailable and auth is admin
      await updateDoc(doc(db, "doctors", doctorId), { isActive: false });
      return { success: true, message: "تم تعطيل حساب العيادة بنجاح" };
    }

    const data = await response.json();
    return { success: true, message: data.message || "تم حذف حساب الطبيب بنجاح" };
  } catch (err: any) {
    console.error("Error deleting doctor account:", err);
    throw new Error(err.message || "فشلت عملية حذف حساب الطبيب");
  }
}

// Purge all test accounts and demo data from database securely
export async function purgeTestAccounts(): Promise<{ success: boolean; deletedCount: number }> {
  try {
    let deletedCount = 0;
    
    // 1. Delete default demo doctor doc
    const demoDocRef = doc(db, "doctors", DEMO_DOCTOR_ID);
    const demoSnap = await getDoc(demoDocRef);
    if (demoSnap.exists()) {
      await deleteDoc(demoDocRef);
      deletedCount++;
    }

    // 2. Query any doctors marked as test/demo
    const querySnap = await getDocs(collection(db, "doctors"));
    for (const docSnap of querySnap.docs) {
      if (docSnap.exists()) {
        const data = docSnap.data() as DoctorProfile;
        if (
          docSnap.id === DEMO_DOCTOR_ID ||
          data.uid === DEMO_DOCTOR_ID ||
          data.name?.includes("تجريبي") ||
          data.name?.includes("أسامة عبد الرحمن") ||
          data.qrCodeId?.includes("DEMO")
        ) {
          // Delete patients in subcollection queue
          try {
            const patientsSnap = await getDocs(collection(db, "queues", docSnap.id, "patients"));
            for (const pDoc of patientsSnap.docs) {
              await deleteDoc(pDoc.ref);
            }
          } catch (e) {
            console.error("Error deleting queue patients:", e);
          }

          // Delete doctor document
          await deleteDoc(docSnap.ref);
          deletedCount++;
        }
      }
    }

    // 3. Delete demo follow up appointments
    try {
      const followUpsSnap = await getDocs(
        query(collection(db, "followUpAppointments"), where("doctorId", "==", DEMO_DOCTOR_ID))
      );
      for (const fDoc of followUpsSnap.docs) {
        await deleteDoc(fDoc.ref);
      }
    } catch (e) {
      console.error("Error purging demo follow-up appointments:", e);
    }

    console.log(`Purged ${deletedCount} test accounts from database.`);
    return { success: true, deletedCount };
  } catch (err) {
    console.error("Error purging test accounts:", err);
    return { success: false, deletedCount: 0 };
  }
}

// Check if a patient ticket has already been rated
export async function checkTicketRated(patientRecordId: string): Promise<DoctorRating | null> {
  try {
    const q = query(
      collection(db, "ratings"),
      where("patientRecordId", "==", patientRecordId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as DoctorRating;
    }
    return null;
  } catch (err) {
    console.error("Error checking ticket rating:", err);
    return null;
  }
}

// Submit a new doctor rating and update average stats
export async function addDoctorRating(params: {
  doctorId: string;
  patientRecordId: string;
  patientName: string;
  patientPhone?: string;
  stars: number;
  comment?: string;
}): Promise<DoctorRating> {
  const { doctorId, patientRecordId, patientName, patientPhone, stars, comment } = params;

  if (stars < 1 || stars > 5) {
    throw new Error("التقييم يجب أن يكون بين 1 و 5 نجوم");
  }

  // 1. Prevent double rating for same booking
  const existingRating = await checkTicketRated(patientRecordId);
  if (existingRating) {
    throw new Error("لقد قمت بإرسال تقييمك لهذه الزيارة من قبل. شكرًا لك!");
  }

  const cleanName = sanitizeInput(patientName || "مريض");
  const cleanComment = comment ? sanitizeInput(comment) : "";
  const nowIso = new Date().toISOString();

  const ratingData: Omit<DoctorRating, 'id'> = {
    doctorId,
    patientRecordId,
    patientName: cleanName,
    patientPhone: patientPhone ? patientPhone.trim() : "",
    stars: Math.round(stars),
    comment: cleanComment,
    createdAt: nowIso
  };

  // 2. Save to 'ratings' collection
  const docRef = await addDoc(collection(db, "ratings"), ratingData);
  const newRating: DoctorRating = { id: docRef.id, ...ratingData };

  // 3. Recalculate average rating & total count for the doctor
  recalculateDoctorRatingStats(doctorId).catch(console.error);

  // Write audit log
  writeAuditLog("ADD_DOCTOR_RATING", "PATIENT_PUBLIC", doctorId, {
    stars,
    ratingId: docRef.id
  });

  return newRating;
}

// Fetch all ratings for a given doctor
export async function getDoctorRatings(doctorId: string): Promise<DoctorRating[]> {
  try {
    const q = query(
      collection(db, "ratings"),
      where("doctorId", "==", doctorId)
    );
    const snap = await getDocs(q);
    const list: DoctorRating[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as DoctorRating);
    });
    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.error("Error fetching doctor ratings:", err);
    return [];
  }
}

// Recalculate doctor rating average and count
export async function recalculateDoctorRatingStats(doctorId: string): Promise<{ avg: number; count: number }> {
  try {
    const ratings = await getDoctorRatings(doctorId);
    const count = ratings.length;
    if (count === 0) {
      await updateDoc(doc(db, "doctors", doctorId), { ratingAverage: 0, ratingCount: 0 });
      return { avg: 0, count: 0 };
    }

    const totalStars = ratings.reduce((acc, r) => acc + r.stars, 0);
    const avg = parseFloat((totalStars / count).toFixed(1));

    await updateDoc(doc(db, "doctors", doctorId), { ratingAverage: avg, ratingCount: count });
    return { avg, count };
  } catch (err) {
    console.error("Error recalculating rating stats:", err);
    return { avg: 0, count: 0 };
  }
}

// ==========================================
// FOLLOW-UP APPOINTMENTS (مواعيد إعادة الكشف)
// ==========================================

// Validate date and time are not in the past
export function isDateTimeInPast(dateStr: string, timeStr: string): boolean {
  try {
    const appointmentDateTime = new Date(`${dateStr}T${timeStr}:00`);
    const now = new Date();
    return appointmentDateTime.getTime() < now.getTime() - 60000; // allow 1 min margin
  } catch {
    return false;
  }
}

// Create a new follow-up appointment
export async function createFollowUpAppointment(params: {
  patientName: string;
  patientPhone: string;
  patientId?: string;
  doctorId: string;
  doctorName?: string;
  clinicId?: string;
  clinicName?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  notes?: string;
  reason?: string;
  reminderSettings?: FollowUpReminderSettings;
}): Promise<FollowUpAppointment> {
  const {
    patientName,
    patientPhone,
    patientId,
    doctorId,
    doctorName,
    clinicId,
    clinicName,
    appointmentDate,
    appointmentTime,
    notes,
    reason,
    reminderSettings
  } = params;

  if (!patientName || !patientName.trim()) {
    throw new Error("اسم المريض مطلوب لحجز موعد إعادة الكشف");
  }

  if (!patientPhone || !patientPhone.trim()) {
    throw new Error("رقم هاتف المريض مطلوب");
  }

  if (!appointmentDate || !appointmentTime) {
    throw new Error("يرجى تحديد تاريخ ووقت موعد إعادة الكشف");
  }

  if (isDateTimeInPast(appointmentDate, appointmentTime)) {
    throw new Error("لا يمكن إنشاء موعد إعادة كشف بتاريخ أو وقت في الماضي");
  }

  const cleanName = sanitizeInput(patientName);
  const cleanPhone = patientPhone.trim();
  const cleanNotes = notes ? sanitizeInput(notes) : "";
  const cleanReason = reason ? sanitizeInput(reason) : "";
  const nowIso = new Date().toISOString();

  const appointmentData: Omit<FollowUpAppointment, 'id'> = {
    patientId: patientId || "",
    patientName: cleanName,
    patientPhone: cleanPhone,
    doctorId,
    doctorName: doctorName || "الطبيب",
    clinicId: clinicId || doctorId,
    clinicName: clinicName || "العيادة",
    appointmentDate,
    appointmentTime,
    notes: cleanNotes,
    reason: cleanReason,
    reminderSettings: reminderSettings || { oneDayBefore: true, twoHoursBefore: true },
    appointmentStatus: 'upcoming',
    createdAt: nowIso
  };

  const docRef = await addDoc(collection(db, "followUpAppointments"), appointmentData);
  const newAppointment: FollowUpAppointment = { id: docRef.id, ...appointmentData };

  writeAuditLog("CREATE_FOLLOWUP_APPOINTMENT", "DOCTOR", doctorId, {
    appointmentId: docRef.id,
    patientName: cleanName,
    appointmentDate,
    appointmentTime
  });

  return newAppointment;
}

// Subscribe to doctor's follow-up appointments
export function subscribeToDoctorFollowUps(
  doctorId: string,
  callback: (appointments: FollowUpAppointment[]) => void
) {
  const q = query(
    collection(db, "followUpAppointments"),
    where("doctorId", "==", doctorId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: FollowUpAppointment[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as FollowUpAppointment);
      });
      list.sort((a, b) => {
        const dtA = new Date(`${a.appointmentDate}T${a.appointmentTime}`).getTime();
        const dtB = new Date(`${b.appointmentDate}T${b.appointmentTime}`).getTime();
        return dtA - dtB;
      });
      callback(list);
    },
    (err) => {
      console.error("Error subscribing to doctor follow-ups:", err);
      callback([]);
    }
  );
}

// Get patient follow-up appointments by phone or patientId
export async function getPatientFollowUpAppointments(phone: string): Promise<FollowUpAppointment[]> {
  try {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return [];

    const q = query(
      collection(db, "followUpAppointments"),
      where("patientPhone", "==", cleanPhone)
    );

    const snapshot = await getDocs(q);
    const list: FollowUpAppointment[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as FollowUpAppointment);
    });

    list.sort((a, b) => {
      const dtA = new Date(`${a.appointmentDate}T${a.appointmentTime}`).getTime();
      const dtB = new Date(`${b.appointmentDate}T${b.appointmentTime}`).getTime();
      return dtA - dtB;
    });

    return list;
  } catch (err) {
    console.error("Error getting patient follow-ups:", err);
    return [];
  }
}

// Real-time subscriber for patient follow-up appointments by phone
export function subscribeToPatientFollowUps(
  phone: string,
  callback: (appointments: FollowUpAppointment[]) => void
) {
  const cleanPhone = phone.trim();
  if (!cleanPhone) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, "followUpAppointments"),
    where("patientPhone", "==", cleanPhone)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: FollowUpAppointment[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as FollowUpAppointment);
      });
      list.sort((a, b) => {
        const dtA = new Date(`${a.appointmentDate}T${a.appointmentTime}`).getTime();
        const dtB = new Date(`${b.appointmentDate}T${b.appointmentTime}`).getTime();
        return dtA - dtB;
      });
      callback(list);
    },
    (err) => {
      console.error("Error subscribing to patient follow-ups:", err);
      callback([]);
    }
  );
}

// Update follow-up appointment status (Doctor / Patient)
export async function updateFollowUpAppointmentStatus(
  appointmentId: string,
  status: FollowUpAppointmentStatus
): Promise<void> {
  const docRef = doc(db, "followUpAppointments", appointmentId);
  await updateDoc(docRef, {
    appointmentStatus: status,
    updatedAt: new Date().toISOString()
  });
}

// Update full follow-up appointment details (Doctor)
export async function updateFollowUpAppointment(
  appointmentId: string,
  updates: Partial<FollowUpAppointment>
): Promise<void> {
  if (updates.appointmentDate && updates.appointmentTime) {
    if (isDateTimeInPast(updates.appointmentDate, updates.appointmentTime)) {
      throw new Error("لا يمكن تعديل الموعد إلى تاريخ أو وقت في الماضي");
    }
  }

  const docRef = doc(db, "followUpAppointments", appointmentId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

// Patient requests a reschedule
export async function requestRescheduleFollowUp(
  appointmentId: string,
  newDate: string,
  newTime: string
): Promise<void> {
  if (isDateTimeInPast(newDate, newTime)) {
    throw new Error("التاريخ والوقت المقترحان يجب أن يكونا في المستقبل");
  }

  const docRef = doc(db, "followUpAppointments", appointmentId);
  await updateDoc(docRef, {
    rescheduleRequested: true,
    requestedNewDate: newDate,
    requestedNewTime: newTime,
    updatedAt: new Date().toISOString()
  });
}

// =========================================================
// CLINIC ORGANIZATION, MEMBERSHIP & PERMISSIONS API
// =========================================================

// Get active clinic member record for current authenticated user
export async function getUserClinicMember(user: any): Promise<{ member: ClinicMember | null; isPrimaryOwner: boolean }> {
  if (!user || !user.uid) return { member: null, isPrimaryOwner: false };

  try {
    // 1. Direct check by UID
    const memberDocRef = doc(db, "clinic_members", user.uid);
    const memberSnap = await getDoc(memberDocRef);

    if (memberSnap.exists()) {
      const data = memberSnap.data() as ClinicMember;
      if (data.status === 'invited') {
        return { member: null, isPrimaryOwner: false };
      }
      return { member: data, isPrimaryOwner: data.role === 'OWNER' };
    }

    // 2. Fallback check: Is user an existing Doctor profile owner?
    const docRef = doc(db, "doctors", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const docData = docSnap.data();
      const ownerMember: ClinicMember = {
        id: user.uid,
        uid: user.uid,
        organizationId: user.uid,
        role: 'OWNER',
        displayName: docData.name || user.displayName || user.email || "مالك العيادة",
        email: user.email ? user.email.toLowerCase().trim() : "",
        status: 'active',
        createdAt: docData.createdAt || new Date().toISOString()
      };

      // Bootstrap clinic member document for smooth sync
      try {
        await setDoc(doc(db, "clinic_members", user.uid), ownerMember, { merge: true });
        await setDoc(doc(db, `organizations/${user.uid}/members`, user.uid), ownerMember, { merge: true });
        await setDoc(doc(db, "organizations", user.uid), {
          organizationId: user.uid,
          clinicName: docData.clinicName || "العيادة",
          ownerUid: user.uid,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.warn("Auto-bootstrap member doc error:", e);
      }

      return { member: ownerMember, isPrimaryOwner: true };
    }

    return { member: null, isPrimaryOwner: false };
  } catch (err) {
    console.error("Error fetching user clinic member info:", err);
    return { member: null, isPrimaryOwner: false };
  }
}

// Real-time subscription to clinic members list
export function subscribeToClinicMembers(
  organizationId: string,
  callback: (members: ClinicMember[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, "clinic_members"),
    where("organizationId", "==", organizationId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const members: ClinicMember[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ClinicMember;
        // Do not include unaccepted invitations in members list
        if (data.status === 'invited') return;
        members.push({ id: docSnap.id, ...data });
      });

      // Sort: OWNER first, then DOCTOR, SECRETARY, STAFF
      const roleOrder: Record<string, number> = { OWNER: 1, DOCTOR: 2, SECRETARY: 3, STAFF: 4 };
      members.sort((a, b) => (roleOrder[a.role] || 5) - (roleOrder[b.role] || 5));

      callback(members);
    },
    (err) => {
      console.error("Error subscribing to clinic members:", err);
      callback([]);
    }
  );
}

// Create secure clinic invitation
export async function createClinicInvitation(
  actorMember: ClinicMember,
  clinicName: string,
  data: {
    displayName: string;
    email: string;
    role: ClinicRole;
    customPermissions?: ClinicPermission[];
  }
): Promise<ClinicInvitation> {
  const cleanEmail = data.email.toLowerCase().trim();
  const orgId = actorMember.organizationId;

  if (!cleanEmail) throw new Error("يرجى إدخال البريد الإلكتروني للموظف");
  if (!data.displayName.trim()) throw new Error("يرجى إدخال اسم الموظف");
  if (data.role === 'OWNER') throw new Error("لا يمكن إرسال دعوة بدور المالك");

  // SERVER-SIDE DUPLICATE CHECKS (BUG #3)
  
  // 1. Check existing members in clinic_members for same org + email
  const membersQuery = query(
    collection(db, "clinic_members"),
    where("organizationId", "==", orgId)
  );
  const membersSnap = await getDocs(membersQuery);
  const existingMember = membersSnap.docs
    .map(d => d.data() as ClinicMember)
    .find(m => m.email && m.email.toLowerCase().trim() === cleanEmail && m.status !== 'invited');

  if (existingMember) {
    if (existingMember.status === 'active') {
      throw new Error(`البريد الإلكتروني (${cleanEmail}) ينتمي لعضو نشط بالفعل في العيادة.`);
    }
    if (existingMember.status === 'disabled') {
      throw new Error(`البريد الإلكتروني (${cleanEmail}) ينتمي لعضو معطل في العيادة. يمكنك إعادة تفعيل حسابه من قائمة الأعضاء بدلاً من إرسال دعوة جديدة.`);
    }
  }

  // 2. Check existing pending invitations in clinic_invitations for same org + email
  const invQuery = query(
    collection(db, "clinic_invitations"),
    where("organizationId", "==", orgId)
  );
  const invSnap = await getDocs(invQuery);
  const now = new Date();
  
  const existingPendingInv = invSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as ClinicInvitation))
    .find(inv => {
      const invEmail = inv.invitedEmail ? inv.invitedEmail.toLowerCase().trim() : '';
      if (invEmail !== cleanEmail) return false;
      if (inv.status === 'pending') {
        const isExpired = inv.expiresAt && new Date(inv.expiresAt) < now;
        return !isExpired;
      }
      return false;
    });

  if (existingPendingInv) {
    throw new Error(`توجد دعوة معلقة بالفعل لهذا البريد الإلكتروني (${cleanEmail}). يمكنك نسخ رابط الدعوة الحالية أو إلغاؤها قبل إرسال دعوة جديدة.`);
  }

  const existingAcceptedInv = invSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as ClinicInvitation))
    .find(inv => {
      const invEmail = inv.invitedEmail ? inv.invitedEmail.toLowerCase().trim() : '';
      return invEmail === cleanEmail && inv.status === 'accepted';
    });

  if (existingAcceptedInv && existingMember) {
    throw new Error(`هذا البريد الإلكتروني ينتمي لعضو في العيادة بالفعل.`);
  }

  // Generate invitation token
  const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const invitation: ClinicInvitation = {
    id: token,
    organizationId: orgId,
    clinicName: clinicName || "العيادة",
    invitedEmail: cleanEmail,
    invitedName: data.displayName.trim(),
    role: data.role,
    customPermissions: data.customPermissions || [],
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt,
    invitedBy: actorMember.uid,
    invitedByName: actorMember.displayName
  };

  // Store ONLY in clinic_invitations! (Do NOT create unaccepted clinic_members doc)
  await setDoc(doc(db, "clinic_invitations", token), invitation);

  await logClinicAction({
    organizationId: orgId,
    actorUid: actorMember.uid,
    actorName: actorMember.displayName,
    action: 'member_invited',
    targetUid: token,
    targetEmail: cleanEmail,
    targetName: data.displayName.trim(),
    details: `تم إنشاء دعوة انضمام بدور ${data.role}`
  });

  return invitation;
}

// Get Clinic Invitation by token/ID
export async function getClinicInvitation(invitationId: string): Promise<ClinicInvitation | null> {
  if (!invitationId) return null;
  try {
    const snap = await getDoc(doc(db, "clinic_invitations", invitationId));
    if (!snap.exists()) return null;
    const inv = snap.data() as ClinicInvitation;

    // Check if expired dynamically
    if (inv.status === 'pending' && inv.expiresAt && new Date(inv.expiresAt) < new Date()) {
      return { ...inv, status: 'expired' };
    }

    return inv;
  } catch (err) {
    console.error("Error fetching invitation:", err);
    return null;
  }
}

// Accept Clinic Invitation
export async function acceptClinicInvitation(
  invitationId: string,
  currentUser: { uid: string; email: string; displayName?: string }
): Promise<ClinicMember> {
  if (!invitationId) throw new Error("معرّف الدعوة غير صالح");
  if (!currentUser || !currentUser.uid || !currentUser.email) {
    throw new Error("يرجى تسجيل الدخول أولاً لقبول الدعوة");
  }

  const invitationRef = doc(db, "clinic_invitations", invitationId);
  const snap = await getDoc(invitationRef);
  if (!snap.exists()) throw new Error("الدعوة غير موجودة أو تم حذفها");

  const invitation = snap.data() as ClinicInvitation;

  if (invitation.status === 'accepted') {
    throw new Error("تم قبول هذه الدعوة سابقاً");
  }
  if (invitation.status === 'revoked') {
    throw new Error("تم إلغاء هذه الدعوة من قبل إدارة العيادة");
  }
  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) {
    throw new Error("عفواً، انتهت صلاحية هذه الدعوة");
  }

  const cleanUserEmail = currentUser.email.toLowerCase().trim();
  const cleanInvitedEmail = invitation.invitedEmail.toLowerCase().trim();

  if (cleanUserEmail !== cleanInvitedEmail) {
    throw new Error(`حسابك الحالي (${cleanUserEmail}) لا يطابق البريد الإلكتروني المدعو (${cleanInvitedEmail}). يرجى تسجيل الدخول بالبريد الإلكتروني الصحيح.`);
  }

  if (invitation.role === 'OWNER') {
    throw new Error("غير مسموح بإنشاء حساب مالك عبر الدعوات العادية");
  }

  const newMember: ClinicMember = {
    id: currentUser.uid,
    uid: currentUser.uid,
    organizationId: invitation.organizationId,
    role: invitation.role,
    displayName: currentUser.displayName || invitation.invitedName || currentUser.email,
    email: cleanUserEmail,
    status: 'active',
    createdAt: new Date().toISOString(),
    invitedBy: invitation.invitedBy,
    customPermissions: invitation.customPermissions || []
  };

  // 1. Create active member documents securely
  await setDoc(doc(db, "clinic_members", currentUser.uid), newMember);
  await setDoc(doc(db, `organizations/${invitation.organizationId}/members`, currentUser.uid), newMember);

  // 2. Mark invitation document as accepted
  await updateDoc(invitationRef, {
    status: 'accepted',
    acceptedByUid: currentUser.uid,
    acceptedAt: new Date().toISOString()
  });

  // 3. Clean up temp doc ID if present
  const tempDocId = `${invitation.organizationId}_${cleanUserEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
  try {
    await deleteDoc(doc(db, "clinic_members", tempDocId));
    await deleteDoc(doc(db, `organizations/${invitation.organizationId}/members`, tempDocId));
  } catch (e) { /* ignore */ }

  // 4. Audit Log
  await logClinicAction({
    organizationId: invitation.organizationId,
    actorUid: currentUser.uid,
    actorName: newMember.displayName,
    action: 'invitation_accepted',
    targetUid: currentUser.uid,
    targetEmail: cleanUserEmail,
    targetName: newMember.displayName,
    details: `تم قبول الدعوة والانضمام للعيادة بدور ${invitation.role}`
  });

  return newMember;
}

// Revoke a pending invitation
export async function revokeClinicInvitation(
  actorMember: ClinicMember,
  invitationId: string
): Promise<void> {
  const orgId = actorMember.organizationId;
  const invitationRef = doc(db, "clinic_invitations", invitationId);
  const snap = await getDoc(invitationRef);
  if (!snap.exists()) throw new Error("الدعوة غير موجودة");

  const inv = snap.data() as ClinicInvitation;

  await updateDoc(invitationRef, {
    status: 'revoked',
    updatedAt: new Date().toISOString()
  });

  const tempDocId = `${orgId}_${inv.invitedEmail.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
  try {
    await deleteDoc(doc(db, "clinic_members", tempDocId));
    await deleteDoc(doc(db, `organizations/${orgId}/members`, tempDocId));
  } catch (e) { /* ignore */ }

  await logClinicAction({
    organizationId: orgId,
    actorUid: actorMember.uid,
    actorName: actorMember.displayName,
    action: 'invitation_revoked',
    targetUid: invitationId,
    targetEmail: inv.invitedEmail,
    targetName: inv.invitedName,
    details: `تم إلغاء دعوة الانضمام`
  });
}

// Real-time subscription to pending clinic invitations
export function subscribeToPendingInvitations(
  organizationId: string,
  callback: (invitations: ClinicInvitation[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, "clinic_invitations"),
    where("organizationId", "==", organizationId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const invitations: ClinicInvitation[] = [];
      const now = new Date();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ClinicInvitation;
        let status = data.status;
        if (status === 'pending' && data.expiresAt && new Date(data.expiresAt) < now) {
          status = 'expired';
        }
        invitations.push({ ...data, id: docSnap.id, status });
      });

      invitations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(invitations);
    },
    (err) => {
      console.error("Error subscribing to invitations:", err);
      callback([]);
    }
  );
}

// Add/Invite a new clinic member
export async function inviteClinicMember(
  actorMember: ClinicMember,
  data: {
    displayName: string;
    email: string;
    role: ClinicRole;
    customPermissions?: ClinicPermission[];
  },
  clinicName?: string
): Promise<ClinicInvitation> {
  return createClinicInvitation(actorMember, clinicName || "العيادة", data);
}

// Update member role
export async function updateClinicMemberRole(
  actorMember: ClinicMember,
  targetMemberId: string,
  newRole: ClinicRole
): Promise<void> {
  const orgId = actorMember.organizationId;

  const targetDocRef = doc(db, "clinic_members", targetMemberId);
  const targetSnap = await getDoc(targetDocRef);
  if (!targetSnap.exists()) throw new Error("العضو غير موجود");

  const targetData = targetSnap.data() as ClinicMember;

  if (targetData.role === 'OWNER' && newRole !== 'OWNER' && targetMemberId === actorMember.uid) {
    throw new Error("لا يمكنك إلغاء صلاحية المالك عن نفسك بنفسك");
  }

  const updates = {
    role: newRole,
    updatedAt: new Date().toISOString()
  };

  await updateDoc(targetDocRef, updates);
  try {
    await updateDoc(doc(db, `organizations/${orgId}/members`, targetMemberId), updates);
  } catch (e) { /* ignore */ }

  await logClinicAction({
    organizationId: orgId,
    actorUid: actorMember.uid,
    actorName: actorMember.displayName,
    action: 'role_changed',
    targetUid: targetMemberId,
    targetEmail: targetData.email,
    targetName: targetData.displayName,
    details: `تغيير الدور من ${targetData.role} إلى ${newRole}`
  });
}

// Update member custom permissions
export async function updateClinicMemberPermissions(
  actorMember: ClinicMember,
  targetMemberId: string,
  customPermissions: ClinicPermission[]
): Promise<void> {
  const orgId = actorMember.organizationId;

  const targetDocRef = doc(db, "clinic_members", targetMemberId);
  const targetSnap = await getDoc(targetDocRef);
  if (!targetSnap.exists()) throw new Error("العضو غير موجود");

  const targetData = targetSnap.data() as ClinicMember;

  if (targetMemberId === actorMember.uid && targetData.role === 'OWNER') {
    throw new Error("مالك العيادة يملك جميع الصلاحيات دائماً بشكل تلقائي");
  }

  const updates = {
    customPermissions,
    updatedAt: new Date().toISOString()
  };

  await updateDoc(targetDocRef, updates);
  try {
    await updateDoc(doc(db, `organizations/${orgId}/members`, targetMemberId), updates);
  } catch (e) { /* ignore */ }

  await logClinicAction({
    organizationId: orgId,
    actorUid: actorMember.uid,
    actorName: actorMember.displayName,
    action: 'permission_updated',
    targetUid: targetMemberId,
    targetEmail: targetData.email,
    targetName: targetData.displayName,
    details: `تم تحديث الصلاحيات المخصصة للعضو (${customPermissions.length} صلاحيات مفعلة)`
  });
}


// Enable / Disable a member
export async function setClinicMemberStatus(
  actorMember: ClinicMember,
  targetMemberId: string,
  newStatus: 'active' | 'disabled'
): Promise<void> {
  const orgId = actorMember.organizationId;

  if (targetMemberId === actorMember.uid && newStatus === 'disabled') {
    throw new Error("لا يمكنك تعطيل حسابك الشخصي");
  }

  const targetDocRef = doc(db, "clinic_members", targetMemberId);
  const targetSnap = await getDoc(targetDocRef);
  if (!targetSnap.exists()) throw new Error("العضو غير موجود");

  const targetData = targetSnap.data() as ClinicMember;

  // Prevent activating unaccepted pending invitations
  if (targetData.status === 'invited') {
    throw new Error("لا يمكن تفعيل عضو لم يقم بقبول الدعوة بعد. يجب على الموظف قبول الدعوة أولاً.");
  }

  const updates = {
    status: newStatus,
    updatedAt: new Date().toISOString()
  };

  await updateDoc(targetDocRef, updates);
  try {
    await updateDoc(doc(db, `organizations/${orgId}/members`, targetMemberId), updates);
  } catch (e) { /* ignore */ }

  await logClinicAction({
    organizationId: orgId,
    actorUid: actorMember.uid,
    actorName: actorMember.displayName,
    action: newStatus === 'disabled' ? 'member_disabled' : 'member_enabled',
    targetUid: targetMemberId,
    targetEmail: targetData.email,
    targetName: targetData.displayName,
    details: newStatus === 'disabled' ? 'تم تعطيل صلاحيات وصول العضو' : 'تم إعادة تفعيل العضو'
  });
}

// Remove member completely
export async function removeClinicMember(
  actorMember: ClinicMember,
  targetMemberId: string
): Promise<void> {
  const orgId = actorMember.organizationId;

  if (targetMemberId === actorMember.uid) {
    throw new Error("لا يمكنك حذف حسابك الخاص بصفتك مالك العيادة");
  }

  const targetDocRef = doc(db, "clinic_members", targetMemberId);
  const targetSnap = await getDoc(targetDocRef);
  const targetData = targetSnap.exists() ? (targetSnap.data() as ClinicMember) : null;

  // 1. Delete main member document
  await deleteDoc(targetDocRef);
  try {
    await deleteDoc(doc(db, `organizations/${orgId}/members`, targetMemberId));
  } catch (e) { /* ignore */ }

  // 2. Clean up any invitations or temp records for this email in this organization
  if (targetData?.email) {
    const cleanEmail = targetData.email.toLowerCase().trim();

    try {
      const invQ = query(
        collection(db, "clinic_invitations"),
        where("organizationId", "==", orgId)
      );
      const invSnap = await getDocs(invQ);
      for (const invDoc of invSnap.docs) {
        const inv = invDoc.data() as ClinicInvitation;
        if (inv.invitedEmail && inv.invitedEmail.toLowerCase().trim() === cleanEmail) {
          await deleteDoc(doc(db, "clinic_invitations", invDoc.id));
        }
      }
    } catch (e) {
      console.warn("Error cleaning up invitations on member removal:", e);
    }

    const tempDocId = `${orgId}_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    try {
      await deleteDoc(doc(db, "clinic_members", tempDocId));
      await deleteDoc(doc(db, `organizations/${orgId}/members`, tempDocId));
    } catch (e) { /* ignore */ }
  }

  // 3. Write audit log
  await logClinicAction({
    organizationId: orgId,
    actorUid: actorMember.uid,
    actorName: actorMember.displayName,
    action: 'member_removed',
    targetUid: targetMemberId,
    targetEmail: targetData?.email,
    targetName: targetData?.displayName,
    details: 'تم حذف العضو وسحب كافة صلاحيات وصول العيادة'
  });
}

// Internal Audit Logger
export async function logClinicAction(params: {
  organizationId: string;
  actorUid: string;
  actorName?: string;
  action: ClinicAuditLog['action'];
  targetUid: string;
  targetEmail?: string;
  targetName?: string;
  details?: string;
}): Promise<void> {
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const logData: ClinicAuditLog = {
      id: logId,
      organizationId: params.organizationId,
      actorUid: params.actorUid,
      actorName: params.actorName || "",
      action: params.action,
      targetUid: params.targetUid,
      targetEmail: params.targetEmail || "",
      targetName: params.targetName || "",
      details: params.details || "",
      timestamp: new Date().toISOString()
    };

    await setDoc(doc(db, `organizations/${params.organizationId}/audit_logs`, logId), logData);
  } catch (err) {
    console.warn("Failed to write clinic audit log:", err);
  }
}

// Fetch Audit Logs for Clinic Organization
export async function getClinicAuditLogs(organizationId: string): Promise<ClinicAuditLog[]> {
  if (!organizationId) return [];

  try {
    const q = query(
      collection(db, `organizations/${organizationId}/audit_logs`),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    const logs: ClinicAuditLog[] = [];
    snap.forEach((docSnap) => {
      logs.push({ id: docSnap.id, ...docSnap.data() } as ClinicAuditLog);
    });
    return logs;
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    return [];
  }
}

// ==========================================
// CLINIC FINANCE SYSTEM SERVICES
// ==========================================

// --- Services & Pricing ---

export function subscribeToClinicServices(
  organizationId: string,
  callback: (services: ClinicService[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const servicesRef = collection(db, `organizations/${organizationId}/services`);
  return onSnapshot(
    servicesRef,
    (snapshot) => {
      const list: ClinicService[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ClinicService);
      });
      // Sort active first then by name
      list.sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return a.name.localeCompare(b.name, "ar");
      });
      callback(list);
    },
    (error) => {
      console.error("Error subscribing to services:", error);
      callback([]);
    }
  );
}

export async function getClinicServicesPublic(organizationId: string): Promise<ClinicService[]> {
  try {
    const srvRef = collection(db, `organizations/${organizationId}/services`);
    const snap = await getDocs(query(srvRef, where("active", "==", true)));
    const list: ClinicService[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as ClinicService);
    });
    return list;
  } catch (err) {
    console.error("Error fetching public clinic services:", err);
    return [];
  }
}

export async function createClinicService(
  actorMember: ClinicMember | null,
  isOwnerFallback: boolean,
  data: {
    organizationId: string;
    name: string;
    description?: string;
    price: number;
  }
): Promise<ClinicService> {
  const orgId = data.organizationId;
  if (!hasPermission(actorMember, 'EDIT_PRICES', isOwnerFallback)) {
    throw new Error("لا تملك صلاحية إضافة أو تعديل أسعار الخدمات.");
  }

  if (!data.name.trim()) throw new Error("يرجى إدخال اسم الخدمة.");
  if (data.price < 0 || isNaN(data.price)) throw new Error("يرجى إدخال سعر صحيح للخدمة.");

  const serviceId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const actorUid = actorMember ? actorMember.uid : orgId;

  const newService: ClinicService = {
    id: serviceId,
    organizationId: orgId,
    name: data.name.trim(),
    description: data.description?.trim() || "",
    price: Number(data.price),
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: actorUid
  };

  await setDoc(doc(db, `organizations/${orgId}/services`, serviceId), newService);

  await logClinicAction({
    organizationId: orgId,
    actorUid,
    actorName: actorMember?.displayName || "مالك العيادة",
    action: 'service_created',
    targetUid: serviceId,
    targetName: data.name,
    details: `تم إضافة خدمة جديدة (${data.name}) بسعر ${data.price} ج`
  });

  return newService;
}

export async function updateClinicService(
  actorMember: ClinicMember | null,
  isOwnerFallback: boolean,
  serviceId: string,
  organizationId: string,
  updates: Partial<{
    name: string;
    description: string;
    price: number;
    active: boolean;
  }>
): Promise<void> {
  if (!hasPermission(actorMember, 'EDIT_PRICES', isOwnerFallback)) {
    throw new Error("لا تملك صلاحية تعديل أسعار الخدمات.");
  }

  const srvRef = doc(db, `organizations/${organizationId}/services`, serviceId);
  const srvSnap = await getDoc(srvRef);
  if (!srvSnap.exists()) throw new Error("الخدمة غير موجودة.");

  const oldData = srvSnap.data() as ClinicService;
  const isPriceChanged = updates.price !== undefined && updates.price !== oldData.price;

  const payload: Partial<ClinicService> = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await updateDoc(srvRef, payload);

  const actorUid = actorMember ? actorMember.uid : organizationId;
  await logClinicAction({
    organizationId,
    actorUid,
    actorName: actorMember?.displayName || "مالك العيادة",
    action: isPriceChanged ? 'service_price_changed' : 'service_updated',
    targetUid: serviceId,
    targetName: updates.name || oldData.name,
    details: isPriceChanged
      ? `تغيير سعر الخدمة (${oldData.name}) من ${oldData.price} ج إلى ${updates.price} ج`
      : `تحديث بيانات الخدمة (${oldData.name})`
  });
}

export async function seedDefaultServicesIfEmpty(
  organizationId: string,
  currentDoctor?: DoctorProfile
): Promise<void> {
  if (!organizationId) return;

  try {
    const servicesRef = collection(db, `organizations/${organizationId}/services`);
    const snap = await getDocs(servicesRef);
    if (!snap.empty) return; // Services already initialized

    // Seed defaults or profile services
    const defaultList: { name: string; price: number }[] = [];

    if (currentDoctor?.servicesAndPrices && currentDoctor.servicesAndPrices.length > 0) {
      currentDoctor.servicesAndPrices.forEach((sp) => {
        const numPrice = parseFloat(sp.price.replace(/[^0-9.]/g, "")) || 200;
        defaultList.push({ name: sp.serviceName, price: numPrice });
      });
    } else {
      defaultList.push(
        { name: "كشف أطفال", price: 300 },
        { name: "كشف باطنة", price: 350 },
        { name: "متابعة", price: 200 },
        { name: "استشارة", price: 150 }
      );
    }

    for (const item of defaultList) {
      const srvId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newSrv: ClinicService = {
        id: srvId,
        organizationId,
        name: item.name,
        description: "خدمة طبية في العيادة",
        price: item.price,
        active: true,
        createdAt: new Date().toISOString(),
        createdBy: organizationId
      };
      await setDoc(doc(db, `organizations/${organizationId}/services`, srvId), newSrv);
    }
  } catch (err) {
    console.warn("Error seeding default services:", err);
  }
}

// --- Transactions & Payments ---

export function subscribeToClinicTransactions(
  organizationId: string,
  callback: (transactions: ClinicTransaction[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const txRef = collection(db, `organizations/${organizationId}/transactions`);
  const q = query(txRef, orderBy("createdAt", "desc"), limit(200));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ClinicTransaction[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ClinicTransaction);
      });
      callback(list);
    },
    (error) => {
      console.error("Error subscribing to transactions:", error);
      callback([]);
    }
  );
}

export async function createClinicTransaction(
  actorMember: ClinicMember | null,
  isOwnerFallback: boolean,
  data: {
    organizationId: string;
    patientId?: string;
    patientName: string;
    patientPhone?: string;
    appointmentId?: string;
    serviceId?: string;
    serviceName: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }
): Promise<ClinicTransaction> {
  const orgId = data.organizationId;
  if (!hasPermission(actorMember, 'MANAGE_FINANCE', isOwnerFallback)) {
    throw new Error("لا تملك صلاحية تسجيل أو إدارة المدفوعات.");
  }

  if (!data.patientName.trim()) throw new Error("يرجى إدخال اسم المريض.");
  if (!data.serviceName.trim()) throw new Error("يرجى اختيار أو كتابة الخدمة المقدمة.");
  if (data.totalAmount < 0 || isNaN(data.totalAmount)) throw new Error("يرجى إدخال إجمالي مبلغ الخدمة بشكل صحيح.");
  if (data.paidAmount < 0 || isNaN(data.paidAmount)) throw new Error("يرجى إدخال المبلغ المدفوع بشكل صحيح.");
  
  if (data.paidAmount > data.totalAmount) {
    throw new Error("المبلغ المدفوع أكبر من قيمة الخدمة الإجمالية.");
  }

  const totalAmount = Number(data.totalAmount);
  const paidAmount = Number(data.paidAmount);
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  let paymentStatus: PaymentStatus = 'UNPAID';
  if (paidAmount >= totalAmount && totalAmount > 0) {
    paymentStatus = 'PAID';
  } else if (paidAmount > 0) {
    paymentStatus = 'PARTIAL';
  }

  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const actorUid = actorMember ? actorMember.uid : orgId;
  const actorName = actorMember ? actorMember.displayName : "مالك العيادة";

  const newTx: ClinicTransaction = {
    id: txId,
    organizationId: orgId,
    patientId: data.patientId || "",
    patientName: data.patientName.trim(),
    patientPhone: data.patientPhone?.trim() || "",
    appointmentId: data.appointmentId || "",
    serviceId: data.serviceId || "",
    serviceName: data.serviceName.trim(),
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentStatus,
    paymentMethod: data.paymentMethod,
    notes: data.notes?.trim() || "",
    createdBy: actorUid,
    createdByName: actorName,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, `organizations/${orgId}/transactions`, txId), newTx);

  await logClinicAction({
    organizationId: orgId,
    actorUid,
    actorName,
    action: 'payment_created',
    targetUid: txId,
    targetName: data.patientName,
    details: `تسجيل معاملة دَفْع جديدة للمريض (${data.patientName}) بقيمة مدفوعة ${paidAmount} ج من إجمالي ${totalAmount} ج (${paymentStatus})`
  });

  return newTx;
}

export async function recordAdditionalPayment(
  actorMember: ClinicMember | null,
  isOwnerFallback: boolean,
  organizationId: string,
  transactionId: string,
  additionalAmount: number,
  paymentMethod: PaymentMethod,
  notes?: string
): Promise<void> {
  if (!hasPermission(actorMember, 'MANAGE_FINANCE', isOwnerFallback)) {
    throw new Error("لا تملك صلاحية تسديد المبالغ المستحقة.");
  }

  const txRef = doc(db, `organizations/${organizationId}/transactions`, transactionId);
  const txSnap = await getDoc(txRef);
  if (!txSnap.exists()) throw new Error("المعاملة غير موجودة.");

  const txData = txSnap.data() as ClinicTransaction;

  if (txData.paymentStatus === 'REFUNDED') {
    throw new Error("لا يمكن إضافة دفعات لمعاملة تم استرداد أموالها.");
  }

  if (additionalAmount <= 0 || isNaN(additionalAmount)) {
    throw new Error("يرجى إدخال مبلغ دفع صحيح.");
  }

  if (additionalAmount > txData.remainingAmount) {
    throw new Error(`المبلغ المدفوع (${additionalAmount} ج) أكبر من المتبقي المستحق (${txData.remainingAmount} ج).`);
  }

  const newPaidAmount = txData.paidAmount + additionalAmount;
  const newRemainingAmount = Math.max(0, txData.totalAmount - newPaidAmount);
  const newStatus: PaymentStatus = newRemainingAmount === 0 ? 'PAID' : 'PARTIAL';

  const actorUid = actorMember ? actorMember.uid : organizationId;
  const actorName = actorMember ? actorMember.displayName : "مالك العيادة";

  const updates = {
    paidAmount: newPaidAmount,
    remainingAmount: newRemainingAmount,
    paymentStatus: newStatus,
    paymentMethod,
    notes: notes ? `${txData.notes || ''}\n[سداد جديد ${new Date().toLocaleDateString('ar-EG')}]: ${notes}`.trim() : txData.notes,
    updatedAt: new Date().toISOString()
  };

  await updateDoc(txRef, updates);

  await logClinicAction({
    organizationId,
    actorUid,
    actorName,
    action: 'payment_updated',
    targetUid: transactionId,
    targetName: txData.patientName,
    details: `سداد مبلغ مستحق إضافي (${additionalAmount} ج) للمريض (${txData.patientName}). المتبقي الحالي: ${newRemainingAmount} ج`
  });
}

export async function refundClinicTransaction(
  actorMember: ClinicMember | null,
  isOwnerFallback: boolean,
  organizationId: string,
  transactionId: string,
  refundAmount: number,
  reason: string
): Promise<void> {
  if (!hasPermission(actorMember, 'REFUND_PAYMENT', isOwnerFallback)) {
    throw new Error("لا تملك صلاحية إجراء استرداد أموال الكشف.");
  }

  if (!reason.trim()) throw new Error("يرجى ذكر سبب استرداد المبلغ.");

  const txRef = doc(db, `organizations/${organizationId}/transactions`, transactionId);
  const txSnap = await getDoc(txRef);
  if (!txSnap.exists()) throw new Error("المعاملة غير موجودة.");

  const txData = txSnap.data() as ClinicTransaction;

  if (refundAmount <= 0 || isNaN(refundAmount)) {
    throw new Error("يرجى إدخال مبلغ استرداد صحيح.");
  }

  if (refundAmount > txData.paidAmount) {
    throw new Error(`مبلغ الاسترداد (${refundAmount} ج) أكبر من المبلغ المدفوع الفعلي (${txData.paidAmount} ج).`);
  }

  const actorUid = actorMember ? actorMember.uid : organizationId;
  const actorName = actorMember ? actorMember.displayName : "مالك العيادة";

  const updates = {
    paymentStatus: 'REFUNDED' as PaymentStatus,
    paidAmount: Math.max(0, txData.paidAmount - refundAmount),
    remainingAmount: txData.totalAmount - Math.max(0, txData.paidAmount - refundAmount),
    refundDetails: {
      refundAmount: Number(refundAmount),
      reason: reason.trim(),
      refundedBy: actorUid,
      refundedByName: actorName,
      refundedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };

  await updateDoc(txRef, updates);

  await logClinicAction({
    organizationId,
    actorUid,
    actorName,
    action: 'refund_created',
    targetUid: transactionId,
    targetName: txData.patientName,
    details: `إجراء استرداد مبلغ (${refundAmount} ج) للمريض (${txData.patientName}). السبب: ${reason}`
  });
}

// --- Expense Management ---

export function subscribeToClinicExpenses(
  organizationId: string,
  callback: (expenses: ClinicExpense[]) => void
): () => void {
  if (!organizationId) {
    callback([]);
    return () => {};
  }

  const expRef = collection(db, `organizations/${organizationId}/expenses`);
  const q = query(expRef, orderBy("createdAt", "desc"), limit(200));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ClinicExpense[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ClinicExpense);
      });
      callback(list);
    },
    (error) => {
      console.error("Error subscribing to expenses:", error);
      callback([]);
    }
  );
}

export async function createClinicExpense(
  actorMember: ClinicMember | null,
  isOwnerFallback: boolean,
  data: {
    organizationId: string;
    title: string;
    category: ExpenseCategory;
    amount: number;
    note?: string;
  }
): Promise<ClinicExpense> {
  const orgId = data.organizationId;
  if (!hasPermission(actorMember, 'MANAGE_FINANCE', isOwnerFallback)) {
    throw new Error("لا تملك صلاحية إضافة أو إدارة المصروفات.");
  }

  if (!data.title.trim()) throw new Error("يرجى إدخال عنوان أو بيان المصروف.");
  if (data.amount <= 0 || isNaN(data.amount)) throw new Error("يرجى إدخال قيمة مصروف صحيحة.");

  const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const actorUid = actorMember ? actorMember.uid : orgId;
  const actorName = actorMember ? actorMember.displayName : "مالك العيادة";

  const newExp: ClinicExpense = {
    id: expenseId,
    organizationId: orgId,
    title: data.title.trim(),
    category: data.category,
    amount: Number(data.amount),
    note: data.note?.trim() || "",
    createdBy: actorUid,
    createdByName: actorName,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, `organizations/${orgId}/expenses`, expenseId), newExp);

  await logClinicAction({
    organizationId: orgId,
    actorUid,
    actorName,
    action: 'expense_created',
    targetUid: expenseId,
    targetName: data.title,
    details: `تسجيل مصروف جديد (${data.title}) بقيمة ${data.amount} ج`
  });

  return newExp;
}

export async function updateClinicExpense(
  actorMember: ClinicMember | null,
  isOwnerFallback: boolean,
  organizationId: string,
  expenseId: string,
  updates: Partial<{
    title: string;
    category: ExpenseCategory;
    amount: number;
    note: string;
  }>
): Promise<void> {
  if (!hasPermission(actorMember, 'MANAGE_FINANCE', isOwnerFallback)) {
    throw new Error("لا تملك صلاحية تعديل المصروفات.");
  }

  const expRef = doc(db, `organizations/${organizationId}/expenses`, expenseId);
  const expSnap = await getDoc(expRef);
  if (!expSnap.exists()) throw new Error("المصروف غير موجود.");

  const oldData = expSnap.data() as ClinicExpense;

  const payload: Partial<ClinicExpense> = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await updateDoc(expRef, payload);

  const actorUid = actorMember ? actorMember.uid : organizationId;
  await logClinicAction({
    organizationId,
    actorUid,
    actorName: actorMember?.displayName || "مالك العيادة",
    action: 'expense_updated',
    targetUid: expenseId,
    targetName: updates.title || oldData.title,
    details: `تحديث بيانات المصروف (${oldData.title})`
  });
}

export async function deleteClinicExpense(
  actorMember: ClinicMember | null,
  isOwnerFallback: boolean,
  organizationId: string,
  expenseId: string
): Promise<void> {
  if (!hasPermission(actorMember, 'MANAGE_FINANCE', isOwnerFallback)) {
    throw new Error("لا تملك صلاحية حذف المصروفات.");
  }

  const expRef = doc(db, `organizations/${organizationId}/expenses`, expenseId);
  const expSnap = await getDoc(expRef);
  const oldData = expSnap.exists() ? (expSnap.data() as ClinicExpense) : null;

  await deleteDoc(expRef);

  const actorUid = actorMember ? actorMember.uid : organizationId;
  await logClinicAction({
    organizationId,
    actorUid,
    actorName: actorMember?.displayName || "مالك العيادة",
    action: 'expense_deleted',
    targetUid: expenseId,
    targetName: oldData?.title || expenseId,
    details: `حذف المصروف (${oldData?.title || expenseId}) بقيمة ${oldData?.amount || 0} ج`
  });
}

// ============================================================================
// PATIENT MEDICAL FILES MANAGEMENT (MULTI-TENANT ISOLATION)
// ============================================================================

export async function getPatientMedicalFile(doctorId: string, phone: string): Promise<PatientMedicalFile | null> {
  try {
    const cleanPhone = normalizePhoneNumber(phone);
    if (!cleanPhone) return null;
    const fileRef = doc(db, "doctors", doctorId, "patientFiles", cleanPhone);
    const snap = await getDoc(fileRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as PatientMedicalFile;
    }
    return null;
  } catch (err) {
    console.error("Error fetching patient medical file:", err);
    return null;
  }
}

export async function savePatientMedicalFile(
  doctorId: string,
  fileData: Partial<PatientMedicalFile> & { patientPhone: string; patientName: string }
): Promise<PatientMedicalFile> {
  const cleanPhone = normalizePhoneNumber(fileData.patientPhone);
  const nowIso = new Date().toISOString();
  const fileRef = doc(db, "doctors", doctorId, "patientFiles", cleanPhone);

  const existingSnap = await getDoc(fileRef);
  let updatedFile: PatientMedicalFile;

  if (existingSnap.exists()) {
    const prev = existingSnap.data() as PatientMedicalFile;
    updatedFile = {
      ...prev,
      ...fileData,
      patientPhone: cleanPhone,
      updatedAt: nowIso
    };
    await setDoc(fileRef, updatedFile, { merge: true });
  } else {
    updatedFile = {
      id: cleanPhone,
      doctorId,
      patientName: sanitizeInput(fileData.patientName),
      patientPhone: cleanPhone,
      age: fileData.age || undefined,
      gender: fileData.gender || undefined,
      bloodGroup: fileData.bloodGroup || '',
      allergies: fileData.allergies || '',
      chronicDiseases: fileData.chronicDiseases || '',
      generalNotes: fileData.generalNotes || '',
      lastVisitDate: fileData.lastVisitDate || getTodayDateString(),
      visitsCount: fileData.visitsCount || 1,
      visits: fileData.visits || [],
      createdAt: nowIso,
      updatedAt: nowIso
    };
    await setDoc(fileRef, updatedFile);
  }
  return updatedFile;
}

export async function addVisitToPatientMedicalFile(
  doctorId: string,
  patientName: string,
  patientPhone: string,
  visitEntry: PatientVisitEntry
): Promise<void> {
  try {
    const cleanPhone = normalizePhoneNumber(patientPhone);
    if (!cleanPhone) return;
    const existing = await getPatientMedicalFile(doctorId, cleanPhone);

    if (existing) {
      const visits = existing.visits || [];
      const existsIndex = visits.findIndex(v => v.id === visitEntry.id);
      if (existsIndex >= 0) {
        visits[existsIndex] = { ...visits[existsIndex], ...visitEntry };
      } else {
        visits.unshift(visitEntry);
      }
      await savePatientMedicalFile(doctorId, {
        patientPhone: cleanPhone,
        patientName: patientName || existing.patientName,
        lastVisitDate: visitEntry.date || getTodayDateString(),
        visitsCount: visits.length,
        visits
      });
    } else {
      await savePatientMedicalFile(doctorId, {
        patientPhone: cleanPhone,
        patientName,
        lastVisitDate: visitEntry.date || getTodayDateString(),
        visitsCount: 1,
        visits: [visitEntry]
      });
    }
  } catch (err) {
    console.error("Error linking visit to patient file:", err);
  }
}

export async function searchPatientsForDoctor(doctorId: string, searchTerm: string, limitCount = 20): Promise<PatientMedicalFile[]> {
  try {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];

    const colRef = collection(db, "doctors", doctorId, "patientFiles");
    const snap = await getDocs(query(colRef, limit(100)));
    const results: PatientMedicalFile[] = [];

    snap.forEach((docSnap) => {
      const data = { id: docSnap.id, ...docSnap.data() } as PatientMedicalFile;
      const nameMatch = data.patientName?.toLowerCase().includes(term);
      const phoneMatch = data.patientPhone?.includes(term);
      if (nameMatch || phoneMatch) {
        results.push(data);
      }
    });

    return results.slice(0, limitCount);
  } catch (err) {
    console.error("Error searching patients for doctor:", err);
    return [];
  }
}

export async function getAllPatientFilesForDoctor(doctorId: string, limitCount = 50): Promise<PatientMedicalFile[]> {
  try {
    const colRef = collection(db, "doctors", doctorId, "patientFiles");
    const q = query(colRef, limit(limitCount));
    const snap = await getDocs(q);
    const list: PatientMedicalFile[] = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() } as PatientMedicalFile));
    return list;
  } catch (err) {
    console.error("Error fetching patient files:", err);
    return [];
  }
}

// ============================================================================
// PLATFORM ADMIN SOFT DELETE & RECYCLE BIN MANAGEMENT (3-DAY POLICY)
// ============================================================================

export async function softDeleteDoctorAccountByAdmin(doctorId: string, adminUid: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await updateDoc(doc(db, "doctors", doctorId), {
    isDeleted: true,
    deletedAt: nowIso,
    deletedByAdminUid: adminUid,
    isActive: false
  });
  writeAuditLog("SOFT_DELETE_DOCTOR", adminUid, doctorId, { deletedAt: nowIso });
}

export async function softDeleteLabAccountByAdmin(labId: string, adminUid: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await updateDoc(doc(db, "labs", labId), {
    isDeleted: true,
    deletedAt: nowIso,
    deletedByAdminUid: adminUid,
    isActive: false
  });
  writeAuditLog("SOFT_DELETE_LAB", adminUid, labId, { deletedAt: nowIso });
}

export async function restoreDoctorAccountByAdmin(doctorId: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, "doctors", doctorId), {
    isDeleted: false,
    deletedAt: null,
    deletedByAdminUid: null,
    isActive: true
  });
  writeAuditLog("RESTORE_DOCTOR", adminUid, doctorId);
}

export async function restoreLabAccountByAdmin(labId: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, "labs", labId), {
    isDeleted: false,
    deletedAt: null,
    deletedByAdminUid: null,
    isActive: true
  });
  writeAuditLog("RESTORE_LAB", adminUid, labId);
}

export interface DeletedAccountItem {
  id: string;
  name: string;
  type: 'doctor' | 'laboratory';
  deletedAt: string;
  deletedByAdminUid?: string;
  originalData: any;
}

export async function getDeletedAccountsAdmin(): Promise<DeletedAccountItem[]> {
  const deletedItems: DeletedAccountItem[] = [];

  try {
    const docSnap = await getDocs(collection(db, "doctors"));
    docSnap.forEach((d) => {
      const data = d.data();
      if (data.isDeleted === true) {
        deletedItems.push({
          id: d.id,
          name: data.clinicName || data.name || 'عيادة',
          type: 'doctor',
          deletedAt: data.deletedAt || new Date().toISOString(),
          deletedByAdminUid: data.deletedByAdminUid || '',
          originalData: data
        });
      }
    });

    const labSnap = await getDocs(collection(db, "labs"));
    labSnap.forEach((l) => {
      const data = l.data();
      if (data.isDeleted === true) {
        deletedItems.push({
          id: l.id,
          name: data.name || 'معمل تحاليل',
          type: 'laboratory',
          deletedAt: data.deletedAt || new Date().toISOString(),
          deletedByAdminUid: data.deletedByAdminUid || '',
          originalData: data
        });
      }
    });
  } catch (err) {
    console.error("Error fetching deleted accounts:", err);
  }

  deletedItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  return deletedItems;
}

export async function hardDeleteAccountByAdmin(id: string, type: 'doctor' | 'laboratory', adminUid: string): Promise<void> {
  if (type === 'doctor') {
    try {
      const queueSnap = await getDocs(collection(db, "queues", id, "patients"));
      for (const p of queueSnap.docs) {
        await deleteDoc(p.ref);
      }
    } catch (e) {
      console.warn("Error purging queue patients:", e);
    }
    await deleteDoc(doc(db, "doctors", id));
  } else {
    await deleteDoc(doc(db, "labs", id));
  }
  writeAuditLog("HARD_DELETE_ACCOUNT", adminUid, id, { accountType: type });
}

// ============================================================================
// ADMIN ANNOUNCEMENTS & NOTIFICATION CENTER SERVICES
// ============================================================================

export async function createAnnouncementAdmin(
  adminUid: string,
  announcement: {
    title: string;
    message: string;
    type: AnnouncementType;
    target: AnnouncementTarget;
    targetUid?: string;
    targetName?: string;
    actionLink?: string;
    actionLabel?: string;
    expiresAt?: string;
  }
): Promise<string> {
  const annId = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const ref = doc(db, "announcements", annId);
  const data: AdminAnnouncement = {
    id: annId,
    title: announcement.title.trim(),
    message: announcement.message.trim(),
    type: announcement.type,
    target: announcement.target,
    targetUid: announcement.targetUid || '',
    targetName: announcement.targetName || '',
    actionLink: announcement.actionLink?.trim() || '',
    actionLabel: announcement.actionLabel?.trim() || '',
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: adminUid,
    expiresAt: announcement.expiresAt || ''
  };

  await setDoc(ref, data);
  writeAuditLog("CREATE_ANNOUNCEMENT", adminUid, annId, { title: data.title, type: data.type });
  return annId;
}

export async function updateAnnouncementAdmin(
  adminUid: string,
  announcementId: string,
  updates: Partial<AdminAnnouncement>
): Promise<void> {
  const ref = doc(db, "announcements", announcementId);
  await updateDoc(ref, updates);
  writeAuditLog("UPDATE_ANNOUNCEMENT", adminUid, announcementId, updates);
}

export async function deleteAnnouncementAdmin(
  adminUid: string,
  announcementId: string
): Promise<void> {
  const ref = doc(db, "announcements", announcementId);
  await deleteDoc(ref);
  writeAuditLog("DELETE_ANNOUNCEMENT", adminUid, announcementId);
}

export async function getAllAnnouncementsAdmin(): Promise<AdminAnnouncement[]> {
  try {
    const snap = await getDocs(collection(db, "announcements"));
    const list: AdminAnnouncement[] = [];
    snap.forEach((d) => {
      list.push(d.data() as AdminAnnouncement);
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.error("Error fetching announcements for admin:", err);
    return [];
  }
}

export function subscribeAnnouncementsForUser(
  userRole: 'visitor' | 'doctor' | 'laboratory' | 'staff' | 'admin' | 'guest' | string,
  userUid: string | null | undefined,
  callback: (announcements: AdminAnnouncement[]) => void
): () => void {
  const q = collection(db, "announcements");

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: AdminAnnouncement[] = [];
      const now = Date.now();

      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as AdminAnnouncement;
        if (!item.isActive) return;

        if (item.expiresAt) {
          const expTime = new Date(item.expiresAt).getTime();
          if (now > expTime) return;
        }

        // Filter based on target and user profile
        if (item.target === 'all') {
          list.push(item);
        } else if (item.target === 'doctors' && (userRole === 'doctor' || userRole === 'admin')) {
          list.push(item);
        } else if (item.target === 'labs' && (userRole === 'laboratory' || userRole === 'lab' || userRole === 'admin')) {
          list.push(item);
        } else if (item.target === 'staff' && (userRole === 'staff' || userRole === 'doctor' || userRole === 'laboratory' || userRole === 'lab' || userRole === 'admin')) {
          list.push(item);
        } else if (item.target === 'specific' && (Boolean(userUid && item.targetUid === userUid) || userRole === 'admin')) {
          list.push(item);
        }
      });

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => {
      console.warn("Announcements subscription error:", err);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Persists read announcement IDs across devices for authenticated accounts
 */
export async function fetchUserReadAnnouncements(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const prefDoc = await getDoc(doc(db, "user_preferences", userId));
    if (prefDoc.exists()) {
      const data = prefDoc.data();
      return Array.isArray(data?.readAnnouncements) ? data.readAnnouncements : [];
    }
    return [];
  } catch (err) {
    console.warn("Could not fetch remote user preferences:", err);
    return [];
  }
}

export async function saveUserReadAnnouncements(userId: string, readIds: string[]): Promise<void> {
  if (!userId || !Array.isArray(readIds)) return;
  try {
    await setDoc(
      doc(db, "user_preferences", userId),
      {
        readAnnouncements: readIds,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Could not sync read announcements to remote cloud:", err);
  }
}


