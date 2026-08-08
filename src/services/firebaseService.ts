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
import { DoctorProfile, PatientRecord, PatientStatus, SubscriptionStatus, NotificationTimingPreference, DoctorRating, FollowUpAppointment, FollowUpAppointmentStatus, FollowUpReminderSettings } from "../types";
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

