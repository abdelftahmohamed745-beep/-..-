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
  limit
} from "firebase/firestore";
import { db } from "../firebase/config";
import { DoctorProfile, PatientRecord, PatientStatus, SubscriptionStatus, NotificationTimingPreference } from "../types";
import {
  sanitizeInput,
  isValidPhoneNumber,
  isValidUrl,
  checkBookingRateLimit,
  writeAuditLog
} from "./securityService";

export const DEMO_DOCTOR_ID = "demo-doctor-123";

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Check doctor subscription state dynamically
export function evaluateSubscriptionStatus(docData: DoctorProfile): SubscriptionStatus {
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
        data.subscriptionStatus = evaluateSubscriptionStatus(data);
        // Only include active clinics for public directory
        if (data.isActive !== false) {
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

// Fetch all doctors for Platform Admin view
export async function getAllDoctorsAdmin(): Promise<DoctorProfile[]> {
  try {
    const querySnap = await getDocs(collection(db, "doctors"));
    const doctors: DoctorProfile[] = [];
    querySnap.forEach((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DoctorProfile;
        data.subscriptionStatus = evaluateSubscriptionStatus(data);
        doctors.push(data);
      }
    });
    return doctors;
  } catch (error) {
    console.error("Error fetching admin doctors list:", error);
    return [];
  }
}

// Admin action: Toggle Doctor account active/deactivated status (Requirement 13 & 14)
export async function toggleDoctorStatus(doctorId: string, isActive: boolean): Promise<void> {
  const docRef = doc(db, "doctors", doctorId);
  await updateDoc(docRef, { isActive });
}

// Admin action: Modify doctor subscription
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

// Fetch Doctor Profile
export async function getDoctorProfile(doctorId: string): Promise<DoctorProfile | null> {
  try {
    const docRef = doc(db, "doctors", doctorId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as DoctorProfile;
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
  const cleanPhone = phone.trim();
  const today = getTodayDateString();
  const q = query(
    collection(db, "queues", doctorId, "patients"),
    where("date", "==", today),
    where("phone", "==", cleanPhone)
  );

  const snapshot = await getDocs(q);
  const activeDoc = snapshot.docs
    .map(d => ({ id: d.id, ...d.data() } as PatientRecord))
    .find(p => p.status === 'waiting' || p.status === 'called');

  return activeDoc || null;
}

// Add Patient to Queue with rate limiting & subscription checks
export async function bookPatient(
  doctorId: string,
  name: string,
  phone: string,
  userId?: string,
  notificationPreference: NotificationTimingPreference = 'two_turns'
): Promise<{ patientId: string; sequenceNumber: number; isExisting?: boolean }> {
  // 1. Sanitize & Validate Inputs
  const cleanName = sanitizeInput(name);
  const cleanPhone = phone.trim();

  if (!cleanName || cleanName.length < 2) {
    throw new Error("يرجى إدخال اسم صحيح لا يقل عن حرفين");
  }

  if (cleanName.length > 100) {
    throw new Error("الاسم أطول من الحد المسموح به (100 حرف)");
  }

  if (!isValidPhoneNumber(cleanPhone)) {
    throw new Error("رقم الهاتف غير صحيح. يرجى كتابة رقم هاتف صالح");
  }

  // 2. Anti-Spam Rate Limiting Check
  const rateCheck = checkBookingRateLimit(cleanPhone);
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

  // 4. Check rate limit (same phone cannot book twice on same day if active)
  const existingBooking = await checkActiveBooking(doctorId, cleanPhone);
  if (existingBooking) {
    return {
      patientId: existingBooking.id,
      sequenceNumber: existingBooking.sequenceNumber,
      isExisting: true
    };
  }

  // 5. Calculate sequence number
  const today = getTodayDateString();
  const q = query(collection(db, "queues", doctorId, "patients"), where("date", "==", today));
  const snap = await getDocs(q);
  
  let maxSeq = 0;
  snap.docs.forEach(d => {
    const p = d.data() as PatientRecord;
    if (p.sequenceNumber > maxSeq) {
      maxSeq = p.sequenceNumber;
    }
  });

  const nextSeq = maxSeq + 1;

  if (doctor.workHours.maxPatientsPerDay && nextSeq > doctor.workHours.maxPatientsPerDay) {
    throw new Error(`عذراً، اكتمل الحد الأقصى لحجوزات اليوم (${doctor.workHours.maxPatientsPerDay} مريض).`);
  }

  const now = new Date().toISOString();
  const estMins = Math.max(0, (nextSeq - 1) * (doctor.avgConsultTime || 12));

  const patientData: Omit<PatientRecord, 'id'> = {
    doctorId,
    clinicId: doctorId,
    userId: userId || '',
    sequenceNumber: nextSeq,
    queueNumber: nextSeq,
    name: cleanName,
    phone: cleanPhone,
    status: 'waiting',
    date: today,
    createdAt: now,
    updatedAt: now,
    estimatedMinutes: estMins,
    notificationSent: false,
    notifiedForTwoTurns: false,
    notifiedForOneTurn: false,
    notifiedForTenMinutes: false,
    notificationPreference
  };

  const docRef = await addDoc(collection(db, "queues", doctorId, "patients"), patientData);

  // Write Audit Log
  writeAuditLog("BOOK_PATIENT_TICKET", userId || "PATIENT_PUBLIC", doctorId, {
    sequenceNumber: nextSeq,
    ticketId: docRef.id
  });

  return { patientId: docRef.id, sequenceNumber: nextSeq, isExisting: false };
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

// Live Single Patient Ticket Listener
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

  const unsubDoctor = onSnapshot(doctorRef, (docSnap) => {
    if (docSnap.exists()) {
      currentDoctor = docSnap.data() as DoctorProfile;
      currentDoctor.subscriptionStatus = evaluateSubscriptionStatus(currentDoctor);
    }
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
    emit();
  });

  function emit() {
    const myPatient = allPatients.find(p => p.id === patientId) || null;
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

// Call Next Patient Action
export async function callNextPatient(doctorId: string): Promise<{ calledPatient: PatientRecord | null }> {
  const today = getTodayDateString();
  const q = query(collection(db, "queues", doctorId, "patients"), where("date", "==", today));
  const snap = await getDocs(q);

  const patients: PatientRecord[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as PatientRecord));
  patients.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  const nowIso = new Date().toISOString();

  // 1. If there's an existing 'called' patient, mark them 'done'
  const currentCalled = patients.find(p => p.status === 'called');
  if (currentCalled) {
    await updateDoc(doc(db, "queues", doctorId, "patients", currentCalled.id), {
      status: 'done',
      doneAt: nowIso
    });
  }

  // 2. Find next 'waiting' patient
  const nextWaiting = patients.find(p => p.status === 'waiting');
  if (nextWaiting) {
    await updateDoc(doc(db, "queues", doctorId, "patients", nextWaiting.id), {
      status: 'called',
      calledAt: nowIso
    });
  }

  // 3. Recalculate average consultation time in background
  recalculateDoctorAvgConsultTime(doctorId).catch(console.error);

  return { calledPatient: nextWaiting || null };
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

// Seed Demo Doctor and realistic sample Queue
export async function seedDemoDoctorAndQueue(): Promise<DoctorProfile> {
  const doctorId = DEMO_DOCTOR_ID;
  const existing = await getDoctorProfile(doctorId);
  if (existing) {
    return existing;
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days active trial

  const demoDoctor: DoctorProfile = {
    uid: doctorId,
    name: "د. أسامة عبد الرحمن",
    specialty: "استشاري الباطنة والجهاز الهضمي",
    clinicName: "مركز الشفاء الطبي - عيادة الباطنة",
    qrCodeId: "QR-DEMO-CLINIC",
    phone: "01012345678",
    address: "شارع التحرير، الدقي، الجيزة",
    subscriptionStatus: "active",
    trialEndDate: trialEnd.toISOString(),
    subscriptionEndDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    avgConsultTime: 10,
    workHours: {
      open: "10:00",
      close: "22:00",
      maxPatientsPerDay: 40,
      daysOfWeek: ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس"]
    },
    createdAt: now.toISOString()
  };

  await setDoc(doc(db, "doctors", doctorId), demoDoctor);

  // Add 5 sample patients for today
  const today = getTodayDateString();
  const samplePatients = [
    { seq: 1, name: "أحمد محمود الفولي", phone: "01098765432", status: 'done' as PatientStatus },
    { seq: 2, name: "سارة حسن عبد الله", phone: "01122334455", status: 'called' as PatientStatus },
    { seq: 3, name: "محمود علي إبراهيم", phone: "01234567890", status: 'waiting' as PatientStatus },
    { seq: 4, name: "رانيا يوسف طه", phone: "01555443322", status: 'waiting' as PatientStatus },
    { seq: 5, name: "عمر خالد العريفي", phone: "01066778899", status: 'waiting' as PatientStatus }
  ];

  for (const item of samplePatients) {
    const pData: Omit<PatientRecord, 'id'> = {
      doctorId,
      sequenceNumber: item.seq,
      name: item.name,
      phone: item.phone,
      status: item.status,
      date: today,
      createdAt: new Date(now.getTime() - (30 - item.seq * 5) * 60000).toISOString(),
      calledAt: item.status === 'called' || item.status === 'done' ? new Date(now.getTime() - 10 * 60000).toISOString() : undefined,
      doneAt: item.status === 'done' ? new Date(now.getTime() - 2 * 60000).toISOString() : undefined
    };
    await addDoc(collection(db, "queues", doctorId, "patients"), pData);
  }

  return demoDoctor;
}
